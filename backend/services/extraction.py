"""
LLM Data Extraction Engine (P1.1 Deliverable)
Extracts structured procurement data from raw OCR documents using OpenAI / Gemini.
Includes schema validation, retry loop, and edge-case error handling.
"""

from datetime import datetime
import json
import logging
import os
import time
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from schemas.procurement import (
    ProcurementDocumentExtract,
    ValidationStatusEnum,
)
from services.preprocessor import OCRPreprocessor

load_dotenv()
logger = logging.getLogger("procurapilot.extraction")
logging.basicConfig(level=logging.INFO)


class ExtractionResult(BaseModel):
    """Wrapper response returned by the extraction engine."""
    success: bool
    document: Optional[ProcurementDocumentExtract] = None
    document_id: Optional[str] = None
    rfq_id: Optional[int] = None
    model_name: str
    provider: str
    latency_ms: float = 0.0
    error_message: Optional[str] = None
    preprocessor_metrics: Dict[str, Any] = Field(default_factory=dict)


SYSTEM_PROMPT = """
You are an expert Procurement AI Data Extraction Agent for ProcuraPilot.
Your role is to analyze unstructured, noisy OCR text from Quotations, Invoices, Purchase Orders, or Bids and extract a strictly typed, normalized JSON object.

### Extraction Rules:
1. SUPPLIER IDENTIFICATION:
   - Identify Supplier / Vendor details from the header, letterhead, or logo section.
   - Extract Supplier Name, GSTIN, Email, Phone, and Address.

2. QUOTATION / DOCUMENT METADATA:
   - Extract Document Number (Quote #, Ref #), Issue Date (YYYY-MM-DD), and RFQ reference if present.
   - Extract Currency (Default to 'INR' unless specified like USD, EUR).

3. LINE ITEMS & PRICING:
   - Itemize every line with description, quantity, unit price, tax rate (GST %), and total amount.
   - Reconstruct subtotal, total tax, and grand total.
   - If single item quotation, extract primary unit_price and total_amount.

4. COMMERCIAL TERMS (CRITICAL FOR PROCUREMENT):
   - Payment Terms: e.g., '100% advance', 'Net 30', '30 days from invoice'.
   - Delivery Time (Days): Convert lead time into integer number of days (e.g. '2 weeks' -> 14).
   - Incoterms: e.g., 'FOB', 'Ex-Works', 'CIF', 'DDP'.
   - Minimum Order Quantity (MOQ).
   - Validity: Number of days the quote remains valid.
   - Warranty: Warranty period in months.

5. DIRTY OCR & ARTIFACTS:
   - Fix obvious OCR character swaps (e.g., 'O' for 0 in numbers, 'l' or 'I' for 1, 'S' or '5' for '$' or '₹').
   - Do NOT hallucinate data. If a field is missing, leave it null.
"""


class ExtractionEngine:
    """Production-grade LLM extraction engine supporting OpenAI and Google Gemini."""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.temperature = float(os.getenv("LLM_TEMPERATURE", "0.0"))
        self.max_retries = int(os.getenv("LLM_MAX_RETRIES", "3"))

        self.client = None
        self.model_name = self.openai_model if self.provider == "openai" else self.gemini_model
        self._init_client()

    def _init_client(self):
        """Attempts to initialize Instructor client with fallback awareness."""
        try:
            import instructor

            if self.provider == "openai":
                from openai import OpenAI
                raw_client = OpenAI(api_key=self.openai_key or "dummy")
                self.client = instructor.from_openai(raw_client)
                self.model_name = self.openai_model
                logger.info(f"Instructor initialized with OpenAI: {self.model_name}")

            elif self.provider == "gemini":
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=self.gemini_key or "dummy")
                    self.client = instructor.from_gemini(
                        client=genai.GenerativeModel(model_name=self.gemini_model),
                        mode=instructor.Mode.GEMINI_JSON,
                    )
                    self.model_name = self.gemini_model
                    logger.info(f"Instructor initialized with Gemini: {self.model_name}")
                except Exception as gem_err:
                    logger.warning(f"Could not init instructor.from_gemini ({gem_err}), using native fallback.")
                    self.client = None

        except ImportError:
            logger.warning("Instructor library not installed. Will use native LLM structured output.")
            self.client = None

    def extract(
        self,
        raw_ocr_text: str,
        document_id: Optional[str] = None,
        rfq_id: Optional[int] = None,
        custom_instructions: Optional[str] = None,
    ) -> ExtractionResult:
        """Cleans dirty OCR text and extracts structured procurement data.
        
        Args:
            raw_ocr_text: Raw string from Iqra's upstream document upload (I1.3).
            document_id: Optional tracking identifier.
            rfq_id: Associated RFQ ID if known.
            custom_instructions: Optional context hints for prompt.

        Returns:
            ExtractionResult with validated ProcurementDocumentExtract model.
        """
        start_time = time.perf_counter()

        # Step 1: Preprocess raw OCR text (P1.3)
        cleaned_text, metrics = OCRPreprocessor.clean(raw_ocr_text)

        if metrics.get("is_empty", False):
            latency = (time.perf_counter() - start_time) * 1000
            return ExtractionResult(
                success=False,
                document_id=document_id,
                rfq_id=rfq_id,
                model_name=self.model_name,
                provider=self.provider,
                latency_ms=round(latency, 2),
                error_message="Provided OCR text is empty or contains only non-printable characters.",
                preprocessor_metrics=metrics,
            )

        # Step 2: Build user prompt
        prompt_content = f"### OCR Document Text:\n```\n{cleaned_text}\n```"
        if rfq_id:
            prompt_content += f"\n\nContext: This document is a quotation response to RFQ ID: {rfq_id}."
        if custom_instructions:
            prompt_content += f"\n\nSpecific Instructions:\n{custom_instructions}"

        # Step 3: Run LLM extraction
        try:
            document = self._call_llm(prompt_content)
            latency = (time.perf_counter() - start_time) * 1000

            # Override rfq_id if provided externally
            if rfq_id and not document.rfq_id:
                document.rfq_id = rfq_id

            # Adjust confidence if high noise ratio
            if metrics.get("noise_ratio", 0.0) > 0.3:
                document.quality.confidence_score = max(0.4, round(document.quality.confidence_score - 0.2, 2))
                document.quality.warnings.append(
                    f"High OCR noise detected (Noise Ratio: {metrics['noise_ratio']}). Verification advised."
                )

            return ExtractionResult(
                success=True,
                document=document,
                document_id=document_id,
                rfq_id=rfq_id,
                model_name=self.model_name,
                provider=self.provider,
                latency_ms=round(latency, 2),
                preprocessor_metrics=metrics,
            )

        except Exception as exc:
            latency = (time.perf_counter() - start_time) * 1000
            logger.error(f"Extraction error for doc {document_id}: {exc}", exc_info=True)
            return ExtractionResult(
                success=False,
                document_id=document_id,
                rfq_id=rfq_id,
                model_name=self.model_name,
                provider=self.provider,
                latency_ms=round(latency, 2),
                error_message=str(exc),
                preprocessor_metrics=metrics,
            )

    def _call_llm(self, prompt: str) -> ProcurementDocumentExtract:
        """Dispatches LLM structured call using Instructor or native fallback."""
        if self.client is not None:
            if self.provider == "openai":
                return self.client.chat.completions.create(
                    model=self.model_name,
                    response_model=ProcurementDocumentExtract,
                    max_retries=self.max_retries,
                    temperature=self.temperature,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                )
            elif self.provider == "gemini":
                return self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    response_model=ProcurementDocumentExtract,
                    max_retries=self.max_retries,
                )

        # Native fallback without Instructor
        return self._native_fallback(prompt)

    def _native_fallback(self, prompt: str) -> ProcurementDocumentExtract:
        """Direct API fallback using OpenAI or Google Generative AI."""
        if self.provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_key)
            resp = client.beta.chat.completions.parse(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format=ProcurementDocumentExtract,
                temperature=self.temperature,
            )
            return resp.choices[0].message.parsed

        elif self.provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)
            try:
                # Try official native Gemini structured outputs using Pydantic response_schema
                model = genai.GenerativeModel(
                    model_name=self.gemini_model,
                    generation_config={
                        "temperature": self.temperature,
                        "response_mime_type": "application/json",
                        "response_schema": ProcurementDocumentExtract,
                    },
                    system_instruction=SYSTEM_PROMPT,
                )
                resp = model.generate_content(prompt)
                return ProcurementDocumentExtract.model_validate_json(resp.text)
            except Exception as schema_err:
                logger.warning(f"Native response_schema failed ({schema_err}), falling back to JSON Schema prompt.")
                model = genai.GenerativeModel(
                    model_name=self.gemini_model,
                    generation_config={
                        "temperature": self.temperature,
                        "response_mime_type": "application/json",
                    },
                    system_instruction=SYSTEM_PROMPT,
                )
                schema_json = json.dumps(ProcurementDocumentExtract.model_json_schema())
                full_prompt = f"{prompt}\n\nStrictly output valid JSON matching this schema:\n{schema_json}"
                resp = model.generate_content(full_prompt)
                data = json.loads(resp.text)
                return ProcurementDocumentExtract.model_validate(data)

        raise RuntimeError(f"Unsupported LLM provider: {self.provider}")


extraction_engine = ExtractionEngine()
