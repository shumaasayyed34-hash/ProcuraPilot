"""
Comprehensive Unit & Integration Tests for Phase 4 Risk Intelligence Module
Tests: News Sentiment Pipeline, Risk Vector Store, Risk Analysis Agent, and Shared Memory.
"""

import asyncio
import pytest
from fastapi.testclient import TestClient

from main import app
from agents.risk_analysis_agent import risk_analysis_agent
from schemas.risk_schemas import RiskEvaluationRequest
from services.news_sentiment_service import news_sentiment_service
from services.shared_memory.risk_shared_memory import get_risk_context, store_risk_report
from services.vector_db.risk_vector_store import risk_vector_store

client = TestClient(app)


def test_news_sentiment_service():
    """Validates news extraction and LLM sentiment pipeline."""
    async def _run():
        supplier_name = "Global Steel Ltd"
        articles = await news_sentiment_service.fetch_supplier_news(supplier_name=supplier_name, limit=3)
        assert len(articles) > 0
        assert articles[0].title != ""

        sentiment_res = await news_sentiment_service.analyze_news_sentiment(articles=articles, supplier_name=supplier_name)
        assert -1.0 <= sentiment_res.sentiment_score <= 1.0
        assert sentiment_res.sentiment_label in ("positive", "neutral", "negative")
        assert sentiment_res.article_count == len(articles)
        assert len(sentiment_res.summary) > 0

    asyncio.run(_run())


def test_risk_vector_store():
    """Validates historical risk event embedding and FAISS semantic search."""
    async def _run():
        supplier_id = "SUPP-TEST-99"
        event_id = risk_vector_store.add_risk_event(
            supplier_id=supplier_id,
            title="Late Delivery & Logistics Delay",
            description="Fulfillment center experienced severe backlog resulting in 14-day shipment delays across Q2.",
            severity_score=75.0,
            event_type="delivery_delay",
        )
        assert event_id.startswith("RISK-EVT-")

        # Semantic Search
        search_results = risk_vector_store.search_supplier_risk_history(
            supplier_id=supplier_id,
            query="shipment delays logistics backlog",
            top_k=3,
        )
        assert len(search_results) > 0
        top_match = search_results[0]
        assert top_match.supplier_id == supplier_id
        assert top_match.severity_score == 75.0
        assert top_match.similarity_score > 0.0

    asyncio.run(_run())


def test_risk_shared_memory_storage():
    """Validates storing and retrieving risk reports from Agent Shared Memory."""
    async def _run():
        supplier_id = "SUPP-TEST-MEM-1"
        sample_report = {
            "supplier_id": supplier_id,
            "supplier_name": "Apex Industrial",
            "composite_risk_score": 25.5,
            "risk_category": "low",
            "unified_narrative": "Low risk profile with strong compliance.",
        }

        stored = await store_risk_report(supplier_id, sample_report)
        assert stored is True

        context = await get_risk_context(supplier_id)
        assert context is not None
        assert context["supplier_name"] == "Apex Industrial"
        assert context["composite_risk_score"] == 25.5

    asyncio.run(_run())


def test_risk_analysis_agent_end_to_end():
    """Validates full RiskAnalysisAgent execution pipeline combining all modules."""
    async def _run():
        req = RiskEvaluationRequest(
            supplier_id="SUPP-777",
            supplier_name="Apex Logistics & Supply",
            country="India",
            years_in_business=5,
            annual_revenue=5000000.0,
            email="info@apexlogistics.com",
            gstin="27AAACA12341Z5",
            certificates=[
                {"certificate_type": "ISO", "is_expired": False, "is_verified": True},
                {"certificate_type": "GST", "is_expired": False, "is_verified": True},
            ],
            delivery_records=[
                {"on_time": True, "delay_days": 0},
                {"on_time": False, "delay_days": 3},
            ],
        )

        report = await risk_analysis_agent.evaluate_supplier_risk(req)

        assert report.supplier_id == "SUPP-777"
        assert report.supplier_name == "Apex Logistics & Supply"
        assert 0.0 <= report.composite_risk_score <= 100.0
        assert report.risk_category in ("low", "medium", "high", "critical")
        assert "financial" in report.dimension_breakdown
        assert len(report.unified_narrative) > 0
        assert len(report.recommendations) > 0

    asyncio.run(_run())


def test_risk_agent_fastapi_endpoints():
    """Tests Phase 4 FastAPI REST endpoints."""
    # 1. Evaluate endpoint
    eval_payload = {
        "supplier_id": "SUPP-888",
        "supplier_name": "Vortex Manufacturing",
        "country": "Germany",
        "years_in_business": 10,
        "annual_revenue": 15000000.0,
        "email": "contact@vortex-mfg.de",
    }
    resp = client.post("/api/v1/risk-agent/evaluate", json=eval_payload)
    assert resp.status_code == 200
    json_resp = resp.json()
    assert json_resp["supplier_id"] == "SUPP-888"
    assert json_resp["risk_category"] in ("low", "medium", "high", "critical")

    # 2. Shared Memory Context Retrieval Endpoint
    ctx_resp = client.get("/api/v1/risk-agent/context/SUPP-888")
    assert ctx_resp.status_code == 200
    ctx_json = ctx_resp.json()
    assert ctx_json["supplier_name"] == "Vortex Manufacturing"

    # 3. News Sentiment Endpoint
    news_resp = client.post("/api/v1/risk-agent/news-sentiment?supplier_name=Vortex%20Manufacturing")
    assert news_resp.status_code == 200
    news_json = news_resp.json()
    assert "sentiment_score" in news_json

    # 4. Historical Event Indexing Endpoint
    hist_payload = {
        "supplier_id": "SUPP-888",
        "title": "Minor Component Recall",
        "description": "Voluntary recall of 100 defective fasteners in Q1 2026.",
        "severity_score": 30.0,
    }
    hist_resp = client.post("/api/v1/risk-agent/historical-event", json=hist_payload)
    assert hist_resp.status_code == 200
    assert hist_resp.json()["event_id"].startswith("RISK-EVT-")
