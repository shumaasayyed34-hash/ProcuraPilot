"""
FastAPI Router for Procurement Upload, OCR, Extraction & Ingestion
Provides endpoints for Iqra's Phase 1 pipeline:
Upload -> Validate -> Store -> Document ID -> OCR -> Existing Preprocessor -> Existing Extraction/Ingestion
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from schemas.procurement import ProcurementDocumentExtract
from services.extraction import ExtractionResult, extraction_engine
from services.ingestion import ingestion_service
from services.upload_service import upload_service
from services.ocr_service import ocr_service
from utils.ocr_metrics import evaluate_ocr_accuracy
from utils.validator import validate_document_content

router = APIRouter(prefix="/extraction", tags=["Document Upload, OCR & Extraction"])


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


from database.postgres import get_db
from models.rfq import RFQ
from models.rfq_supplier import RFQSupplier
from models.quotation import Quotation
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


@router.post(
    "/upload",
    summary="Phase 1: Complete Upload -> Validate -> Store -> OCR -> Preprocess -> Extract Pipeline",
)
async def upload_and_process_document(
    file: UploadFile = File(..., description="PDF, PNG, JPG, or JPEG file"),
    rfq_id: Optional[int] = Form(None, description="Associated RFQ ID"),
    supplier_id: Optional[int] = Form(None, description="Selected invited supplier ID"),
    ocr_engine: str = Form("auto", description="OCR engine choice ('tesseract', 'paddleocr', 'auto')"),
    auto_ingest: bool = Form(False, description="Set True to persist to MongoDB & PostgreSQL"),
    custom_instructions: Optional[str] = Form(None, description="Custom prompt instructions for LLM"),
    db: AsyncSession = Depends(get_db),
):
    """Executes Phase 1 Document Pipeline:
    1. Validates file type and size limit.
    2. Generates unique document tracking ID (DOC-...).
    3. Safely stores uploaded file on disk.
    4. Runs Tesseract OCR / PaddleOCR on PDF/Images.
    5. Cleans text using existing OCRPreprocessor.
    6. Triggers LLM Extraction and optional DB Ingestion.
    """
    # 0. RFQ and Invited Supplier Verification
    if rfq_id:
        rfq_res = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
        rfq = rfq_res.scalar_one_or_none()
        if not rfq:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"RFQ with ID {rfq_id} does not exist.",
            )

        if supplier_id:
            # Check if supplier was invited to this RFQ
            inv_res = await db.execute(
                select(RFQSupplier).where(
                    RFQSupplier.rfq_id == rfq_id,
                    RFQSupplier.supplier_id == supplier_id,
                )
            )
            invited = inv_res.scalar_one_or_none()
            if not invited:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This supplier was not invited to the selected RFQ.",
                )

            # Prevent duplicate submissions for the same RFQ
            dup_res = await db.execute(
                select(Quotation).where(
                    Quotation.rfq_id == rfq_id,
                    Quotation.supplier_id == supplier_id,
                )
            )
            if dup_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This supplier has already submitted a quotation for this RFQ.",
                )

    # 1. Validate & Store file
    doc_id, file_path, file_size = await upload_service.save_uploaded_file(file)

    # 2. Run OCR & Preprocessing (reusing existing preprocessor)
    ocr_result = ocr_service.process_document(
        file_path_or_bytes=file_path,
        filename=file.filename or "uploaded_file",
        engine=ocr_engine,
        preprocess=True,
    )

    cleaned_ocr_text = ocr_result.get("cleaned_text", "")
    metadata = {
        "filename": file.filename,
        "content_type": file.content_type,
        "file_size": file_size,
        "ocr_engine": ocr_result.get("engine_used"),
        "preprocessor_metrics": ocr_result.get("preprocessor_metrics"),
    }

    if not cleaned_ocr_text or len(cleaned_ocr_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Document is empty or unreadable. Please upload a clear supplier quotation, invoice, or price list.",
                "document_validation": {"is_valid_document": False, "document_errors": ["Unreadable document content"]},
            },
        )

    # If auto_ingest is True, run dual-write ingestion pipeline
    if auto_ingest:
        ingest_res = await ingestion_service.ingest_document(
            raw_ocr_text=cleaned_ocr_text,
            document_id=doc_id,
            rfq_id=rfq_id,
            supplier_id=supplier_id,
            metadata=metadata,
            custom_instructions=custom_instructions,
        )
        structured = ingest_res.get("extracted_data") or ingest_res.get("structured_data") or {}
        if isinstance(structured, dict) and "supplier" in structured and isinstance(structured["supplier"], dict):
            structured["supplier_name"] = structured["supplier"].get("name")
        final_doc_validation = validate_document_content(cleaned_ocr_text, structured if structured else None)
        return {
            "document_id": doc_id,
            "filename": file.filename,
            "ocr": ocr_result,
            "ingestion": ingest_res,
            "extracted_data": structured,
            "extraction": {"document": structured},
            "document_validation": final_doc_validation,
        }

    # Otherwise run extraction engine in-memory
    extraction_res = extraction_engine.extract(
        raw_ocr_text=cleaned_ocr_text,
        document_id=doc_id,
        rfq_id=rfq_id,
        custom_instructions=custom_instructions,
    )

    structured_data = None
    if extraction_res.document:
        structured_data = extraction_res.document.model_dump(mode="json")
        if extraction_res.document.supplier:
            structured_data["supplier_name"] = extraction_res.document.supplier.name
    final_doc_validation = validate_document_content(cleaned_ocr_text, structured_data)
    if not final_doc_validation["is_valid_document"] and final_doc_validation["document_errors"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid document: " + " ".join(final_doc_validation["document_errors"]),
                "document_validation": final_doc_validation,
            },
        )

    return {
        "document_id": doc_id,
        "filename": file.filename,
        "file_size_bytes": file_size,
        "ocr": ocr_result,
        "extraction": extraction_res,
        "document_validation": {
            "is_valid_document": final_doc_validation["is_valid_document"],
            "document_errors": final_doc_validation["document_errors"],
            "document_warnings": final_doc_validation["document_warnings"],
            "extracted_fields_count": final_doc_validation["extracted_fields_count"],
        },
    }


@router.post(
    "/compare-ocr",
    summary="Phase 1: Test & Compare Tesseract vs PaddleOCR accuracy",
)
async def compare_ocr_engines(
    file: UploadFile = File(..., description="Sample document for OCR testing"),
    expected_text: Optional[str] = Form(None, description="Expected ground truth text for accuracy calculation"),
):
    """Executes both Tesseract and PaddleOCR on sample file and compares text output & accuracy metrics."""
    doc_id, file_path, file_size = await upload_service.save_uploaded_file(file)

    tess_res = ocr_service.process_document(file_path, file.filename or "sample", engine="tesseract")
    paddle_res = ocr_service.process_document(file_path, file.filename or "sample", engine="paddleocr")

    response = {
        "document_id": doc_id,
        "filename": file.filename,
        "tesseract_ocr": tess_res,
        "paddle_ocr": paddle_res,
    }

    if expected_text:
        response["accuracy_metrics"] = {
            "tesseract": evaluate_ocr_accuracy(expected_text, tess_res.get("cleaned_text", ""), engine_name="Tesseract"),
            "paddleocr": evaluate_ocr_accuracy(expected_text, paddle_res.get("cleaned_text", ""), engine_name="PaddleOCR"),
        }

    return response


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
