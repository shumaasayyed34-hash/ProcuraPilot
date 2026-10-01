from typing import Optional

EXCHANGE_RATES: dict[str, float] = {
    "INR": 1.0,
    "USD": 83.5,
    "EUR": 90.2,
    "GBP": 105.8,
    "AED": 22.7,
    "SGD": 61.9,
    "JPY": 0.55,
    "CNY": 11.5,
    "MYR": 17.8,
    "THB": 2.3,
}


def convert_to_inr(amount: float, currency: str) -> float:
    rate = EXCHANGE_RATES.get(currency.upper(), 1.0)
    return round(amount * rate, 4)


def normalize_prices_to_inr(quotation_data: dict) -> dict:
    currency = (quotation_data.get("currency") or "INR").upper()
    if currency == "INR":
        return quotation_data

    data = dict(quotation_data)
    if data.get("unit_price") is not None:
        data["unit_price"] = convert_to_inr(data["unit_price"], currency)
    if data.get("total_amount") is not None:
        data["total_amount"] = convert_to_inr(data["total_amount"], currency)
    data["currency"] = "INR"
    return data
