from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from models.rfq import RFQStatus
from models.rfq_supplier import RFQSupplierStatus


class RFQItemCreate(BaseModel):
    product_code: str
    description: str
    quantity: float
    unit: str = "EACH"


class RFQItemResponse(BaseModel):
    id: int
    rfq_id: int
    product_code: str
    description: str
    quantity: float
    unit: str

    model_config = ConfigDict(from_attributes=True)


class RFQSupplierResponse(BaseModel):
    id: int
    rfq_id: int
    supplier_id: int
    supplier_name: Optional[str] = None
    status: RFQSupplierStatus = RFQSupplierStatus.invited
    invited_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RFQCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    budget: Optional[float] = None
    currency: str = "INR"

    # Deadlines & Dates
    rfq_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    required_delivery_date: Optional[date] = None

    # Buyer Details
    buyer_company: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None

    # Commercial / Delivery
    payment_terms: Optional[str] = None
    dispatch_method: Optional[str] = None
    shipment_type: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    delivery_location: Optional[str] = None
    additional_terms: Optional[str] = None

    # Dynamic line items & invited suppliers
    items: List[RFQItemCreate] = []
    supplier_ids: List[int] = []

    # If true, sets status to Active, generates unique RFQ-YYYY-NNNN, and validates strictly
    generate: bool = False

    # Legacy fields
    quantity: Optional[float] = None
    unit: Optional[str] = None


class RFQUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    rfq_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    required_delivery_date: Optional[date] = None
    buyer_company: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    dispatch_method: Optional[str] = None
    shipment_type: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    delivery_location: Optional[str] = None
    additional_terms: Optional[str] = None
    status: Optional[RFQStatus] = None


class RFQResponse(BaseModel):
    id: int
    rfq_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    budget: Optional[float] = None
    currency: str = "INR"
    rfq_date: Optional[date] = None
    submission_deadline: Optional[date] = None
    required_delivery_date: Optional[date] = None
    buyer_company: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_contact_person: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_phone: Optional[str] = None
    payment_terms: Optional[str] = None
    dispatch_method: Optional[str] = None
    shipment_type: Optional[str] = None
    port_of_loading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    delivery_location: Optional[str] = None
    additional_terms: Optional[str] = None
    status: RFQStatus
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    items: List[RFQItemResponse] = []
    invited_suppliers: List[RFQSupplierResponse] = []
    quotations_count: int = 0
    invited_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SupplierOption(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    iso_certified: bool = False

    model_config = ConfigDict(from_attributes=True)


class RFQOptionsResponse(BaseModel):
    suppliers: List[SupplierOption]
    categories: List[str]
    currencies: List[str]
    units: List[str]
    payment_terms_options: List[str]
    dispatch_methods: List[str]
    shipment_types: List[str]
