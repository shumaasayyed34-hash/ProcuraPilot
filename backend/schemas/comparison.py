"""
Pydantic Schemas for Phase 2: Supplier Comparison Engine (P2.4 Deliverable)

Defines standard JSON schema output format consumed by Frontend Supplier Comparison
Dashboard & Responsive Tables (Faisal's F2.2 & F2.4) and fed by Validation Engine (S2.2/S2.4).
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class CriterionType(str, Enum):
    """Directionality of criteria for min-max normalization."""
    COST = "cost"          # Lower is better (Price, Delivery Time, Defect Rate)
    BENEFIT = "benefit"    # Higher is better (Rating, Quality, Warranty, ESG)


class ComparisonBadge(str, Enum):
    """Smart UI highlight badges for the frontend comparison cards & tables."""
    BEST_OVERALL = "Best Overall"
    LOWEST_PRICE = "Lowest Price"
    FASTEST_DELIVERY = "Fastest Delivery"
    TOP_RATED = "Highest Quality"
    BEST_WARRANTY = "Longest Warranty"
    ESG_LEADER = "ESG Leader"
    RUNNER_UP = "Runner Up"


class CriteriaWeights(BaseModel):
    """Configurable weights for Multi-Criteria Decision Making (MCDM).
    
    Weights are automatically normalized to sum to 1.0 (100%).
    """
    price: float = Field(default=0.40, ge=0.0, le=1.0, description="Weight for price / landed cost")
    delivery_time: float = Field(default=0.25, ge=0.0, le=1.0, description="Weight for delivery lead time")
    quality_rating: float = Field(default=0.15, ge=0.0, le=1.0, description="Weight for supplier rating & quality")
    warranty: float = Field(default=0.10, ge=0.0, le=1.0, description="Weight for warranty duration")
    esg_compliance: float = Field(default=0.10, ge=0.0, le=1.0, description="Weight for ESG / ISO certification / compliance")

    @model_validator(mode="after")
    def auto_normalize_weights(self) -> "CriteriaWeights":
        total = self.price + self.delivery_time + self.quality_rating + self.warranty + self.esg_compliance
        if total > 0 and abs(total - 1.0) > 1e-4:
            object.__setattr__(self, "price", round(self.price / total, 4))
            object.__setattr__(self, "delivery_time", round(self.delivery_time / total, 4))
            object.__setattr__(self, "quality_rating", round(self.quality_rating / total, 4))
            object.__setattr__(self, "warranty", round(self.warranty / total, 4))
            object.__setattr__(self, "esg_compliance", round(self.esg_compliance / total, 4))
        return self


class FXConversionAudit(BaseModel):
    """Audit details for multi-currency conversion to base currency."""
    original_currency: str = Field(..., description="Quotation currency as extracted (e.g. USD, EUR, INR)")
    target_currency: str = Field(default="INR", description="Base comparison currency")
    exchange_rate: float = Field(default=1.0, description="Exchange rate applied: 1 Original = X Target")
    conversion_timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the applied FX rate"
    )
    source: str = Field(default="ValidationEngine_S2.4", description="Source of FX rate")


class CriterionDetail(BaseModel):
    """Detailed scoring breakdown for a single criterion."""
    criterion_name: str = Field(..., description="Name of criterion (e.g. 'price', 'delivery_time')")
    criterion_type: CriterionType = Field(..., description="Cost (lower better) or Benefit (higher better)")
    raw_value: Optional[float] = Field(None, description="Original numerical value from quotation")
    raw_unit: Optional[str] = Field(None, description="Unit of raw value (e.g., 'USD', 'days', 'months')")
    normalized_base_value: Optional[float] = Field(None, description="Converted to common baseline (e.g., INR)")
    score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Min-max normalized score scaled from 0.0 to 100.0"
    )
    weight: float = Field(..., description="Weight applied to this criterion in composite score")
    weighted_score: float = Field(..., description="score * weight")
    is_best_in_class: bool = Field(default=False, description="True if this supplier achieved the best value")


class SupplierComparisonItem(BaseModel):
    """Comparison record for an individual supplier in the responsive table (F2.2 & F2.4)."""
    supplier_id: int = Field(..., description="Supplier ID")
    supplier_name: str = Field(..., description="Trade name of supplier")
    quotation_id: Optional[int] = Field(None, description="Quotation database ID")
    quote_number: Optional[str] = Field(None, description="Quotation document number")
    country: Optional[str] = Field(default="India", description="Country of supplier")
    is_iso_certified: bool = Field(default=False, description="ISO certification status")
    
    # Financial Display (Original vs Base Currency)
    currency: str = Field(default="INR", description="Original currency of quotation")
    raw_unit_price: Optional[float] = Field(None, description="Original unit price")
    raw_total_amount: Optional[float] = Field(None, description="Original total amount")
    base_unit_price: Optional[float] = Field(None, description="Unit price converted to base currency")
    base_total_amount: Optional[float] = Field(None, description="Total amount converted to base currency")
    fx_audit: FXConversionAudit = Field(..., description="FX conversion details")

    # Operational Parameters
    delivery_time_days: Optional[int] = Field(None, description="Lead time in calendar days")
    warranty_months: Optional[int] = Field(None, description="Warranty coverage in months")
    payment_terms: Optional[str] = Field(None, description="Quoted payment terms")
    supplier_rating: float = Field(default=3.0, ge=0.0, le=5.0, description="Historical rating (0-5 stars)")

    # Scoring & Ranking
    composite_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Overall weighted multi-criteria score (0-100)"
    )
    rank: int = Field(..., ge=1, description="Ranking position (1 = Best recommended)")
    badges: List[ComparisonBadge] = Field(default_factory=list, description="UI visual highlight badges")
    
    # Criteria-by-criteria breakdown for radar charts & expandable table rows
    criteria_scores: Dict[str, CriterionDetail] = Field(
        default_factory=dict,
        description="Scoring breakdown keyed by criterion name"
    )


class CriterionBenchmark(BaseModel):
    """Statistical benchmark for a given parameter across all received quotes."""
    criterion_name: str
    criterion_type: CriterionType
    unit: str
    best_value: Optional[float] = None
    worst_value: Optional[float] = None
    average_value: Optional[float] = None
    best_supplier_name: Optional[str] = None


class BenchmarkSummary(BaseModel):
    """Aggregate benchmark indicators for executive overview cards in Dashboard."""
    total_suppliers_compared: int
    lowest_price_base: Optional[float] = None
    highest_price_base: Optional[float] = None
    price_variance_percent: Optional[float] = None
    fastest_delivery_days: Optional[int] = None
    slowest_delivery_days: Optional[int] = None
    max_warranty_months: Optional[int] = None
    benchmarks_by_criterion: Dict[str, CriterionBenchmark] = Field(default_factory=dict)


class ComparisonEngineResponse(BaseModel):
    """Standard JSON schema output format for Phase 2 Supplier Comparison (P2.4).
    
    Powers Faisal's Frontend Comparison Dashboard, responsive tables, and charts.
    """
    rfq_id: int = Field(..., description="Associated RFQ ID")
    base_currency: str = Field(default="INR", description="Common baseline currency for comparison")
    comparison_timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Calculation generation timestamp"
    )
    weights_applied: CriteriaWeights = Field(..., description="Criteria weights applied during calculation")
    benchmark_summary: BenchmarkSummary = Field(..., description="High-level best/worst/average metrics")
    recommended_supplier_id: int = Field(..., description="Supplier ID of top-ranked winner")
    recommended_supplier_name: str = Field(..., description="Trade name of top-ranked winner")
    suppliers: List[SupplierComparisonItem] = Field(
        ...,
        description="List of ranked suppliers sorted from Rank 1 to N"
    )


class SupplierQuoteInput(BaseModel):
    """Input payload for ad-hoc comparison requests or API calls."""
    supplier_id: int
    supplier_name: str
    quotation_id: Optional[int] = None
    quote_number: Optional[str] = None
    country: Optional[str] = "India"
    is_iso_certified: bool = False
    currency: str = "INR"
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    delivery_time_days: Optional[int] = None
    warranty_months: Optional[int] = 0
    payment_terms: Optional[str] = None
    supplier_rating: float = 3.0  # 0 to 5
    esg_score: Optional[float] = 50.0  # 0 to 100


class ComparisonRequest(BaseModel):
    """Request schema for comparison endpoint."""
    rfq_id: int
    base_currency: str = "INR"
    weights: Optional[CriteriaWeights] = None
    quotes: Optional[List[SupplierQuoteInput]] = None
    custom_fx_rates: Optional[Dict[str, float]] = None
