import re
from typing import Any, Optional


PROCUREMENT_KEYWORDS = [
    "price", "quotation", "quote", "invoice", "supplier",
    "vendor", "delivery", "payment", "amount", "total",
    "unit", "quantity", "tax", "gst", "rate", "offer",
    "purchase", "order", "supply", "cost", "per",
]

_CURRENCY_MAP = {
    "rs": "INR",
    "rs.": "INR",
    "rupees": "INR",
    "rupee": "INR",
    "$": "USD",
    "usd$": "USD",
    "€": "EUR",
    "£": "GBP",
}


def normalize_currency(currency: str) -> str:
    if not currency:
        return currency
    stripped = currency.strip()
    lower = stripped.lower()
    if lower in _CURRENCY_MAP:
        return _CURRENCY_MAP[lower]
    if re.fullmatch(r"[A-Za-z]{3}", stripped):
        return stripped.upper()
    return stripped


def check_duplicate(rfq_id: int, supplier_id: int, db_quotations: list) -> bool:
    for q in db_quotations:
        qrid = q.rfq_id if hasattr(q, "rfq_id") else q.get("rfq_id")
        qsid = q.supplier_id if hasattr(q, "supplier_id") else q.get("supplier_id")
        if qrid == rfq_id and qsid == supplier_id:
            return True
    return False


def calculate_validation_score(errors: list, warnings: list) -> int:
    score = 100 - (len(errors) * 20) - (len(warnings) * 5)
    return max(0, score)


def validate_quotation(data: dict) -> dict:
    errors: list[str] = []
    warnings: list[str] = []

    # --- Mandatory field checks ---
    rfq_id = data.get("rfq_id")
    if rfq_id is None:
        errors.append("rfq_id is required.")

    supplier_id = data.get("supplier_id")
    if supplier_id is None:
        errors.append("supplier_id is required.")

    unit_price = data.get("unit_price")
    if unit_price is None:
        errors.append("unit_price is required and must be greater than 0.")
    elif not isinstance(unit_price, (int, float)) or unit_price <= 0:
        errors.append("unit_price must be a positive number.")

    delivery_time_days = data.get("delivery_time_days")
    if delivery_time_days is None:
        errors.append("delivery_time_days is required and must be greater than 0.")
    elif not isinstance(delivery_time_days, int) or delivery_time_days <= 0:
        errors.append("delivery_time_days must be a positive integer.")

    currency = data.get("currency")
    if not currency:
        errors.append("currency is required (e.g. INR, USD, EUR).")
    elif not re.fullmatch(r"[A-Z]{3}", str(currency)):
        errors.append(f"currency must be exactly 3 uppercase letters (got '{currency}'). Use normalize_currency() before validation.")

    moq = data.get("moq")
    if moq is not None and moq < 1:
        errors.append("moq must be >= 1 if provided.")

    # --- Type and range checks ---
    total_amount = data.get("total_amount")
    if total_amount is not None:
        if not isinstance(total_amount, (int, float)) or total_amount <= 0:
            errors.append("total_amount must be a positive number if provided.")

    gst_percentage = data.get("gst_percentage")
    if gst_percentage is not None:
        if not isinstance(gst_percentage, (int, float)) or not (0 <= gst_percentage <= 100):
            errors.append("gst_percentage must be between 0 and 100.")

    validity_days = data.get("validity_days")
    if validity_days is not None:
        if not isinstance(validity_days, int) or validity_days <= 0:
            errors.append("validity_days must be a positive integer if provided.")

    warranty_months = data.get("warranty_months")
    if warranty_months is not None:
        if not isinstance(warranty_months, int) or warranty_months < 0:
            errors.append("warranty_months must be >= 0 if provided.")

    # --- Warnings ---
    if gst_percentage is not None and isinstance(gst_percentage, (int, float)) and gst_percentage > 28:
        warnings.append(f"gst_percentage {gst_percentage}% is unusually high for India (typical max is 28%).")

    if validity_days is not None and isinstance(validity_days, int) and validity_days < 7:
        warnings.append(f"validity_days {validity_days} is a very short validity period (less than 7 days).")

    if warranty_months == 0:
        warnings.append("warranty_months is 0 — no warranty provided.")

    if delivery_time_days is not None and isinstance(delivery_time_days, int) and delivery_time_days > 90:
        warnings.append(f"delivery_time_days {delivery_time_days} is a very long delivery time (over 90 days).")

    if (
        total_amount is not None
        and unit_price is not None
        and moq is not None
        and isinstance(total_amount, (int, float))
        and isinstance(unit_price, (int, float))
        and isinstance(moq, (int, float))
        and unit_price > 0
        and moq > 0
    ):
        expected = unit_price * moq
        tolerance = expected * 0.05
        if abs(total_amount - expected) > tolerance:
            warnings.append(
                f"total_amount {total_amount} does not match unit_price × moq "
                f"({unit_price} × {moq} = {expected:.2f}). Possible pricing mismatch."
            )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


def validate_document_content(extracted_text: str, structured_data: Optional[dict]) -> dict:
    document_errors: list[str] = []
    document_warnings: list[str] = []

    text_lower = (extracted_text or "").lower()

    # Step 1 — procurement keyword check
    found_keywords = [kw for kw in PROCUREMENT_KEYWORDS if kw in text_lower]
    if len(found_keywords) < 3:
        document_errors.append(
            "Document does not appear to be a procurement or quotation document. "
            "Please upload a valid supplier quotation, invoice, or price list."
        )
        return {
            "is_valid_document": False,
            "document_errors": document_errors,
            "document_warnings": document_warnings,
            "extracted_fields_count": 0,
            "procurement_keywords_found": found_keywords,
        }

    # Step 2 & 3 — structured data checks (evaluated if structured_data is provided)
    extracted_count = 0
    if structured_data is not None:
        unit_price = structured_data.get("unit_price")
        total_amount = structured_data.get("total_amount")

        if unit_price is None and total_amount is None:
            document_errors.append(
                "No price information found in the document. "
                "Please ensure the document contains clear pricing details."
            )
            return {
                "is_valid_document": False,
                "document_errors": document_errors,
                "document_warnings": document_warnings,
                "extracted_fields_count": 0,
                "procurement_keywords_found": found_keywords,
            }

        tracked_fields = ["unit_price", "total_amount", "delivery_time_days", "currency", "payment_terms", "supplier_name"]
        extracted_count = sum(1 for f in tracked_fields if structured_data.get(f) is not None)

        if extracted_count < 2:
            document_errors.append(
                f"Insufficient data extracted from document. Only {extracted_count} field(s) found. "
                "Please upload a more detailed quotation document."
            )
            return {
                "is_valid_document": False,
                "document_errors": document_errors,
                "document_warnings": document_warnings,
                "extracted_fields_count": extracted_count,
                "procurement_keywords_found": found_keywords,
            }

    # Step 4 — language / ASCII check
    if extracted_text:
        ascii_chars = sum(1 for c in extracted_text if ord(c) < 128)
        ascii_ratio = ascii_chars / len(extracted_text)
        if ascii_ratio < 0.5:
            document_warnings.append(
                "Document may contain non-English content. Extraction accuracy may be reduced."
            )

    return {
        "is_valid_document": True,
        "document_errors": document_errors,
        "document_warnings": document_warnings,
        "extracted_fields_count": extracted_count,
        "procurement_keywords_found": found_keywords,
    }
