/**
 * Pure TypeScript Mathematical Implementation of the Analytic Hierarchy Process (AHP)
 * and Multi-Attribute Utility Theory (MAUT) Normalization.
 * 
 * Directly mirrors backend/utils/ahp_engine.py and technical specification in
 * docs/AHP_SCORING_METHODOLOGY.md for 100% offline & client-side real-time responsiveness.
 */

import {
  AHPConsistencyMetrics,
  AHPCriteriaWeights,
  AHPCriterionKey,
  AHPWeightTemplate,
  AHPEvaluationResult,
} from "./ahp-types";

export const SAATY_RI: Record<number, number> = {
  1: 0.0,
  2: 0.0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
};

export const SAATY_SCALE_OPTIONS = [
  { value: 9, label: "9 - Extreme Importance (Favors Row)" },
  { value: 7, label: "7 - Very Strong Importance (Favors Row)" },
  { value: 5, label: "5 - Strong Importance (Favors Row)" },
  { value: 3, label: "3 - Moderate Importance (Favors Row)" },
  { value: 2, label: "2 - Slight / Weak Importance (Favors Row)" },
  { value: 1, label: "1 - Equal Importance (Neutral)" },
  { value: 1 / 2, label: "1/2 - Slight Importance (Favors Column)" },
  { value: 1 / 3, label: "1/3 - Moderate Importance (Favors Column)" },
  { value: 1 / 5, label: "1/5 - Strong Importance (Favors Column)" },
  { value: 1 / 7, label: "1/7 - Very Strong Importance (Favors Column)" },
  { value: 1 / 9, label: "1/9 - Extreme Importance (Favors Column)" },
];

export const ORDERED_CRITERIA_KEYS: AHPCriterionKey[] = [
  "price",
  "quality",
  "delivery",
  "esg",
];

// Criteria where LOWER value is better (cost metrics)
const LOWER_IS_BETTER = new Set<AHPCriterionKey>(["price", "delivery"]);

/**
 * Step 1: Column-wise Normalization of Pairwise Matrix
 * r_ij = a_ij / sum_k(a_kj)
 */
export function normalizeMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const colSums = Array(n).fill(0);
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) {
      colSums[c] += matrix[r][c];
    }
  }

  return matrix.map((row) =>
    row.map((val, c) => (colSums[c] > 0 ? val / colSums[c] : 0))
  );
}

/**
 * Step 2: Calculate Priority Weights via Row-Averaging
 * w_i = (1/n) * sum_j(r_ij)
 */
export function calculateWeights(normalizedMatrix: number[][]): number[] {
  const n = normalizedMatrix.length;
  const raw = normalizedMatrix.map(
    (row) => row.reduce((sum, val) => sum + val, 0) / n
  );
  const total = raw.reduce((sum, val) => sum + val, 0);
  return total > 0 ? raw.map((w) => w / total) : Array(n).fill(1 / n);
}

/**
 * Step 3: Calculate Consistency Ratio (CR)
 * lambda_i = (Aw)_i / w_i
 * lambda_max = average(lambda_i)
 * CI = (lambda_max - n) / (n - 1)
 * CR = CI / RI
 */
export function calculateConsistencyRatio(
  matrix: number[][],
  weights: number[]
): AHPConsistencyMetrics {
  const n = matrix.length;
  if (n <= 2) {
    return {
      lambda_max: n,
      CI: 0.0,
      CR: 0.0,
      is_consistent: true,
      message: "Matrix of order n <= 2 is mathematically always consistent.",
    };
  }

  // Weighted sum vector Aw
  const aw = matrix.map((row) =>
    row.reduce((sum, val, j) => sum + val * weights[j], 0)
  );

  // Individual eigenvalue approximations lambda_i
  const lambdas: number[] = [];
  for (let i = 0; i < n; i++) {
    if (weights[i] > 0) {
      lambdas.push(aw[i] / weights[i]);
    }
  }

  const lambdaMax =
    lambdas.length > 0
      ? lambdas.reduce((sum, l) => sum + l, 0) / lambdas.length
      : n;
  const ci = (lambdaMax - n) / (n - 1);
  const ri = SAATY_RI[n] || 1.45;
  const cr = ri > 0 ? ci / ri : 0.0;
  const roundedCR = Math.max(0, Number(cr.toFixed(4)));
  const isConsistent = roundedCR < 0.1;

  return {
    lambda_max: Number(lambdaMax.toFixed(4)),
    CI: Number(ci.toFixed(4)),
    CR: roundedCR,
    is_consistent: isConsistent,
    message: isConsistent
      ? `Matrix consistency verified (CR = ${roundedCR.toFixed(4)} < 0.10). Valid transitivity.`
      : `Pairwise matrix is inconsistent (CR = ${roundedCR.toFixed(4)} ≥ 0.10). Please re-balance judgments.`,
  };
}

/**
 * Standard Multi-Attribute Weight Templates with Version Control
 */
export const DEFAULT_WEIGHT_TEMPLATES: AHPWeightTemplate[] = [
  {
    id: "balanced",
    name: "Standard Balanced Sourcing",
    tagline: "Harmonized weights across cost, quality, and lead time",
    description: "Enterprise default template for mature industrial categories balancing price competitiveness with operational SLA compliance.",
    category: "Procurement Default",
    weights: {
      price: 0.35,
      quality: 0.3,
      delivery: 0.25,
      esg: 0.1,
    },
    pairwiseMatrix: [
      [1.0, 1.2, 1.5, 3.0],
      [1 / 1.2, 1.0, 1.2, 3.0],
      [1 / 1.5, 1 / 1.2, 1.0, 2.5],
      [1 / 3.0, 1 / 3.0, 1 / 2.5, 1.0],
    ],
    currentVersion: "v2.1-approved",
    versionHistory: [
      {
        version: "v2.1-approved",
        author: "Faisal Sakware (Procurement Lead)",
        approved_at: "2025-09-20T10:15:00Z",
        notes: "Aligned ESG weight to 10% compliance threshold per corporate policy revision.",
        weights: { price: 0.35, quality: 0.3, delivery: 0.25, esg: 0.1 },
      },
      {
        version: "v2.0",
        author: "Paramita (Risk Lead)",
        approved_at: "2025-08-14T14:30:00Z",
        notes: "Increased delivery reliability weight to 25% due to global supply chain lead time variances.",
        weights: { price: 0.4, quality: 0.25, delivery: 0.25, esg: 0.1 },
      },
      {
        version: "v1.0",
        author: "Apex Decision Engine",
        approved_at: "2025-06-01T09:00:00Z",
        notes: "Baseline equalized weighting model.",
        weights: { price: 0.4, quality: 0.3, delivery: 0.2, esg: 0.1 },
      },
    ],
  },
  {
    id: "cost_focused",
    name: "Cost Heavy & Margin Protection",
    tagline: "60% Cost priority for high-volume standard commodities",
    description: "Optimized for standardized commodities and high-volume consumables where vendor technical capability is baseline uniform and margin savings dominate.",
    category: "Strategic",
    weights: {
      price: 0.6,
      quality: 0.2,
      delivery: 0.15,
      esg: 0.05,
    },
    pairwiseMatrix: [
      [1.0, 3.0, 4.0, 7.0],
      [1 / 3.0, 1.0, 1.5, 3.0],
      [1 / 4.0, 1 / 1.5, 1.0, 2.0],
      [1 / 7.0, 1 / 3.0, 1 / 2.0, 1.0],
    ],
    currentVersion: "v1.4",
    versionHistory: [
      {
        version: "v1.4",
        author: "CFO Executive Sourcing Committee",
        approved_at: "2025-09-10T11:00:00Z",
        notes: "Strict 60% price allocation for Q4 CAPEX savings initiatives.",
        weights: { price: 0.6, quality: 0.2, delivery: 0.15, esg: 0.05 },
      },
    ],
  },
  {
    id: "quality_focused",
    name: "Mission-Critical Quality & Specs",
    tagline: "55% Quality priority for aerospace & critical precision parts",
    description: "Designed for high-precision components, medical equipment, and aerospace assemblies where warranty duration and ISO certification override price differences.",
    category: "Strategic",
    weights: {
      price: 0.2,
      quality: 0.55,
      delivery: 0.15,
      esg: 0.1,
    },
    pairwiseMatrix: [
      [1.0, 1 / 3.0, 1.5, 2.0],
      [3.0, 1.0, 4.0, 5.0],
      [1 / 1.5, 1 / 4.0, 1.0, 1.5],
      [1 / 2.0, 1 / 5.0, 1 / 1.5, 1.0],
    ],
    currentVersion: "v2.0",
    versionHistory: [
      {
        version: "v2.0",
        author: "Quality Assurance Council",
        approved_at: "2025-09-05T16:00:00Z",
        notes: "Elevated quality factor to 55% for Grade 316 CNC shafts and ceramic bearings.",
        weights: { price: 0.2, quality: 0.55, delivery: 0.15, esg: 0.1 },
      },
    ],
  },
  {
    id: "speed_critical",
    name: "Speed Critical & Expedited Lead Time",
    tagline: "50% Delivery time allocation for urgent assembly bottlenecks",
    description: "Deploy during factory shutdown risks or sudden demand surges where component arrival within 14 calendar days is the gating operational constraint.",
    category: "Strategic",
    weights: {
      price: 0.2,
      quality: 0.2,
      delivery: 0.5,
      esg: 0.1,
    },
    pairwiseMatrix: [
      [1.0, 1.0, 1 / 3.0, 2.0],
      [1.0, 1.0, 1 / 3.0, 2.0],
      [3.0, 3.0, 1.0, 5.0],
      [1 / 2.0, 1 / 2.0, 1 / 5.0, 1.0],
    ],
    currentVersion: "v1.2",
    versionHistory: [
      {
        version: "v1.2",
        author: "Supply Chain Operations Lead",
        approved_at: "2025-08-28T09:45:00Z",
        notes: "Prioritizes domestic inventory holding and quick turnaround.",
        weights: { price: 0.2, quality: 0.2, delivery: 0.5, esg: 0.1 },
      },
    ],
  },
  {
    id: "sustainability_focused",
    name: "ESG & Green Compliance Leader",
    tagline: "30% ESG & Scope 3 carbon compliance weight",
    description: "Tailored for European CSRD reporting, MSME enterprise procurement quotas, and circular economy compliance standards.",
    category: "Strategic",
    weights: {
      price: 0.25,
      quality: 0.25,
      delivery: 0.2,
      esg: 0.3,
    },
    pairwiseMatrix: [
      [1.0, 1.0, 1.2, 1 / 1.3],
      [1.0, 1.0, 1.2, 1 / 1.3],
      [1 / 1.2, 1 / 1.2, 1.0, 1 / 1.5],
      [1.3, 1.3, 1.5, 1.0],
    ],
    currentVersion: "v1.1",
    versionHistory: [
      {
        version: "v1.1",
        author: "Corporate Sustainability Officer",
        approved_at: "2025-09-18T13:20:00Z",
        notes: "Mandatory template for Scope 3 emissions reduction suppliers.",
        weights: { price: 0.25, quality: 0.25, delivery: 0.2, esg: 0.3 },
      },
    ],
  },
];

/**
 * Realistic Sample Suppliers for RFQ 101 with Rich Multi-Attribute Metrics
 */
export const SAMPLE_SUPPLIERS_DATA = [
  {
    supplier_id: 1,
    supplier_name: "Apex Motion & Components Pvt Ltd",
    quote_number: "QT-2025-089",
    country: "India",
    is_iso_certified: true,
    msme_registered: true,
    price: 3125000, // Landed INR
    delivery_time: 14, // 14 days
    warranty_months: 18,
    quality_raw: 88,
    esg_raw: 75,
    agent_rationale:
      "Ranked #1 overall due to excellent delivery turnaround (14 days) and balanced domestic landed pricing (₹31.25L). Holds ISO 9001:2015 and active MSME registration.",
    risk_status: "Low" as const,
  },
  {
    supplier_id: 2,
    supplier_name: "Schneider & Bauer Automation GmbH",
    quote_number: "QT-SB-DE-8821",
    country: "Germany",
    is_iso_certified: true,
    msme_registered: false,
    price: 3084840, // 34,200 EUR * 90.2 = ~₹30.85L
    delivery_time: 21,
    warranty_months: 24,
    quality_raw: 94,
    esg_raw: 50,
    agent_rationale:
      "Competitive landed pricing and superior technical build with 24 months warranty. Delivery requires international ocean transit from Hamburg.",
    risk_status: "Low" as const,
  },
  {
    supplier_id: 3,
    supplier_name: "Precision Dynamics Corporation",
    quote_number: "PDC-2025-Q19",
    country: "United States",
    is_iso_certified: true,
    msme_registered: false,
    price: 3248150, // 38,900 USD * 83.5 = ~₹32.48L
    delivery_time: 19,
    warranty_months: 36,
    quality_raw: 96,
    esg_raw: 50,
    agent_rationale:
      "Industry-leading 36-month warranty and top technical quality rating (96/100), offset by higher landed price due to air freight surcharges.",
    risk_status: "Low" as const,
  },
  {
    supplier_id: 4,
    supplier_name: "Bharat Forge & Allied Industries",
    quote_number: "BF-IND-9902",
    country: "India",
    is_iso_certified: false,
    msme_registered: true,
    price: 2980000, // Lowest Landed INR
    delivery_time: 35,
    warranty_months: 12,
    quality_raw: 62,
    esg_raw: 25,
    agent_rationale:
      "Lowest raw purchase price (₹29.80L), but penalized by longer lead time (35 days) and lack of ISO 9001 quality certification.",
    risk_status: "Moderate" as const,
  },
  {
    supplier_id: 5,
    supplier_name: "Zenith Automation Robotics Ltd",
    quote_number: "ZA-JP-4022",
    country: "Japan",
    is_iso_certified: true,
    msme_registered: false,
    price: 3390000,
    delivery_time: 16,
    warranty_months: 24,
    quality_raw: 92,
    esg_raw: 65,
    agent_rationale:
      "High reliability and quick 16-day air freight from Tokyo, with top-tier robotics precision tolerances and solid ESG credentials.",
    risk_status: "Low" as const,
  },
];

/**
 * Min-Max MAUT Normalization across suppliers
 * Cost criteria (Price, Delivery): (max - val) / (max - min)
 * Benefit criteria (Quality, ESG): (val - min) / (max - min)
 */
export function normalizeSupplierMetrics(
  suppliers: typeof SAMPLE_SUPPLIERS_DATA
) {
  const criteriaKeys: AHPCriterionKey[] = ["price", "quality", "delivery", "esg"];
  const minMax: Record<AHPCriterionKey, { min: number; max: number }> = {
    price: { min: Infinity, max: -Infinity },
    quality: { min: Infinity, max: -Infinity },
    delivery: { min: Infinity, max: -Infinity },
    esg: { min: Infinity, max: -Infinity },
  };

  suppliers.forEach((s) => {
    // Price
    minMax.price.min = Math.min(minMax.price.min, s.price);
    minMax.price.max = Math.max(minMax.price.max, s.price);

    // Delivery
    minMax.delivery.min = Math.min(minMax.delivery.min, s.delivery_time);
    minMax.delivery.max = Math.max(minMax.delivery.max, s.delivery_time);

    // Quality
    minMax.quality.min = Math.min(minMax.quality.min, s.quality_raw);
    minMax.quality.max = Math.max(minMax.quality.max, s.quality_raw);

    // ESG
    minMax.esg.min = Math.min(minMax.esg.min, s.esg_raw);
    minMax.esg.max = Math.max(minMax.esg.max, s.esg_raw);
  });

  const normalizedResults: Record<
    number,
    Record<AHPCriterionKey, number>
  > = {};

  suppliers.forEach((s) => {
    normalizedResults[s.supplier_id] = {} as any;
    criteriaKeys.forEach((crit) => {
      const { min, max } = minMax[crit];
      let val = 0;
      if (crit === "price") val = s.price;
      else if (crit === "delivery") val = s.delivery_time;
      else if (crit === "quality") val = s.quality_raw;
      else if (crit === "esg") val = s.esg_raw;

      if (max === min) {
        normalizedResults[s.supplier_id][crit] = 0.5;
      } else if (LOWER_IS_BETTER.has(crit)) {
        // Lower is better: (max - val) / (max - min)
        normalizedResults[s.supplier_id][crit] = Number(
          ((max - val) / (max - min)).toFixed(4)
        );
      } else {
        // Higher is better: (val - min) / (max - min)
        normalizedResults[s.supplier_id][crit] = Number(
          ((val - min) / (max - min)).toFixed(4)
        );
      }
    });
  });

  return normalizedResults;
}

/**
 * Calculates Full AHP Supplier Rankings and Multi-Attribute Utility Breakdown
 */
export function calculateAHPScores(
  weights: AHPCriteriaWeights,
  options?: {
    rfqId?: number;
    rfqTitle?: string;
    mode?: "simple" | "pairwise";
    pairwiseMatrix?: number[][];
    customSuppliers?: typeof SAMPLE_SUPPLIERS_DATA;
  }
): AHPEvaluationResult {
  const rfqId = options?.rfqId || 101;
  const rfqTitle =
    options?.rfqTitle ||
    "RFQ-2025-0841 • Precision CNC Machined Shafts & Bearing Assemblies";
  const suppliers = options?.customSuppliers || SAMPLE_SUPPLIERS_DATA;
  const mode = options?.mode || "simple";

  // Normalize weights to sum exactly to 1.0
  const totalWeight =
    weights.price + weights.quality + weights.delivery + weights.esg;
  const normalizedWeights: AHPCriteriaWeights =
    totalWeight > 0
      ? {
          price: Number((weights.price / totalWeight).toFixed(4)),
          quality: Number((weights.quality / totalWeight).toFixed(4)),
          delivery: Number((weights.delivery / totalWeight).toFixed(4)),
          esg: Number((weights.esg / totalWeight).toFixed(4)),
        }
      : { price: 0.35, quality: 0.3, delivery: 0.25, esg: 0.1 };

  const normalizedScores = normalizeSupplierMetrics(suppliers);

  // Compute composite utility score for each supplier
  const scoredSuppliers = suppliers.map((sup) => {
    const norm = normalizedScores[sup.supplier_id];
    const priceContrib = Number(
      (norm.price * normalizedWeights.price).toFixed(4)
    );
    const qualityContrib = Number(
      (norm.quality * normalizedWeights.quality).toFixed(4)
    );
    const deliveryContrib = Number(
      (norm.delivery * normalizedWeights.delivery).toFixed(4)
    );
    const esgContrib = Number((norm.esg * normalizedWeights.esg).toFixed(4));

    const totalAhpScore = Number(
      (priceContrib + qualityContrib + deliveryContrib + esgContrib).toFixed(4)
    );

    return {
      supplier_id: sup.supplier_id,
      supplier_name: sup.supplier_name,
      quote_number: sup.quote_number,
      country: sup.country,
      is_iso_certified: sup.is_iso_certified,
      raw_metrics: {
        price: sup.price,
        delivery_time: sup.delivery_time,
        warranty_months: sup.warranty_months,
        is_iso_certified: sup.is_iso_certified,
        msme_registered: sup.msme_registered,
        quality_raw: sup.quality_raw,
        esg_raw: sup.esg_raw,
      },
      normalized_scores: {
        price: norm.price,
        delivery: norm.delivery,
        quality: norm.quality,
        esg: norm.esg,
      },
      criteria_contributions: {
        price: priceContrib,
        delivery: deliveryContrib,
        quality: qualityContrib,
        esg: esgContrib,
      },
      ahp_score: totalAhpScore,
      rank: 1, // dynamically updated below
      badges: [] as string[],
      agent_rationale: sup.agent_rationale,
      risk_status: sup.risk_status,
    };
  });

  // Sort descending by AHP score
  scoredSuppliers.sort((a, b) => b.ahp_score - a.ahp_score);

  // Assign ranks and badges
  scoredSuppliers.forEach((s, idx) => {
    s.rank = idx + 1;
    if (idx === 0) s.badges.push("Top Utility Rank", "AI Recommended");
    else if (idx === 1) s.badges.push("Runner-Up");
    else if (idx === 2) s.badges.push("Tier-1 Qualified");

    if (s.raw_metrics.price === Math.min(...suppliers.map((x) => x.price))) {
      s.badges.push("Lowest Cost");
    }
    if (
      s.raw_metrics.delivery_time ===
      Math.min(...suppliers.map((x) => x.delivery_time))
    ) {
      s.badges.push("Fastest Lead Time");
    }
    if (s.raw_metrics.warranty_months >= 24) {
      s.badges.push("Extended Warranty");
    }
  });

  // Optional consistency metrics for pairwise mode
  let consistency: AHPConsistencyMetrics | undefined = undefined;
  if (mode === "pairwise" && options?.pairwiseMatrix) {
    const weightsList = ORDERED_CRITERIA_KEYS.map((k) => normalizedWeights[k]);
    consistency = calculateConsistencyRatio(options.pairwiseMatrix, weightsList);
  }

  const topSupplier = scoredSuppliers[0];
  const agentSummary = `AHP Decision Engine evaluated ${
    scoredSuppliers.length
  } qualified vendors for ${rfqTitle}. Leading vendor is "${
    topSupplier.supplier_name
  }" with composite utility score of ${(topSupplier.ahp_score * 100).toFixed(
    1
  )}% under ${mode === "pairwise" ? "Pairwise Matrix" : "Simple Weight"} criteria.`;

  return {
    rfq_id: rfqId,
    rfq_title: rfqTitle,
    mode,
    criteria_weights: normalizedWeights,
    consistency,
    pairwise_matrix: options?.pairwiseMatrix,
    criteria_keys: ORDERED_CRITERIA_KEYS,
    rankings: scoredSuppliers,
    total_suppliers: scoredSuppliers.length,
    top_supplier: topSupplier,
    calculated_at: new Date().toISOString(),
    agent_summary: agentSummary,
  };
}
