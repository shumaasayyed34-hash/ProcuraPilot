from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class MarketPrice(BaseModel):
    commodity: str
    price: float
    unit: str
    currency: str
    source: str
    retrieved_at: str


class PriceForecast(BaseModel):
    commodity: str
    current_price: float
    forecast_30_days: float
    forecast_60_days: float
    forecast_90_days: float
    trend: str
    trend_percentage: float
    recommendation: str
    generated_at: str


class MarketPriceWithForecast(MarketPrice, PriceForecast):
    pass


class SupplierBenchmark(BaseModel):
    supplier_id: Optional[int]
    supplier_name: str
    quoted_price: float
    deviation_percentage: float
    deviation_amount: float
    fairness_label: str
    is_overpriced: bool
    recommended_target_price: float


class BenchmarkReport(BaseModel):
    rfq_category: str
    market_price: float
    market_unit: str
    average_quoted_price: float
    lowest_quoted_price: float
    highest_quoted_price: float
    average_deviation_percentage: float
    overpriced_suppliers_count: int
    supplier_benchmarks: List[SupplierBenchmark]


class OverpricedSupplier(BaseModel):
    supplier_name: str
    quoted_price: float
    deviation_percentage: float
    potential_saving: float
    recommended_target: float


class OverpricedReport(BaseModel):
    rfq_id: int
    market_price: float
    overpriced_suppliers: List[OverpricedSupplier]
