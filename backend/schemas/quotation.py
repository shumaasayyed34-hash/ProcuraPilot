from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel
from models.quotation import ValidationStatus


class QuotationCreate(BaseModel):
    rfq_id: int
    supplier_id: int
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    currency: str = "INR"
    gst_percentage: Optional[float] = None
    delivery_time_days: Optional[int] = None
    payment_terms: Optional[str] = None
    incoterms: Optional[str] = None
    moq: Optional[float] = None
    validity_days: Optional[int] = None
    warranty_months: Optional[int] = None
    notes: Optional[str] = None


class QuotationUpdate(BaseModel):
    rfq_id: Optional[int] = None
    supplier_id: Optional[int] = None
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    gst_percentage: Optional[float] = None
    delivery_time_days: Optional[int] = None
    payment_terms: Optional[str] = None
    incoterms: Optional[str] = None
    moq: Optional[float] = None
    validity_days: Optional[int] = None
    warranty_months: Optional[int] = None
    notes: Optional[str] = None
    validation_status: Optional[ValidationStatus] = None


class QuotationResponse(BaseModel):
    id: int
    rfq_id: int
    supplier_id: int
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    gst_percentage: Optional[float] = None
    delivery_time_days: Optional[int] = None
    payment_terms: Optional[str] = None
    incoterms: Optional[str] = None
    moq: Optional[float] = None
    validity_days: Optional[int] = None
    warranty_months: Optional[int] = None
    notes: Optional[str] = None
    extraction_confidence: Optional[float] = None
    validation_status: ValidationStatus
    validation_errors: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
