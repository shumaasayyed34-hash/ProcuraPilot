import time
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.agent_log import AgentLog, AgentStatus
from models.audit_log import AuditLog
from models.quotation import Quotation
from models.supplier import Supplier
from models.supplier_score import SupplierScore
from models.user import User
from schemas.ahp import (
    AHPCalculateRequest,
    AHPPairwiseRequest,
    AHPResponse,
    AHPPairwiseResponse,
    AHPResult,
)
from utils.ahp_engine import (
    build_suppliers_data,
    calculate_ahp_scores,
    calculate_consistency_ratio,
    calculate_weights,
    normalize_matrix,
)
from utils.auth import get_current_user

router = APIRouter(prefix="/ahp", tags=["AHP Scoring"])

WEIGHT_TEMPLATES: Dict[str, Dict[str, float]] = {
    "cost_focused":          {"price": 0.60, "quality": 0.20, "delivery": 0.15, "esg": 0.05},
    "quality_focused":       {"price": 0.20, "quality": 0.55, "delivery": 0.15, "esg": 0.10},
    "balanced":              {"price": 0.35, "quality": 0.30, "delivery": 0.25, "esg": 0.10},
    "sustainability_focused":{"price": 0.25, "quality": 0.25, "delivery": 0.20, "esg": 0.30},
}


@router.get("/weights/templates")
async def get_weight_templates(_: User = Depends(get_current_user)):
    return WEIGHT_TEMPLATES


async def _fetch_quotations_and_suppliers(rfq_id: int, db: AsyncSession):
    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    quotations = q_result.scalars().all()
    if not quotations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quotations found for RFQ {rfq_id}.",
        )
    supplier_ids = list({q.supplier_id for q in quotations})
    s_result = await db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids)))
    suppliers = s_result.scalars().all()
    return quotations, suppliers


async def _save_scores(
    rfq_id: int,
    rankings: list,
    criteria_weights: dict,
    db: AsyncSession,
):
    # Clear previous scores for this RFQ
    await db.execute(delete(SupplierScore).where(SupplierScore.rfq_id == rfq_id))
    for item in rankings:
        score = SupplierScore(
            rfq_id=rfq_id,
            supplier_id=item["supplier_id"],
            ahp_score=item["ahp_score"],
            price_score=item["price_score"],
            quality_score=item["quality_score"],
            delivery_score=item["delivery_score"],
            esg_score=item["esg_score"],
            rank_position=item["rank"],
            criteria_weights=criteria_weights,
        )
        db.add(score)


async def _write_logs(
    rfq_id: int,
    execution_time: float,
    output_data: dict,
    db: AsyncSession,
):
    db.add(AuditLog(
        event_type="ahp_calculated",
        event_description=f"AHP scoring calculated for RFQ {rfq_id}",
        rfq_id=rfq_id,
        agent_name="AHPDecisionAgent",
        data_snapshot=output_data,
    ))
    db.add(AgentLog(
        agent_name="AHPDecisionAgent",
        rfq_id=rfq_id,
        status=AgentStatus.completed,
        execution_time_seconds=round(execution_time, 4),
        output_data=output_data,
    ))


@router.post("/calculate", response_model=AHPResponse)
async def calculate_ahp(
    payload: AHPCalculateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    start = time.perf_counter()

    quotations, suppliers = await _fetch_quotations_and_suppliers(payload.rfq_id, db)

    # Map template keys (delivery) → engine keys (delivery_time)
    weights_mapped = {
        ("delivery_time" if k == "delivery" else k): v
        for k, v in payload.criteria_weights.items()
    }

    suppliers_data = build_suppliers_data(quotations, suppliers)
    rankings_raw = calculate_ahp_scores(suppliers_data, weights_mapped)

    await _save_scores(payload.rfq_id, rankings_raw, payload.criteria_weights, db)

    elapsed = time.perf_counter() - start
    await _write_logs(payload.rfq_id, elapsed, {"rankings": rankings_raw}, db)
    await db.commit()

    return AHPResponse(
        rfq_id=payload.rfq_id,
        criteria_weights=payload.criteria_weights,
        rankings=[AHPResult(**r) for r in rankings_raw],
        total_suppliers=len(rankings_raw),
    )


@router.post("/pairwise", response_model=AHPPairwiseResponse)
async def calculate_pairwise(
    payload: AHPPairwiseRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    start = time.perf_counter()
    matrix = payload.pairwise_matrix
    criteria = payload.criteria

    if len(matrix) != len(criteria) or any(len(row) != len(criteria) for row in matrix):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pairwise_matrix dimensions must match the number of criteria.",
        )

    norm = normalize_matrix(matrix)
    weights_list = calculate_weights(norm)
    cr_result = calculate_consistency_ratio(matrix, weights_list)

    if not cr_result["is_consistent"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Pairwise matrix is inconsistent",
                "CR": cr_result["CR"],
                "message": "Please revise your comparisons. CR must be less than 0.10",
            },
        )

    criteria_weights = {c: round(w, 4) for c, w in zip(criteria, weights_list)}

    quotations, suppliers = await _fetch_quotations_and_suppliers(payload.rfq_id, db)

    weights_mapped = {
        ("delivery_time" if k == "delivery" else k): v
        for k, v in criteria_weights.items()
    }

    suppliers_data = build_suppliers_data(quotations, suppliers)
    rankings_raw = calculate_ahp_scores(suppliers_data, weights_mapped)

    await _save_scores(payload.rfq_id, rankings_raw, criteria_weights, db)

    elapsed = time.perf_counter() - start
    await _write_logs(payload.rfq_id, elapsed, {"rankings": rankings_raw, "consistency": cr_result}, db)
    await db.commit()

    return AHPPairwiseResponse(
        rfq_id=payload.rfq_id,
        criteria_weights=criteria_weights,
        consistency=cr_result,
        rankings=[AHPResult(**r) for r in rankings_raw],
        total_suppliers=len(rankings_raw),
    )


@router.get("/results/{rfq_id}")
async def get_ahp_results(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SupplierScore)
        .where(SupplierScore.rfq_id == rfq_id)
        .order_by(SupplierScore.rank_position)
    )
    scores = result.scalars().all()
    if not scores:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No AHP results found for RFQ {rfq_id}. Run /ahp/calculate first.",
        )

    supplier_ids = [s.supplier_id for s in scores]
    s_result = await db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids)))
    sup_map = {s.id: s.name for s in s_result.scalars().all()}

    return {
        "rfq_id": rfq_id,
        "total_suppliers": len(scores),
        "criteria_weights": scores[0].criteria_weights if scores else {},
        "rankings": [
            {
                "supplier_id": s.supplier_id,
                "supplier_name": sup_map.get(s.supplier_id, ""),
                "ahp_score": s.ahp_score,
                "price_score": s.price_score,
                "quality_score": s.quality_score,
                "delivery_score": s.delivery_score,
                "esg_score": s.esg_score,
                "rank": s.rank_position,
                "criteria_weights": s.criteria_weights,
                "created_at": s.created_at,
            }
            for s in scores
        ],
    }
