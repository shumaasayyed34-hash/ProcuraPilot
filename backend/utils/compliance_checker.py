import re
from datetime import date, timedelta
from typing import Any, Dict, List

REQUIRED_CERT_TYPES = ["GST", "ISO", "MSME", "ESG"]


def check_gst_validity(gstin: str) -> Dict:
    if not gstin:
        return {"is_valid_format": False, "gstin": gstin, "state_code": None, "error": "GSTIN is empty"}

    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"is_valid_format": False, "gstin": gstin, "state_code": None, "error": "GSTIN must be 15 characters"}

    # First 2: state code digits, chars 3-12: PAN (5 letters + 4 digits + 1 letter), char 13: digit, char 14: Z, char 15: digit/letter
    pattern = r"^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z]\d$"
    if not re.match(pattern, gstin):
        return {"is_valid_format": False, "gstin": gstin, "state_code": gstin[:2], "error": "Invalid GSTIN format"}

    return {"is_valid_format": True, "gstin": gstin, "state_code": gstin[:2], "error": None}


def check_certificate_expiry(certificates: List[Any]) -> Dict:
    today = date.today()
    soon_threshold = today + timedelta(days=90)

    expired = []
    expiring_soon = []
    valid = []
    present_types = set()

    for cert in certificates:
        cert_type = cert.certificate_type.value if hasattr(cert.certificate_type, 'value') else cert.certificate_type
        present_types.add(cert_type)
        cert_info = {
            "id": cert.id,
            "certificate_type": cert_type,
            "certificate_number": cert.certificate_number,
            "expiry_date": str(cert.expiry_date) if cert.expiry_date else None,
        }

        if cert.is_expired or (cert.expiry_date and cert.expiry_date < today):
            expired.append(cert_info)
        elif cert.expiry_date and cert.expiry_date <= soon_threshold:
            expiring_soon.append(cert_info)
        else:
            valid.append(cert_info)

    missing_types = [t for t in REQUIRED_CERT_TYPES if t not in present_types]

    return {
        "expired": expired,
        "expiring_soon": expiring_soon,
        "valid": valid,
        "missing_types": missing_types,
    }


def generate_compliance_report(supplier, certificates: List[Any]) -> Dict:
    cert_types = {
        c.certificate_type.value if hasattr(c.certificate_type, 'value') else c.certificate_type
        for c in certificates
    }

    expiry_info = check_certificate_expiry(certificates)
    gstin_check = check_gst_validity(supplier.gstin or "")

    issues = []
    score = 100

    if not gstin_check["is_valid_format"]:
        issues.append("Invalid or missing GSTIN")
        score -= 20

    if "GST" not in cert_types:
        issues.append("Missing GST certificate")
        score -= 15
    if "ISO" not in cert_types:
        issues.append("Missing ISO certificate")
        score -= 15
    if "MSME" not in cert_types:
        issues.append("Missing MSME certificate")
        score -= 10
    if "ESG" not in cert_types:
        issues.append("Missing ESG certificate")
        score -= 10

    for _ in expiry_info["expired"]:
        score -= 10
        issues.append(f"Expired certificate: {_['certificate_type']}")

    return {
        "supplier_id": supplier.id,
        "gstin_valid": gstin_check["is_valid_format"],
        "has_gst_cert": "GST" in cert_types,
        "has_iso_cert": "ISO" in cert_types,
        "has_msme_cert": "MSME" in cert_types,
        "has_esg_cert": "ESG" in cert_types,
        "expired_certs": expiry_info["expired"],
        "expiring_soon": expiry_info["expiring_soon"],
        "compliance_score": max(score, 0),
        "issues": issues,
    }
