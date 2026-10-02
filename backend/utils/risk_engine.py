from typing import Dict, List, Any

COUNTRY_RISK_MAP: Dict[str, int] = {
    # Low risk: 15
    "india": 15, "usa": 15, "uk": 15, "germany": 15, "japan": 15,
    "singapore": 15, "australia": 15, "canada": 15, "france": 15, "netherlands": 15,
    # Medium risk: 40
    "china": 40, "brazil": 40, "mexico": 40, "turkey": 40,
    "indonesia": 40, "vietnam": 40, "thailand": 40, "malaysia": 40, "philippines": 40,
    # High risk: 65
    "russia": 65, "pakistan": 65, "nigeria": 65,
    "bangladesh": 65, "egypt": 65, "ukraine": 65, "myanmar": 65,
    # Critical risk: 85
    "north korea": 85, "iran": 85, "syria": 85,
    "venezuela": 85, "afghanistan": 85, "sudan": 85,
}

FREE_EMAIL_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com"}


def calculate_financial_risk(supplier) -> float:
    score = 0
    years = supplier.years_in_business or 0
    if years < 2:
        score += 40
    elif years <= 5:
        score += 20

    revenue = supplier.annual_revenue or 0
    if revenue < 1_000_000:
        score += 30
    elif revenue <= 10_000_000:
        score += 15

    if not supplier.email:
        score += 10

    return min(score, 100)


def calculate_compliance_risk(certificates: List[Any]) -> float:
    if not certificates:
        return 80.0

    score = 10
    cert_types = {c.certificate_type.value if hasattr(c.certificate_type, 'value') else c.certificate_type
                  for c in certificates}

    for cert in certificates:
        if cert.is_expired:
            score += 25
        elif not cert.is_verified:
            score += 10

    if "GST" not in cert_types:
        score += 20
    if "ISO" not in cert_types:
        score += 15

    return min(score, 100)


def calculate_delivery_risk(delivery_records: List[Any]) -> float:
    if not delivery_records:
        return 50.0

    total = len(delivery_records)
    on_time_count = sum(1 for r in delivery_records if r.on_time)
    on_time_rate = (on_time_count / total) * 100

    if on_time_rate < 50:
        score = 80
    elif on_time_rate < 70:
        score = 60
    elif on_time_rate <= 85:
        score = 35
    else:
        score = 15

    delays = [r.delay_days for r in delivery_records if r.delay_days is not None]
    if delays and (sum(delays) / len(delays)) > 10:
        score += 15

    return min(score, 100)


def calculate_country_risk(country: str) -> float:
    if not country:
        return 50.0
    return float(COUNTRY_RISK_MAP.get(country.strip().lower(), 50))


def calculate_esg_risk(supplier, certificates: List[Any]) -> float:
    cert_types = {c.certificate_type.value if hasattr(c.certificate_type, 'value') else c.certificate_type
                  for c in certificates}

    has_esg = "ESG" in cert_types
    has_iso = "ISO" in cert_types

    if has_esg and has_iso:
        return 10.0

    score = 30
    if not has_esg:
        score += 40
    if not has_iso:
        score += 20
    if not supplier.msme_number:
        score += 10

    return min(score, 100)


def calculate_fraud_risk(supplier) -> float:
    score = 10

    if not supplier.gstin:
        score += 35
    if not supplier.address:
        score += 20

    if supplier.email:
        domain = supplier.email.split("@")[-1].lower()
        if domain in FREE_EMAIL_DOMAINS:
            score += 15

    name = (supplier.name or "").strip()
    if len(name.split()) < 2:
        score += 10

    years = supplier.years_in_business or 0
    if years < 1:
        score += 20

    return min(score, 100)


def calculate_composite_risk(
    financial: float,
    compliance: float,
    delivery: float,
    country: float,
    esg: float,
    fraud: float,
) -> float:
    composite = (
        financial * 0.25
        + compliance * 0.20
        + delivery * 0.20
        + country * 0.15
        + esg * 0.10
        + fraud * 0.10
    )
    return round(composite, 2)


def get_risk_category(composite_score: float) -> str:
    if composite_score <= 30:
        return "low"
    elif composite_score <= 60:
        return "medium"
    elif composite_score <= 80:
        return "high"
    else:
        return "critical"


def generate_risk_narrative(supplier_name: str, scores: Dict[str, float]) -> str:
    composite = scores.get("composite", 0)
    category = get_risk_category(composite)

    dimension_scores = {
        "financial": scores.get("financial", 0),
        "compliance": scores.get("compliance", 0),
        "delivery": scores.get("delivery", 0),
        "country": scores.get("country", 0),
        "esg": scores.get("esg", 0),
        "fraud": scores.get("fraud", 0),
    }

    sorted_dims = sorted(dimension_scores.items(), key=lambda x: x[1], reverse=True)
    top3 = sorted_dims[:3]
    lowest = sorted_dims[-1]

    primary = ", ".join(f"{dim} ({score:.0f})" for dim, score in top3)
    return (
        f"Supplier {supplier_name} has a {category} overall risk profile with a composite score of "
        f"{composite}/100. Primary risk areas are {primary}. "
        f"Strongest area is {lowest[0]} ({lowest[1]:.0f})."
    )
