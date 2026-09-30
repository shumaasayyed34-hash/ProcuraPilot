/**
 * Types for Phase 2: RFQ Management, Validation Engine, and Supplier Comparison
 * Maps directly to backend schemas (Paramita's comparison.py & Shumaaila's procurement.py)
 */

export type RFQStatus =
  | "draft"
  | "awaiting_quotes"
  | "validating"
  | "ready_for_comparison"
  | "awarded"
  | "closed";

export interface RFQLineItem {
  id: number;
  item_code: string;
  description: string;
  quantity: number;
  unit: string;
  target_unit_price?: number;
}

export interface RFQItem {
  id: number;
  rfq_number: string;
  title: string;
  category: string;
  target_delivery_date: string;
  status: RFQStatus;
  budget: number;
  currency: string;
  created_at: string;
  due_date: string;
  department: string;
  buyer_name: string;
  line_items: RFQLineItem[];
  quotations_count: number;
}

export type QuotationValidationStatus =
  | "validating"
  | "passed"
  | "action_required"
  | "rejected";

export type ValidationSeverity = "blocking_error" | "warning";

export type ValidationIssueType =
  | "mandatory_missing"
  | "type_range_discrepancy"
  | "duplicate_detected"
  | "arithmetic_mismatch";

export interface ValidationIssue {
  id: string;
  quotation_id: number;
  supplier_name: string;
  field_name: string;
  severity: ValidationSeverity;
  issue_type: ValidationIssueType;
  title: string;
  description: string;
  current_value?: string | number | null;
  suggested_value?: string | number | null;
  is_resolved: boolean;
  resolution_type?: "overridden" | "rectified" | "rejected";
  resolution_note?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface QuotationValidationSummary {
  quotation_id: number;
  supplier_id: number;
  supplier_name: string;
  quote_number: string;
  total_fields_validated: number;
  error_count: number;
  warning_count: number;
  duplicate_alert: boolean;
  hygiene_score: number; // 0 to 100
  is_blocking: boolean;
  issues: ValidationIssue[];
}

export interface QuotationSubmission {
  id: number;
  rfq_id: number;
  supplier_id: number;
  supplier_name: string;
  quote_number: string;
  submission_date: string;
  currency: string;
  unit_price?: number;
  total_amount: number;
  base_total_amount: number; // converted to base currency (INR)
  delivery_time_days: number;
  incoterms?: string;
  payment_terms?: string;
  warranty_months?: number;
  gst_percentage?: number;
  moq?: number;
  country: string;
  is_iso_certified: boolean;
  validation_status: QuotationValidationStatus;
  validation_summary: QuotationValidationSummary;
  is_selected?: boolean;
}

export interface FXConversionAudit {
  original_currency: string;
  target_currency: string;
  exchange_rate: number;
  conversion_timestamp: string;
  source: string;
}

export interface CriterionDetail {
  criterion_name: string;
  criterion_type: "cost" | "benefit";
  raw_value: number | null;
  raw_unit: string | null;
  normalized_base_value: number | null;
  score: number; // 0 to 100
  weight: number;
  weighted_score: number;
  is_best_in_class: boolean;
}

export type ComparisonBadge =
  | "Best Overall"
  | "Lowest Price"
  | "Fastest Delivery"
  | "Highest Quality"
  | "Longest Warranty"
  | "ESG Leader"
  | "Runner Up";

export interface SupplierComparisonItem {
  supplier_id: number;
  supplier_name: string;
  quotation_id: number;
  quote_number: string;
  country: string;
  is_iso_certified: boolean;

  // Financial Display (Original vs Base Currency)
  currency: string;
  raw_unit_price: number | null;
  raw_total_amount: number | null;
  base_unit_price: number | null;
  base_total_amount: number | null;
  fx_audit: FXConversionAudit;

  // Operational Parameters
  delivery_time_days: number | null;
  warranty_months: number | null;
  payment_terms: string | null;
  incoterms: string | null;
  supplier_rating: number; // 0 to 5
  esg_score: number; // 0 to 100

  // Scoring & Ranking
  composite_score: number; // 0 to 100
  rank: number;
  badges: ComparisonBadge[];
  criteria_scores: Record<string, CriterionDetail>;
}

export interface CriterionBenchmark {
  criterion_name: string;
  criterion_type: "cost" | "benefit";
  unit: string;
  best_value: number | null;
  worst_value: number | null;
  average_value: number | null;
  best_supplier_name: string | null;
}

export interface BenchmarkSummary {
  total_suppliers_compared: number;
  lowest_price_base: number | null;
  highest_price_base: number | null;
  price_variance_percent: number | null;
  fastest_delivery_days: number | null;
  slowest_delivery_days: number | null;
  max_warranty_months: number | null;
  benchmarks_by_criterion: Record<string, CriterionBenchmark>;
}

export interface CriteriaWeights {
  price: number;
  delivery_time: number;
  quality_rating: number;
  warranty: number;
  esg_compliance: number;
}

export interface ComparisonEngineResponse {
  rfq_id: number;
  rfq_title?: string;
  base_currency: string;
  comparison_timestamp: string;
  weights_applied: CriteriaWeights;
  benchmark_summary: BenchmarkSummary;
  recommended_supplier_id: number;
  recommended_supplier_name: string;
  suppliers: SupplierComparisonItem[];
}
