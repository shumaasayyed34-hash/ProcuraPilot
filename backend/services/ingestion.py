"""
Procurement Document Ingestion Service (P1.4 Deliverable)
Coordinates dual-write database persistence:
1. Raw OCR payload + upload metadata -> MongoDB (raw_ocr_payloads collection)
2. Normalized, validated Pydantic models -> PostgreSQL (suppliers and quotations tables)
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.mongodb import get_mongo_db
from database.postgres import AsyncSessionLocal
from models.quotation import Quotation, ValidationStatus
from models.supplier import Supplier
from schemas.procurement import ProcurementDocumentExtract
from services.extraction import ExtractionResult, extraction_engine

logger = logging.getLogger("procurapilot.ingestion")


class IngestionService:
    """Ingestion orchestrator for raw OCR payloads and structured records."""

    def __init__(self, extractor=extraction_engine):
        self.extractor = extractor

    async def archive_raw_to_mongodb(
        self,
        document_id: str,
        raw_ocr_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Stores the unedited raw OCR text in MongoDB (raw_ocr_payloads)."""
        db = get_mongo_db()
        collection = db["raw_ocr_payloads"]

        payload = {
            "document_id": document_id,
            "raw_ocr_text": raw_ocr_text,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
            "status": "INGESTED_RAW",
        }

        # Async Motor upsert
        res = await collection.update_one(
            {"document_id": document_id},
            {"$set": payload},
            upsert=True,
        )
        logger.info(f"Raw OCR payload archived to MongoDB for document_id={document_id}")
        return str(res.upserted_id or document_id)

    async def ingest_document(
        self,
        raw_ocr_text: str,
        document_id: Optional[str] = None,
        rfq_id: Optional[int] = None,
        supplier_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        custom_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Full pipeline: Raw Mongo write -> LLM extraction -> Postgres relational write."""
        doc_id = document_id or f"DOC-{uuid.uuid4().hex[:10].upper()}"

        # Step 1: Save raw OCR in MongoDB (P1.4 requirement)
        mongo_status = "SUCCESS"
        mongo_ref = None
        try:
            mongo_ref = await self.archive_raw_to_mongodb(
                document_id=doc_id,
                raw_ocr_text=raw_ocr_text,
                metadata=metadata,
            )
        except Exception as m_err:
            logger.error(f"MongoDB raw write error: {m_err}")
            mongo_status = f"FAILED: {m_err}"

        # Step 2: Run LLM Extraction (P1.1 + P1.2 + P1.3)
        extraction_res: ExtractionResult = self.extractor.extract(
            raw_ocr_text=raw_ocr_text,
            document_id=doc_id,
            rfq_id=rfq_id,
            custom_instructions=custom_instructions,
        )

        if not extraction_res.success or not extraction_res.document:
            return {
                "document_id": doc_id,
                "status": "EXTRACTION_FAILED",
                "mongo_status": mongo_status,
                "mongo_ref": mongo_ref,
                "error": extraction_res.error_message,
                "preprocessor_metrics": extraction_res.preprocessor_metrics,
            }

        extracted_data: ProcurementDocumentExtract = extraction_res.document

        # Step 3: Write structured data into PostgreSQL (P1.4 requirement)
        quotation_id = None
        final_supplier_id = supplier_id

        async with AsyncSessionLocal() as session:
            try:
                # 3a. Resolve or create Supplier if not explicitly provided
                if not final_supplier_id:
                    final_supplier_id = await self._resolve_or_create_supplier(session, extracted_data)

                # 3b. Insert Quotation record
                val_status = (
                    ValidationStatus.passed
                    if extracted_data.quality.arithmetic_valid and not extracted_data.quality.missing_fields
                    else ValidationStatus.pending
                )

                # Collect validation errors / warnings and preserve line items in JSON field
                validation_errors_dict = {
                    "missing_fields": extracted_data.quality.missing_fields,
                    "warnings": extracted_data.quality.warnings,
                    "arithmetic_valid": extracted_data.quality.arithmetic_valid,
                    "document_number": extracted_data.document_number,
                    "issue_date": str(extracted_data.issue_date) if extracted_data.issue_date else None,
                    "subtotal_amount": extracted_data.subtotal_amount,
                    "total_tax_amount": extracted_data.total_tax_amount,
                    "line_items": [item.model_dump(mode="json") for item in extracted_data.line_items],
                }

                target_rfq_id = rfq_id or extracted_data.rfq_id

                quotation = Quotation(
                    rfq_id=target_rfq_id,
                    supplier_id=final_supplier_id,
                    unit_price=extracted_data.unit_price,
                    total_amount=extracted_data.total_amount,
                    currency=extracted_data.currency,
                    gst_percentage=extracted_data.gst_percentage,
                    delivery_time_days=extracted_data.delivery_time_days,
                    payment_terms=extracted_data.payment_terms,
                    incoterms=extracted_data.incoterms,
                    moq=extracted_data.moq,
                    validity_days=extracted_data.validity_days,
                    warranty_months=extracted_data.warranty_months,
                    notes=extracted_data.notes,
                    extraction_confidence=extracted_data.quality.confidence_score,
                    validation_status=val_status,
                    validation_errors=validation_errors_dict,
                )
                session.add(quotation)

                # 3c. If linked to an RFQ and supplier, mark RFQSupplier as responded
                if target_rfq_id and final_supplier_id:
                    from models.rfq_supplier import RFQSupplier, RFQSupplierStatus
                    from sqlalchemy import select
                    rfq_sup_res = await session.execute(
                        select(RFQSupplier).where(
                            RFQSupplier.rfq_id == target_rfq_id,
                            RFQSupplier.supplier_id == final_supplier_id,
                        )
                    )
                    rfq_sup = rfq_sup_res.scalar_one_or_none()
                    if rfq_sup:
                        rfq_sup.status = RFQSupplierStatus.responded
                        rfq_sup.responded_at = datetime.now(timezone.utc)

                await session.commit()
                await session.refresh(quotation)
                quotation_id = quotation.id
                supplier_id = final_supplier_id

            except Exception as pg_err:
                await session.rollback()
                logger.error(f"PostgreSQL persistence error for doc {doc_id}: {pg_err}", exc_info=True)
                return {
                    "document_id": doc_id,
                    "status": "POSTGRES_WRITE_FAILED",
                    "mongo_status": mongo_status,
                    "mongo_ref": mongo_ref,
                    "error": str(pg_err),
                    "extracted_data": extracted_data.model_dump(mode="json"),
                }

        return {
            "document_id": doc_id,
            "status": "SUCCESS",
            "quotation_id": quotation_id,
            "supplier_id": supplier_id,
            "mongo_ref": mongo_ref,
            "latency_ms": extraction_res.latency_ms,
            "confidence_score": extracted_data.quality.confidence_score,
            "extracted_data": extracted_data.model_dump(mode="json"),
        }

    async def _resolve_or_create_supplier(
        self, session: AsyncSession, data: ProcurementDocumentExtract
    ) -> int:
        """Finds existing supplier by GSTIN or Name, or inserts a new record."""
        sup = data.supplier
        query = select(Supplier).where(Supplier.name.ilike(sup.name.strip()))
        if sup.gstin:
            query = select(Supplier).where(
                (Supplier.name.ilike(sup.name.strip())) | (Supplier.gstin == sup.gstin.strip())
            )

        res = await session.execute(query)
        existing_supplier = res.scalars().first()

        if existing_supplier:
            return existing_supplier.id

        new_supplier = Supplier(
            name=sup.name,
            gstin=sup.gstin,
            email=sup.email,
            phone=sup.phone,
            address=sup.address,
            country=sup.country or "India",
        )
        session.add(new_supplier)
        await session.flush()
        return new_supplier.id


ingestion_service = IngestionService()
