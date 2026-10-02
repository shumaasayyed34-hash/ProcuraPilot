import time
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.mongodb import get_mongo_db
from database.postgres import get_db
from models.agent_log import AgentLog, AgentStatus
from models.audit_log import AuditLog
from models.market_data import MarketData
from models.quotation import Quotation
from models.rfq import RFQ
from models.supplier import Supplier
from models.user import User
from schemas.market import (
    BenchmarkReport,
    MarketPrice,
    OverpricedReport,
    OverpricedSupplier,
    PriceForecast,
)
from utils.auth import get_current_user
from utils.market_engine import (
    benchmark_rfq_quotations,
    generate_price_forecast,
    get_market_price,
)

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/price/{commodity}", response_model=dict)
async def get_commodity_price(
    commodity: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    price_data = get_market_price(commodity)
    forecast_data = generate_price_forecast(commodity)

    db.add(MarketData(
        commodity_name=commodity.lower(),
        unit=price_data["unit"],
        price=price_data["price"],
        currency=price_data["currency"],
        source=price_data["source"],
        price_date=date.today(),
    ))
    await db.commit()

    return {**price_data, **forecast_data}


@router.get("/forecast/{commodity}", response_model=PriceForecast)
async def get_commodity_forecast(
    commodity: str,
    _: User = Depends(get_current_user),
):
    return generate_price_forecast(commodity)


@router.post("/benchmark/{rfq_id}", response_model=BenchmarkReport)
async def run_benchmark(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = time.perf_counter()

    rfq_result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = rfq_result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"RFQ {rfq_id} not found")

    q_result = await db.execute(
        select(Quotation, Supplier)
        .join(Supplier, Quotation.supplier_id == Supplier.id)
        .where(Quotation.rfq_id == rfq_id)
    )
    rows = q_result.all()
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No quotations found for RFQ {rfq_id}")

    quotations_data = [
        {
            "supplier_id": supplier.id,
            "supplier_name": supplier.name,
            "unit_price": quotation.unit_price or 0,
        }
        for quotation, supplier in rows
    ]

    category = rfq.category or "default"
    benchmark = benchmark_rfq_quotations(category, quotations_data)

    mongo_db = get_mongo_db()
    await mongo_db["market_benchmarks"].insert_one({
        "rfq_id": rfq_id,
        "benchmark_data": benchmark,
        "created_at": datetime.now(timezone.utc),
    })

    elapsed = time.perf_counter() - start

    db.add(AuditLog(
        event_type="market_benchmarked",
        event_description=f"Market benchmark completed for RFQ {rfq_id}",
        rfq_id=rfq_id,
        user_id=current_user.id,
        agent_name="MarketIntelligenceAgent",
        data_snapshot={"rfq_category": category, "market_price": benchmark["market_price"]},
    ))
    db.add(AgentLog(
        agent_name="MarketIntelligenceAgent",
        rfq_id=rfq_id,
        status=AgentStatus.completed,
        execution_time_seconds=round(elapsed, 4),
        output_data=benchmark,
    ))
    await db.commit()

    return BenchmarkReport(**benchmark)


@router.get("/benchmark/{rfq_id}", response_model=BenchmarkReport)
async def get_benchmark(
    rfq_id: int,
    _: User = Depends(get_current_user),
):
    mongo_db = get_mongo_db()
    doc = await mongo_db["market_benchmarks"].find_one(
        {"rfq_id": rfq_id},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No benchmark found for RFQ {rfq_id}")
    return BenchmarkReport(**doc["benchmark_data"])


@router.get("/overpriced/{rfq_id}", response_model=OverpricedReport)
async def get_overpriced_suppliers(
    rfq_id: int,
    _: User = Depends(get_current_user),
):
    mongo_db = get_mongo_db()
    doc = await mongo_db["market_benchmarks"].find_one(
        {"rfq_id": rfq_id},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No benchmark found for RFQ {rfq_id}. Run POST /market/benchmark/{rfq_id} first.")

    benchmark = doc["benchmark_data"]
    market_price = benchmark["market_price"]
    recommended_target = round(market_price * 1.05, 2)

    overpriced = [
        OverpricedSupplier(
            supplier_name=s["supplier_name"],
            quoted_price=s["quoted_price"],
            deviation_percentage=s["deviation_percentage"],
            potential_saving=round(s["quoted_price"] - recommended_target, 2),
            recommended_target=recommended_target,
        )
        for s in benchmark["supplier_benchmarks"]
        if s["is_overpriced"]
    ]

    return OverpricedReport(rfq_id=rfq_id, market_price=market_price, overpriced_suppliers=overpriced)
