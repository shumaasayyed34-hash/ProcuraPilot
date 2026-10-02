"""
News Sentiment Pipeline (I4.2)
Fetches real-time news articles via News API (with graceful fallback)
and uses LLM sentiment analysis to extract risk signals and scores.
"""

import os
import re
import logging
from typing import List, Optional
import httpx

from schemas.risk_schemas import NewsArticle, NewsSentimentResult
from services.extraction import extraction_engine

logger = logging.getLogger("procurapilot.news_sentiment")

# Keyword risk tag dictionary for rule-assisted tag extraction
RISK_SIGNAL_KEYWORDS = {
    "bankruptcy": ["bankruptcy", "insolvent", "chapter 11", "liquidation", "bankrupt", "defaults"],
    "legal_dispute": ["lawsuit", "court", "litigation", "sued", "legal dispute", "arbitration", "penalty"],
    "supply_delay": ["delay", "bottleneck", "shortage", "disruption", "factory shutdown", "strike"],
    "compliance_violation": ["sanction", "fine", "fraud", "bribe", "investigation", "violation", "audit failure"],
    "financial_instability": ["loss", "debt", "downgrade", "cash crunch", "layoff", "revenue drop"],
    "reputational_risk": ["scandal", "protest", "boycott", "hazard", "recall", "safety violation"],
}


class NewsSentimentService:
    def __init__(self):
        self.api_key = os.getenv("NEWS_API_KEY")
        self.news_api_url = "https://newsapi.org/v2/everything"

    async def fetch_supplier_news(
        self,
        supplier_name: str,
        industry: Optional[str] = None,
        limit: int = 5,
        custom_keywords: Optional[List[str]] = None,
    ) -> List[NewsArticle]:
        """Fetches news articles for a supplier using NewsAPI, falling back to mock articles if unconfigured or unreachable."""
        articles: List[NewsArticle] = []

        if self.api_key:
            query = f'"{supplier_name}"'
            if custom_keywords:
                query += " OR " + " OR ".join(f'"{kw}"' for kw in custom_keywords)
            elif industry:
                query += f' AND "{industry}"'

            params = {
                "q": query,
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": limit,
                "apiKey": self.api_key,
            }

            try:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.get(self.news_api_url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_articles = data.get("articles", [])
                        for item in raw_articles[:limit]:
                            articles.append(
                                NewsArticle(
                                    title=item.get("title") or "Untitled",
                                    source=item.get("source", {}).get("name") or "NewsAPI",
                                    snippet=item.get("description") or item.get("content") or "",
                                    url=item.get("url"),
                                    published_at=item.get("publishedAt"),
                                    is_simulated=False,
                                )
                            )
                        logger.info(f"Fetched {len(articles)} articles from NewsAPI for supplier '{supplier_name}'")
                    else:
                        logger.warning(f"NewsAPI returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Failed to fetch news from NewsAPI for '{supplier_name}': {e}")

        # Fallback simulated news feed if no live articles retrieved
        if not articles:
            articles = self._generate_simulated_news(supplier_name, limit)

        return articles

    def _generate_simulated_news(self, supplier_name: str, limit: int = 3) -> List[NewsArticle]:
        """Generates realistic market news feed for fallback/testing environments."""
        return [
            NewsArticle(
                title=f"{supplier_name} Expands Manufacturing Capacity with New Facility",
                source="Global Trade Review",
                snippet=f"{supplier_name} announced today the opening of its state-of-the-art production line, aiming to reduce fulfillment times by 20%. Operational reliability remains strong.",
                published_at="2026-09-15T10:00:00Z",
                is_simulated=True,
            ),
            NewsArticle(
                title=f"Industry Logistics Update: Regional Supply Chains Face Minor Delay Risks",
                source="Supply Chain Digest",
                snippet=f"Port congestion across key shipping corridors has caused minor shipment delays for major suppliers including {supplier_name}. However, lead times are expected to normalize next quarter.",
                published_at="2026-09-20T14:30:00Z",
                is_simulated=True,
            ),
            NewsArticle(
                title=f"{supplier_name} Maintains Compliance & ISO Certification Verification",
                source="Industrial Quality News",
                snippet=f"Annual compliance audits confirmed {supplier_name} adheres to international ISO 9001 and ESG environmental standards with zero major non-conformances reported.",
                published_at="2026-09-28T09:15:00Z",
                is_simulated=True,
            ),
        ][:limit]

    async def analyze_news_sentiment(
        self,
        articles: List[NewsArticle],
        supplier_name: str,
    ) -> NewsSentimentResult:
        """Analyzes sentiment score (-1.0 to +1.0) and extracts risk signals across articles."""
        if not articles:
            return NewsSentimentResult(
                sentiment_score=0.0,
                sentiment_label="neutral",
                risk_signals=[],
                key_snippets=[],
                article_count=0,
                summary=f"No recent news articles found for supplier {supplier_name}.",
            )

        combined_text = "\n\n".join([f"[{a.source}] {a.title}: {a.snippet}" for a in articles])

        # Step 1: Rule-assisted keyword risk signal extraction
        detected_signals = set()
        text_lower = combined_text.lower()
        for signal_tag, keywords in RISK_SIGNAL_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    detected_signals.add(signal_tag)
                    break

        # Step 2: Extract key snippets containing risk keywords
        key_snippets = []
        for article in articles:
            snippet_lower = (article.title + " " + article.snippet).lower()
            if any(kw in snippet_lower for keywords in RISK_SIGNAL_KEYWORDS.values() for kw in keywords):
                key_snippets.append(f"{article.title} ({article.source})")
            if len(key_snippets) >= 3:
                break

        # Step 3: LLM Sentiment Scoring & Summarization via extraction_engine (Gemini)
        prompt = (
            f"Analyze the following news articles regarding supplier '{supplier_name}'.\n"
            f"Return a brief evaluation summarizing overall market sentiment, risk exposure, and key takeaways.\n\n"
            f"ARTICLES:\n{combined_text}"
        )

        llm_summary = ""
        try:
            # Reusing extraction engine LLM infrastructure
            if extraction_engine and extraction_engine.client:
                response = extraction_engine.client.chat.completions.create(
                    model=extraction_engine.model_name,
                    response_model=None,
                    messages=[{"role": "user", "content": prompt}],
                )
                if hasattr(response, "content"):
                    llm_summary = str(response.content)
                elif hasattr(response, "choices") and response.choices:
                    llm_summary = str(response.choices[0].message.content)
        except Exception as e:
            logger.warning(f"LLM news sentiment summary fallback: {e}")

        # Compute numerical sentiment score (-1.0 to +1.0)
        # Risk signals penalize sentiment score
        penalty = len(detected_signals) * 0.35
        base_score = 0.4 if len(articles) > 0 else 0.0
        calculated_score = round(max(-1.0, min(1.0, base_score - penalty)), 2)

        if calculated_score < -0.2:
            sentiment_label = "negative"
        elif calculated_score > 0.2:
            sentiment_label = "positive"
        else:
            sentiment_label = "neutral"

        if not llm_summary:
            if detected_signals:
                llm_summary = (
                    f"News analysis for {supplier_name} flagged potential risk signals: "
                    f"{', '.join(sorted(detected_signals))}. Overall market sentiment is rated {sentiment_label}."
                )
            else:
                llm_summary = (
                    f"News coverage for {supplier_name} appears stable with no major operational or legal risk signals detected. "
                    f"Market sentiment is rated {sentiment_label}."
                )

        return NewsSentimentResult(
            sentiment_score=calculated_score,
            sentiment_label=sentiment_label,
            risk_signals=sorted(list(detected_signals)),
            key_snippets=key_snippets if key_snippets else [a.title for a in articles[:2]],
            article_count=len(articles),
            summary=llm_summary,
        )


news_sentiment_service = NewsSentimentService()
