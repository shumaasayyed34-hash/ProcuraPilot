from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr


class SupplierCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    msme_number: Optional[str] = None
    iso_certified: bool = False
    years_in_business: Optional[int] = None
    annual_revenue: Optional[float] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    msme_number: Optional[str] = None
    iso_certified: Optional[bool] = None
    years_in_business: Optional[int] = None
    annual_revenue: Optional[float] = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    msme_number: Optional[str] = None
    iso_certified: bool
    years_in_business: Optional[int] = None
    annual_revenue: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
