/**
 * TypeScript Definitions for Phase 3: AHP Supplier Scoring Engine
 * Corresponds to backend/schemas/ahp.py and backend/utils/ahp_engine.py
 * Mathematical Reference: Saaty's Analytic Hierarchy Process (AHP) & MAUT Normalization
 */

export type AHPCriterionKey = "price" | "quality" | "delivery" | "esg";

export interface AHPCriterionMeta {
  key: AHPCriterionKey;
  backendKey: string; // "price", "quality", "delivery_time", "esg"
  label: string;
  shortLabel: string;
  description: string;
  direction: "cost" | "benefit"; // "cost" = lower is better (Price, Delivery), "benefit" = higher is better (Quality, ESG)
  unit: string;
  defaultWeight: number;
  color: string;
  badgeBg: string;
  badgeText: string;
}

export const AHP_CRITERIA_METADATA: Record<AHPCriterionKey, AHPCriterionMeta> = {
  price: {
    key: "price",
    backendKey: "price",
    label: "Landed Pricing & Commercial Terms",
    shortLabel: "Cost / Price",
    description: "Total landed procurement cost including freight, customs duty, and payment discount terms (Lower is better).",
    direction: "cost",
    unit: "INR",
    defaultWeight: 0.35,
    color: "#2563EB", // Blue
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
  },
  quality: {
    key: "quality",
    backendKey: "quality",
    label: "Technical Quality & Warranty Coverage",
    shortLabel: "Quality & Specs",
    description: "Material specifications, ISO 9001 certification, warranty duration, and defect-tolerance threshold.",
    direction: "benefit",
    unit: "Score (0-100)",
    defaultWeight: 0.30,
    color: "#10B981", // Emerald
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
  delivery: {
    key: "delivery",
    backendKey: "delivery_time",
    label: "Lead Time & Delivery Reliability",
    shortLabel: "Lead Time",
    description: "Production lead time in calendar days, shipping reliability, and expedited shipment commitment.",
    direction: "cost",
    unit: "Days",
    defaultWeight: 0.25,
    color: "#0EA5E9", // Sky
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-700",
  },
  esg: {
    key: "esg",
    backendKey: "esg",
    label: "ESG & Regulatory Compliance",
    shortLabel: "ESG / Compliance",
    description: "Environmental compliance, carbon footprint audit, MSME enterprise status, and ethical governance.",
    direction: "benefit",
    unit: "Score (0-100)",
    defaultWeight: 0.10,
    color: "#F59E0B", // Amber
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
  },
};

export type AHPCriteriaWeights = Record<AHPCriterionKey, number>;

export interface AHPConsistencyMetrics {
  lambda_max: number;
  CI: number;
  CR: number;
  is_consistent: boolean;
  message: string;
}

export interface AHPTemplateVersion {
  version: string;
  author: string;
  approved_at: string;
  notes: string;
  weights: AHPCriteriaWeights;
}

export interface AHPWeightTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: "Procurement Default" | "Strategic" | "Custom";
  weights: AHPCriteriaWeights;
  pairwiseMatrix?: number[][];
  currentVersion: string;
  versionHistory: AHPTemplateVersion[];
}

export interface AHPRawSupplierMetrics {
  price: number;
  delivery_time: number;
  warranty_months: number;
  is_iso_certified: boolean;
  msme_registered: boolean;
  quality_raw: number;
  esg_raw: number;
}

export interface AHPSupplierNormalizedScores {
  price: number;
  delivery: number;
  quality: number;
  esg: number;
}

export interface AHPSupplierContributions {
  price: number;
  delivery: number;
  quality: number;
  esg: number;
}

export interface AHPRankedSupplier {
  supplier_id: number;
  supplier_name: string;
  quote_number: string;
  country: string;
  is_iso_certified: boolean;
  raw_metrics: AHPRawSupplierMetrics;
  normalized_scores: AHPSupplierNormalizedScores;
  criteria_contributions: AHPSupplierContributions;
  ahp_score: number; // 0.0 to 1.0 (Utility score)
  rank: number;
  badges: string[];
  agent_rationale: string;
  risk_status: "Low" | "Moderate" | "Elevated";
}

export interface AHPEvaluationResult {
  rfq_id: number;
  rfq_title: string;
  mode: "simple" | "pairwise";
  criteria_weights: AHPCriteriaWeights;
  consistency?: AHPConsistencyMetrics;
  pairwise_matrix?: number[][];
  criteria_keys: AHPCriterionKey[];
  rankings: AHPRankedSupplier[];
  total_suppliers: number;
  top_supplier: AHPRankedSupplier;
  calculated_at: string;
  agent_summary: string;
}

export interface AHPCalculateRequestPayload {
  rfq_id: number;
  criteria_weights: Record<string, number>;
}

export interface AHPPairwiseRequestPayload {
  rfq_id: number;
  pairwise_matrix: number[][];
  criteria: string[];
}
