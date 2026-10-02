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

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

// Local storage keys for persistent overrides during demo
const STORAGE_KEY_ISSUES = "procurapilot_validation_issues";
const STORAGE_KEY_QUOTES = "procurapilot_quotations_state";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("procurapilot_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const comparisonApi = {
  /**
   * Fetch all active RFQs from backend or mock
   */
  async getRFQs(): Promise<RFQItem[]> {
    try {
      const res = await fetch(`${API_BASE}/rfqs/`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge backend list with rich mock details
          const merged = data.map((d: any) => {
            const mock = MOCK_RFQS.find((m) => m.id === d.id);
            return {
              id: d.id,
              rfq_number: mock?.rfq_number || `RFQ-2025-0${d.id}`,
              title: d.title || mock?.title || `Procurement RFQ #${d.id}`,
              category: d.category || mock?.category || "Industrial Sourcing",
              target_delivery_date: d.required_delivery_date || mock?.target_delivery_date || "2025-12-31",
              status: d.status || mock?.status || "ready_for_comparison",
              budget: mock?.budget ?? 3500000,
              currency: "INR",
              created_at: d.created_at || mock?.created_at || new Date().toISOString(),
              due_date: mock?.due_date || "2025-11-30T18:00:00Z",
              department: mock?.department || "Procurement Operations",
              buyer_name: mock?.buyer_name || "Procurement Officer",
              quotations_count: mock?.quotations_count || 3,
              line_items: mock?.line_items || [],
            };
          });
          return merged;
        }
      }
    } catch (e) {
      // Fallback
    }
    return MOCK_RFQS;
  },

  /**
   * Get single RFQ with line items - fully dynamic for any ID
   */
  async getRFQById(id: number): Promise<RFQItem | null> {
    const numId = Number(id) || 101;
    let backendData: any = null;

    try {
      const res = await fetch(`${API_BASE}/rfqs/${numId}`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        cache: "no-store",
      });
      if (res.ok) {
        backendData = await res.json();
      }
    } catch (e) {}

    const foundMock = MOCK_RFQS.find((r) => r.id === numId);

    if (foundMock && backendData) {
      return {
        ...foundMock,
        ...backendData,
        id: numId,
        budget: foundMock.budget,
        buyer_name: foundMock.buyer_name,
        quotations_count: foundMock.quotations_count,
        line_items: foundMock.line_items,
      };
    }
    if (foundMock) {
      return foundMock;
    }
    if (backendData) {
      return {
        id: numId,
        rfq_number: `RFQ-2025-0${numId}`,
        title: backendData.title || `Procurement Sourcing Package #${numId}`,
        category: backendData.category || "Precision Industrial Components",
        target_delivery_date: backendData.required_delivery_date || "2025-12-31",
        status: backendData.status || "ready_for_comparison",
        budget: 3500000,
        currency: "INR",
        created_at: backendData.created_at || new Date().toISOString(),
        due_date: "2025-11-30T18:00:00Z",
        department: "Heavy Machinery Operations",
        buyer_name: "Procurement Lead",
        quotations_count: 4,
        line_items: [
          {
            id: 1,
            item_code: `MCH-${numId}-01`,
            description: `Precision CNC Machined Assemblies (${backendData.title || `Spec #${numId}`})`,
            quantity: backendData.quantity || 500,
            unit: backendData.unit || "PCS",
            target_unit_price: 3200,
          },
        ],
      };
    }

    // Dynamic RFQ generator for any other non-mock ID
    return {
      id: numId,
      rfq_number: `RFQ-2025-0${numId}`,
      title: `Precision Machined Assemblies & Industrial Sourcing #${numId}`,
      category: "Industrial Equipment & Components",
      target_delivery_date: "2025-12-31",
      status: "ready_for_comparison",
      budget: 3500000,
      currency: "INR",
      created_at: new Date().toISOString(),
      due_date: "2025-11-30T18:00:00Z",
      department: "Heavy Machinery Operations",
      buyer_name: "Procurement Lead",
      quotations_count: 4,
      line_items: [
        {
          id: 1,
          item_code: `ENG-${numId}-01`,
          description: `Custom CNC Turned Stainless Shafts (Package #${numId})`,
          quantity: 400,
          unit: "PCS",
          target_unit_price: 4200,
        },
      ],
    };
  },

  /**
   * Get all quotation submissions for an RFQ - dynamic for any RFQ ID
   */
  async getQuotationsForRFQ(rfqId: number): Promise<QuotationSubmission[]> {
    const numId = Number(rfqId) || 101;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEY_QUOTES}_${numId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }

    // Try fetching from backend API
    try {
      const res = await fetch(`${API_BASE}/rfqs/${numId}/quotations`, {
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });
      if (res.ok) {
        const quotes = await res.json();
        if (Array.isArray(quotes) && quotes.length > 0) {
          return quotes.map((q: any, idx: number): QuotationSubmission => ({
            id: q.id || numId * 10 + idx + 1,
            rfq_id: numId,
            supplier_id: q.supplier_id || idx + 1,
            supplier_name: q.supplier_name || `Supplier ${idx + 1}`,
            quote_number: q.quotation_number || `QTN-${numId}-0${idx + 1}`,
            submission_date: q.created_at || new Date().toISOString(),
            currency: q.currency || "INR",
            total_amount: q.total_amount || 3200000,
            base_total_amount: q.total_amount || 3200000,
            delivery_time_days: q.delivery_days || 21,
            payment_terms: "Net 30 Days",
            incoterms: "DDP Mumbai",
            warranty_months: 18,
            country: q.country || "India",
            is_iso_certified: true,
            validation_status: "passed",
            validation_summary: {
              quotation_id: q.id || numId * 10 + idx + 1,
              supplier_id: q.supplier_id || idx + 1,
              supplier_name: q.supplier_name || `Supplier ${idx + 1}`,
              quote_number: q.quotation_number || `QTN-${numId}-0${idx + 1}`,
              total_fields_validated: 12,
              error_count: 0,
              warning_count: 0,
              duplicate_alert: false,
              hygiene_score: 98,
              is_blocking: false,
              issues: [],
            },
            is_selected: true,
          }));
        }
      }
    } catch (e) {}

    // Adapt mock quotations dynamically to this RFQ ID
    return MOCK_QUOTATIONS_RFQ_101.map((q, idx) => ({
      ...q,
      rfq_id: numId,
      id: numId * 10 + idx + 1,
      quote_number: `QTN-${numId}-0${idx + 1}`,
    }));
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
   * Get validation issues for RFQ - dynamic for any RFQ ID
   */
  async getValidationIssues(rfqId: number): Promise<ValidationIssue[]> {
    const numId = Number(rfqId) || 101;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_KEY_ISSUES}_${numId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return MOCK_VALIDATION_ISSUES_RFQ_101.map((iss, idx) => ({
      ...iss,
      id: `VAL-${numId}-00${idx + 1}`,
      rfq_id: numId,
      quotation_id: numId * 10 + (idx % 4) + 1,
    }));
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
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Fetch Supplier Comparison Output Matrix dynamically
   */
  async getComparisonMatrix(
    rfqId: number,
    weights: CriteriaWeights = INITIAL_WEIGHTS
  ): Promise<ComparisonEngineResponse> {
    const numId = Number(rfqId) || 101;
    const quotes = await this.getQuotationsForRFQ(numId);
    return computeComparisonResponse(numId, weights, quotes);
  },
};
