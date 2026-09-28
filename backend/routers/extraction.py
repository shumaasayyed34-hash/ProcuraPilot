"""
FastAPI Router for Procurement Extraction & Ingestion
Provides endpoints for Iqra's upstream OCR upload module (I1.3)
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from schemas.procurement import ProcurementDocumentExtract
from services.extraction import ExtractionResult, extraction_engine
from services.ingestion import ingestion_service

router = APIRouter(prefix="/extraction", tags=["Extraction & Ingestion"])


class ExtractOCRRequest(BaseModel):
    raw_ocr_text: str = Field(..., description="Raw unstructured OCR text output from document")
    document_id: Optional[str] = Field(None, description="Optional document tracking ID")
    rfq_id: Optional[int] = Field(None, description="Optional associated RFQ ID")
    custom_instructions: Optional[str] = Field(None, description="Specific extraction instructions")


class IngestOCRRequest(BaseModel):
    raw_ocr_text: str = Field(..., description="Raw unstructured OCR text")
    document_id: Optional[str] = Field(None, description="Unique tracking identifier")
    rfq_id: Optional[int] = Field(None, description="Associated RFQ ID")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="File metadata: filename, uploader, size, etc.",
    )
    custom_instructions: Optional[str] = Field(None, description="Specific extraction instructions")


@router.post(
    "/extract",
    response_model=ExtractionResult,
    summary="P1.1: Extract structured procurement data from OCR text",
)
async def extract_from_ocr(request: ExtractOCRRequest):
    """Executes OCR text preprocessing and LLM data extraction without saving to database."""
    res = extraction_engine.extract(
        raw_ocr_text=request.raw_ocr_text,
        document_id=request.document_id,
        rfq_id=request.rfq_id,
        custom_instructions=request.custom_instructions,
    )
    if not res.success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=res.error_message or "Extraction failed",
        )
    return res


@router.post(
    "/ingest",
    summary="P1.4: Ingest document into MongoDB (raw) and PostgreSQL (structured)",
)
async def ingest_ocr_document(request: IngestOCRRequest):
    """Executes complete ingestion pipeline:
    1. Archives raw OCR payload into MongoDB.
    2. Runs LLM extraction and validation.
    3. Persists structured quotation and supplier records into PostgreSQL.
    """
    res = await ingestion_service.ingest_document(
        raw_ocr_text=request.raw_ocr_text,
        document_id=request.document_id,
        rfq_id=request.rfq_id,
        metadata=request.metadata,
        custom_instructions=request.custom_instructions,
    )
    if res.get("status") == "EXTRACTION_FAILED":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=res.get("error"),
        )
    if res.get("status") == "POSTGRES_WRITE_FAILED":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database write failed: {res.get('error')}",
        )
    return res
