import random
from datetime import datetime, date, timezone

COMMODITY_PRICES = {
    "electronics": {"price": 8500, "unit": "per unit", "currency": "INR"},
    "steel": {"price": 55000, "unit": "per tonne", "currency": "INR"},
    "copper": {"price": 720, "unit": "per kg", "currency": "INR"},
    "aluminium": {"price": 210, "unit": "per kg", "currency": "INR"},
    "plastic": {"price": 95, "unit": "per kg", "currency": "INR"},
    "rubber": {"price": 160, "unit": "per kg", "currency": "INR"},
    "paper": {"price": 45, "unit": "per kg", "currency": "INR"},
    "glass": {"price": 35, "unit": "per kg", "currency": "INR"},
    "wood": {"price": 1200, "unit": "per cubic foot", "currency": "INR"},
    "cotton": {"price": 62000, "unit": "per bale", "currency": "INR"},
    "packaging": {"price": 25, "unit": "per kg", "currency": "INR"},
    "chemicals": {"price": 180, "unit": "per kg", "currency": "INR"},
    "fuel": {"price": 96, "unit": "per litre", "currency": "INR"},
    "cement": {"price": 380, "unit": "per bag", "currency": "INR"},
    "default": {"price": 1000, "unit": "per unit", "currency": "INR"},
}


def get_market_price(commodity_name: str) -> dict:
    key = commodity_name.lower().strip()
    data = COMMODITY_PRICES.get(key, COMMODITY_PRICES["default"])
    base_price = data["price"]
    variation = random.uniform(-0.05, 0.05)
    price = round(base_price * (1 + variation), 2)
    return {
        "commodity": key,
        "price": price,
        "unit": data["unit"],
        "currency": data["currency"],
        "source": "mock_market_data",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }


def calculate_price_deviation(quoted_price: float, market_price: float) -> dict:
    deviation_amount = quoted_price - market_price
    deviation_percentage = round((deviation_amount / market_price) * 100, 2)
    is_above_market = deviation_percentage > 0
    is_overpriced = deviation_percentage > 15

    if deviation_percentage < -10:
        fairness_label = "Below Market (Great Deal)"
    elif deviation_percentage < -3:
        fairness_label = "Slightly Below Market"
    elif deviation_percentage <= 3:
        fairness_label = "At Market Rate"
    elif deviation_percentage <= 15:
        fairness_label = "Slightly Above Market"
    elif deviation_percentage <= 30:
        fairness_label = "Above Market"
    else:
        fairness_label = "Significantly Overpriced"

    return {
        "quoted_price": quoted_price,
        "market_price": market_price,
        "deviation_amount": round(deviation_amount, 2),
        "deviation_percentage": deviation_percentage,
        "is_above_market": is_above_market,
        "is_overpriced": is_overpriced,
        "fairness_label": fairness_label,
    }


def generate_price_forecast(commodity_name: str, days: int = 90) -> dict:
    market_data = get_market_price(commodity_name)
    current_price = market_data["price"]

    def next_price(p):
        change = random.uniform(-0.02, 0.02)
        return round(p * (1 + change), 2)

    forecast_30 = next_price(current_price)
    forecast_60 = next_price(forecast_30)
    forecast_90 = next_price(forecast_60)

    trend_pct = round(((forecast_90 - current_price) / current_price) * 100, 2)

    if trend_pct > 3:
        trend = "upward"
        recommendation = "Consider buying now before prices rise further"
    elif trend_pct < -3:
        trend = "downward"
        recommendation = "Consider waiting for better market conditions"
    else:
        trend = "stable"
        recommendation = "Market is stable, proceed with procurement as planned"

    return {
        "commodity": commodity_name.lower().strip(),
        "current_price": current_price,
        "forecast_30_days": forecast_30,
        "forecast_60_days": forecast_60,
        "forecast_90_days": forecast_90,
        "trend": trend,
        "trend_percentage": trend_pct,
        "recommendation": recommendation,
        "generated_at": date.today().isoformat(),
    }


def benchmark_rfq_quotations(rfq_category: str, quotations: list) -> dict:
    market_data = get_market_price(rfq_category)
    market_price = market_data["price"]
    recommended_target = round(market_price * 1.05, 2)

    supplier_benchmarks = []
    for q in quotations:
        quoted = q.get("unit_price") or q.get("quoted_price", 0)
        dev = calculate_price_deviation(quoted, market_price)
        supplier_benchmarks.append({
            "supplier_id": q.get("supplier_id"),
            "supplier_name": q.get("supplier_name", ""),
            "quoted_price": quoted,
            "deviation_percentage": dev["deviation_percentage"],
            "deviation_amount": dev["deviation_amount"],
            "fairness_label": dev["fairness_label"],
            "is_overpriced": dev["is_overpriced"],
            "recommended_target_price": recommended_target,
        })

    prices = [b["quoted_price"] for b in supplier_benchmarks]
    avg_quoted = round(sum(prices) / len(prices), 2) if prices else 0
    avg_dev = round(
        sum(b["deviation_percentage"] for b in supplier_benchmarks) / len(supplier_benchmarks), 2
    ) if supplier_benchmarks else 0

    return {
        "rfq_category": rfq_category.lower().strip(),
        "market_price": market_price,
        "market_unit": market_data["unit"],
        "average_quoted_price": avg_quoted,
        "lowest_quoted_price": min(prices) if prices else 0,
        "highest_quoted_price": max(prices) if prices else 0,
        "average_deviation_percentage": avg_dev,
        "overpriced_suppliers_count": sum(1 for b in supplier_benchmarks if b["is_overpriced"]),
        "supplier_benchmarks": supplier_benchmarks,
    }
