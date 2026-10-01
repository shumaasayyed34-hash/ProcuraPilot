from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.quotation import Quotation, ValidationStatus
from models.rfq import RFQ
from models.supplier import Supplier
from models.user import User
from schemas.quotation import QuotationCreate, QuotationUpdate, QuotationResponse
from schemas.validation import QuotationValidateResponse, RFQValidationSummary, ValidationSummaryItem
from utils.auth import get_current_user
from utils.validator import normalize_currency, check_duplicate, validate_quotation, calculate_validation_score
from utils.currency import normalize_prices_to_inr

router = APIRouter(prefix="/quotations", tags=["Quotations"])


@router.post("/", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_quotation(
    payload: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rfq_check = await db.execute(select(RFQ).where(RFQ.id == payload.rfq_id))
    if not rfq_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"RFQ {payload.rfq_id} not found")

    sup_check = await db.execute(select(Supplier).where(Supplier.id == payload.supplier_id))
    if not sup_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Supplier {payload.supplier_id} not found")

    # Duplicate check
    existing = await db.execute(
        select(Quotation).where(
            Quotation.rfq_id == payload.rfq_id,
            Quotation.supplier_id == payload.supplier_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A quotation from supplier {payload.supplier_id} already exists for RFQ {payload.rfq_id}.",
        )

    data = payload.model_dump()

    # Normalize currency
    if data.get("currency"):
        data["currency"] = normalize_currency(data["currency"])

    # Convert prices to INR
    data = normalize_prices_to_inr(data)

    # Run validation
    validation_result = validate_quotation(data)
    validation_score = calculate_validation_score(
        validation_result["errors"], validation_result["warnings"]
    )
    val_status = ValidationStatus.passed if validation_result["is_valid"] else ValidationStatus.failed
    data["validation_status"] = val_status
    data["validation_errors"] = {
        "errors": validation_result["errors"],
        "warnings": validation_result["warnings"],
        "validation_score": validation_score,
    }

    quotation = Quotation(**data)
    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)

    response = {
        "id": quotation.id,
        "rfq_id": quotation.rfq_id,
        "supplier_id": quotation.supplier_id,
        "unit_price": quotation.unit_price,
        "total_amount": quotation.total_amount,
        "currency": quotation.currency,
        "gst_percentage": quotation.gst_percentage,
        "delivery_time_days": quotation.delivery_time_days,
        "payment_terms": quotation.payment_terms,
        "incoterms": quotation.incoterms,
        "moq": quotation.moq,
        "validity_days": quotation.validity_days,
        "warranty_months": quotation.warranty_months,
        "notes": quotation.notes,
        "extraction_confidence": quotation.extraction_confidence,
        "validation_status": quotation.validation_status,
        "validation_errors": quotation.validation_errors,
        "validation_score": validation_score,
        "created_at": quotation.created_at,
        "updated_at": quotation.updated_at,
    }
    return response


@router.get("/", response_model=List[QuotationResponse])
async def list_quotations(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/rfq/{rfq_id}/validation-summary", response_model=RFQValidationSummary)
async def get_rfq_validation_summary(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    quotations = result.scalars().all()

    items = []
    passed = failed = pending = 0
    for q in quotations:
        val_errors = q.validation_errors or {}
        errs = val_errors.get("errors", [])
        warns = val_errors.get("warnings", [])
        score = val_errors.get("validation_score", calculate_validation_score(errs, warns))
        if q.validation_status == ValidationStatus.passed:
            passed += 1
        elif q.validation_status == ValidationStatus.failed:
            failed += 1
        else:
            pending += 1
        items.append(ValidationSummaryItem(
            quotation_id=q.id,
            supplier_id=q.supplier_id,
            validation_status=q.validation_status.value,
            validation_score=score,
            errors=errs,
            warnings=warns,
        ))

    return RFQValidationSummary(
        rfq_id=rfq_id,
        total_quotations=len(quotations),
        passed=passed,
        failed=failed,
        pending=pending,
        quotations=items,
    )


@router.get("/rfq/{rfq_id}", response_model=List[QuotationResponse])
async def get_quotations_by_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    return result.scalars().all()


@router.get("/{quotation_id}/validate", response_model=QuotationValidateResponse)
async def validate_quotation_endpoint(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    data = {
        "rfq_id": quotation.rfq_id,
        "supplier_id": quotation.supplier_id,
        "unit_price": quotation.unit_price,
        "total_amount": quotation.total_amount,
        "currency": quotation.currency,
        "gst_percentage": quotation.gst_percentage,
        "delivery_time_days": quotation.delivery_time_days,
        "moq": quotation.moq,
        "validity_days": quotation.validity_days,
        "warranty_months": quotation.warranty_months,
    }

    validation_result = validate_quotation(data)
    score = calculate_validation_score(validation_result["errors"], validation_result["warnings"])
    val_status = ValidationStatus.passed if validation_result["is_valid"] else ValidationStatus.failed

    # Persist updated status
    quotation.validation_status = val_status
    quotation.validation_errors = {
        "errors": validation_result["errors"],
        "warnings": validation_result["warnings"],
        "validation_score": score,
    }
    await db.commit()

    return QuotationValidateResponse(
        quotation_id=quotation_id,
        is_valid=validation_result["is_valid"],
        errors=validation_result["errors"],
        warnings=validation_result["warnings"],
        validation_score=score,
        validation_status=val_status.value,
    )


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    return quotation


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: int,
    payload: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(quotation, field, value)

    await db.commit()
    await db.refresh(quotation)
    return quotation


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.id == quotation_id))
    quotation = result.scalar_one_or_none()
    if not quotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
    await db.delete(quotation)
    await db.commit()
