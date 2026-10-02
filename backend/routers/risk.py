import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.agent_log import AgentLog, AgentStatus
from models.audit_log import AuditLog
from models.compliance_certificate import ComplianceCertificate
from models.delivery_record import DeliveryRecord
from models.quotation import Quotation
from models.risk_report import RiskReport, RiskCategory
from models.supplier import Supplier
from models.user import User
from schemas.risk import (
    RiskReport as RiskReportSchema,
    RiskHeatmapData,
    RiskHeatmapSupplier,
    RiskAlert,
    RecalculateAllResponse,
)
from utils.auth import get_current_user
from utils.risk_engine import (
    calculate_financial_risk,
    calculate_compliance_risk,
    calculate_delivery_risk,
    calculate_country_risk,
    calculate_esg_risk,
    calculate_fraud_risk,
    calculate_composite_risk,
    get_risk_category,
    generate_risk_narrative,
)

router = APIRouter(prefix="/risk", tags=["Risk Intelligence"])


async def _run_risk_analysis(supplier: Supplier, db: AsyncSession, rfq_id: int = None) -> dict:
    certs_result = await db.execute(
        select(ComplianceCertificate).where(ComplianceCertificate.supplier_id == supplier.id)
    )
    certificates = certs_result.scalars().all()

    delivery_result = await db.execute(
        select(DeliveryRecord).where(DeliveryRecord.supplier_id == supplier.id)
    )
    delivery_records = delivery_result.scalars().all()

    financial = calculate_financial_risk(supplier)
    compliance = calculate_compliance_risk(certificates)
    delivery = calculate_delivery_risk(delivery_records)
    country = calculate_country_risk(supplier.country or "")
    esg = calculate_esg_risk(supplier, certificates)
    fraud = calculate_fraud_risk(supplier)
    composite = calculate_composite_risk(financial, compliance, delivery, country, esg, fraud)
    category = get_risk_category(composite)

    scores = {
        "financial": financial,
        "compliance": compliance,
        "delivery": delivery,
        "country": country,
        "esg": esg,
        "fraud": fraud,
        "composite": composite,
    }
    narrative = generate_risk_narrative(supplier.name, scores)

    return {
        "supplier_id": supplier.id,
        "supplier_name": supplier.name,
        "rfq_id": rfq_id,
        "financial_risk": financial,
        "compliance_risk": compliance,
        "delivery_risk": delivery,
        "country_risk": country,
        "esg_risk": esg,
        "fraud_risk": fraud,
        "composite_risk_score": composite,
        "risk_category": category,
        "risk_narrative": narrative,
    }


async def _save_risk_report(data: dict, db: AsyncSession) -> RiskReport:
    existing = await db.execute(
        select(RiskReport).where(RiskReport.supplier_id == data["supplier_id"])
        .order_by(RiskReport.created_at.desc())
        .limit(1)
    )
    report = RiskReport(
        supplier_id=data["supplier_id"],
        rfq_id=data.get("rfq_id"),
        financial_risk=data["financial_risk"],
        compliance_risk=data["compliance_risk"],
        delivery_risk=data["delivery_risk"],
        country_risk=data["country_risk"],
        esg_risk=data["esg_risk"],
        fraud_risk=data["fraud_risk"],
        composite_risk_score=data["composite_risk_score"],
        risk_category=RiskCategory(data["risk_category"]),
        risk_narrative=data["risk_narrative"],
    )
    db.add(report)
    return report


@router.post("/analyze/{supplier_id}", response_model=RiskReportSchema)
async def analyze_supplier_risk(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = time.perf_counter()

    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Supplier {supplier_id} not found")

    data = await _run_risk_analysis(supplier, db)
    report = await _save_risk_report(data, db)

    elapsed = time.perf_counter() - start

    db.add(AuditLog(
        event_type="risk_analyzed",
        event_description=f"Risk analysis completed for supplier {supplier_id}",
        supplier_id=supplier_id,
        user_id=current_user.id,
        agent_name="RiskAnalysisAgent",
        data_snapshot={"composite_risk_score": data["composite_risk_score"], "risk_category": data["risk_category"]},
    ))
    db.add(AgentLog(
        agent_name="RiskAnalysisAgent",
        status=AgentStatus.completed,
        execution_time_seconds=round(elapsed, 4),
        output_data=data,
    ))

    await db.commit()
    await db.refresh(report)

    return RiskReportSchema(
        id=report.id,
        created_at=report.created_at,
        **data,
    )


@router.post("/analyze-rfq/{rfq_id}", response_model=List[RiskReportSchema])
async def analyze_rfq_risk(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    quotations = q_result.scalars().all()
    if not quotations:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No quotations found for RFQ {rfq_id}")

    supplier_ids = list({q.supplier_id for q in quotations})
    s_result = await db.execute(select(Supplier).where(Supplier.id.in_(supplier_ids)))
    suppliers = s_result.scalars().all()

    results = []
    for supplier in suppliers:
        data = await _run_risk_analysis(supplier, db, rfq_id=rfq_id)
        report = await _save_risk_report(data, db)
        await db.flush()
        await db.refresh(report)
        results.append(RiskReportSchema(
            id=report.id,
            created_at=report.created_at,
            **data,
        ))

    db.add(AuditLog(
        event_type="risk_analyzed",
        event_description=f"Bulk risk analysis for RFQ {rfq_id}",
        rfq_id=rfq_id,
        user_id=current_user.id,
        agent_name="RiskAnalysisAgent",
        data_snapshot={"supplier_count": len(results)},
    ))
    await db.commit()

    return sorted(results, key=lambda r: r.composite_risk_score, reverse=True)


@router.get("/report/{supplier_id}", response_model=RiskReportSchema)
async def get_risk_report(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RiskReport, Supplier)
        .join(Supplier, RiskReport.supplier_id == Supplier.id)
        .where(RiskReport.supplier_id == supplier_id)
        .order_by(RiskReport.created_at.desc())
        .limit(1)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No risk report found for supplier {supplier_id}")

    report, supplier = row
    return RiskReportSchema(
        id=report.id,
        supplier_id=report.supplier_id,
        supplier_name=supplier.name,
        rfq_id=report.rfq_id,
        financial_risk=report.financial_risk,
        compliance_risk=report.compliance_risk,
        delivery_risk=report.delivery_risk,
        country_risk=report.country_risk,
        esg_risk=report.esg_risk,
        fraud_risk=report.fraud_risk,
        composite_risk_score=report.composite_risk_score,
        risk_category=report.risk_category.value,
        risk_narrative=report.risk_narrative,
        created_at=report.created_at,
    )


@router.get("/rfq/{rfq_id}", response_model=RiskHeatmapData)
async def get_rfq_risk_heatmap(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    quotations = q_result.scalars().all()
    if not quotations:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No quotations found for RFQ {rfq_id}")

    supplier_ids = list({q.supplier_id for q in quotations})

    rows_result = await db.execute(
        select(RiskReport, Supplier)
        .join(Supplier, RiskReport.supplier_id == Supplier.id)
        .where(RiskReport.supplier_id.in_(supplier_ids))
        .order_by(RiskReport.supplier_id, RiskReport.created_at.desc())
    )
    rows = rows_result.all()

    seen = set()
    suppliers_data = []
    for report, supplier in rows:
        if supplier.id in seen:
            continue
        seen.add(supplier.id)
        suppliers_data.append(RiskHeatmapSupplier(
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            financial_risk=report.financial_risk or 0,
            compliance_risk=report.compliance_risk or 0,
            delivery_risk=report.delivery_risk or 0,
            country_risk=report.country_risk or 0,
            esg_risk=report.esg_risk or 0,
            fraud_risk=report.fraud_risk or 0,
            composite_risk_score=report.composite_risk_score or 0,
            risk_category=report.risk_category.value,
            risk_narrative=report.risk_narrative,
        ))

    return RiskHeatmapData(rfq_id=rfq_id, suppliers=suppliers_data)


@router.get("/alerts", response_model=List[RiskAlert])
async def get_risk_alerts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows_result = await db.execute(
        select(RiskReport, Supplier)
        .join(Supplier, RiskReport.supplier_id == Supplier.id)
        .where(RiskReport.composite_risk_score > 60)
        .order_by(RiskReport.composite_risk_score.desc())
    )
    rows = rows_result.all()

    seen = set()
    alerts = []
    for report, supplier in rows:
        if supplier.id in seen:
            continue
        seen.add(supplier.id)

        # Determine primary risk reason from highest dimension
        dims = {
            "financial": report.financial_risk or 0,
            "compliance": report.compliance_risk or 0,
            "delivery": report.delivery_risk or 0,
            "country": report.country_risk or 0,
            "esg": report.esg_risk or 0,
            "fraud": report.fraud_risk or 0,
        }
        primary = max(dims, key=dims.get)

        alerts.append(RiskAlert(
            supplier_id=supplier.id,
            supplier_name=supplier.name,
            composite_risk_score=report.composite_risk_score,
            risk_category=report.risk_category.value,
            primary_risk_reason=f"High {primary} risk ({dims[primary]:.0f})",
            created_at=report.created_at,
        ))

    return alerts


@router.post("/recalculate-all", response_model=RecalculateAllResponse)
async def recalculate_all_risk(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s_result = await db.execute(select(Supplier))
    suppliers = s_result.scalars().all()

    recalculated = 0
    high_risk = 0
    critical_risk = 0

    for supplier in suppliers:
        try:
            data = await _run_risk_analysis(supplier, db)
            await _save_risk_report(data, db)
            recalculated += 1
            if data["risk_category"] == "critical":
                critical_risk += 1
            elif data["risk_category"] == "high":
                high_risk += 1
        except Exception:
            pass

    await db.commit()

    return RecalculateAllResponse(
        total_suppliers=len(suppliers),
        recalculated=recalculated,
        high_risk_found=high_risk,
        critical_risk_found=critical_risk,
    )
