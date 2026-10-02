"""
Autonomous Risk Analysis Agent (Task I4.1)
Orchestrates multi-dimensional risk evaluations across suppliers by interfacing with:
1. Baseline Risk Engine (S4.2)
2. Real-time News Sentiment Pipeline (I4.2)
3. Historical Risk Vector Store (I4.3)
4. Shared Agent Memory (I4.4)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from schemas.risk_schemas import (
    RiskEvaluationRequest,
    SupplierRiskReport,
    NewsSentimentResult,
    RiskVectorSearchResult,
)
from services.news_sentiment_service import news_sentiment_service
from services.shared_memory.risk_shared_memory import store_risk_report, get_risk_context
from services.vector_db.risk_vector_store import risk_vector_store
from utils.risk_engine import (
    calculate_composite_risk,
    calculate_compliance_risk,
    calculate_country_risk,
    calculate_delivery_risk,
    calculate_esg_risk,
    calculate_financial_risk,
    calculate_fraud_risk,
    generate_risk_narrative,
    get_risk_category,
)

logger = logging.getLogger("procurapilot.risk_agent")


class MockSupplierObject:
    """Helper mock wrapper to pass dictionary payload to S4.2 functions expecting object attributes."""

    def __init__(self, data: Dict[str, Any]):
        self.years_in_business = data.get("years_in_business") or 0
        self.annual_revenue = data.get("annual_revenue") or 0
        self.email = data.get("email") or ""
        self.gstin = data.get("gstin") or ""
        self.address = data.get("address") or ""
        self.name = data.get("supplier_name") or data.get("name") or "Supplier"
        self.country = data.get("country") or ""
        self.msme_number = data.get("msme_number") or ""


class MockCertificateObject:
    def __init__(self, cert_data: Dict[str, Any]):
        self.certificate_type = cert_data.get("certificate_type") or cert_data.get("type") or "ISO"
        self.is_expired = cert_data.get("is_expired", False)
        self.is_verified = cert_data.get("is_verified", True)


class MockDeliveryRecordObject:
    def __init__(self, rec_data: Dict[str, Any]):
        self.on_time = rec_data.get("on_time", True)
        self.delay_days = rec_data.get("delay_days", 0)


class RiskAnalysisAgent:
    """
    Autonomous Risk Intelligence Agent.
    Evaluates financial, compliance, delivery, country, ESG, and fraud risks,
    combining news sentiment and historical vector memory.
    """

    def __init__(self):
        self.agent_name = "RiskAnalysisAgent"

    async def evaluate_supplier_risk(
        self,
        request: RiskEvaluationRequest,
        use_shared_memory_cache: bool = False,
    ) -> SupplierRiskReport:
        """Executes end-to-end multi-dimensional supplier risk evaluation."""
        logger.info(f"Starting risk analysis for supplier '{request.supplier_name}' (ID: {request.supplier_id})")

        # 0. Check shared memory cache if requested
        if use_shared_memory_cache:
            cached = await get_risk_context(request.supplier_id)
            if cached:
                logger.info(f"Retrieved cached risk report for supplier {request.supplier_id} from shared memory")
                return SupplierRiskReport(**cached)

        # 1. Structural Baseline Risk Assessment (S4.2 Engine Integration)
        supplier_obj = MockSupplierObject(request.model_dump())
        certificates = [MockCertificateObject(c) for c in (request.certificates or [])]
        delivery_records = [MockDeliveryRecordObject(r) for r in (request.delivery_records or [])]

        financial_score = calculate_financial_risk(supplier_obj)
        compliance_score = calculate_compliance_risk(certificates)
        delivery_score = calculate_delivery_risk(delivery_records)
        country_score = calculate_country_risk(request.country or "")
        esg_score = calculate_esg_risk(supplier_obj, certificates)
        fraud_score = calculate_fraud_risk(supplier_obj)

        base_composite = calculate_composite_risk(
            financial=financial_score,
            compliance=compliance_score,
            delivery=delivery_score,
            country=country_score,
            esg=esg_score,
            fraud=fraud_score,
        )

        dimension_breakdown = {
            "financial": financial_score,
            "compliance": compliance_score,
            "delivery": delivery_score,
            "country": country_score,
            "esg": esg_score,
            "fraud": fraud_score,
        }

        # 2. Real-Time News Extraction & Sentiment Analysis (Task I4.2)
        news_articles = await news_sentiment_service.fetch_supplier_news(
            supplier_name=request.supplier_name,
            custom_keywords=request.custom_keywords,
            limit=5,
        )
        sentiment_result = await news_sentiment_service.analyze_news_sentiment(
            articles=news_articles,
            supplier_name=request.supplier_name,
        )

        # 3. Vector Embeddings & Historical Semantic Search (Task I4.3)
        search_query = f"{request.supplier_name} risk events compliance delivery disputes"
        historical_matches = risk_vector_store.search_supplier_risk_history(
            supplier_id=request.supplier_id,
            query=search_query,
            top_k=5,
        )

        # 4. Score Synthesis & Risk Category Determination
        # News Sentiment Adjustment (-1.0 score adds up to 15 risk points; +1.0 reduces by 5)
        news_adjustment = 0.0
        if sentiment_result.sentiment_score < 0:
            news_adjustment = abs(sentiment_result.sentiment_score) * 15.0
        elif sentiment_result.sentiment_score > 0:
            news_adjustment = -1.0 * (sentiment_result.sentiment_score * 5.0)

        # Historical Risk Match Penalty
        historical_penalty = 0.0
        if historical_matches:
            avg_severity = sum(m.severity_score for m in historical_matches) / len(historical_matches)
            if avg_severity > 50:
                historical_penalty = (avg_severity - 50) * 0.2

        adjusted_composite = base_composite + news_adjustment + historical_penalty
        final_composite = round(max(0.0, min(100.0, adjusted_composite)), 2)
        category = get_risk_category(final_composite)

        # 5. Narrative & Recommendations Generation
        baseline_narrative = generate_risk_narrative(request.supplier_name, dimension_breakdown)
        unified_narrative = self._generate_unified_narrative(
            supplier_name=request.supplier_name,
            composite_score=final_composite,
            category=category,
            baseline_narrative=baseline_narrative,
            sentiment_result=sentiment_result,
            historical_matches=historical_matches,
        )

        recommendations = self._generate_recommendations(
            category=category,
            dimensions=dimension_breakdown,
            risk_signals=sentiment_result.risk_signals,
        )

        # 6. Build Final Report Object
        timestamp = datetime.now(timezone.utc).isoformat()
        report = SupplierRiskReport(
            supplier_id=str(request.supplier_id),
            supplier_name=request.supplier_name,
            composite_risk_score=final_composite,
            risk_category=category,
            dimension_breakdown=dimension_breakdown,
            news_sentiment=sentiment_result,
            historical_risk_matches=historical_matches,
            unified_narrative=unified_narrative,
            recommendations=recommendations,
            timestamp=timestamp,
        )

        # 7. Persist to Shared Agent Memory (Task I4.4)
        await store_risk_report(supplier_id=str(request.supplier_id), report_data=report.model_dump())
        logger.info(f"Completed risk analysis for '{request.supplier_name}': Score={final_composite}, Category={category}")

        return report

    def _generate_unified_narrative(
        self,
        supplier_name: str,
        composite_score: float,
        category: str,
        baseline_narrative: str,
        sentiment_result: NewsSentimentResult,
        historical_matches: List[RiskVectorSearchResult],
    ) -> str:
        narrative_parts = [
            f"=== Executive Risk Analysis for {supplier_name} ===",
            f"Composite Risk Rating: {category.upper()} ({composite_score}/100).",
            f"Structural Evaluation: {baseline_narrative}",
        ]

        if sentiment_result.risk_signals:
            signals_str = ", ".join(sentiment_result.risk_signals)
            narrative_parts.append(
                f"Real-Time News Alert: Flagged risk signals ({signals_str}) with market sentiment rating '{sentiment_result.sentiment_label}'. "
                f"Summary: {sentiment_result.summary}"
            )
        else:
            narrative_parts.append(f"Real-Time News Alert: Market sentiment is '{sentiment_result.sentiment_label}'. {sentiment_result.summary}")

        if historical_matches:
            top_match = historical_matches[0]
            narrative_parts.append(
                f"Historical Vector Memory: Found {len(historical_matches)} historical risk records. "
                f"Most relevant past event: '{top_match.title}' (Severity: {top_match.severity_score}/100)."
            )

        return " ".join(narrative_parts)

    def _generate_recommendations(
        self,
        category: str,
        dimensions: Dict[str, float],
        risk_signals: List[str],
    ) -> List[str]:
        recs = []

        if category in ("high", "critical"):
            recs.append("Mandatory Senior Procurement Officer review required before contract approval.")
            recs.append("Request dual-signature financial guarantee or escrow deposit.")

        if dimensions.get("compliance", 0) > 40:
            recs.append("Require updated ISO / GST compliance certificate submission.")

        if dimensions.get("delivery", 0) > 40:
            recs.append("Incorporate strict SLA delivery penalty clauses in contract terms.")

        if "bankruptcy" in risk_signals or dimensions.get("financial", 0) > 50:
            recs.append("Perform urgent external credit agency financial audit.")

        if not recs:
            recs.append("Standard procurement workflow approved; maintain periodic quarterly review.")

        return recs


risk_analysis_agent = RiskAnalysisAgent()
