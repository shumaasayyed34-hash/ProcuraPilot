"""
OCR Integration Service (Phase 1 Task 2 & Task 3)
Integrates Tesseract OCR and PaddleOCR engines for PDF, PNG, JPG, and JPEG procurement documents.
Reuses backend/services/preprocessor.py for cleaning without duplicate code.
"""

import io
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

from PIL import Image

# Import existing preprocessor to adhere to Phase 1 Task 3 requirement
from services.preprocessor import OCRPreprocessor

logger = logging.getLogger("procurapilot.ocr")


class TesseractOCREngine:
    """Tesseract OCR wrapper using pytesseract."""

    def __init__(self):
        self.available = False
        self._check_availability()

    def _check_availability(self):
        try:
            import pytesseract
            # Check if tesseract binary is accessible or configured
            # On Windows, user might set TESSERACT_CMD env variable
            custom_cmd = os.getenv("TESSERACT_CMD")
            if custom_cmd:
                pytesseract.pytesseract.tesseract_cmd = custom_cmd
            self.available = True
        except ImportError:
            self.available = False

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Extracts text from PIL Image using pytesseract."""
        try:
            import pytesseract
            return pytesseract.image_to_string(image)
        except Exception as err:
            logger.warning(f"Tesseract extraction error: {err}")
            return f"[Tesseract OCR Error / Unavailable: {err}]"


class PaddleOCREngine:
    """PaddleOCR engine wrapper with fallback capability."""

    def __init__(self):
        self.available = False
        self.ocr_instance = None
        self._init_paddle()

    def _init_paddle(self):
        try:
            from paddleocr import PaddleOCR
            # Initialize PaddleOCR engine (English / Multilingual support)
            self.ocr_instance = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            self.available = True
            logger.info("PaddleOCR engine initialized successfully.")
        except Exception as err:
            logger.warning(f"PaddleOCR not available or failed to load ({err}). Native fallback will be used.")
            self.available = False

    def extract_text_from_image(self, image: Image.Image) -> str:
        """Extracts text from PIL Image using PaddleOCR or simulated fallback."""
        if not self.available or self.ocr_instance is None:
            # Fallback text extraction simulation or notification if Paddle OCR binary missing
            logger.info("PaddleOCR engine not active, delegating to Tesseract or pure rendering.")
            tess = TesseractOCREngine()
            if tess.available:
                return tess.extract_text_from_image(image)
            return "[PaddleOCR binary not installed in environment]"

        try:
            import numpy as np
            img_np = np.array(image.convert("RGB"))
            result = self.ocr_instance.ocr(img_np, cls=True)
            text_lines = []
            if result and result[0]:
                for line in result[0]:
                    if len(line) >= 2 and line[1]:
                        text_lines.append(str(line[1][0]))
            return "\n".join(text_lines)
        except Exception as err:
            logger.error(f"PaddleOCR execution error: {err}")
            return f"[PaddleOCR Error: {err}]"


class OCRService:
    """Main OCR Service integrating Tesseract & PaddleOCR for procurement documents (PDF/PNG/JPG/JPEG)."""

    def __init__(self):
        self.tesseract_engine = TesseractOCREngine()
        self.paddle_engine = PaddleOCREngine()

    def _convert_pdf_to_images(self, file_bytes: bytes) -> List[Image.Image]:
        """Converts PDF pages into PIL Images using pdf2image or pypdf/Pillow fallback."""
        images = []
        try:
            from pdf2image import convert_from_bytes
            images = convert_from_bytes(file_bytes)
            if images:
                return images
        except Exception as pdf2img_err:
            logger.info(f"pdf2image conversion fallback ({pdf2img_err}). Trying pypdf text / raster rendering...")

        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            # Extract image streams from PDF if present
            for page in reader.pages:
                for img_obj in page.images:
                    img_data = img_obj.data
                    img = Image.open(io.BytesIO(img_data))
                    images.append(img)
        except Exception as pypdf_err:
            logger.warning(f"pypdf extraction error: {pypdf_err}")

        return images

    def extract_pdf_embedded_text(self, file_bytes: bytes) -> str:
        """Extracts clean text directly from digital PDF files if available."""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text_pages = []
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    text_pages.append(txt)
            return "\n\n".join(text_pages)
        except Exception as err:
            logger.warning(f"Digital PDF text extraction error: {err}")
            return ""

    def process_document(
        self,
        file_path_or_bytes: Any,
        filename: str,
        engine: str = "auto",
        preprocess: bool = True,
    ) -> Dict[str, Any]:
        """Processes a PDF, PNG, JPG, or JPEG file using specified OCR engine.
        
        Args:
            file_path_or_bytes: File path (str/Path) or bytes content.
            filename: Name of file to detect extension (.pdf, .png, .jpg, .jpeg).
            engine: OCR engine choice ('tesseract', 'paddleocr', 'auto').
            preprocess: Whether to run OCRPreprocessor on the extracted text.

        Returns:
            Dict containing raw_ocr_text, cleaned_text, engine_used, metrics.
        """
        ext = Path(filename).suffix.lower()

        # Read bytes content
        if isinstance(file_path_or_bytes, (str, Path)):
            with open(file_path_or_bytes, "rb") as f:
                file_bytes = f.read()
        else:
            file_bytes = file_path_or_bytes

        raw_ocr_text = ""
        engine_used = engine.lower()

        if ext == ".pdf":
            # 1. Attempt digital text extraction first
            raw_ocr_text = self.extract_pdf_embedded_text(file_bytes)

            # 2. If PDF has no digital text or scanned PDF, run image OCR on pages
            if not raw_ocr_text or len(raw_ocr_text.strip()) < 20:
                images = self._convert_pdf_to_images(file_bytes)
                page_texts = []
                for img in images:
                    txt = self._run_ocr_on_image(img, engine=engine_used)
                    if txt:
                        page_texts.append(txt)
                if page_texts:
                    raw_ocr_text = "\n\n".join(page_texts)

        elif ext in (".png", ".jpg", ".jpeg"):
            try:
                img = Image.open(io.BytesIO(file_bytes))
                raw_ocr_text = self._run_ocr_on_image(img, engine=engine_used)
            except Exception as img_err:
                logger.error(f"Image load error for {filename}: {img_err}")
                raw_ocr_text = f"[Image Read Error: {img_err}]"

        else:
            raw_ocr_text = f"[Unsupported File Extension: {ext}]"

        # Adhere to Phase 1 Task 3 requirement: reuse existing preprocessor
        cleaned_text = raw_ocr_text
        metrics = {}
        if preprocess and raw_ocr_text:
            cleaned_text, metrics = OCRPreprocessor.clean(raw_ocr_text)

        return {
            "filename": filename,
            "engine_used": engine_used,
            "raw_ocr_text": raw_ocr_text,
            "cleaned_text": cleaned_text,
            "preprocessor_metrics": metrics,
        }

    def _extract_text_with_gemini_vision(self, img: Image.Image) -> str:
        try:
            import google.generativeai as genai
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-3.5-flash-lite")
                response = model.generate_content([
                    "You are an expert OCR system. Extract and transcribe all text, tables, line items, headers, numbers, and currency values from this procurement quotation document image verbatim. Output pure plain text.",
                    img
                ])
                if response and response.text:
                    return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemini Vision OCR error: {e}")
        return ""

    def _run_ocr_on_image(self, img: Image.Image, engine: str) -> str:
        """Executes selected engine on PIL Image with resilient vision fallback."""
        res = ""
        if engine == "paddleocr" and self.paddle_engine.available:
            res = self.paddle_engine.extract_text_from_image(img)
        elif engine == "tesseract" and self.tesseract_engine.available:
            res = self.tesseract_engine.extract_text_from_image(img)
        else:
            if self.paddle_engine.available:
                res = self.paddle_engine.extract_text_from_image(img)
            elif self.tesseract_engine.available:
                res = self.tesseract_engine.extract_text_from_image(img)

        # If OCR output indicates failure or is empty, use Gemini Vision OCR
        if not res or "Error" in res or "not installed" in res or len(res.strip()) < 10:
            vision_res = self._extract_text_with_gemini_vision(img)
            if vision_res:
                return vision_res

        return res


ocr_service = OCRService()
