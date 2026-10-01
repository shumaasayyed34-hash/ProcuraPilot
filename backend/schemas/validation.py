from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class QuotationValidationResult(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    validation_score: int


class DocumentValidationResult(BaseModel):
    is_valid_document: bool
    document_errors: List[str]
    document_warnings: List[str]
    extracted_fields_count: int
    procurement_keywords_found: List[str]


class QuotationValidateResponse(BaseModel):
    quotation_id: int
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    validation_score: int
    validation_status: str


class ValidationSummaryItem(BaseModel):
    quotation_id: int
    supplier_id: int
    validation_status: str
    validation_score: int
    errors: List[str]
    warnings: List[str]


class RFQValidationSummary(BaseModel):
    rfq_id: int
    total_quotations: int
    passed: int
    failed: int
    pending: int
    quotations: List[ValidationSummaryItem]
