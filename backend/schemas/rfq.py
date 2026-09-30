from datetime import datetime, date, timezone
from typing import Optional
from pydantic import BaseModel
from models.rfq import RFQStatus


class RFQCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    required_delivery_date: Optional[date] = None
    status: RFQStatus = RFQStatus.draft


class RFQUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    required_delivery_date: Optional[date] = None
    status: Optional[RFQStatus] = None


class RFQResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    required_delivery_date: Optional[date] = None
    status: RFQStatus
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
