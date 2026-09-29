from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.rfq import RFQ, RFQStatus
from models.quotation import Quotation
from models.user import User
from schemas.rfq import RFQCreate, RFQUpdate, RFQResponse
from schemas.quotation import QuotationResponse
from utils.auth import get_current_user

router = APIRouter(prefix="/rfqs", tags=["RFQs"])


@router.post("/", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
async def create_rfq(
    payload: RFQCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = RFQ(**payload.model_dump(), created_by=current_user.id)
    db.add(rfq)
    await db.commit()
    await db.refresh(rfq)
    return rfq


@router.get("/", response_model=List[RFQResponse])
async def list_rfqs(
    skip: int = 0,
    limit: int = 20,
    status: Optional[RFQStatus] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(RFQ)
    if status:
        query = query.where(RFQ.status == status)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{rfq_id}", response_model=RFQResponse)
async def get_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")
    return rfq


@router.put("/{rfq_id}", response_model=RFQResponse)
async def update_rfq(
    rfq_id: int,
    payload: RFQUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(rfq, field, value)

    await db.commit()
    await db.refresh(rfq)
    return rfq


@router.delete("/{rfq_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rfq(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")
    await db.delete(rfq)
    await db.commit()


@router.get("/{rfq_id}/quotations", response_model=List[QuotationResponse])
async def get_rfq_quotations(
    rfq_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    q_result = await db.execute(select(Quotation).where(Quotation.rfq_id == rfq_id))
    return q_result.scalars().all()
