"""
Comprehensive Unit & Integration Test Suite for Phase 4 Risk Intelligence Module (Task P4.3)
Author: Paramita (AI/ML Engineer - ProcuraPilot)

Validates:
1. P4.1: News Sentiment Classification (VADER, TextBlob, Domain Lexicon, Relevance/Recency Decay).
2. P4.2: Structured Risk Narrative Generation (Pydantic Schema, Prompt Logic, Actionable Mitigations).
3. P4.3: Accuracy and Robustness across Diverse Supplier Archetypes & Edge Cases.
"""

import asyncio
from datetime import datetime, timezone, timedelta
import pytest

from agents.risk_analysis_agent import risk_analysis_agent
from schemas.risk_schemas import NewsArticle, RiskEvaluationRequest
from services.risk_sentiment import risk_sentiment_classifier, DetailedNewsSentimentReport
from services.risk_narrative import risk_narrative_engine, StructuredRiskNarrative
from utils.risk_engine import (
    calculate_composite_risk,
    calculate_compliance_risk,
    calculate_country_risk,
    calculate_delivery_risk,
    calculate_esg_risk,
    calculate_financial_risk,
    calculate_fraud_risk,
    get_risk_category,
)


# ==============================================================================
# Helper Mock Objects for S4.2 Baseline Engine Testing
# ==============================================================================
class MockSupplier:
    def __init__(
        self,
        name="Test Corp",
        years_in_business=5,
        annual_revenue=15000000.0,
        email="contact@testcorp.com",
        gstin="27AAACA12341Z5",
        address="Plot 42, MIDC Industrial Area, Pune",
        country="India",
        msme_number="UDYAM-MH-01-0012345",
    ):
        self.name = name
        self.years_in_business = years_in_business
        self.annual_revenue = annual_revenue
        self.email = email
        self.gstin = gstin
        self.address = address
        self.country = country
        self.msme_number = msme_number


class MockCert:
    def __init__(self, cert_type="ISO", is_expired=False, is_verified=True):
        self.certificate_type = cert_type
        self.is_expired = is_expired
        self.is_verified = is_verified


class MockDelivery:
    def __init__(self, on_time=True, delay_days=0):
        self.on_time = on_time
        self.delay_days = delay_days


# ==============================================================================
# P4.1: News Sentiment Classification Tests
# ==============================================================================
def test_p4_1_sentiment_positive_news():
    """Validates sentiment scoring for positive expansion and milestone press coverage."""
    articles = [
        NewsArticle(
            title="Apex Precision Expands Manufacturing Capacity with New Facility",
            source="Global Manufacturing Review",
            snippet="Apex Precision has opened a state-of-the-art facility, achieving ISO 9001 excellence and strong quarterly profit growth.",
            published_at=datetime.now(timezone.utc).isoformat(),
        ),
        NewsArticle(
            title="Apex Precision Wins Top Supplier Award for Quality Excellence",
            source="Industrial Weekly",
            snippet="Industry association honors Apex Precision for zero defect record and successful contract renewal.",
            published_at=datetime.now(timezone.utc).isoformat(),
        ),
    ]

    report = risk_sentiment_classifier.analyze_supplier_news(articles, "Apex Precision")
    assert report.composite_sentiment_score > 0.20
    assert report.sentiment_label == "positive"
    assert report.sentiment_risk_penalty <= 5.0
    assert len(report.risk_signals) == 0
    assert "positive" in report.executive_sentiment_summary.lower()


def test_p4_1_sentiment_severe_negative_signals():
    """Validates sentiment scoring and taxonomy extraction for severe distress news."""
    articles = [
        NewsArticle(
            title="Nova Logistics Faces Bankruptcy as Creditors File Chapter 11",
            source="Financial Times",
            snippet="Nova Logistics reported massive debt defaults and initiated debt restructuring after severe liquidity freeze.",
            published_at=datetime.now(timezone.utc).isoformat(),
        ),
        NewsArticle(
            title="Court Issues Injunction in Major Fraud and Lawsuit Against Nova Logistics",
            source="Legal Tribune",
            snippet="Federal prosecutors filed fraud charges and a class action litigation alleging accounting irregularities at Nova Logistics.",
            published_at=datetime.now(timezone.utc).isoformat(),
        ),
    ]

    report = risk_sentiment_classifier.analyze_supplier_news(articles, "Nova Logistics")
    assert report.composite_sentiment_score < -0.40
    assert report.sentiment_label == "negative"
    assert "bankruptcy_insolvency" in report.risk_signals
    assert "legal_regulatory_dispute" in report.risk_signals
    assert report.sentiment_risk_penalty >= 45.0
    assert report.high_risk_article_count >= 1


def test_p4_1_sentiment_neutral_and_empty_edge_cases():
    """Validates edge cases: empty article lists, empty snippets, and neutral reports."""
    # 1. Empty articles
    empty_report = risk_sentiment_classifier.analyze_supplier_news([], "Phantom Corp")
    assert empty_report.composite_sentiment_score == 0.0
    assert empty_report.sentiment_label == "neutral"
    assert empty_report.sentiment_risk_penalty == 0.0
    assert empty_report.total_articles_analyzed == 0

    # 2. Neutral routine article
    neutral_articles = [
        NewsArticle(
            title="Global Trade Updates for Q3",
            source="Trade Bulletin",
            snippet="Routine market statistics published regarding raw material container shipping index.",
            published_at=datetime.now(timezone.utc).isoformat(),
        )
    ]
    neutral_report = risk_sentiment_classifier.analyze_supplier_news(neutral_articles, "Standard Corp")
    assert -0.20 <= neutral_report.composite_sentiment_score <= 0.20
    assert neutral_report.sentiment_label == "neutral"


def test_p4_1_sentiment_recency_and_relevance():
    """Validates time-decay weighting and supplier name relevance logic."""
    now = datetime.now(timezone.utc)
    old_date = (now - timedelta(days=200)).isoformat()
    recent_date = now.isoformat()

    # Article mentioning supplier in title vs vague mention
    title_match = NewsArticle(
        title="Vortex Steel announces expansion",
        source="News",
        snippet="Expansion details here.",
        published_at=recent_date,
    )
    vague_match = NewsArticle(
        title="Industry Roundup",
        source="News",
        snippet="Other companies and minor mention of Vortex Steel.",
        published_at=old_date,
    )

    detail_title = risk_sentiment_classifier._analyze_single_article(title_match, "Vortex Steel")
    detail_vague = risk_sentiment_classifier._analyze_single_article(vague_match, "Vortex Steel")

    assert detail_title.relevance_score > detail_vague.relevance_score
    weight_recent = risk_sentiment_classifier._compute_recency_weight(recent_date)
    weight_old = risk_sentiment_classifier._compute_recency_weight(old_date)
    assert weight_recent > weight_old


# ==============================================================================
# P4.2: Structured Risk Narrative Generation Tests
# ==============================================================================
def test_p4_2_structured_narrative_schema_and_mitigations():
    """Validates structured narrative schema compliance and actionability."""
    narrative = risk_narrative_engine.generate_narrative(
        supplier_name="Zenith Dynamics",
        composite_score=72.5,
        risk_category="high",
        dimensions={
            "financial": 65.0,
            "compliance": 75.0,
            "delivery": 40.0,
            "country": 15.0,
            "esg": 30.0,
            "fraud": 20.0,
        },
        supplier_profile={
            "country": "Germany",
            "years_in_business": 2,
            "annual_revenue": 800000.0,
            "gstin": "27AAACZ1234M1Z1",
            "certificates": [{"certificate_type": "ISO", "is_expired": True}],
            "delivery_records": [{"on_time": True}],
        },
    )

    assert isinstance(narrative, StructuredRiskNarrative)
    assert narrative.supplier_name == "Zenith Dynamics"
    assert narrative.composite_risk_score == 72.5
    assert narrative.risk_category == "high"
    assert len(narrative.executive_summary) > 20
    assert len(narrative.primary_risk_drivers) >= 2
    assert len(narrative.actionable_mitigation_plan) >= 2

    # High risk must formulate high/urgent mitigation controls
    priorities = [m.priority for m in narrative.actionable_mitigation_plan]
    assert any(p in ("URGENT", "HIGH") for p in priorities)
    assert "# Executive Risk Intelligence Briefing" in narrative.markdown_briefing


# ==============================================================================
# P4.3: Diverse Supplier Archetype Accuracy & Edge Case Testing
# ==============================================================================
def test_p4_3_archetype_low_risk_global_enterprise():
    """
    Archetype 1: Low-Risk Global Enterprise
    Profile: 15 years, $50M revenue, clean ISO+GST+ESG certs, 100% on-time, Low-risk country.
    Expected: composite <= 30, category == 'low'.
    """
    supp = MockSupplier(years_in_business=15, annual_revenue=50_000_000, country="Germany")
    certs = [MockCert("ISO"), MockCert("GST"), MockCert("ESG")]
    deliveries = [MockDelivery(True, 0) for _ in range(10)]

    fin = calculate_financial_risk(supp)
    comp = calculate_compliance_risk(certs)
    deliv = calculate_delivery_risk(deliveries)
    cntry = calculate_country_risk(supp.country)
    esg = calculate_esg_risk(supp, certs)
    fraud = calculate_fraud_risk(supp)

    composite = calculate_composite_risk(fin, comp, deliv, cntry, esg, fraud)
    category = get_risk_category(composite)

    assert fin == 0.0
    assert comp == 10.0
    assert deliv == 15.0
    assert cntry == 15.0
    assert esg == 10.0
    assert fraud == 10.0
    assert composite <= 20.0
    assert category == "low"


def test_p4_3_archetype_financially_distressed_supplier():
    """
    Archetype 2: Financially Distressed Startup
    Profile: <1 year operating history, $200k revenue, bankruptcy press signals.
    Expected: financial risk >= 50, news penalty elevated.
    """
    supp = MockSupplier(years_in_business=1, annual_revenue=200_000, country="India")
    fin = calculate_financial_risk(supp)
    assert fin >= 70.0  # 40 (years < 2) + 30 (rev < 1M)

    news = [
        NewsArticle(
            title="Supplier struggles with debt and creditor negotiations",
            snippet="Company is facing potential insolvency and cash burn crisis.",
        )
    ]
    report = risk_sentiment_classifier.analyze_supplier_news(news, supp.name)
    assert "bankruptcy_insolvency" in report.risk_signals
    assert report.composite_sentiment_score < 0.0


def test_p4_3_archetype_compliance_failure_supplier():
    """
    Archetype 3: Statutory Compliance Non-Conformance
    Profile: Expired certificates, missing GSTIN, unverified entity.
    Expected: compliance risk >= 70, fraud risk elevated.
    """
    supp = MockSupplier(gstin="", address="")
    certs = [MockCert("ISO", is_expired=True), MockCert("Vendor", is_verified=False)]

    comp = calculate_compliance_risk(certs)
    fraud = calculate_fraud_risk(supp)

    assert comp >= 65.0  # Expired cert + missing GST + unverified
    assert fraud >= 55.0  # Missing GSTIN + missing address


def test_p4_3_archetype_chronic_delivery_delay_supplier():
    """
    Archetype 4: Chronic Logistics Bottleneck
    Profile: On-time fulfillment < 50%, average delay > 15 days.
    Expected: delivery risk >= 80.
    """
    deliveries = [
        MockDelivery(on_time=False, delay_days=18),
        MockDelivery(on_time=False, delay_days=22),
        MockDelivery(on_time=True, delay_days=0),
    ]
    deliv = calculate_delivery_risk(deliveries)
    assert deliv >= 80.0


def test_p4_3_archetype_geopolitical_high_risk_country():
    """
    Archetype 5: High-Risk Geopolitical Jurisdiction
    Profile: Operations based in sanctioned/critical countries (Iran, North Korea, Russia).
    Expected: country risk >= 65.
    """
    russia_risk = calculate_country_risk("russia")
    iran_risk = calculate_country_risk("iran")
    india_risk = calculate_country_risk("india")

    assert russia_risk == 65.0
    assert iran_risk == 85.0
    assert india_risk == 15.0


def test_p4_3_archetype_fraudulent_shell_company():
    """
    Archetype 6: Fraudulent Phantom / Shell Company
    Profile: <1 yr, free webmail (gmail.com), missing address, missing GSTIN, single word name.
    Expected: fraud risk >= 80.
    """
    shell_supp = MockSupplier(
        name="ShellCo",
        years_in_business=0,
        email="vendor99@gmail.com",
        gstin="",
        address="",
    )
    fraud = calculate_fraud_risk(shell_supp)
    assert fraud >= 85.0


def test_p4_3_archetype_contradictory_market_signals():
    """
    Archetype 7: Contradictory Telemetry (Healthy Financials vs Sudden Lawsuit/Scandal)
    Profile: Pristine balance sheet but breaking litigation headlines.
    Expected: Sentiment correctly identifies litigation, shifts composite upwards.
    """
    articles = [
        NewsArticle(
            title="Major Federal Lawsuit Filed Against Titan Mfg for Patent Infringement",
            source="Wall Street Journal",
            snippet="Plaintiff seeks $50M damages in patent infringement and trade secret misappropriation litigation against Titan Mfg.",
        )
    ]
    sentiment_report = risk_sentiment_classifier.analyze_supplier_news(articles, "Titan Mfg")
    assert "legal_regulatory_dispute" in sentiment_report.risk_signals
    assert sentiment_report.sentiment_risk_penalty > 0.0


def test_p4_3_end_to_end_agent_integration():
    """Integration test verifying full agent flow with P4.1 and P4.2 enhancements."""
    async def _run():
        req = RiskEvaluationRequest(
            supplier_id="SUPP-PARAMITA-P4",
            supplier_name="Global Heavy Tech Industries",
            country="India",
            years_in_business=8,
            annual_revenue=18000000.0,
            email="procurement@globalheavytech.com",
            gstin="27AAACA9999P1Z3",
            address="Heavy Industrial Estate, Sector 5, Mumbai",
            certificates=[
                {"certificate_type": "ISO", "is_expired": False, "is_verified": True},
                {"certificate_type": "GST", "is_expired": False, "is_verified": True},
                {"certificate_type": "ESG", "is_expired": False, "is_verified": True},
            ],
            delivery_records=[
                {"on_time": True, "delay_days": 0},
                {"on_time": True, "delay_days": 0},
                {"on_time": False, "delay_days": 4},
            ],
        )

        report = await risk_analysis_agent.evaluate_supplier_risk(req)
        assert report.supplier_id == "SUPP-PARAMITA-P4"
        assert 0.0 <= report.composite_risk_score <= 100.0
        assert report.risk_category in ("low", "medium", "high", "critical")
        assert len(report.unified_narrative) > 50
        assert len(report.recommendations) > 0

    asyncio.run(_run())
