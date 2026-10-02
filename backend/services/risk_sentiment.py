"""
Risk Sentiment Classification Module (Phase 4 Deliverable P4.1)
Author: Paramita (AI/ML Engineer - ProcuraPilot)

Evaluates external news feeds and market sentiment to quantify supplier risk.
Features:
- Domain-specific procurement risk taxonomy & keyword extraction.
- VADER & TextBlob NLP sentiment analysis with custom procurement valence shifters.
- Time-decay and relevance weighting for multi-article batches.
- Normalized score mapping: Sentiment [-1.0, 1.0] -> Risk Contribution [0.0, 100.0].
- Structured Pydantic outputs with direct integration for RiskAnalysisAgent (I4.1) and UI Dashboards (F4.1, F4.2).
"""

from datetime import datetime, timezone
import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from schemas.risk_schemas import NewsArticle, NewsSentimentResult

logger = logging.getLogger("procurapilot.risk_sentiment")

# ==============================================================================
# Domain-Specific Procurement Risk Taxonomy (P4.1)
# ==============================================================================
PROCUREMENT_RISK_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "bankruptcy_insolvency": {
        "weight": 35.0,
        "keywords": [
            "bankruptcy", "insolvent", "insolvency", "chapter 11", "liquidation",
            "defaults", "defaulted", "debt restructuring", "cash crunch", "unable to pay",
            "winding up", "creditors meeting", "receivership", "financial collapse",
        ],
        "category": "financial",
    },
    "legal_regulatory_dispute": {
        "weight": 25.0,
        "keywords": [
            "lawsuit", "litigation", "sued", "court order", "subpoena",
            "injunction", "arbitration", "penalty", "anti-trust", "antitrust",
            "patent infringement", "prosecution", "class action", "enforcement action",
        ],
        "category": "legal",
    },
    "supply_chain_disruption": {
        "weight": 25.0,
        "keywords": [
            "delay", "bottleneck", "shortage", "disruption", "factory shutdown",
            "strike", "walkout", "plant closure", "freight backlog", "logistics crisis",
            "raw material shortage", "force majeure", "port congestion", "halted operations",
        ],
        "category": "operational",
    },
    "compliance_sanctions_fraud": {
        "weight": 30.0,
        "keywords": [
            "sanction", "sanctioned", "fine", "fraud", "bribe", "bribery",
            "investigation", "violation", "audit failure", "blacklisted",
            "money laundering", "embargo", "export control", "tax evasion",
            "forgery", "counterfeit", "kickback",
        ],
        "category": "compliance",
    },
    "esg_labor_violations": {
        "weight": 20.0,
        "keywords": [
            "child labor", "forced labor", "toxic spill", "pollution fine",
            "fatal accident", "worker protest", "workplace safety", "osha violation",
            "greenwashing", "environmental hazard", "illegal dumping", "human rights",
        ],
        "category": "esg",
    },
    "cyber_security_incident": {
        "weight": 20.0,
        "keywords": [
            "ransomware", "data breach", "cyberattack", "hacked", "data leak",
            "service outage", "malware", "it breakdown", "security breach",
        ],
        "category": "operational",
    },
}

POSITIVE_INDICATORS: List[str] = [
    "expansion", "record revenue", "iso certified", "award", "profit growth",
    "contract renewal", "new facility", "partnership", "strong quarter",
    "credit upgrade", "debt reduction", "supply chain excellence", "fully compliant",
    "operational milestone", "innovation award", "sustainability leader",
]


class ArticleSentimentDetail(BaseModel):
    """Granular sentiment & risk assessment for a single news article."""
    title: str
    source: str
    url: Optional[str] = None
    published_at: Optional[str] = None
    vader_compound: float = Field(0.0, description="VADER compound polarity (-1.0 to 1.0)")
    textblob_polarity: float = Field(0.0, description="TextBlob polarity (-1.0 to 1.0)")
    textblob_subjectivity: float = Field(0.0, description="TextBlob subjectivity (0.0 to 1.0)")
    normalized_sentiment: float = Field(0.0, description="Blended normalized sentiment (-1.0 to 1.0)")
    relevance_score: float = Field(1.0, description="Relevance to target supplier (0.1 to 1.0)")
    risk_signals: List[str] = Field(default_factory=list)
    positive_signals: List[str] = Field(default_factory=list)
    risk_penalty: float = Field(0.0, description="Risk penalty contributed by this article (0 to 100)")


class DetailedNewsSentimentReport(BaseModel):
    """Comprehensive News Sentiment output model for Phase 4 Risk Intelligence."""
    supplier_name: str
    composite_sentiment_score: float = Field(
        0.0, description="Normalized overall sentiment score from -1.0 (severe risk) to +1.0 (positive)"
    )
    sentiment_label: str = Field("neutral", description="'positive', 'neutral', or 'negative'")
    sentiment_risk_penalty: float = Field(
        0.0, description="Calculated risk penalty contribution for composite risk score (0 to 100)"
    )
    risk_signals: List[str] = Field(default_factory=list, description="Unique detected risk signal tags")
    key_snippets: List[str] = Field(default_factory=list, description="Representative quotes / headlines")
    total_articles_analyzed: int = 0
    high_risk_article_count: int = 0
    article_details: List[ArticleSentimentDetail] = Field(default_factory=list)
    executive_sentiment_summary: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_legacy_sentiment_result(self) -> NewsSentimentResult:
        """Converts to backward-compatible NewsSentimentResult schema for I4.2 consumers."""
        return NewsSentimentResult(
            sentiment_score=self.composite_sentiment_score,
            sentiment_label=self.sentiment_label,
            risk_signals=self.risk_signals,
            key_snippets=self.key_snippets,
            article_count=self.total_articles_analyzed,
            summary=self.executive_sentiment_summary,
        )


class RiskSentimentClassifier:
    """
    Production-grade sentiment classification module mapping supplier news articles
    to normalized sentiment scores and quantified risk vectors.
    """

    def __init__(self):
        self._init_nlp_engines()

    def _init_nlp_engines(self):
        """Initializes VADER and TextBlob engines with graceful fallback handling."""
        # 1. Initialize VADER
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            self.vader = SentimentIntensityAnalyzer()
            # Augment VADER lexicon with procurement-specific domain weights
            self._augment_vader_lexicon()
            self.has_vader = True
            logger.info("VADER sentiment analyzer initialized with procurement domain weights.")
        except Exception as e:
            logger.warning(f"VADER analyzer not available ({e}). Using native lexicon fallback.")
            self.vader = None
            self.has_vader = False

        # 2. Check TextBlob
        try:
            from textblob import TextBlob
            self.has_textblob = True
            self.textblob_cls = TextBlob
            logger.info("TextBlob NLP analyzer initialized.")
        except Exception as e:
            logger.warning(f"TextBlob not available ({e}).")
            self.has_textblob = False
            self.textblob_cls = None

    def _augment_vader_lexicon(self):
        """Injects procurement-specific polarity weights into VADER lexicon."""
        if not self.vader:
            return
        procurement_valences = {
            "insolvency": -3.8,
            "insolvent": -3.8,
            "bankrupt": -3.9,
            "bankruptcy": -3.9,
            "defaulted": -3.5,
            "defaults": -3.4,
            "sanctioned": -3.7,
            "sanction": -3.5,
            "lawsuit": -2.8,
            "litigation": -2.7,
            "fraud": -3.8,
            "counterfeit": -3.6,
            "bribery": -3.7,
            "blacklisted": -3.9,
            "shortage": -2.4,
            "bottleneck": -2.2,
            "shutdown": -2.9,
            "strike": -2.5,
            "disruption": -2.3,
            "profitable": 2.8,
            "expansion": 2.6,
            "certified": 2.5,
            "compliant": 2.4,
            "milestone": 2.3,
            "excellence": 3.0,
        }
        self.vader.lexicon.update(procurement_valences)

    def analyze_supplier_news(
        self,
        articles: List[NewsArticle],
        supplier_name: str,
    ) -> DetailedNewsSentimentReport:
        """
        Executes end-to-end sentiment classification and risk mapping across articles.
        
        Args:
            articles: List of NewsArticle objects (from Iqra's I4.2 fetcher or mock feeds).
            supplier_name: Target company / supplier name.
            
        Returns:
            DetailedNewsSentimentReport with normalized scores, detected risk tags, and executive summary.
        """
        if not articles:
            return DetailedNewsSentimentReport(
                supplier_name=supplier_name,
                composite_sentiment_score=0.0,
                sentiment_label="neutral",
                sentiment_risk_penalty=0.0,
                risk_signals=[],
                key_snippets=[],
                total_articles_analyzed=0,
                high_risk_article_count=0,
                article_details=[],
                executive_sentiment_summary=f"No recent news articles discovered for {supplier_name}. Risk posture assumes neutral baseline.",
            )

        article_details: List[ArticleSentimentDetail] = []
        all_risk_signals = set()
        all_positive_signals = set()
        key_snippets: List[str] = []
        high_risk_count = 0

        weighted_sentiment_sum = 0.0
        total_weight_sum = 0.0

        for article in articles:
            detail = self._analyze_single_article(article, supplier_name)
            article_details.append(detail)

            all_risk_signals.update(detail.risk_signals)
            all_positive_signals.update(detail.positive_signals)

            if detail.risk_penalty >= 25.0 or detail.normalized_sentiment <= -0.35:
                high_risk_count += 1
                if len(key_snippets) < 4:
                    key_snippets.append(f"[{article.source}] {article.title}")

            # Calculate article weight based on relevance and recency
            recency_weight = self._compute_recency_weight(article.published_at)
            combined_weight = detail.relevance_score * recency_weight

            weighted_sentiment_sum += detail.normalized_sentiment * combined_weight
            total_weight_sum += combined_weight

        # Compute composite normalized sentiment score [-1.0, 1.0]
        if total_weight_sum > 0:
            composite_sentiment = round(max(-1.0, min(1.0, weighted_sentiment_sum / total_weight_sum)), 4)
        else:
            composite_sentiment = 0.0

        # Determine categorical label
        if composite_sentiment <= -0.15:
            sentiment_label = "negative"
        elif composite_sentiment >= 0.15:
            sentiment_label = "positive"
        else:
            sentiment_label = "neutral"

        # Map sentiment score & risk signals to quantitative risk penalty (0 to 100)
        risk_penalty = self._calculate_aggregate_risk_penalty(
            composite_sentiment=composite_sentiment,
            detected_signals=list(all_risk_signals),
            high_risk_article_count=high_risk_count,
            total_articles=len(articles),
        )

        # Fallback snippet selection if none triggered high risk
        if not key_snippets and articles:
            key_snippets = [f"[{a.source}] {a.title}" for a in articles[:3]]

        # Generate concise narrative summary
        summary = self._generate_executive_summary(
            supplier_name=supplier_name,
            sentiment_label=sentiment_label,
            composite_sentiment=composite_sentiment,
            risk_signals=sorted(list(all_risk_signals)),
            positive_signals=sorted(list(all_positive_signals)),
            article_count=len(articles),
            high_risk_count=high_risk_count,
        )

        return DetailedNewsSentimentReport(
            supplier_name=supplier_name,
            composite_sentiment_score=composite_sentiment,
            sentiment_label=sentiment_label,
            sentiment_risk_penalty=round(risk_penalty, 2),
            risk_signals=sorted(list(all_risk_signals)),
            key_snippets=key_snippets,
            total_articles_analyzed=len(articles),
            high_risk_article_count=high_risk_count,
            article_details=article_details,
            executive_sentiment_summary=summary,
        )

    def _analyze_single_article(self, article: NewsArticle, supplier_name: str) -> ArticleSentimentDetail:
        """Analyzes an individual article using lexical matching, VADER, and TextBlob."""
        text = f"{article.title}. {article.snippet}".strip()
        text_lower = text.lower()

        # 1. NLP Sentiment Scoring
        vader_compound = 0.0
        if self.has_vader and self.vader:
            vs = self.vader.polarity_scores(text)
            vader_compound = vs.get("compound", 0.0)

        tb_polarity = 0.0
        tb_subjectivity = 0.0
        if self.has_textblob and self.textblob_cls:
            try:
                blob = self.textblob_cls(text)
                tb_polarity = float(blob.sentiment.polarity)
                tb_subjectivity = float(blob.sentiment.subjectivity)
            except Exception:
                pass

        # 2. Risk Taxonomy Signal Detection & Severity Weighting
        detected_risk_signals = []
        raw_risk_penalty = 0.0

        for signal_tag, config in PROCUREMENT_RISK_TAXONOMY.items():
            for kw in config["keywords"]:
                pattern = r"\b" + re.escape(kw) + r"\b"
                if re.search(pattern, text_lower):
                    detected_risk_signals.append(signal_tag)
                    raw_risk_penalty += config["weight"]
                    break

        # 3. Positive Indicator Detection
        detected_positives = []
        for pkw in POSITIVE_INDICATORS:
            pattern = r"\b" + re.escape(pkw) + r"\b"
            if re.search(pattern, text_lower):
                detected_positives.append(pkw)

        # 4. Normalized Sentiment Calculation
        if self.has_vader and self.has_textblob:
            blended_nlp = (vader_compound * 0.65) + (tb_polarity * 0.35)
        elif self.has_vader:
            blended_nlp = vader_compound
        elif self.has_textblob:
            blended_nlp = tb_polarity
        else:
            blended_nlp = self._rule_based_sentiment_fallback(text_lower)

        # Adjust blended NLP score downward if risk taxonomy signals are detected
        risk_suppression = min(0.6, len(detected_risk_signals) * 0.25)
        positive_boost = min(0.3, len(detected_positives) * 0.15)
        final_normalized = round(max(-1.0, min(1.0, blended_nlp - risk_suppression + positive_boost)), 4)

        # 5. Supplier Relevance Scoring
        relevance = self._compute_relevance(article, supplier_name)

        # 6. Article-level risk penalty contribution
        article_risk_penalty = min(100.0, raw_risk_penalty + (abs(final_normalized) * 20.0 if final_normalized < 0 else 0.0))

        return ArticleSentimentDetail(
            title=article.title,
            source=article.source,
            url=article.url,
            published_at=article.published_at,
            vader_compound=round(vader_compound, 4),
            textblob_polarity=round(tb_polarity, 4),
            textblob_subjectivity=round(tb_subjectivity, 4),
            normalized_sentiment=final_normalized,
            relevance_score=round(relevance, 2),
            risk_signals=list(set(detected_risk_signals)),
            positive_signals=list(set(detected_positives)),
            risk_penalty=round(article_risk_penalty, 2),
        )

    def _compute_relevance(self, article: NewsArticle, supplier_name: str) -> float:
        """Computes relevance multiplier (0.3 to 1.0) based on mention in title vs snippet."""
        clean_supplier = supplier_name.strip().lower()
        title_lower = article.title.lower()
        snippet_lower = article.snippet.lower()

        # Split supplier name into core tokens (ignoring suffixes like Ltd, Inc, Corp)
        tokens = [t for t in clean_supplier.split() if t not in ("ltd", "inc", "corp", "llc", "pvt", "limited", "co")]
        core_name = " ".join(tokens) if tokens else clean_supplier

        if clean_supplier in title_lower or (core_name and core_name in title_lower):
            return 1.0
        elif clean_supplier in snippet_lower or (core_name and core_name in snippet_lower):
            return 0.8
        else:
            return 0.5

    def _compute_recency_weight(self, published_at: Optional[str]) -> float:
        """Applies exponential time-decay weighting (half-life of ~90 days)."""
        if not published_at:
            return 0.8
        try:
            pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            days_old = max(0, (now - pub_date).days)
            # Exponential decay: e^(-days / 120)
            decay = math.exp(-days_old / 120.0)
            return round(max(0.4, min(1.0, decay)), 3)
        except Exception:
            return 0.8

    def _calculate_aggregate_risk_penalty(
        self,
        composite_sentiment: float,
        detected_signals: List[str],
        high_risk_article_count: int,
        total_articles: int,
    ) -> float:
        """
        Maps sentiment & detected risk signals into a quantified composite risk penalty (0 to 100).
        - Negative sentiment contributes up to 40 penalty points.
        - Specific critical signals (bankruptcy, sanctions) add high targeted penalties.
        - Positive sentiment provides a risk discount (up to -10 points).
        """
        penalty = 0.0

        # Sentiment polarity contribution
        if composite_sentiment < -0.1:
            penalty += abs(composite_sentiment) * 35.0
        elif composite_sentiment > 0.2:
            penalty -= (composite_sentiment * 8.0)

        # Taxonomical signal penalty
        for signal in detected_signals:
            tax_entry = PROCUREMENT_RISK_TAXONOMY.get(signal)
            if tax_entry:
                penalty += tax_entry["weight"] * 0.5

        # Volume penalty for multiple high-risk articles
        if total_articles > 0:
            risk_ratio = high_risk_article_count / total_articles
            if risk_ratio >= 0.5:
                penalty += 15.0

        return max(0.0, min(100.0, penalty))

    def _rule_based_sentiment_fallback(self, text_lower: str) -> float:
        """Deterministic lexical sentiment fallback for offline / dependency-free execution."""
        pos_words = {"growth", "expansion", "certified", "record", "profit", "award", "reliable", "success"}
        neg_words = {"delay", "loss", "lawsuit", "dispute", "fine", "fraud", "strike", "shortage", "default"}

        pos_count = sum(1 for w in pos_words if w in text_lower)
        neg_count = sum(1 for w in neg_words if w in text_lower)

        diff = pos_count - neg_count
        if diff == 0:
            return 0.0
        return round(max(-1.0, min(1.0, diff / max(1, pos_count + neg_count))), 2)

    def _generate_executive_summary(
        self,
        supplier_name: str,
        sentiment_label: str,
        composite_sentiment: float,
        risk_signals: List[str],
        positive_signals: List[str],
        article_count: int,
        high_risk_count: int,
    ) -> str:
        """Constructs an executive paragraph summarizing news intelligence."""
        sentiment_desc = f"{sentiment_label} (polarity: {composite_sentiment:+.2f})"

        if risk_signals:
            signals_str = ", ".join(risk_signals).replace("_", " ")
            summary = (
                f"External news surveillance for {supplier_name} reflects {sentiment_desc} sentiment across {article_count} "
                f"articles, with {high_risk_count} flagging critical risk exposure. "
                f"Primary risk drivers detected: {signals_str}."
            )
            if positive_signals:
                pos_str = ", ".join(positive_signals[:3])
                summary += f" Partially mitigated by positive developments: {pos_str}."
            return summary
        elif positive_signals:
            pos_str = ", ".join(positive_signals[:3])
            return (
                f"External media coverage for {supplier_name} is predominantly {sentiment_desc} across {article_count} "
                f"verified articles. Noted growth and stability milestones include {pos_str}, with zero adverse risk flags detected."
            )
        else:
            return (
                f"Recent news surveillance across {article_count} articles indicates a stable, {sentiment_desc} market standing "
                f"for {supplier_name}, with no critical legal, financial, or operational supply chain vulnerabilities detected."
            )


# Global singleton instance
risk_sentiment_classifier = RiskSentimentClassifier()
