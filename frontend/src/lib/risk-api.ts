/**
 * Risk Intelligence API Service (Phase 4: F4.1 - F4.4)
 * Connects frontend dashboard and profiles to FastAPI Risk Engine (Shumaaila S4.2/S4.4)
 * and Autonomous Risk Agent (Paramita P4.1/P4.2).
 * Includes rich simulated archetypes for offline evaluation.
 */

import {
  RiskHeatmapSupplier,
  RiskAlertItem,
  RiskThresholdSettings,
  SupplierRiskProfileFull,
} from "./risk-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SETTINGS_KEY = "procurapilot_risk_thresholds";

export const DEFAULT_RISK_THRESHOLDS: RiskThresholdSettings = {
  compositeAlertThreshold: 60,
  criticalThreshold: 80,
  financialRiskCap: 50,
  complianceFailureCutoff: 40,
  deliveryDelayTolerance: 40,
  fraudSensitivity: 35,
  autoBlockCriticalPO: true,
  enableNewsSpikeAlerts: true,
};

// ==============================================================================
// Realistic High-Fidelity Mock Suppliers for Phase 4 Evaluation
// ==============================================================================
export const MOCK_HEATMAP_SUPPLIERS: RiskHeatmapSupplier[] = [
  {
    supplier_id: 1,
    supplier_name: "Apex Precision Components Ltd",
    rfq_id: 101,
    country: "Germany",
    financial_risk: 15.0,
    compliance_risk: 10.0,
    delivery_risk: 15.0,
    country_risk: 15.0,
    esg_risk: 10.0,
    fraud_risk: 10.0,
    composite_risk_score: 13.5,
    risk_category: "low",
    news_sentiment_score: 0.65,
    news_sentiment_label: "positive",
    risk_signals: [],
    active_alerts_count: 0,
    risk_narrative: "Pristine operating record, Tier-1 manufacturing excellence with full ISO & ESG certifications.",
    last_evaluated_at: "2026-10-02T12:00:00Z",
  },
  {
    supplier_id: 2,
    supplier_name: "Titan Industrial Fasteners",
    rfq_id: 101,
    country: "India",
    financial_risk: 35.0,
    compliance_risk: 25.0,
    delivery_risk: 45.0,
    country_risk: 15.0,
    esg_risk: 30.0,
    fraud_risk: 20.0,
    composite_risk_score: 29.5,
    risk_category: "low",
    news_sentiment_score: 0.15,
    news_sentiment_label: "neutral",
    risk_signals: ["supply_chain_disruption"],
    active_alerts_count: 0,
    risk_narrative: "Stable domestic supplier. Minor logistic transit delays noted in Q2 but within SLA limits.",
    last_evaluated_at: "2026-10-02T11:45:00Z",
  },
  {
    supplier_id: 3,
    supplier_name: "SwiftLogistics Express",
    rfq_id: 101,
    country: "Indonesia",
    financial_risk: 45.0,
    compliance_risk: 35.0,
    delivery_risk: 78.0,
    country_risk: 40.0,
    esg_risk: 40.0,
    fraud_risk: 25.0,
    composite_risk_score: 51.5,
    risk_category: "medium",
    news_sentiment_score: -0.22,
    news_sentiment_label: "negative",
    risk_signals: ["supply_chain_disruption"],
    active_alerts_count: 1,
    risk_narrative: "Port congestion and driver walkouts triggered chronic shipment delays averaging 12 days.",
    last_evaluated_at: "2026-10-02T10:15:00Z",
  },
  {
    supplier_id: 4,
    supplier_name: "Vortex Castings & Alloys",
    rfq_id: 102,
    country: "Vietnam",
    financial_risk: 65.0,
    compliance_risk: 75.0,
    delivery_risk: 40.0,
    country_risk: 40.0,
    esg_risk: 50.0,
    fraud_risk: 30.0,
    composite_risk_score: 64.2,
    risk_category: "high",
    news_sentiment_score: -0.48,
    news_sentiment_label: "negative",
    risk_signals: ["legal_regulatory_dispute", "compliance_sanctions_fraud"],
    active_alerts_count: 2,
    risk_narrative: "Expired ISO 9001 and statutory tax disputes flag high non-conformance vulnerability.",
    last_evaluated_at: "2026-10-02T09:30:00Z",
  },
  {
    supplier_id: 5,
    supplier_name: "Nova Global Petrochemicals",
    rfq_id: 102,
    country: "Russia",
    financial_risk: 75.0,
    compliance_risk: 85.0,
    delivery_risk: 70.0,
    country_risk: 65.0,
    esg_risk: 60.0,
    fraud_risk: 45.0,
    composite_risk_score: 76.5,
    risk_category: "high",
    news_sentiment_score: -0.85,
    news_sentiment_label: "negative",
    risk_signals: ["compliance_sanctions_fraud", "bankruptcy_insolvency"],
    active_alerts_count: 3,
    risk_narrative: "International trade sanction exposure and severe currency volatility present severe supply chain risk.",
    last_evaluated_at: "2026-10-02T08:50:00Z",
  },
  {
    supplier_id: 6,
    supplier_name: "Phantom Micro Devices (Ghost Entity)",
    rfq_id: 103,
    country: "India",
    financial_risk: 85.0,
    compliance_risk: 95.0,
    delivery_risk: 80.0,
    country_risk: 15.0,
    esg_risk: 70.0,
    fraud_risk: 95.0,
    composite_risk_score: 87.8,
    risk_category: "critical",
    news_sentiment_score: -0.92,
    news_sentiment_label: "negative",
    risk_signals: ["compliance_sanctions_fraud", "legal_regulatory_dispute"],
    active_alerts_count: 4,
    risk_narrative: "CRITICAL FRAUD: Free webmail domain, non-existent physical address, and unverified GSTIN.",
    last_evaluated_at: "2026-10-02T08:00:00Z",
  },
];

class RiskApiService {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("procurapilot_token");
  }

  /**
   * F4.1: Fetch overall risk heatmap data for all suppliers or specific RFQ
   */
  async getRiskHeatmap(rfqId?: number): Promise<RiskHeatmapSupplier[]> {
    try {
      const token = this.getToken();
      const url = rfqId ? `${API_BASE}/risk/rfq/${rfqId}` : `${API_BASE}/risk/alerts`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        if (data.suppliers && Array.isArray(data.suppliers)) {
          return data.suppliers;
        }
      }
    } catch {
      // Backend offline fallback
    }

    return MOCK_HEATMAP_SUPPLIERS;
  }

  /**
   * Alias for getRiskHeatmap
   */
  async getHeatmapSuppliers(rfqId?: number): Promise<RiskHeatmapSupplier[]> {
    return this.getRiskHeatmap(rfqId);
  }

  /**
   * F4.2: Fetch granular supplier risk profile including 6 dimensions, LLM narrative, news, & vector matches
   */
  async getSupplierRiskProfile(supplierId: number | string): Promise<SupplierRiskProfileFull> {
    const numericId = Number(supplierId);
    const mock = MOCK_HEATMAP_SUPPLIERS.find((s) => s.supplier_id === numericId) || MOCK_HEATMAP_SUPPLIERS[0];

    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/risk/report/${supplierId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const report = await res.json();
        return this._buildFullProfileFromReport(report, mock);
      }
    } catch {
      // Fallback
    }

    return this._generateMockFullProfile(mock);
  }

  /**
   * F4.3: Fetch real-time risk alerts exceeding thresholds
   */
  async getRiskAlerts(): Promise<RiskAlertItem[]> {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/risk/alerts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data: any[] = await res.json();
        return data.map((d, idx) => ({
          id: `ALERT-${d.supplier_id}-${idx}`,
          supplier_id: d.supplier_id,
          supplier_name: d.supplier_name,
          composite_risk_score: d.composite_risk_score,
          risk_category: d.risk_category,
          primary_risk_reason: d.primary_risk_reason || "Elevated Composite Score",
          severity: d.composite_risk_score >= 80 ? "CRITICAL" : "HIGH",
          created_at: d.created_at || new Date().toISOString(),
          acknowledged: false,
        }));
      }
    } catch {
      // Fallback
    }

    // Default mock alerts derived from high-risk suppliers
    return [
      {
        id: "ALERT-GHOST-6",
        supplier_id: 6,
        supplier_name: "Phantom Micro Devices (Ghost Entity)",
        composite_risk_score: 87.8,
        risk_category: "critical",
        primary_risk_reason: "High Fraud & Compliance Risk: Free Webmail & Missing GSTIN",
        severity: "CRITICAL",
        created_at: "2026-10-02T12:00:00Z",
        acknowledged: false,
      },
      {
        id: "ALERT-SANCTION-5",
        supplier_id: 5,
        supplier_name: "Nova Global Petrochemicals",
        composite_risk_score: 76.5,
        risk_category: "high",
        primary_risk_reason: "Sanctions Violation & Liquidity Distress News Alert",
        severity: "HIGH",
        created_at: "2026-10-02T11:15:00Z",
        acknowledged: false,
      },
      {
        id: "ALERT-COMPLIANCE-4",
        supplier_id: 4,
        supplier_name: "Vortex Castings & Alloys",
        composite_risk_score: 64.2,
        risk_category: "high",
        primary_risk_reason: "Statutory Compliance: Expired ISO 9001 and Pending Litigation",
        severity: "HIGH",
        created_at: "2026-10-02T09:40:00Z",
        acknowledged: false,
      },
      {
        id: "ALERT-DELIVERY-3",
        supplier_id: 3,
        supplier_name: "SwiftLogistics Express",
        composite_risk_score: 51.5,
        risk_category: "medium",
        primary_risk_reason: "Logistics Delay: On-time fulfillment plunged below 65%",
        severity: "MEDIUM",
        created_at: "2026-10-02T08:30:00Z",
        acknowledged: false,
      },
    ];
  }

  /**
   * F4.4: Load Risk Notification Threshold Settings
   */
  getThresholdSettings(): RiskThresholdSettings {
    if (typeof window === "undefined") return DEFAULT_RISK_THRESHOLDS;
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_RISK_THRESHOLDS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_RISK_THRESHOLDS;
      }
    }
    return DEFAULT_RISK_THRESHOLDS;
  }

  /**
   * F4.4: Save Risk Notification Threshold Settings
   */
  saveThresholdSettings(settings: RiskThresholdSettings): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  }

  /**
   * Trigger Recalculate All Risk Scores
   */
  async recalculateAllRisk(): Promise<{ total_suppliers: number; recalculated: number; high_risk_found: number }> {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/risk/recalculate-all`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    return {
      total_suppliers: MOCK_HEATMAP_SUPPLIERS.length,
      recalculated: MOCK_HEATMAP_SUPPLIERS.length,
      high_risk_found: 3,
    };
  }

  // Helper generators
  private _buildFullProfileFromReport(report: any, mock: RiskHeatmapSupplier): SupplierRiskProfileFull {
    return {
      supplier_id: report.supplier_id,
      supplier_name: report.supplier_name || mock.supplier_name,
      country: report.country || mock.country || "India",
      years_in_business: mock.supplier_id === 1 ? 14 : 3,
      annual_revenue: mock.supplier_id === 1 ? 45000000 : 2500000,
      email: `procurement@${mock.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      composite_risk_score: report.composite_risk_score,
      risk_category: report.risk_category,
      dimension_breakdown: {
        financial: report.financial_risk || 0,
        compliance: report.compliance_risk || 0,
        delivery: report.delivery_risk || 0,
        country: report.country_risk || 0,
        esg: report.esg_risk || 0,
        fraud: report.fraud_risk || 0,
      },
      structured_narrative: {
        executive_summary: report.risk_narrative || mock.risk_narrative || "Risk assessment completed.",
        risk_category_justification: `Assigned category '${report.risk_category}' based on weighted multi-criteria telemetry.`,
        primary_risk_drivers: [
          {
            dimension: "Compliance",
            score: report.compliance_risk || 20,
            severity: (report.compliance_risk || 0) > 60 ? "HIGH" : "LOW",
            rationale: "Statutory certificate conformance assessment",
            evidence: "Evaluated GST and ISO filings on record",
          },
        ],
        mitigating_strengths: [
          {
            dimension: "Delivery",
            strength_description: "Consistent logistics fulfillment benchmark",
          },
        ],
        news_market_synopsis: "Media coverage indicates normalized sentiment with low legal controversy.",
        historical_risk_summary: "No catastrophic historical defaults indexed in vector database.",
        actionable_mitigation_plan: [
          {
            priority: report.composite_risk_score > 60 ? "URGENT" : "LOW",
            action: report.composite_risk_score > 60 ? "Require Escrow or Advance Guarantee" : "Standard contracting terms approved",
            justification: "Risk mitigation protocol according to corporate policy",
            target_role: "Procurement Officer",
          },
        ],
        markdown_briefing: report.risk_narrative || "",
      },
      news_sentiment: {
        sentiment_score: mock.news_sentiment_score || 0.1,
        sentiment_label: mock.news_sentiment_label || "neutral",
        risk_signals: mock.risk_signals || [],
        key_snippets: [
          `Market intelligence report confirmed stable performance for ${mock.supplier_name}.`,
        ],
        article_count: 3,
        summary: `News sentiment remains at ${mock.news_sentiment_score || 0.0} with no critical legal alerts.`,
      },
      historical_events: [],
      recommendations: ["Maintain standard quarterly performance reviews."],
      last_evaluated_at: report.created_at || new Date().toISOString(),
    };
  }

  private _generateMockFullProfile(mock: RiskHeatmapSupplier): SupplierRiskProfileFull {
    const isCritical = mock.risk_category === "critical";
    const isHigh = mock.risk_category === "high";

    return {
      supplier_id: mock.supplier_id,
      supplier_name: mock.supplier_name,
      country: mock.country || "India",
      years_in_business: isCritical ? 1 : isHigh ? 3 : 12,
      annual_revenue: isCritical ? 250000 : isHigh ? 3200000 : 38000000,
      email: isCritical ? "phantom_sales@gmail.com" : `procurement@${mock.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      gstin: isCritical ? undefined : "27AAACA12341Z5",
      address: isCritical ? undefined : "Industrial Corridor, Phase 2, Pune",
      msme_number: isCritical ? undefined : "UDYAM-MH-01-0088921",
      composite_risk_score: mock.composite_risk_score,
      risk_category: mock.risk_category,
      dimension_breakdown: {
        financial: mock.financial_risk,
        compliance: mock.compliance_risk,
        delivery: mock.delivery_risk,
        country: mock.country_risk,
        esg: mock.esg_risk,
        fraud: mock.fraud_risk,
      },
      structured_narrative: {
        executive_summary: mock.risk_narrative || `Supplier ${mock.supplier_name} exhibits a ${mock.risk_category.toUpperCase()} risk profile with composite score ${mock.composite_risk_score}/100.`,
        risk_category_justification: `Assigned category '${mock.risk_category}' based on multi-dimensional telemetry. Highest exposure detected in ${mock.compliance_risk > 50 ? "Compliance & Legal" : mock.fraud_risk > 50 ? "Fraud & Identity" : "Delivery Performance"}.`,
        primary_risk_drivers: [
          {
            dimension: "Compliance",
            score: mock.compliance_risk,
            severity: mock.compliance_risk >= 75 ? "CRITICAL" : mock.compliance_risk >= 50 ? "HIGH" : "LOW",
            rationale: mock.compliance_risk > 50 ? "Unverified or expired statutory certificates on file" : "ISO 9001 and GST verified",
            evidence: isCritical ? "Zero compliance filings provided" : "ISO 9001 verified through 2027",
          },
          {
            dimension: "Financial",
            score: mock.financial_risk,
            severity: mock.financial_risk >= 70 ? "HIGH" : "LOW",
            rationale: mock.financial_risk > 50 ? "Low turnover with elevated cash-burn risk" : "Pristine audited financials and strong cash reserves",
            evidence: isCritical ? "Turnover < $500K with low liquidity" : "Audited balance sheet confirms $38M revenue",
          },
        ],
        mitigating_strengths: [
          {
            dimension: "Delivery",
            strength_description: mock.delivery_risk < 30 ? "Exemplary 98.5% on-time fulfillment track record" : "Regional warehousing backup available",
          },
        ],
        news_market_synopsis: `External media surveillance indicates ${mock.news_sentiment_label || "neutral"} sentiment (${mock.news_sentiment_score || 0.0}). Signals: ${mock.risk_signals?.join(", ") || "None"}.`,
        historical_risk_summary: isHigh || isCritical ? "Historical vector search identified 2 past incident records relating to fulfillment breaches." : "Zero historical contract breaches or defaults indexed in FAISS vector store.",
        actionable_mitigation_plan: [
          {
            priority: isCritical ? "URGENT" : isHigh ? "HIGH" : "LOW",
            action: isCritical ? "Halt all Purchase Order issuance and initiate Corporate Registry site inspection" : isHigh ? "Require 100% post-delivery milestone payment; eliminate advance guarantees" : "Standard procurement contracting approved with quarterly audit",
            justification: isCritical ? "Mitigates phantom vendor fraud and non-delivery risk" : isHigh ? "Protects working capital against financial distress" : "All assessed metrics remain well within acceptable corporate tolerances",
            target_role: isCritical ? "VP of Procurement" : isHigh ? "Finance Controller" : "Procurement Specialist",
          },
        ],
        markdown_briefing: mock.risk_narrative || "",
      },
      news_sentiment: {
        sentiment_score: mock.news_sentiment_score || 0.0,
        sentiment_label: mock.news_sentiment_label || "neutral",
        risk_signals: mock.risk_signals || [],
        key_snippets: [
          `Press reports regarding ${mock.supplier_name} market performance and operational announcements.`,
        ],
        article_count: 4,
        summary: `Market surveillance classified recent press sentiment as ${mock.news_sentiment_label || "neutral"}.`,
      },
      historical_events: isHigh || isCritical ? [
        {
          event_id: "RISK-EVT-901",
          supplier_id: String(mock.supplier_id),
          event_type: "delivery_delay",
          title: "Q2 Logistics Congestion Backlog",
          description: "Fulfillment center experienced 14-day delays affecting industrial fasteners shipment.",
          severity_score: 72.0,
          similarity_score: 0.88,
          timestamp: "2026-05-14T10:00:00Z",
        },
      ] : [],
      recommendations: isCritical ? [
        "Block immediate PO creation.",
        "Initiate physical site audit and legal affairs validation.",
      ] : [
        "Standard commercial workflow approved.",
        "Maintain periodic quarterly risk review.",
      ],
      last_evaluated_at: mock.last_evaluated_at || new Date().toISOString(),
    };
  }
}

export const riskApi = new RiskApiService();
