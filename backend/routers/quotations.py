from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.quotation import Quotation
from models.rfq import RFQ
from models.supplier import Supplier
from models.user import User
from schemas.quotation import QuotationCreate, QuotationUpdate, QuotationResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/quotations", tags=["Quotations"])


@router.post("/", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
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

    quotation = Quotation(**payload.model_dump())
    db.add(quotation)
    await db.commit()
    await db.refresh(quotation)
    return quotation


@router.get("/", response_model=List[QuotationResponse])
async def list_quotations(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/rfq/{rfq_id}", response_model=List[QuotationResponse])
async def get_quotations_by_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    return result.scalars().all()


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
