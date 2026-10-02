/**
 * Risk Intelligence Type Definitions (Phase 4: F4.1 - F4.4)
 * Bridges frontend UI with Shumaaila's baseline Risk Engine (S4.2)
 * and Paramita's LLM Risk Narrative & Sentiment Engine (P4.1, P4.2).
 */

export type RiskCategory = "low" | "medium" | "high" | "critical";

export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskDimensions {
  financial: number;
  compliance: number;
  delivery: number;
  country: number;
  esg: number;
  fraud: number;
  news_sentiment?: number;
}

export interface RiskHeatmapSupplier {
  supplier_id: number | string;
  supplier_name: string;
  rfq_id?: number;
  country?: string;
  financial_risk: number;
  compliance_risk: number;
  delivery_risk: number;
  country_risk: number;
  esg_risk: number;
  fraud_risk: number;
  composite_risk_score: number;
  risk_category: RiskCategory;
  risk_narrative?: string;
  news_sentiment_score?: number;
  news_sentiment_label?: "positive" | "neutral" | "negative";
  risk_signals?: string[];
  active_alerts_count?: number;
  last_evaluated_at?: string;
}

export interface RiskAlertItem {
  id: string;
  supplier_id: number | string;
  supplier_name: string;
  composite_risk_score: number;
  risk_category: RiskCategory;
  primary_risk_reason: string;
  severity: RiskSeverity;
  created_at: string;
  acknowledged?: boolean;
}

export interface RiskThresholdSettings {
  compositeAlertThreshold: number; // default: 60
  criticalThreshold: number; // default: 80
  financialRiskCap: number; // default: 50
  complianceFailureCutoff: number; // default: 40
  deliveryDelayTolerance: number; // default: 40
  fraudSensitivity: number; // default: 35
  autoBlockCriticalPO: boolean; // default: true
  enableNewsSpikeAlerts: boolean; // default: true
}

export interface RiskDriverDetail {
  dimension: string;
  score: number;
  severity: RiskSeverity;
  rationale: string;
  evidence: string;
}

export interface MitigatingStrength {
  dimension: string;
  strength_description: string;
}

export interface ActionableMitigationItem {
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  action: string;
  justification: string;
  target_role: string;
}

export interface StructuredRiskNarrativeUI {
  executive_summary: string;
  risk_category_justification: string;
  primary_risk_drivers: RiskDriverDetail[];
  mitigating_strengths: MitigatingStrength[];
  news_market_synopsis: string;
  historical_risk_summary: string;
  actionable_mitigation_plan: ActionableMitigationItem[];
  markdown_briefing: string;
}

export interface HistoricalRiskEventUI {
  event_id: string;
  supplier_id: string;
  event_type: string;
  title: string;
  description: string;
  severity_score: number;
  similarity_score?: number;
  timestamp?: string;
}

export interface NewsSentimentDetailUI {
  sentiment_score: number;
  sentiment_label: "positive" | "neutral" | "negative";
  risk_signals: string[];
  key_snippets: string[];
  article_count: number;
  summary: string;
}

export interface SupplierRiskProfileFull {
  supplier_id: number | string;
  supplier_name: string;
  rfq_id?: number;
  country: string;
  years_in_business: number;
  annual_revenue: number;
  email: string;
  gstin?: string;
  address?: string;
  msme_number?: string;
  composite_risk_score: number;
  risk_category: RiskCategory;
  dimension_breakdown: RiskDimensions;
  structured_narrative: StructuredRiskNarrativeUI;
  news_sentiment: NewsSentimentDetailUI;
  historical_events: HistoricalRiskEventUI[];
  recommendations: string[];
  last_evaluated_at: string;
}
