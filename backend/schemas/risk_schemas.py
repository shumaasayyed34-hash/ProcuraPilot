"""
Pydantic Data Models for Phase 4 Risk Intelligence Module (I4.1, I4.2, I4.3)
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NewsArticle(BaseModel):
    title: str = Field(..., description="Article title or headline")
    source: str = Field("Unknown", description="Publisher or news domain")
    snippet: str = Field("", description="Article preview text or full content")
    url: Optional[str] = Field(None, description="Direct URL link to article")
    published_at: Optional[str] = Field(None, description="Publication timestamp ISO string")
    is_simulated: bool = Field(False, description="True if article is fallback simulated mock data")


class NewsSentimentResult(BaseModel):
    sentiment_score: float = Field(0.0, description="Normalized sentiment score from -1.0 (very negative/high risk) to +1.0 (very positive)")
    sentiment_label: str = Field("neutral", description="Categorical sentiment: 'positive', 'neutral', or 'negative'")
    risk_signals: List[str] = Field(default_factory=list, description="Extracted risk tags e.g. bankruptcy, legal_dispute, supply_delay")
    key_snippets: List[str] = Field(default_factory=list, description="Direct relevant quotes or snippets supporting sentiment assessment")
    article_count: int = Field(0, description="Total news articles evaluated")
    summary: str = Field("", description="Summary narrative of recent news and market alerts")


class HistoricalRiskRecord(BaseModel):
    event_id: str = Field(..., description="Unique ID for historical risk event")
    supplier_id: str = Field(..., description="Associated supplier identifier")
    event_type: str = Field(..., description="Classification: e.g. compliance_failure, delivery_delay, financial_default, legal_issue")
    title: str = Field(..., description="Short headline or event title")
    description: str = Field(..., description="Detailed narrative of historical incident")
    severity_score: float = Field(50.0, description="Impact severity score 0-100")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context or evidence")


class RiskVectorSearchResult(BaseModel):
    event_id: str
    supplier_id: str
    event_type: str
    title: str
    description: str
    severity_score: float
    similarity_score: float = Field(..., description="Cosine similarity score (0.0 to 1.0)")


class SupplierRiskReport(BaseModel):
    supplier_id: str
    supplier_name: str
    composite_risk_score: float = Field(..., description="Overall composite risk score (0-100)")
    risk_category: str = Field(..., description="Categorical risk rating: 'low', 'medium', 'high', 'critical'")
    dimension_breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Individual risk dimension scores: financial, compliance, delivery, country, esg, fraud",
    )
    news_sentiment: NewsSentimentResult = Field(default_factory=NewsSentimentResult)
    historical_risk_matches: List[RiskVectorSearchResult] = Field(default_factory=list)
    unified_narrative: str = Field("", description="AI-generated comprehensive risk synthesis narrative")
    recommendations: List[str] = Field(default_factory=list, description="Actionable risk mitigation recommendations")
    timestamp: str = Field("", description="ISO timestamp when report was generated")


class RiskEvaluationRequest(BaseModel):
    supplier_id: str = Field(..., description="Unique identifier for supplier")
    supplier_name: str = Field(..., description="Legal company/supplier name")
    country: Optional[str] = Field(None, description="Supplier headquarters/operating country")
    years_in_business: Optional[int] = Field(None, description="Operating history in years")
    annual_revenue: Optional[float] = Field(None, description="Annual revenue in local currency/USD")
    email: Optional[str] = Field(None, description="Contact email address")
    gstin: Optional[str] = Field(None, description="Tax / GST identification number")
    address: Optional[str] = Field(None, description="Registered business address")
    msme_number: Optional[str] = Field(None, description="MSME / Small Business registration number")
    certificates: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="List of compliance certificates")
    delivery_records: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="List of past delivery performance records")
    custom_keywords: Optional[List[str]] = Field(default_factory=list, description="Optional custom news search keywords")
