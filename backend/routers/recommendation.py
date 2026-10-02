import time
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from database.mongodb import get_mongo_db
from database.postgres import get_db
from models.agent_log import AgentLog, AgentStatus
from models.audit_log import AuditLog
from models.quotation import Quotation
from models.rfq import RFQ, RFQStatus
from models.risk_report import RiskReport
from models.supplier import Supplier
from models.supplier_score import SupplierScore
from models.user import User
from schemas.recommendation import (
    ApproveVendorRequest,
    CompareResponse,
    CompareSupplier,
    RecommendationResponse,
    SupplierRank,
)
from utils.auth import get_current_user
from utils.recommendation_engine import (
    calculate_savings_estimate,
    generate_recommendation_rationale,
    rank_suppliers,
)

router = APIRouter(prefix="/recommendation", tags=["Recommendation Engine"])


async def _build_suppliers_data(rfq_id: int, db: AsyncSession) -> list:
    # AHP scores
    ahp_result = await db.execute(
        select(SupplierScore).where(SupplierScore.rfq_id == rfq_id)
    )
    ahp_scores = ahp_result.scalars().all()
    if not ahp_scores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete AHP scoring first. Run POST /api/v1/ahp/calculate",
        )

    supplier_ids = [s.supplier_id for s in ahp_scores]

    # Risk reports (latest per supplier)
    risk_result = await db.execute(
        select(RiskReport)
        .where(RiskReport.supplier_id.in_(supplier_ids))
        .order_by(RiskReport.supplier_id, RiskReport.created_at.desc())
    )
    risk_rows = risk_result.scalars().all()
    risk_map: dict = {}
    for r in risk_rows:
        if r.supplier_id not in risk_map:
            risk_map[r.supplier_id] = r

    if not risk_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete Risk Analysis first. Run POST /api/v1/risk/analyze-rfq/{rfq_id}",
        )

    # Supplier names
    sup_result = await db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids)))
    sup_map = {s.id: s for s in sup_result.scalars().all()}

    # Quotations for prices
    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    q_rows = q_result.scalars().all()
    price_map = {q.supplier_id: q.unit_price or 0 for q in q_rows}

    # Market benchmark from MongoDB
    mongo_db = get_mongo_db()
    benchmark_doc = await mongo_db["market_benchmarks"].find_one(
        {"rfq_id": rfq_id}, sort=[("created_at", -1)]
    )
    if not benchmark_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete Market Benchmarking first. Run POST /api/v1/market/benchmark/{rfq_id}",
        )

    # Build deviation map from benchmark
    deviation_map: dict = {}
    for sb in benchmark_doc["benchmark_data"].get("supplier_benchmarks", []):
        sid = sb.get("supplier_id")
        if sid:
            deviation_map[sid] = sb.get("deviation_percentage", 0)

    suppliers_data = []
    for ahp in ahp_scores:
        sid = ahp.supplier_id
        risk = risk_map.get(sid)
        supplier = sup_map.get(sid)
        suppliers_data.append({
            "supplier_id": sid,
            "supplier_name": supplier.name if supplier else str(sid),
            "ahp_score": ahp.ahp_score or 0,
            "risk_score": risk.composite_risk_score if risk else 50,
            "risk_category": risk.risk_category.value if risk else "medium",
            "market_deviation": deviation_map.get(sid, 0),
            "quoted_price": price_map.get(sid, 0),
        })

    return suppliers_data


@router.post("/generate/{rfq_id}", response_model=RecommendationResponse)
async def generate_recommendation(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = time.perf_counter()

    rfq_result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = rfq_result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"RFQ {rfq_id} not found")

    suppliers_data = await _build_suppliers_data(rfq_id, db)
    ranked = rank_suppliers(suppliers_data)

    eligible = [s for s in ranked if not s.get("excluded")]
    winner = eligible[0] if eligible else None

    mongo_db = get_mongo_db()
    benchmark_doc = await mongo_db["market_benchmarks"].find_one(
        {"rfq_id": rfq_id}, sort=[("created_at", -1)]
    )
    market_data = benchmark_doc["benchmark_data"] if benchmark_doc else {}

    rationale = generate_recommendation_rationale(winner, ranked, market_data) if winner else {}
    savings = calculate_savings_estimate(winner, ranked) if winner else {}

    generated_at = datetime.now(timezone.utc).isoformat()

    rec_doc = {
        "rfq_id": rfq_id,
        "winner_supplier_id": winner["supplier_id"] if winner else None,
        "winner_supplier_name": winner["supplier_name"] if winner else None,
        "rankings": ranked,
        "rationale": rationale,
        "savings_estimate": savings,
        "generated_at": generated_at,
    }

    await mongo_db["recommendations"].update_one(
        {"rfq_id": rfq_id},
        {"$set": rec_doc},
        upsert=True,
    )

    # Update RFQ status
    await db.execute(
        update(RFQ).where(RFQ.id == rfq_id).values(status=RFQStatus.under_comparison)
    )

    elapsed = time.perf_counter() - start
    db.add(AuditLog(
        event_type="recommendation_generated",
        event_description=f"Recommendation generated for RFQ {rfq_id}",
        rfq_id=rfq_id,
        user_id=current_user.id,
        agent_name="RecommendationAgent",
        data_snapshot={"winner": winner["supplier_name"] if winner else None},
    ))
    db.add(AgentLog(
        agent_name="RecommendationAgent",
        rfq_id=rfq_id,
        status=AgentStatus.completed,
        execution_time_seconds=round(elapsed, 4),
        output_data={"winner": winner["supplier_name"] if winner else None, "total_ranked": len(ranked)},
    ))
    await db.commit()

    return RecommendationResponse(
        rfq_id=rfq_id,
        winner_supplier_id=winner["supplier_id"] if winner else None,
        winner_supplier_name=winner["supplier_name"] if winner else None,
        rankings=[SupplierRank(**s) for s in ranked],
        rationale=rationale,
        savings_estimate=savings,
        generated_at=generated_at,
    )


@router.get("/{rfq_id}", response_model=RecommendationResponse)
async def get_recommendation(
    rfq_id: int,
    _: User = Depends(get_current_user),
):
    mongo_db = get_mongo_db()
    doc = await mongo_db["recommendations"].find_one({"rfq_id": rfq_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No recommendation found for RFQ {rfq_id}. Run POST /recommendation/generate/{rfq_id} first.",
        )

    return RecommendationResponse(
        rfq_id=doc["rfq_id"],
        winner_supplier_id=doc.get("winner_supplier_id"),
        winner_supplier_name=doc.get("winner_supplier_name"),
        rankings=[SupplierRank(**s) for s in doc.get("rankings", [])],
        rationale=doc.get("rationale", {}),
        savings_estimate=doc.get("savings_estimate", {}),
        generated_at=doc.get("generated_at"),
    )


@router.post("/approve/{rfq_id}")
async def approve_vendor(
    rfq_id: int,
    payload: ApproveVendorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq_result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = rfq_result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"RFQ {rfq_id} not found")

    sup_result = await db.execute(select(Supplier).where(Supplier.id == payload.approved_supplier_id))
    supplier = sup_result.scalar_one_or_none()
    supplier_name = supplier.name if supplier else str(payload.approved_supplier_id)

    await db.execute(update(RFQ).where(RFQ.id == rfq_id).values(status=RFQStatus.completed))

    db.add(AuditLog(
        event_type="vendor_approved",
        event_description=f"Vendor {supplier_name} approved for RFQ {rfq_id}",
        rfq_id=rfq_id,
        supplier_id=payload.approved_supplier_id,
        user_id=current_user.id,
        agent_name="RecommendationAgent",
        data_snapshot={"approved_supplier_id": payload.approved_supplier_id, "notes": payload.approval_notes},
    ))
    await db.commit()

    return {
        "status": "approved",
        "rfq_id": rfq_id,
        "approved_supplier_id": payload.approved_supplier_id,
        "approved_supplier_name": supplier_name,
        "approval_notes": payload.approval_notes,
        "next_steps": (
            f"Vendor {supplier_name} has been approved. "
            "Next steps: (1) Issue Purchase Order, "
            "(2) Share PO with supplier for confirmation, "
            "(3) Track delivery milestones."
        ),
    }


@router.get("/compare/{rfq_id}", response_model=CompareResponse)
async def compare_suppliers(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        suppliers_data = await _build_suppliers_data(rfq_id, db)
    except HTTPException:
        raise

    ranked = rank_suppliers(suppliers_data)

    return CompareResponse(
        rfq_id=rfq_id,
        suppliers=[
            CompareSupplier(
                supplier_id=s["supplier_id"],
                supplier_name=s["supplier_name"],
                ahp_score=s["ahp_score"],
                risk_score=s["risk_score"],
                risk_category=s["risk_category"],
                market_deviation=s["market_deviation"],
                quoted_price=s["quoted_price"],
                recommendation_score=s["recommendation_score"],
                rank=s.get("rank"),
                excluded=s.get("excluded", False),
            )
            for s in ranked
        ],
    )
