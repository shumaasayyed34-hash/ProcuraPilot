from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.postgres import get_db
from models.rfq import RFQ, RFQStatus
from models.rfq_item import RFQItem
from models.rfq_supplier import RFQSupplier, RFQSupplierStatus
from models.supplier import Supplier
from models.quotation import Quotation
from models.user import User
from schemas.rfq import (
    RFQCreate,
    RFQUpdate,
    RFQResponse,
    RFQOptionsResponse,
    SupplierOption,
    RFQItemResponse,
    RFQSupplierResponse,
)
from schemas.quotation import QuotationResponse
from services.pdf_generator import generate_rfq_pdf
from utils.auth import get_current_user_optional

router = APIRouter(prefix="/rfqs", tags=["RFQs"])


DEFAULT_CATEGORIES = [
    "Precision Engineering & Mechanical Components",
    "Heavy Machinery & Industrial Equipment",
    "High-Temperature Sensors & Transducers",
    "Polymers & Injection Molded Thermoplastics",
    "Electronic Assemblies & Semiconductors",
    "Raw Metals, Castings & Forgings",
]

DEFAULT_CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "SGD"]
DEFAULT_UNITS = ["EACH", "PCS", "SETS", "LOT", "METRIC_TON", "KG", "METERS"]
DEFAULT_PAYMENT_TERMS = [
    "Net 30 Days",
    "Net 45 Days",
    "Net 60 Days",
    "100% Advance",
    "30% Advance, 70% Upon Dispatch",
    "Letter of Credit (LC)",
]
DEFAULT_DISPATCH_METHODS = ["Ocean Freight", "Air Cargo", "Road Freight Express", "Rail Freight"]
DEFAULT_SHIPMENT_TYPES = ["FCL (Full Container)", "LCL (Less Container)", "Bulk Freight", "Courier Express"]


async def _generate_unique_rfq_number(db: AsyncSession) -> str:
    """Generates an incremental unique RFQ number: RFQ-YYYY-NNNN."""
    current_year = datetime.now(timezone.utc).year
    prefix = f"RFQ-{current_year}-"

    # Find highest sequence for the current year
    result = await db.execute(
        select(RFQ.rfq_number).where(RFQ.rfq_number.like(f"{prefix}%"))
    )
    existing_numbers = result.scalars().all()
    highest_seq = 0
    for num in existing_numbers:
        try:
            seq = int(num.split("-")[-1])
            if seq > highest_seq:
                highest_seq = seq
        except (ValueError, IndexError):
            continue

    next_seq = highest_seq + 1
    return f"{prefix}{next_seq:04d}"


async def _ensure_seed_suppliers(db: AsyncSession) -> List[Supplier]:
    """Ensures standard demo suppliers exist so buyers can immediately invite them."""
    result = await db.execute(select(Supplier))
    suppliers = result.scalars().all()
    if suppliers:
        return suppliers

    demo_suppliers = [
        Supplier(
            name="Apex Motion & Components Pvt Ltd",
            email="sales@apexmotion.in",
            phone="+91 22 6821 4400",
            address="Plot 42, MIDC Industrial Area, Pune, Maharashtra",
            country="India",
            gstin="27AAACA9921D1Z4",
            iso_certified=True,
            years_in_business=12,
            annual_revenue=85000000.0,
        ),
        Supplier(
            name="Schneider & Bauer Automation GmbH",
            email="quotes@schneider-bauer.de",
            phone="+49 711 9283 0",
            address="Industriestrasse 18, 70174 Stuttgart",
            country="Germany",
            iso_certified=True,
            years_in_business=28,
            annual_revenue=420000000.0,
        ),
        Supplier(
            name="Vanguard Precision Dynamics Inc",
            email="bids@vanguardprecision.com",
            phone="+1 312 555 0199",
            address="1400 Industrial Blvd, Chicago, IL 60607",
            country="USA",
            iso_certified=True,
            years_in_business=16,
            annual_revenue=190000000.0,
        ),
        Supplier(
            name="Sterling Precision Solutions Pvt Ltd",
            email="contact@sterlingprecision.in",
            phone="+91 44 2811 7733",
            address="Phase II, Ambattur Industrial Estate, Chennai, Tamil Nadu",
            country="India",
            iso_certified=True,
            years_in_business=9,
            annual_revenue=45000000.0,
        ),
    ]
    for s in demo_suppliers:
        db.add(s)
    await db.commit()
    for s in demo_suppliers:
        await db.refresh(s)
    return demo_suppliers


def _build_rfq_response(rfq: RFQ, quotations_count: int = 0) -> RFQResponse:
    item_responses = [RFQItemResponse.model_validate(itm) for itm in (rfq.items or [])]
    supplier_responses = []
    for rfq_sup in rfq.invited_suppliers or []:
        sup_name = rfq_sup.supplier.name if rfq_sup.supplier else None
        supplier_responses.append(
            RFQSupplierResponse(
                id=rfq_sup.id,
                rfq_id=rfq_sup.rfq_id,
                supplier_id=rfq_sup.supplier_id,
                supplier_name=sup_name,
                status=rfq_sup.status,
                invited_at=rfq_sup.invited_at,
                responded_at=rfq_sup.responded_at,
            )
        )

    return RFQResponse(
        id=rfq.id,
        rfq_number=rfq.rfq_number,
        title=rfq.title,
        description=rfq.description,
        category=rfq.category,
        budget=rfq.budget,
        currency=rfq.currency or "INR",
        rfq_date=rfq.rfq_date,
        submission_deadline=rfq.submission_deadline,
        required_delivery_date=rfq.required_delivery_date,
        buyer_company=rfq.buyer_company,
        buyer_address=rfq.buyer_address,
        buyer_contact_person=rfq.buyer_contact_person,
        buyer_email=rfq.buyer_email,
        buyer_phone=rfq.buyer_phone,
        payment_terms=rfq.payment_terms,
        dispatch_method=rfq.dispatch_method,
        shipment_type=rfq.shipment_type,
        port_of_loading=rfq.port_of_loading,
        port_of_discharge=rfq.port_of_discharge,
        delivery_location=rfq.delivery_location,
        additional_terms=rfq.additional_terms,
        status=rfq.status,
        created_by=rfq.created_by,
        created_at=rfq.created_at,
        updated_at=rfq.updated_at,
        items=item_responses,
        invited_suppliers=supplier_responses,
        quotations_count=quotations_count,
        invited_count=len(supplier_responses),
    )


@router.get("/options", response_model=RFQOptionsResponse)
async def get_rfq_options(
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Returns suppliers and options for the RFQ creation intake form."""
    suppliers = await _ensure_seed_suppliers(db)
    supplier_options = [SupplierOption.model_validate(s) for s in suppliers]

    return RFQOptionsResponse(
        suppliers=supplier_options,
        categories=DEFAULT_CATEGORIES,
        currencies=DEFAULT_CURRENCIES,
        units=DEFAULT_UNITS,
        payment_terms_options=DEFAULT_PAYMENT_TERMS,
        dispatch_methods=DEFAULT_DISPATCH_METHODS,
        shipment_types=DEFAULT_SHIPMENT_TYPES,
    )


@router.post("/", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
async def create_rfq(
    payload: RFQCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Creates a new RFQ, its line items, and supplier invitations in a single transaction."""
    # Strict validation if generating and publishing immediately
    if payload.generate:
        if not payload.title or not payload.title.strip():
            raise HTTPException(status_code=400, detail="RFQ Title is required to publish.")
        if not payload.items:
            raise HTTPException(status_code=400, detail="At least one RFQ line item is required.")
        if not payload.supplier_ids:
            raise HTTPException(status_code=400, detail="Please select at least one supplier to invite.")

    # Generate unique RFQ number if published or if requested
    rfq_number = None
    initial_status = RFQStatus.draft
    if payload.generate:
        rfq_number = await _generate_unique_rfq_number(db)
        initial_status = RFQStatus.active

    # Create RFQ parent
    rfq = RFQ(
        rfq_number=rfq_number,
        title=payload.title.strip(),
        description=payload.description,
        category=payload.category,
        budget=payload.budget,
        currency=payload.currency or "INR",
        rfq_date=payload.rfq_date or datetime.now(timezone.utc).date(),
        submission_deadline=payload.submission_deadline,
        required_delivery_date=payload.required_delivery_date,
        buyer_company=payload.buyer_company,
        buyer_address=payload.buyer_address,
        buyer_contact_person=payload.buyer_contact_person,
        buyer_email=payload.buyer_email,
        buyer_phone=payload.buyer_phone,
        payment_terms=payload.payment_terms,
        dispatch_method=payload.dispatch_method,
        shipment_type=payload.shipment_type,
        port_of_loading=payload.port_of_loading,
        port_of_discharge=payload.port_of_discharge,
        delivery_location=payload.delivery_location,
        additional_terms=payload.additional_terms,
        status=initial_status,
        created_by=current_user.id if current_user else None,
        quantity=payload.quantity,
        unit=payload.unit,
    )
    db.add(rfq)
    await db.flush()  # assign rfq.id for child records

    # Add Line Items
    for item in payload.items:
        rfq_item = RFQItem(
            rfq_id=rfq.id,
            product_code=item.product_code.strip(),
            description=item.description.strip(),
            quantity=item.quantity,
            unit=item.unit.strip().upper(),
        )
        db.add(rfq_item)

    # Add Invited Suppliers (deduplicated)
    unique_supplier_ids = set(payload.supplier_ids)
    for sup_id in unique_supplier_ids:
        # Verify supplier exists
        sup_res = await db.execute(select(Supplier).where(Supplier.id == sup_id))
        if sup_res.scalar_one_or_none():
            rfq_sup = RFQSupplier(
                rfq_id=rfq.id,
                supplier_id=sup_id,
                status=RFQSupplierStatus.invited,
            )
            db.add(rfq_sup)

    await db.commit()

    # Re-fetch full RFQ with relationships
    stmt = (
        select(RFQ)
        .where(RFQ.id == rfq.id)
        .options(
            selectinload(RFQ.items),
            selectinload(RFQ.invited_suppliers).selectinload(RFQSupplier.supplier),
        )
    )
    res = await db.execute(stmt)
    full_rfq = res.scalar_one()

    return _build_rfq_response(full_rfq, quotations_count=0)


@router.get("/", response_model=List[RFQResponse])
async def list_rfqs(
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[RFQStatus] = None,
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Lists RFQs with real bids count and invited suppliers count."""
    stmt = (
        select(RFQ)
        .options(
            selectinload(RFQ.items),
            selectinload(RFQ.invited_suppliers).selectinload(RFQSupplier.supplier),
        )
        .order_by(RFQ.id.desc())
    )
    if status_filter:
        stmt = stmt.where(RFQ.status == status_filter)

    result = await db.execute(stmt.offset(skip).limit(limit))
    rfq_list = result.scalars().all()

    responses = []
    for rfq in rfq_list:
        # Count quotations linked to this RFQ
        q_count_res = await db.execute(
            select(func.count(Quotation.id)).where(Quotation.rfq_id == rfq.id)
        )
        q_count = q_count_res.scalar() or 0
        responses.append(_build_rfq_response(rfq, quotations_count=q_count))

    return responses


@router.get("/{rfq_id}", response_model=RFQResponse)
async def get_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Returns single RFQ with line items and invited suppliers."""
    stmt = (
        select(RFQ)
        .where(RFQ.id == rfq_id)
        .options(
            selectinload(RFQ.items),
            selectinload(RFQ.invited_suppliers).selectinload(RFQSupplier.supplier),
        )
    )
    result = await db.execute(stmt)
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    q_count_res = await db.execute(
        select(func.count(Quotation.id)).where(Quotation.rfq_id == rfq.id)
    )
    q_count = q_count_res.scalar() or 0

    return _build_rfq_response(rfq, quotations_count=q_count)


@router.post("/{rfq_id}/generate", response_model=RFQResponse)
async def generate_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Publishes a draft RFQ: assigns RFQ-YYYY-NNNN and marks status as Active."""
    stmt = (
        select(RFQ)
        .where(RFQ.id == rfq_id)
        .options(
            selectinload(RFQ.items),
            selectinload(RFQ.invited_suppliers).selectinload(RFQSupplier.supplier),
        )
    )
    result = await db.execute(stmt)
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    if not rfq.rfq_number:
        rfq.rfq_number = await _generate_unique_rfq_number(db)
    rfq.status = RFQStatus.active

    await db.commit()
    await db.refresh(rfq)

    q_count_res = await db.execute(
        select(func.count(Quotation.id)).where(Quotation.rfq_id == rfq.id)
    )
    q_count = q_count_res.scalar() or 0

    return _build_rfq_response(rfq, quotations_count=q_count)


@router.get("/{rfq_id}/pdf")
async def download_rfq_pdf(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Generates and downloads the official RFQ PDF representation."""
    stmt = (
        select(RFQ)
        .where(RFQ.id == rfq_id)
        .options(
            selectinload(RFQ.items),
            selectinload(RFQ.invited_suppliers).selectinload(RFQSupplier.supplier),
        )
    )
    result = await db.execute(stmt)
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    # Serialize RFQ to dictionary for PDF builder
    rfq_dict = {
        "rfq_number": rfq.rfq_number or f"DRAFT-{rfq.id}",
        "title": rfq.title,
        "description": rfq.description,
        "category": rfq.category,
        "budget": rfq.budget,
        "currency": rfq.currency or "INR",
        "rfq_date": rfq.rfq_date,
        "submission_deadline": rfq.submission_deadline,
        "required_delivery_date": rfq.required_delivery_date,
        "buyer_company": rfq.buyer_company,
        "buyer_address": rfq.buyer_address,
        "buyer_contact_person": rfq.buyer_contact_person,
        "buyer_email": rfq.buyer_email,
        "buyer_phone": rfq.buyer_phone,
        "payment_terms": rfq.payment_terms,
        "dispatch_method": rfq.dispatch_method,
        "shipment_type": rfq.shipment_type,
        "port_of_loading": rfq.port_of_loading,
        "port_of_discharge": rfq.port_of_discharge,
        "delivery_location": rfq.delivery_location,
        "additional_terms": rfq.additional_terms,
        "status": rfq.status.value if hasattr(rfq.status, "value") else str(rfq.status),
        "items": [
            {
                "product_code": itm.product_code,
                "description": itm.description,
                "quantity": itm.quantity,
                "unit": itm.unit,
            }
            for itm in (rfq.items or [])
        ],
        "invited_suppliers": [
            {
                "supplier_id": s.supplier_id,
                "supplier_name": s.supplier.name if s.supplier else f"Supplier #{s.supplier_id}",
            }
            for s in (rfq.invited_suppliers or [])
        ],
    }

    pdf_bytes = generate_rfq_pdf(rfq_dict)
    filename = f"RFQ-{rfq.rfq_number or rfq.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/{rfq_id}/quotations", response_model=List[QuotationResponse])
async def get_rfq_quotations(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: Optional[User] = Depends(get_current_user_optional),
):
    """Retrieves quotations belonging to the specified RFQ."""
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    return q_result.scalars().all()
