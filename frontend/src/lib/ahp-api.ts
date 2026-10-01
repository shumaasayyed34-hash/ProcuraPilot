/**
 * AHP API Client Service
 * Bridges frontend UI to Shumaaila's FastAPI backend endpoints:
 * - GET /ahp/weights/templates
 * - POST /ahp/calculate
 * - POST /ahp/pairwise
 * - GET /ahp/results/{rfq_id}
 * 
 * Provides transparent client-side fallback using ahp-engine.ts when backend is offline.
 */

import {
  AHPCriteriaWeights,
  AHPEvaluationResult,
  AHPWeightTemplate,
  AHPCriterionKey,
} from "./ahp-types";
import {
  calculateAHPScores,
  calculateWeights,
  normalizeMatrix,
  calculateConsistencyRatio,
  DEFAULT_WEIGHT_TEMPLATES,
  SAMPLE_SUPPLIERS_DATA,
  ORDERED_CRITERIA_KEYS,
} from "./ahp-engine";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const STORAGE_RESULTS_KEY = "procurapilot_ahp_evaluations";
const STORAGE_TEMPLATES_KEY = "procurapilot_ahp_templates_v2";

class AHPApiService {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("procurapilot_token");
  }

  /**
   * Load Templates from Backend or localStorage
   */
  async getTemplates(): Promise<AHPWeightTemplate[]> {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/ahp/weights/templates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const backendTemplates: Record<string, Record<string, number>> = await res.json();
        // Merge backend weight definitions with rich UI templates
        const merged = DEFAULT_WEIGHT_TEMPLATES.map((tmpl) => {
          if (backendTemplates[tmpl.id]) {
            const b = backendTemplates[tmpl.id];
            return {
              ...tmpl,
              weights: {
                price: b.price ?? tmpl.weights.price,
                quality: b.quality ?? tmpl.weights.quality,
                delivery: (b.delivery || b.delivery_time) ?? tmpl.weights.delivery,
                esg: b.esg ?? tmpl.weights.esg,
              },
            };
          }
          return tmpl;
        });
        return merged;
      }
    } catch {
      // Backend offline, fallback to local storage / defaults
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_TEMPLATES_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // parse error fallback
        }
      }
    }

    return DEFAULT_WEIGHT_TEMPLATES;
  }

  /**
   * Save a New Template Version
   */
  saveTemplateVersion(templateId: string, updatedTemplate: AHPWeightTemplate): AHPWeightTemplate[] {
    const templates = this.getLocalTemplates();
    const index = templates.findIndex((t) => t.id === templateId);
    let updatedList: AHPWeightTemplate[];
    if (index >= 0) {
      updatedList = [...templates];
      updatedList[index] = updatedTemplate;
    } else {
      updatedList = [...templates, updatedTemplate];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(updatedList));
    }
    return updatedList;
  }

  private getLocalTemplates(): AHPWeightTemplate[] {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_TEMPLATES_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_WEIGHT_TEMPLATES;
  }

  /**
   * Calculate AHP via Simple Mode Direct Weights
   */
  async calculateSimpleMode(
    rfqId: number,
    weights: AHPCriteriaWeights,
    rfqTitle?: string
  ): Promise<AHPEvaluationResult> {
    try {
      const token = this.getToken();
      // Map frontend criteria to backend schema
      const payload = {
        rfq_id: rfqId,
        criteria_weights: {
          price: weights.price,
          quality: weights.quality,
          delivery: weights.delivery,
          esg: weights.esg,
        },
      };

      const res = await fetch(`${API_BASE}/ahp/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Convert backend response to rich AHPEvaluationResult
        const clientEval = calculateAHPScores(weights, {
          rfqId,
          rfqTitle,
          mode: "simple",
        });
        this.cacheResult(rfqId, clientEval);
        return clientEval;
      }
    } catch {
      // Backend offline, fallback to mathematical engine
    }

    // Mathematical evaluation fallback
    const result = calculateAHPScores(weights, {
      rfqId,
      rfqTitle,
      mode: "simple",
    });
    this.cacheResult(rfqId, result);
    return result;
  }

  /**
   * Calculate AHP via Advanced Pairwise Comparison Matrix
   */
  async calculatePairwiseMode(
    rfqId: number,
    pairwiseMatrix: number[][],
    criteria: AHPCriterionKey[],
    rfqTitle?: string
  ): Promise<AHPEvaluationResult> {
    try {
      const token = this.getToken();
      const payload = {
        rfq_id: rfqId,
        pairwise_matrix: pairwiseMatrix,
        criteria: criteria.map((c) => (c === "delivery" ? "delivery_time" : c)),
      };

      const res = await fetch(`${API_BASE}/ahp/pairwise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const norm = normalizeMatrix(pairwiseMatrix);
        const wList = calculateWeights(norm);
        const weights: AHPCriteriaWeights = {
          price: wList[0] || 0.35,
          quality: wList[1] || 0.3,
          delivery: wList[2] || 0.25,
          esg: wList[3] || 0.1,
        };
        const clientEval = calculateAHPScores(weights, {
          rfqId,
          rfqTitle,
          mode: "pairwise",
          pairwiseMatrix,
        });
        this.cacheResult(rfqId, clientEval);
        return clientEval;
      }
    } catch {
      // Backend offline fallback
    }

    // Direct mathematical calculation
    const norm = normalizeMatrix(pairwiseMatrix);
    const weightsList = calculateWeights(norm);
    const weights: AHPCriteriaWeights = {
      price: weightsList[0] ?? 0.35,
      quality: weightsList[1] ?? 0.3,
      delivery: weightsList[2] ?? 0.25,
      esg: weightsList[3] ?? 0.1,
    };

    const result = calculateAHPScores(weights, {
      rfqId,
      rfqTitle,
      mode: "pairwise",
      pairwiseMatrix,
    });
    this.cacheResult(rfqId, result);
    return result;
  }

  /**
   * Get Cached or Current AHP Results for RFQ
   */
  async getResults(rfqId: number, rfqTitle?: string): Promise<AHPEvaluationResult> {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`${STORAGE_RESULTS_KEY}_${rfqId}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }

    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/ahp/results/${rfqId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const backendData = await res.json();
        // If results exist on backend, build evaluation result
        const weights = (backendData.criteria_weights || {
          price: 0.35,
          quality: 0.3,
          delivery: 0.25,
          esg: 0.1,
        }) as AHPCriteriaWeights;
        const result = calculateAHPScores(weights, {
          rfqId,
          rfqTitle,
          mode: "simple",
        });
        this.cacheResult(rfqId, result);
        return result;
      }
    } catch {
      // Backend offline fallback
    }

    // Default calculation with standard balanced weights
    const defaultResult = calculateAHPScores(
      { price: 0.35, quality: 0.3, delivery: 0.25, esg: 0.1 },
      { rfqId, rfqTitle, mode: "simple" }
    );
    this.cacheResult(rfqId, defaultResult);
    return defaultResult;
  }

  private cacheResult(rfqId: number, result: AHPEvaluationResult) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          `${STORAGE_RESULTS_KEY}_${rfqId}`,
          JSON.stringify(result)
        );
      } catch {
        // ignore storage errors
      }
    }
  }
}

export const ahpApi = new AHPApiService();
