from typing import Any, Dict, List, Optional
from pydantic import BaseModel, field_validator


class AHPCalculateRequest(BaseModel):
    rfq_id: int
    criteria_weights: Dict[str, float]

    @field_validator("criteria_weights")
    @classmethod
    def weights_sum_to_one(cls, v: dict) -> dict:
        total = sum(v.values())
        if abs(total - 1.0) > 0.01:
            raise ValueError(f"criteria_weights must sum to 1.0 (got {total:.4f})")
        return v


class AHPPairwiseRequest(BaseModel):
    rfq_id: int
    pairwise_matrix: List[List[float]]
    criteria: List[str]


class AHPResult(BaseModel):
    supplier_id: int
    supplier_name: str
    ahp_score: float
    price_score: float
    quality_score: float
    delivery_score: float
    esg_score: float
    rank: int


class AHPResponse(BaseModel):
    rfq_id: int
    criteria_weights: Dict[str, float]
    rankings: List[AHPResult]
    total_suppliers: int


class AHPPairwiseResponse(BaseModel):
    rfq_id: int
    criteria_weights: Dict[str, float]
    consistency: Dict[str, Any]
    rankings: List[AHPResult]
    total_suppliers: int
