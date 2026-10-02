"""
AHP Agent Pydantic Schemas (Phase 3 Tasks I3.1 & I3.3)
Defines communication protocols, trigger payloads, score breakdowns, and rationale outputs for AHP Decision Agent.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class AHPEvaluationRequest(BaseModel):
    """Payload to trigger an AHP Supplier Evaluation Run."""
    run_id: str = Field(..., description="Unique run/session identifier (e.g. AHP-RUN-2026-001)")
    rfq_id: int = Field(..., description="Target RFQ ID")
    criteria_weights: Dict[str, float] = Field(
        default_factory=lambda: {"price": 0.40, "quality_rating": 0.25, "delivery_time": 0.20, "esg_compliance": 0.15},
        description="Weights for AHP evaluation criteria (must sum to 1.0)"
    )
    supplier_quotes: List[Dict[str, Any]] = Field(..., description="List of supplier quote records")

    @field_validator("criteria_weights")
    @classmethod
    def validate_weights_sum(cls, weights: Dict[str, float]) -> Dict[str, float]:
        total = sum(weights.values())
        if abs(total - 1.0) > 0.05:
            raise ValueError(f"Criteria weights must sum to approximately 1.0 (got {total:.3f})")
        return weights


class AHPScoreBreakdown(BaseModel):
    """Breakdown for a single evaluation criterion for a supplier."""
    criterion_name: str = Field(..., description="Name of the criterion (e.g. price, quality_rating)")
    raw_value: Any = Field(..., description="Unnormalized input value")
    normalized_score: float = Field(..., description="Normalized score [0.0 - 100.0]")
    weight: float = Field(..., description="Criteria weight factor")
    weighted_score: float = Field(..., description="Weighted contribution to total score")
    is_best_in_class: bool = Field(default=False, description="True if top performer in this criterion")


class AHPSupplierRankItem(BaseModel):
    """Ranked evaluation output for a single supplier."""
    supplier_id: int = Field(..., description="Unique supplier ID")
    supplier_name: str = Field(..., description="Supplier company name")
    quotation_id: Optional[int] = Field(None, description="Associated quotation ID")
    rank: int = Field(..., description="Final ordinal rank (1 = Winner)")
    total_score: float = Field(..., description="Composite AHP Utility Score [0.0 - 100.0]")
    badges: List[str] = Field(default_factory=list, description="Performance badges earned")
    criteria_breakdown: Dict[str, AHPScoreBreakdown] = Field(..., description="Detailed criteria score breakdown")


class AHPRationaleSummary(BaseModel):
    """Structured text rationale explaining why the top supplier won."""
    winner_supplier_id: int = Field(..., description="ID of winning supplier")
    winner_name: str = Field(..., description="Name of winning supplier")
    winner_total_score: float = Field(..., description="Final score of winning supplier")
    margin_over_runner_up: float = Field(..., description="Point lead over 2nd place supplier")
    key_differentiators: List[str] = Field(..., description="List of key winning criteria factors")
    rationale_text: str = Field(..., description="Human-readable decision explanation for procurement team")


class AHPAgentDecisionResponse(BaseModel):
    """Full decision output returned by AHPDecisionAgent and stored in Shared Memory."""
    run_id: str = Field(..., description="Unique run/session identifier")
    rfq_id: int = Field(..., description="Associated RFQ ID")
    status: str = Field(default="SUCCESS", description="Execution status (SUCCESS / FAILED)")
    total_suppliers_evaluated: int = Field(..., description="Count of evaluated suppliers")
    criteria_weights: Dict[str, float] = Field(..., description="Criteria weights applied")
    rankings: List[AHPSupplierRankItem] = Field(..., description="Ordered list of supplier rankings")
    rationale: AHPRationaleSummary = Field(..., description="Text decision explanation")
    executed_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO timestamp of evaluation execution"
    )
