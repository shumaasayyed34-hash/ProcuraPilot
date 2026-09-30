"""
OCR Text Preprocessor & Cleaner (P1.3 Edge Case Handling)
Cleans dirty, noisy OCR output from upstream document upload module (Iqra's I1.3)
before passing text to the LLM extraction engine.
"""

import re
import unicodedata
from typing import Dict, Tuple


class OCRPreprocessor:
    """Preprocesses raw OCR text to eliminate noise, formatting errors, and artifacts."""

    CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]")
    HORIZONTAL_SPACES = re.compile(r"[^\S\r\n]+")
    EXCESSIVE_NEWLINES = re.compile(r"\n{3,}")
    REPEATED_PUNCTUATION = re.compile(r"([_=\-*~#|]){4,}")

    @classmethod
    def clean(cls, raw_ocr_text: str, max_chars: int = 35_000) -> Tuple[str, Dict]:
        """Cleans and standardizes raw OCR text.

        Returns:
            Tuple of (cleaned_text, metrics_dict)
        """
        if not raw_ocr_text or not raw_ocr_text.strip():
            return "", {
                "original_len": 0,
                "cleaned_len": 0,
                "is_empty": True,
                "noise_ratio": 1.0,
            }

        orig_len = len(raw_ocr_text)

        # 1. Normalize unicode characters (NFKC handles ligatures and exotic accents)
        text = unicodedata.normalize("NFKC", raw_ocr_text)

        # 2. Strip non-printable control characters
        text = cls.CONTROL_CHARS.sub("", text)

        # 3. Replace non-breaking spaces
        text = text.replace("\xa0", " ").replace("\u200b", "").replace("\ufeff", "")

        # 4. Standardize horizontal rules/dividers (table borders in OCR)
        text = cls.REPEATED_PUNCTUATION.sub(r"\1\1\1", text)

        # 5. Clean excessive spaces per line while preserving line structure
        lines = [cls.HORIZONTAL_SPACES.sub(" ", line).strip() for line in text.splitlines()]
        text = "\n".join(lines)

        # 6. Collapse excessive blank lines
        text = cls.EXCESSIVE_NEWLINES.sub("\n\n", text).strip()

        # 7. Apply length guardrails to avoid token overflow
        truncated = False
        if len(text) > max_chars:
            text = text[:max_chars]
            truncated = True

        cleaned_len = len(text)
        noise_ratio = round((orig_len - cleaned_len) / max(orig_len, 1), 3)

        metrics = {
            "original_len": orig_len,
            "cleaned_len": cleaned_len,
            "noise_ratio": noise_ratio,
            "truncated": truncated,
            "is_empty": cleaned_len == 0,
        }

        return text, metrics
