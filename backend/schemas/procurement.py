"""
Pydantic Schemas for Procurement Data Extraction (P1.2 Deliverable)
Maps unstructured OCR documents (Quotations, Invoices, POs) into validated schemas
matching Shumaaila's S1.5 PostgreSQL schema and downstream agent requirements.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
import re
from typing import Any, Dict, List, Optional
from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
)


class DocumentType(str, Enum):
    QUOTATION = "QUOTATION"
    PURCHASE_ORDER = "PURCHASE_ORDER"
    INVOICE = "INVOICE"
    RFQ_RESPONSE = "RFQ_RESPONSE"
    UNKNOWN = "UNKNOWN"


class ValidationStatusEnum(str, Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"


def clean_monetary_value(v: Any) -> Optional[float]:
    """Cleans dirty OCR currency strings into float values.
    
    Handles strings like '₹ 1,25,000.00', '$ 1,250.00', '1.250,00', '(500.00)'.
    """
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, str):
        cleaned = v.strip()
        if not cleaned or cleaned.lower() in ("null", "none", "n/a", "-", "nil"):
            return None
        is_negative = cleaned.startswith("(") and cleaned.endswith(")")
        # Remove currency symbols ($, ₹, €, £, etc.) and non-numeric chars except . , -
        cleaned = re.sub(r"[^\d.,\-]", "", cleaned)
        if not cleaned:
            return None
        # Handle decimal separators
        if "," in cleaned and "." in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                # European formatting (e.g. 1.250,50 -> 1250.50)
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                # Standard formatting (e.g. 1,250.50 -> 1250.50)
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned and "." not in cleaned:
            # Comma used as decimal point
            cleaned = cleaned.replace(",", ".")
        try:
            val = float(cleaned)
            return -val if is_negative else val
        except Exception:
            return None
    return None


class SupplierExtract(BaseModel):
    """Supplier / Vendor information extracted from OCR header or letterhead."""
    name: str = Field(..., description="Trade or business name of the supplier")
    gstin: Optional[str] = Field(None, description="GSTIN / VAT / Tax ID of the supplier")
    email: Optional[str] = Field(None, description="Contact email address")
    phone: Optional[str] = Field(None, description="Contact phone or mobile number")
    address: Optional[str] = Field(None, description="Complete business address")
    country: Optional[str] = Field(default="India", description="Country of supplier")

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        cleaned = v.strip()
        return cleaned if cleaned else "UNKNOWN SUPPLIER"

    @field_validator("gstin")
    @classmethod
    def clean_gstin(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        # Uppercase and remove spaces from GSTIN
        return re.sub(r"\s+", "", v.strip().upper())


class LineItemExtract(BaseModel):
    """Itemized product or service row extracted from quotation/order."""
    item_index: Optional[int] = Field(None, description="Line number (1, 2, 3...)")
    sku: Optional[str] = Field(None, description="Item code, SKU, or part number")
    description: str = Field(..., description="Description of material, item, or service")
    quantity: float = Field(default=1.0, description="Quantity offered or ordered")
    unit: Optional[str] = Field(None, description="Unit of measurement (e.g. NOS, KG, MTR, PCS)")
    unit_price: float = Field(default=0.0, description="Unit price per item excluding tax")
    tax_rate_percent: Optional[float] = Field(None, description="GST / Tax percentage (e.g. 18.0)")
    tax_amount: Optional[float] = Field(None, description="Total tax amount for this line")
    discount_amount: Optional[float] = Field(default=0.0, description="Line item discount")
    total_amount: float = Field(..., description="Total line amount")

    @field_validator("quantity", "unit_price", "tax_rate_percent", "tax_amount", "discount_amount", "total_amount", mode="before")
    @classmethod
    def parse_numbers(cls, v: Any) -> Optional[float]:
        return clean_monetary_value(v)

    @model_validator(mode="after")
    def reconcile_line(self) -> "LineItemExtract":
        """Calculates total if missing or zero."""
        if (self.total_amount == 0.0 or self.total_amount is None) and self.unit_price > 0.0:
            self.total_amount = round((self.quantity * self.unit_price) - (self.discount_amount or 0.0), 2)
        return self


class ExtractionQualityMetadata(BaseModel):
    """Engine confidence and audit metadata."""
    confidence_score: float = Field(default=1.0, description="Confidence metric between 0.0 and 1.0")
    missing_fields: List[str] = Field(default_factory=list, description="Critical fields missing from OCR")
    arithmetic_valid: bool = Field(default=True, description="True if line items and taxes sum to total")
    warnings: List[str] = Field(default_factory=list, description="Warnings regarding OCR noise or discrepancies")


class ProcurementDocumentExtract(BaseModel):
    """Master structured procurement model (P1.2 Deliverable).
    
    Directly maps to Shumaaila's S1.5 PostgreSQL models (`Supplier`, `Quotation`, `PurchaseOrder`).
    """
    document_type: DocumentType = Field(
        default=DocumentType.QUOTATION,
        description="Type of document (QUOTATION, PURCHASE_ORDER, INVOICE)",
    )
    document_number: Optional[str] = Field(
        None,
        description="Quotation number, Quote Reference, or PO Number",
    )
    issue_date: Optional[date] = Field(
        None,
        description="Issuance or quotation date (YYYY-MM-DD)",
    )
    rfq_id: Optional[int] = Field(
        None,
        description="Associated RFQ ID if referenced in quotation",
    )
    currency: str = Field(
        default="INR",
        description="Currency code (e.g. INR, USD, EUR)",
    )
    supplier: SupplierExtract = Field(
        ...,
        description="Supplier / Vendor details extracted from document",
    )
    line_items: List[LineItemExtract] = Field(
        default_factory=list,
        description="Itemized line items from quotation table",
    )
    unit_price: Optional[float] = Field(
        None,
        description="Overall or primary unit price if single item quotation",
    )
    subtotal_amount: Optional[float] = Field(
        None,
        description="Subtotal before taxes",
    )
    gst_percentage: Optional[float] = Field(
        None,
        description="Applicable GST or tax percentage (e.g., 18.0 for 18% GST)",
    )
    total_tax_amount: Optional[float] = Field(
        default=0.0,
        description="Total tax amount",
    )
    total_amount: float = Field(
        ...,
        description="Grand total quotation or order amount",
    )
    delivery_time_days: Optional[int] = Field(
        None,
        description="Lead time or delivery period in days",
    )
    payment_terms: Optional[str] = Field(
        None,
        description="Payment terms (e.g., '100% against delivery', 'Net 30', '30% advance')",
    )
    incoterms: Optional[str] = Field(
        None,
        description="Incoterms (e.g., Ex-Works, FOB, CIF, DDP)",
    )
    moq: Optional[float] = Field(
        None,
        description="Minimum Order Quantity (MOQ)",
    )
    validity_days: Optional[int] = Field(
        None,
        description="Quotation validity period in days",
    )
    warranty_months: Optional[int] = Field(
        None,
        description="Warranty period in months",
    )
    notes: Optional[str] = Field(
        None,
        description="Additional terms, remarks, or warranty clauses",
    )
    quality: ExtractionQualityMetadata = Field(
        default_factory=ExtractionQualityMetadata,
        description="Extraction confidence and edge case diagnostic audit",
    )

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: Optional[str]) -> str:
        if not v:
            return "INR"
        cleaned = v.strip().upper()
        symbol_map = {"₹": "INR", "RS": "INR", "INR": "INR", "$": "USD", "USD": "USD", "€": "EUR"}
        return symbol_map.get(cleaned, cleaned[:3] if len(cleaned) >= 3 else "INR")

    @field_validator("total_amount", "subtotal_amount", "total_tax_amount", "unit_price", "moq", "gst_percentage", mode="before")
    @classmethod
    def parse_header_floats(cls, v: Any) -> Optional[float]:
        return clean_monetary_value(v)

    @model_validator(mode="after")
    def reconcile_and_audit(self) -> "ProcurementDocumentExtract":
        """Calculates subtotals, reconciles math, and flags missing fields (P1.3)."""
        warnings = []
        missing = []

        if not self.document_number:
            missing.append("document_number")
        if not self.issue_date:
            missing.append("issue_date")
        if not self.payment_terms:
            missing.append("payment_terms")
        if not self.delivery_time_days:
            missing.append("delivery_time_days")

        # Subtotal calculation fallback
        if self.subtotal_amount is None and self.line_items:
            self.subtotal_amount = round(sum(item.total_amount for item in self.line_items), 2)

        # Primary unit_price fallback
        if self.unit_price is None and self.line_items:
            self.unit_price = self.line_items[0].unit_price

        # Arithmetic reconciliation check
        if self.subtotal_amount is not None and self.total_amount is not None:
            expected = self.subtotal_amount + (self.total_tax_amount or 0.0)
            diff = abs(expected - self.total_amount)
            if diff > 1.0:  # Allow tolerance for minor rounding or rounding to nearest rupee
                self.quality.arithmetic_valid = False
                warnings.append(
                    f"Subtotal ({self.subtotal_amount}) + Tax ({self.total_tax_amount}) != Total ({self.total_amount}) "
                    f"Diff: {diff:.2f}"
                )
                # Lower confidence score when math doesn't reconcile
                self.quality.confidence_score = max(0.5, round(self.quality.confidence_score - 0.2, 2))
            else:
                self.quality.arithmetic_valid = True

        self.quality.missing_fields = missing
        self.quality.warnings.extend(warnings)
        return self
