import {
  RFQItem,
  QuotationSubmission,
  ValidationIssue,
  ComparisonEngineResponse,
  CriteriaWeights,
} from "./comparison-types";
import {
  MOCK_RFQS,
  MOCK_QUOTATIONS_RFQ_101,
  MOCK_VALIDATION_ISSUES_RFQ_101,
  computeComparisonResponse,
  INITIAL_WEIGHTS,
} from "./mock-data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Local storage key for persistent overrides during demo
const STORAGE_KEY_ISSUES = "procurapilot_validation_issues";
const STORAGE_KEY_QUOTES = "procurapilot_quotations_state";

export const comparisonApi = {
  /**
   * Fetch all active RFQs
   */
  async getRFQs(): Promise<RFQItem[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/rfqs/`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge with mock details to ensure rich display
          return MOCK_RFQS;
        }
      }
    } catch (e) {
      // Fallback
    }
    return MOCK_RFQS;
  },

  /**
   * Get single RFQ with line items
   */
  async getRFQById(id: number): Promise<RFQItem | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/rfqs/${id}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const foundMock = MOCK_RFQS.find((r) => r.id === Number(id));
        return { ...foundMock, ...data, id: Number(id) };
      }
    } catch (e) {}
    return MOCK_RFQS.find((r) => r.id === Number(id)) || MOCK_RFQS[0];
  },

  /**
   * Get all quotation submissions for an RFQ
   */
  async getQuotationsForRFQ(rfqId: number): Promise<QuotationSubmission[]> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEY_QUOTES}_${rfqId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return MOCK_QUOTATIONS_RFQ_101;
  },

  /**
   * Save quotation submissions state
   */
  saveQuotationsState(rfqId: number, quotes: QuotationSubmission[]) {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${STORAGE_KEY_QUOTES}_${rfqId}`, JSON.stringify(quotes));
    }
  },

  /**
   * Get validation issues for RFQ
   */
  async getValidationIssues(rfqId: number): Promise<ValidationIssue[]> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEY_ISSUES}_${rfqId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return MOCK_VALIDATION_ISSUES_RFQ_101;
  },

  /**
   * Save resolved validation issue (Inline Quick-Fix / Override)
   */
  async resolveValidationIssue(
    rfqId: number,
    issueId: string,
    resolution: {
      type: "rectified" | "overridden" | "rejected";
      rectifiedValue?: string | number;
      note?: string;
    }
  ): Promise<{ success: boolean; issue: ValidationIssue }> {
    const issues = await this.getValidationIssues(rfqId);
    const targetIdx = issues.findIndex((i) => i.id === issueId);
    if (targetIdx === -1) {
      throw new Error(`Issue ${issueId} not found`);
    }

    const updatedIssue: ValidationIssue = {
      ...issues[targetIdx],
      is_resolved: true,
      resolution_type: resolution.type,
      current_value: resolution.rectifiedValue !== undefined ? resolution.rectifiedValue : issues[targetIdx].current_value,
      resolution_note: resolution.note || (resolution.type === "overridden" ? "Warning acknowledged by Procurement Officer" : "Value corrected inline"),
      resolved_at: new Date().toISOString(),
      resolved_by: "Faisal Sakware",
    };

    issues[targetIdx] = updatedIssue;
    if (typeof window !== "undefined") {
      localStorage.setItem(`${STORAGE_KEY_ISSUES}_${rfqId}`, JSON.stringify(issues));
    }

    // Also update quotation state if rectified
    const quotes = await this.getQuotationsForRFQ(rfqId);
    const quote = quotes.find((q) => q.id === updatedIssue.quotation_id);
    if (quote) {
      if (resolution.type === "rejected") {
        quote.validation_status = "rejected";
        quote.is_selected = false;
        quote.validation_summary.is_blocking = true;
      } else {
        // Check if there are other blocking issues
        const otherIssues = issues.filter(
          (i) => i.quotation_id === quote.id && !i.is_resolved && i.severity === "blocking_error"
        );
        if (otherIssues.length === 0) {
          quote.validation_status = "passed";
          quote.validation_summary.is_blocking = false;
        }
      }
      this.saveQuotationsState(rfqId, quotes);
    }

    return { success: true, issue: updatedIssue };
  },

  /**
   * Trigger backend re-run validation
   */
  async rerunValidation(rfqId: number): Promise<{ success: boolean; timestamp: string }> {
    // Simulate real-time validation pipeline latency (750ms)
    await new Promise((r) => setTimeout(r, 750));
    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch Supplier Comparison Output Matrix
   */
  async getComparisonMatrix(
    rfqId: number,
    weights: CriteriaWeights = INITIAL_WEIGHTS
  ): Promise<ComparisonEngineResponse> {
    const quotes = await this.getQuotationsForRFQ(rfqId);
    return computeComparisonResponse(rfqId, weights, quotes);
  },
};
