"""
FastAPI REST Router for Autonomous Risk Agent (Phase 4 Tasks I4.1, I4.2, I4.3, I4.4)
Endpoints for risk evaluation, news sentiment analysis, vector risk search, and shared memory retrieval.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from agents.risk_analysis_agent import risk_analysis_agent
from schemas.risk_schemas import (
    HistoricalRiskRecord,
    NewsArticle,
    NewsSentimentResult,
    RiskEvaluationRequest,
    RiskVectorSearchResult,
    SupplierRiskReport,
)
from services.news_sentiment_service import news_sentiment_service
from services.shared_memory.risk_shared_memory import get_risk_context
from services.vector_db.risk_vector_store import risk_vector_store

router = APIRouter(prefix="/risk-agent", tags=["Risk Analysis Agent (Phase 4)"])


class HistoricalEventCreateRequest(BaseModel):
    supplier_id: str = Field(..., description="Target supplier identifier")
    title: str = Field(..., description="Headline of historical event")
    description: str = Field(..., description="Detailed description of risk incident")
    severity_score: float = Field(50.0, ge=0.0, le=100.0, description="Severity score 0-100")
    event_type: str = Field("general_risk", description="Category of event")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class HistoricalEventCreateResponse(BaseModel):
    event_id: str
    message: str


@router.post(
    "/evaluate",
    response_model=SupplierRiskReport,
    summary="I4.1: Autonomous Supplier Risk Evaluation",
)
async def evaluate_supplier_risk(request: RiskEvaluationRequest):
    """Executes multi-dimensional supplier risk evaluation including news sentiment & vector memory search."""
    try:
        report = await risk_analysis_agent.evaluate_supplier_risk(request)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk evaluation failed: {str(e)}",
        )


@router.get(
    "/context/{supplier_id}",
    response_model=Optional[Dict[str, Any]],
    summary="I4.4: Retrieve Supplier Risk Context from Shared Memory",
)
async def get_supplier_risk_context(supplier_id: str):
    """Retrieves real-time/historical risk context for a supplier stored in Agent Shared Memory."""
    context = await get_risk_context(supplier_id)
    if not context:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No risk memory context found for supplier '{supplier_id}'",
        )
    return context


@router.post(
    "/news-sentiment",
    response_model=NewsSentimentResult,
    summary="I4.2: Fetch Real-Time News & LLM Sentiment Analysis",
)
async def analyze_supplier_news(
    supplier_name: str = Query(..., description="Name of supplier company"),
    custom_keywords: Optional[List[str]] = Query(None, description="Keywords for news query"),
):
    """Fetches real-time news articles via News API and extracts sentiment & risk signals."""
    articles = await news_sentiment_service.fetch_supplier_news(
        supplier_name=supplier_name,
        custom_keywords=custom_keywords,
    )
    result = await news_sentiment_service.analyze_news_sentiment(
        articles=articles,
        supplier_name=supplier_name,
    )
    return result


@router.post(
    "/historical-event",
    response_model=HistoricalEventCreateResponse,
    summary="I4.3: Index Historical Supplier Risk Event into Vector Database",
)
async def index_historical_risk_event(request: HistoricalEventCreateRequest):
    """Indexes a historical risk record into FAISS vector database for semantic search."""
    event_id = risk_vector_store.add_risk_event(
        supplier_id=request.supplier_id,
        title=request.title,
        description=request.description,
        severity_score=request.severity_score,
        event_type=request.event_type,
        metadata=request.metadata,
    )
    return HistoricalEventCreateResponse(
        event_id=event_id,
        message=f"Historical risk event '{request.title}' indexed successfully.",
    )


@router.get(
    "/search-history/{supplier_id}",
    response_model=List[RiskVectorSearchResult],
    summary="I4.3: Semantic Search Historical Supplier Risk Memory",
)
async def search_risk_history(
    supplier_id: str,
    query: str = Query("supplier compliance delivery financial risks", description="Semantic query text"),
    top_k: int = Query(5, ge=1, le=20, description="Max results"),
):
    """Performs vector similarity search over supplier's past risk incidents."""
    results = risk_vector_store.search_supplier_risk_history(
        supplier_id=supplier_id,
        query=query,
        top_k=top_k,
    )
    return results
