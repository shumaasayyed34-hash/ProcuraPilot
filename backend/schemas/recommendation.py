from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class SupplierRank(BaseModel):
    supplier_id: int
    supplier_name: str
    ahp_score: float
    risk_score: float
    risk_category: str
    market_deviation: float
    quoted_price: float
    recommendation_score: float
    rank: Optional[int]
    excluded: bool
    exclusion_reason: Optional[str]


class RecommendationResponse(BaseModel):
    rfq_id: int
    winner_supplier_id: Optional[int]
    winner_supplier_name: Optional[str]
    rankings: List[SupplierRank]
    rationale: Dict[str, Any]
    savings_estimate: Dict[str, Any]
    generated_at: Optional[str]


class ApproveVendorRequest(BaseModel):
    approved_supplier_id: int
    approval_notes: Optional[str] = None


class CompareSupplier(BaseModel):
    supplier_id: int
    supplier_name: str
    ahp_score: float
    risk_score: float
    risk_category: str
    market_deviation: float
    quoted_price: float
    recommendation_score: float
    rank: Optional[int]
    excluded: bool


class CompareResponse(BaseModel):
    rfq_id: int
    suppliers: List[CompareSupplier]
