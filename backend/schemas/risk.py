from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class RiskReport(BaseModel):
    id: Optional[int] = None
    supplier_id: int
    supplier_name: Optional[str] = None
    rfq_id: Optional[int] = None
    financial_risk: float
    compliance_risk: float
    delivery_risk: float
    country_risk: float
    esg_risk: float
    fraud_risk: float
    composite_risk_score: float
    risk_category: str
    risk_narrative: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RiskHeatmapSupplier(BaseModel):
    supplier_id: int
    supplier_name: str
    financial_risk: float
    compliance_risk: float
    delivery_risk: float
    country_risk: float
    esg_risk: float
    fraud_risk: float
    composite_risk_score: float
    risk_category: str
    risk_narrative: Optional[str] = None


class RiskHeatmapData(BaseModel):
    rfq_id: int
    suppliers: List[RiskHeatmapSupplier]


class RiskAlert(BaseModel):
    supplier_id: int
    supplier_name: str
    composite_risk_score: float
    risk_category: str
    primary_risk_reason: str
    created_at: Optional[datetime] = None


class RecalculateAllResponse(BaseModel):
    total_suppliers: int
    recalculated: int
    high_risk_found: int
    critical_risk_found: int
