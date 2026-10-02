"""
Structured Risk Narrative Generation Engine (Phase 4 Deliverable P4.2)
Author: Paramita (AI/ML Engineer - ProcuraPilot)

Generates concise, human-readable, executive risk summaries and actionable mitigation
plans from multi-dimensional risk vector inputs (Financial, Compliance, Delivery, Country,
ESG, Fraud, News Sentiment, and Historical Incidents).
"""

from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from schemas.risk_schemas import NewsSentimentResult, RiskVectorSearchResult

logger = logging.getLogger("procurapilot.risk_narrative")


class RiskDriverItem(BaseModel):
    dimension: str = Field(..., description="Risk dimension e.g. financial, compliance, delivery, country, esg, fraud, news")
    score: float = Field(..., description="Dimension score 0 to 100")
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(..., description="Assessed severity level")
    rationale: str = Field(..., description="Concise explanation of the risk root cause")
    evidence: str = Field(..., description="Underlying metric or evidence string")


class MitigatingFactor(BaseModel):
    dimension: str = Field(..., description="Dimension with favorable performance")
    strength_description: str = Field(..., description="Operational or financial strength identified")


class ActionableMitigation(BaseModel):
    priority: Literal["URGENT", "HIGH", "MEDIUM", "LOW"] = Field(..., description="Action priority")
    action: str = Field(..., description="Concrete, legally binding or operational procurement control")
    justification: str = Field(..., description="Why this step mitigates the identified vulnerability")
    target_role: str = Field("Procurement Officer", description="Role responsible for executing control")


class StructuredRiskNarrative(BaseModel):
    """Production Pydantic schema for LLM-generated executive risk narratives."""
    supplier_name: str
    composite_risk_score: float = Field(..., description="Overall composite risk score (0 to 100)")
    risk_category: Literal["low", "medium", "high", "critical"]
    executive_summary: str = Field(
        ...,
        description="2-3 sentence executive synopsis for Sourcing Committee and C-level Procurement Officers",
    )
    risk_category_justification: str = Field(
        ..., description="Objective rationale for assigned category based on dimension scores"
    )
    primary_risk_drivers: List[RiskDriverItem] = Field(default_factory=list)
    mitigating_strengths: List[MitigatingFactor] = Field(default_factory=list)
    news_market_synopsis: str = Field(
        "", description="Synthesis of external media sentiment, real-time alerts, and market rumors"
    )
    historical_risk_summary: str = Field(
        "", description="Summary of past risk incidents retrieved from vector memory"
    )
    actionable_mitigation_plan: List[ActionableMitigation] = Field(default_factory=list)
    markdown_briefing: str = Field("", description="Full GitHub-flavored markdown executive briefing for UI")
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==============================================================================
# Prompt Engineering Templates (P4.2)
# ==============================================================================
SYSTEM_RISK_NARRATIVE_PROMPT = """
You are a Principal Supply Chain Risk & Strategic Sourcing Intelligence Analyst at ProcuraPilot.
Your role is to analyze multi-dimensional supplier risk inputs and produce a strictly typed, executive-level risk briefing.

### Analysis & Synthesis Rules:
1. DATA FIDELITY (ZERO HALLUCINATIONS):
   - Only cite data explicitly provided in the input payload (financial metrics, certificates, delivery KPIs, country ratings, news sentiment, historical incidents).
   - Do not invent external data or unverified claims.

2. EXECUTIVE CLARITY & TONE:
   - Provide a concise, decisive executive summary (2-3 sentences max).
   - Avoid generic boilerplate. Emphasize root causes (e.g. "Unverified GSTIN coupled with free email domain indicates shell company fraud exposure").

3. RISK THRESHOLD CONVENTIONS:
   - Score <= 30.0: LOW Risk (Standard monitoring, favorable terms approved).
   - 30.1 to 60.0: MEDIUM Risk (Moderate exposure; standard commercial safeguards apply).
   - 60.1 to 80.0: HIGH Risk (Significant operational/financial vulnerability; requires Senior Officer review and collateral/guarantees).
   - > 80.0: CRITICAL Risk (Severe default/legal risk; recommend blocking PO or requiring escrow/dual sourcing).

4. ACTIONABLE MITIGATION CONTROLS:
   - Formulate concrete, legally and operationally enforceable mitigations (e.g. "Require 20% advance bank guarantee", "Incorporate strict 1.5% weekly SLA delivery delay penalty", "Perform onsite factory compliance audit").
"""


class RiskNarrativeEngine:
    """
    LLM-powered Risk Narrative Generation Pipeline.
    Supports OpenAI, Google Gemini, and automated high-fidelity deterministic fallback.
    """

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai").lower()
        self.openai_key = os.getenv("OPENAI_API_KEY", "")
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4o") if self.provider == "openai" else os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    def generate_narrative(
        self,
        supplier_name: str,
        composite_score: float,
        risk_category: str,
        dimensions: Dict[str, float],
        supplier_profile: Optional[Dict[str, Any]] = None,
        news_sentiment: Optional[NewsSentimentResult] = None,
        historical_matches: Optional[List[RiskVectorSearchResult]] = None,
    ) -> StructuredRiskNarrative:
        """
        Executes structured narrative generation across all risk telemetry inputs.
        
        Args:
            supplier_name: Company name.
            composite_score: Calculated composite score (0-100).
            risk_category: 'low', 'medium', 'high', or 'critical'.
            dimensions: Dict of dimension scores (financial, compliance, delivery, country, esg, fraud).
            supplier_profile: Optional dictionary with years_in_business, revenue, country, gstin, certificates, etc.
            news_sentiment: NewsSentimentResult from P4.1 classifier.
            historical_matches: List of RiskVectorSearchResult from FAISS vector memory.
            
        Returns:
            StructuredRiskNarrative validated Pydantic model.
        """
        profile = supplier_profile or {}

        # Attempt LLM structured generation if credentials available
        if (self.provider == "openai" and self.openai_key) or (self.provider == "gemini" and self.gemini_key):
            try:
                llm_result = self._call_llm_for_narrative(
                    supplier_name=supplier_name,
                    composite_score=composite_score,
                    risk_category=risk_category,
                    dimensions=dimensions,
                    profile=profile,
                    news_sentiment=news_sentiment,
                    historical_matches=historical_matches or [],
                )
                if llm_result:
                    return llm_result
            except Exception as e:
                logger.warning(f"LLM narrative generation encountered error ({e}). Using deterministic fallback.")

        # High-fidelity deterministic fallback generator
        return self._generate_deterministic_narrative(
            supplier_name=supplier_name,
            composite_score=composite_score,
            risk_category=risk_category,
            dimensions=dimensions,
            profile=profile,
            news_sentiment=news_sentiment,
            historical_matches=historical_matches or [],
        )

    def _call_llm_for_narrative(
        self,
        supplier_name: str,
        composite_score: float,
        risk_category: str,
        dimensions: Dict[str, float],
        profile: Dict[str, Any],
        news_sentiment: Optional[NewsSentimentResult],
        historical_matches: List[RiskVectorSearchResult],
    ) -> Optional[StructuredRiskNarrative]:
        """Calls OpenAI or Gemini using structured JSON completions."""
        payload_context = {
            "supplier_name": supplier_name,
            "composite_score": composite_score,
            "risk_category": risk_category,
            "dimension_scores": dimensions,
            "supplier_profile": {
                "country": profile.get("country"),
                "years_in_business": profile.get("years_in_business"),
                "annual_revenue": profile.get("annual_revenue"),
                "email": profile.get("email"),
                "gstin": profile.get("gstin"),
                "certificates_count": len(profile.get("certificates", [])),
                "delivery_records_count": len(profile.get("delivery_records", [])),
            },
            "news_sentiment": {
                "score": news_sentiment.sentiment_score if news_sentiment else 0.0,
                "label": news_sentiment.sentiment_label if news_sentiment else "neutral",
                "risk_signals": news_sentiment.risk_signals if news_sentiment else [],
                "summary": news_sentiment.summary if news_sentiment else "",
            },
            "historical_events_count": len(historical_matches),
            "top_historical_event": {
                "title": historical_matches[0].title if historical_matches else None,
                "severity": historical_matches[0].severity_score if historical_matches else None,
                "description": historical_matches[0].description if historical_matches else None,
            } if historical_matches else None,
        }

        user_prompt = (
            f"Analyze the following supplier telemetry and generate a structured executive risk briefing in JSON.\n\n"
            f"SUPPLIER DATA:\n{json.dumps(payload_context, indent=2)}\n\n"
            f"Output strictly according to the StructuredRiskNarrative schema."
        )

        # 1. OpenAI Implementation
        if self.provider == "openai" and self.openai_key:
            from openai import OpenAI
            client = OpenAI(api_key=self.openai_key)
            completion = client.beta.chat.completions.parse(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_RISK_NARRATIVE_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=StructuredRiskNarrative,
                temperature=0.1,
            )
            return completion.choices[0].message.parsed

        # 2. Gemini Implementation
        elif self.provider == "gemini" and self.gemini_key:
            import google.generativeai as genai
            genai.configure(api_key=self.gemini_key)
            model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={"response_mime_type": "application/json", "temperature": 0.1},
                system_instruction=SYSTEM_RISK_NARRATIVE_PROMPT,
            )
            resp = model.generate_content(user_prompt)
            data = json.loads(resp.text)
            return StructuredRiskNarrative(**data)

        return None

    def _generate_deterministic_narrative(
        self,
        supplier_name: str,
        composite_score: float,
        risk_category: str,
        dimensions: Dict[str, float],
        profile: Dict[str, Any],
        news_sentiment: Optional[NewsSentimentResult],
        historical_matches: List[RiskVectorSearchResult],
    ) -> StructuredRiskNarrative:
        """
        Deterministic, rule-grounded generator providing 100% reliable, production-grade
        risk narratives when running offline or without active LLM API keys.
        """
        # 1. Identify Primary Risk Drivers and Strengths
        sorted_dims = sorted(dimensions.items(), key=lambda x: x[1], reverse=True)
        primary_drivers: List[RiskDriverItem] = []
        strengths: List[MitigatingFactor] = []

        dimension_evidence_map = {
            "financial": (
                f"Operating history: {profile.get('years_in_business', 'Unknown')} yrs, "
                f"Annual Revenue: ${profile.get('annual_revenue', 0):,.0f}" if profile.get('annual_revenue') else "Limited revenue data"
            ),
            "compliance": (
                f"Evaluated {len(profile.get('certificates', []))} compliance certificates"
                if profile.get("certificates") else "No compliance certificates on file"
            ),
            "delivery": (
                f"Evaluated {len(profile.get('delivery_records', []))} past shipment milestones"
                if profile.get("delivery_records") else "No historical delivery records"
            ),
            "country": f"Headquarters / operations base: {profile.get('country', 'Not specified')}",
            "esg": "Environmental, labor, and MSME governance standing",
            "fraud": (
                f"GSTIN: {'Provided' if profile.get('gstin') else 'Missing'}, "
                f"Email domain: {profile.get('email', '').split('@')[-1] if profile.get('email') else 'Missing'}"
            ),
        }

        for dim, score in sorted_dims:
            severity = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MEDIUM" if score >= 35 else "LOW"
            evidence = dimension_evidence_map.get(dim, f"Assessed score: {score:.1f}/100")

            if score >= 35.0:
                rationale = self._get_dimension_rationale(dim, score, profile)
                primary_drivers.append(
                    RiskDriverItem(
                        dimension=dim,
                        score=score,
                        severity=severity,
                        rationale=rationale,
                        evidence=evidence,
                    )
                )
            elif score <= 25.0:
                strengths.append(
                    MitigatingFactor(
                        dimension=dim,
                        strength_description=f"Strong operational benchmark in {dim} risk ({score:.1f}/100).",
                    )
                )

        # 2. News Sentiment Synopsis
        news_synopsis = ""
        if news_sentiment:
            if news_sentiment.risk_signals:
                signals = ", ".join(news_sentiment.risk_signals).replace("_", " ")
                news_synopsis = (
                    f"External media monitoring flagged adverse risk signals: {signals}. "
                    f"Overall sentiment is categorized as '{news_sentiment.sentiment_label}' "
                    f"(score: {news_sentiment.sentiment_score:+.2f}). Summary: {news_sentiment.summary}"
                )
            else:
                news_synopsis = (
                    f"External news surveillance indicates stable, {news_sentiment.sentiment_label} market sentiment "
                    f"(score: {news_sentiment.sentiment_score:+.2f}) with zero critical legal or supply chain risk signals."
                )

        # 3. Historical Risk Synopsis
        hist_synopsis = ""
        if historical_matches:
            top_evt = historical_matches[0]
            hist_synopsis = (
                f"Retrieved {len(historical_matches)} historical risk incident(s) from vector memory. "
                f"Most severe incident: '{top_evt.title}' (Impact Severity: {top_evt.severity_score:.0f}/100) - {top_evt.description}"
            )
        else:
            hist_synopsis = "No prior adverse risk incidents found in historical vector memory."

        # 4. Formulate Actionable Mitigation Plan
        mitigations = self._build_actionable_mitigations(
            risk_category=risk_category,
            composite_score=composite_score,
            dimensions=dimensions,
            news_signals=news_sentiment.risk_signals if news_sentiment else [],
            has_historical_incidents=len(historical_matches) > 0,
        )

        # 5. Executive Summary
        top_driver_names = [d.dimension for d in primary_drivers[:2]]
        drivers_text = f" Driven primarily by elevated vulnerabilities in {', '.join(top_driver_names)}." if top_driver_names else ""
        exec_summary = (
            f"Supplier {supplier_name} presents an overall {risk_category.upper()} risk profile with a composite score "
            f"of {composite_score:.1f}/100.{drivers_text} "
            f"{'Immediate executive escalation and commercial safeguards required prior to contract award.' if risk_category in ('high', 'critical') else 'Supplier is commercially eligible with standard operational monitoring.'}"
        )

        justification = (
            f"Category '{risk_category}' reflects a weighted composite score of {composite_score:.1f}/100. "
            f"Top risk contributor is {sorted_dims[0][0]} ({sorted_dims[0][1]:.1f}/100), "
            f"while {sorted_dims[-1][0]} ({sorted_dims[-1][1]:.1f}/100) represents the lowest risk exposure."
        )

        # 6. Markdown Briefing Formatter
        markdown = self._format_markdown_briefing(
            supplier_name=supplier_name,
            composite_score=composite_score,
            risk_category=risk_category,
            exec_summary=exec_summary,
            drivers=primary_drivers,
            strengths=strengths,
            news_synopsis=news_synopsis,
            hist_synopsis=hist_synopsis,
            mitigations=mitigations,
        )

        return StructuredRiskNarrative(
            supplier_name=supplier_name,
            composite_risk_score=composite_score,
            risk_category=risk_category,  # type: ignore
            executive_summary=exec_summary,
            risk_category_justification=justification,
            primary_risk_drivers=primary_drivers,
            mitigating_strengths=strengths,
            news_market_synopsis=news_synopsis,
            historical_risk_summary=hist_synopsis,
            actionable_mitigation_plan=mitigations,
            markdown_briefing=markdown,
        )

    def _get_dimension_rationale(self, dimension: str, score: float, profile: Dict[str, Any]) -> str:
        """Generates domain-grounded root cause rationales."""
        if dimension == "financial":
            years = profile.get("years_in_business", 0)
            rev = profile.get("annual_revenue", 0)
            if years < 2:
                return f"Early-stage operating company ({years} years), presenting elevated capitalization risk."
            elif rev and rev < 1_000_000:
                return f"Sub-$1M annual turnover indicates constrained working capital and low debt absorption capacity."
            return "Elevated financial distress risk based on revenue-to-volume ratio."

        elif dimension == "compliance":
            certs = profile.get("certificates", [])
            if not certs:
                return "Complete absence of verified compliance certificates (ISO 9001 / GST)."
            expired = [c for c in certs if c.get("is_expired")]
            if expired:
                return f"Contains {len(expired)} expired compliance certificate(s)."
            return "Non-conformance detected in required statutory certifications."

        elif dimension == "delivery":
            delays = profile.get("delivery_records", [])
            return f"Substandard on-time fulfillment rate across {len(delays)} past orders with systemic shipment delays."

        elif dimension == "country":
            return f"Operating in jurisdiction '{profile.get('country')}' with heightened geopolitical or regulatory friction."

        elif dimension == "fraud":
            flags = []
            if not profile.get("gstin"):
                flags.append("missing GSTIN tax identifier")
            if not profile.get("address"):
                flags.append("unverified registered address")
            email = profile.get("email", "")
            if any(free in email.lower() for free in ["gmail", "yahoo", "hotmail"]):
                flags.append("use of non-corporate free webmail")
            return f"Elevated fraud index triggered by {', '.join(flags) if flags else 'inconsistent entity registration details'}."

        elif dimension == "esg":
            return "Deficiencies in environmental compliance or absence of mandatory ESG certifications."

        return f"Elevated score ({score:.1f}/100) requires procurement scrutiny."

    def _build_actionable_mitigations(
        self,
        risk_category: str,
        composite_score: float,
        dimensions: Dict[str, float],
        news_signals: List[str],
        has_historical_incidents: bool,
    ) -> List[ActionableMitigation]:
        """Constructs concrete, legally binding mitigation steps for procurement professionals."""
        mitigations: List[ActionableMitigation] = []

        # High/Critical Category Escalation
        if risk_category in ("high", "critical"):
            mitigations.append(
                ActionableMitigation(
                    priority="URGENT",
                    action="Require Senior Procurement Officer & Legal sign-off prior to Purchase Order issuance.",
                    justification=f"Overall risk rating is {risk_category.upper()} ({composite_score:.1f}/100).",
                    target_role="VP of Procurement",
                )
            )
            mitigations.append(
                ActionableMitigation(
                    priority="HIGH",
                    action="Enforce Dual-Sourcing strategy with a minimum 40% volume allocation to an alternate qualified supplier.",
                    justification="Protects production continuity against sudden supplier default or failure.",
                    target_role="Strategic Sourcing Lead",
                )
            )

        # Financial Mitigation
        if dimensions.get("financial", 0) >= 40.0 or any("bankruptcy" in s for s in news_signals):
            mitigations.append(
                ActionableMitigation(
                    priority="HIGH",
                    action="Mandate 100% milestone-based payments upon verified delivery; eliminate advance payments.",
                    justification="Prevents financial loss due to supplier liquidity freeze or bankruptcy filing.",
                    target_role="Finance Controller",
                )
            )

        # Compliance Mitigation
        if dimensions.get("compliance", 0) >= 35.0:
            mitigations.append(
                ActionableMitigation(
                    priority="HIGH",
                    action="Request verified re-submission of current ISO 9001 and valid GST tax clearance certificates within 7 business days.",
                    justification="Rectifies statutory compliance and audit non-conformance vulnerabilities.",
                    target_role="Compliance Officer",
                )
            )

        # Delivery Mitigation
        if dimensions.get("delivery", 0) >= 35.0 or has_historical_incidents:
            mitigations.append(
                ActionableMitigation(
                    priority="MEDIUM",
                    action="Embed strict Liquidated Damages SLA clause (2% contract price penalty per week of delay).",
                    justification="Incentivizes adherence to contract delivery schedules and offsets late fulfillment penalties.",
                    target_role="Contracts Specialist",
                )
            )

        # Fraud Mitigation
        if dimensions.get("fraud", 0) >= 35.0:
            mitigations.append(
                ActionableMitigation(
                    priority="URGENT",
                    action="Initiate formal physical site verification and Corporate Affairs Registry validation.",
                    justification="Mitigates shell company / phantom vendor risk identified during intake.",
                    target_role="Risk & Audit Officer",
                )
            )

        # Low-risk default approval
        if not mitigations:
            mitigations.append(
                ActionableMitigation(
                    priority="LOW",
                    action="Approve supplier for standard commercial contracting with standard quarterly performance reviews.",
                    justification="All assessed risk dimensions remain well within approved risk tolerance thresholds.",
                    target_role="Procurement Specialist",
                )
            )

        return mitigations

    def _format_markdown_briefing(
        self,
        supplier_name: str,
        composite_score: float,
        risk_category: str,
        exec_summary: str,
        drivers: List[RiskDriverItem],
        strengths: List[MitigatingFactor],
        news_synopsis: str,
        hist_synopsis: str,
        mitigations: List[ActionableMitigation],
    ) -> str:
        """Renders comprehensive markdown briefing document."""
        category_badges = {
            "low": "🟢 LOW RISK",
            "medium": "🟡 MEDIUM RISK",
            "high": "🟠 HIGH RISK",
            "critical": "🔴 CRITICAL RISK",
        }
        badge = category_badges.get(risk_category.lower(), risk_category.upper())

        lines = [
            f"# Executive Risk Intelligence Briefing: {supplier_name}",
            f"**Evaluation Status**: {badge} (`{composite_score:.1f}/100`)",
            "",
            "## 1. Executive Summary",
            f"> {exec_summary}",
            "",
            "## 2. Primary Risk Drivers",
        ]

        if drivers:
            for d in drivers:
                lines.append(f"- **{d.dimension.upper()}** [{d.severity} - {d.score:.1f}/100]: {d.rationale} *(Evidence: {d.evidence})*")
        else:
            lines.append("- *No elevated risk drivers detected; supplier performs within acceptable benchmarks.*")

        lines.extend(["", "## 3. Mitigating Strengths"])
        if strengths:
            for s in strengths:
                lines.append(f"- **{s.dimension.capitalize()}**: {s.strength_description}")
        else:
            lines.append("- *No exceptional operational strengths identified.*")

        lines.extend([
            "",
            "## 4. Market & Historical Context",
            f"- **Real-Time News**: {news_synopsis}",
            f"- **Historical Memory**: {hist_synopsis}",
            "",
            "## 5. Recommended Procurement Action Plan",
        ])

        for m in mitigations:
            lines.append(f"- `[{m.priority}]` **{m.action}** ({m.target_role}) - *{m.justification}*")

        return "\n".join(lines)


# Global singleton instance
risk_narrative_engine = RiskNarrativeEngine()
