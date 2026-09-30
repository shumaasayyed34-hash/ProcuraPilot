import {
  RFQItem,
  QuotationSubmission,
  ValidationIssue,
  ComparisonEngineResponse,
  CriteriaWeights,
  SupplierComparisonItem,
} from "./comparison-types";

export const FX_RATES_TO_INR: Record<string, number> = {
  INR: 1.0,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  JPY: 0.55,
  SGD: 62.15,
};

export const INITIAL_WEIGHTS: CriteriaWeights = {
  price: 0.4,
  delivery_time: 0.25,
  quality_rating: 0.15,
  warranty: 0.1,
  esg_compliance: 0.1,
};

export const MOCK_RFQS: RFQItem[] = [
  {
    id: 101,
    rfq_number: "RFQ-2025-0841",
    title: "Precision CNC Machined Shafts & Bearing Assemblies (Grade 316 Stainless)",
    category: "Precision Engineering & Mechanical Components",
    target_delivery_date: "2025-11-30",
    status: "ready_for_comparison",
    budget: 3500000,
    currency: "INR",
    created_at: "2025-09-15T09:00:00Z",
    due_date: "2025-10-15T18:00:00Z",
    department: "Heavy Machinery Operations",
    buyer_name: "Faisal Sakware",
    quotations_count: 4,
    line_items: [
      {
        id: 1,
        item_code: "MCH-316-01",
        description: "CNC Turned Stepped Shaft 45mm x 320mm (AISI 316L)",
        quantity: 500,
        unit: "PCS",
        target_unit_price: 3200,
      },
      {
        id: 2,
        item_code: "BRG-HYB-08",
        description: "High-Load Ceramic Hybrid Flange Bearing Assembly",
        quantity: 250,
        unit: "SETS",
        target_unit_price: 6800,
      },
    ],
  },
  {
    id: 102,
    rfq_number: "RFQ-2025-0914",
    title: "High-Temperature Industrial Sensors & Valve Positioners",
    category: "Electrical & Instrumentation",
    target_delivery_date: "2025-12-15",
    status: "validating",
    budget: 1800000,
    currency: "INR",
    created_at: "2025-09-22T11:30:00Z",
    due_date: "2025-10-25T18:00:00Z",
    department: "Plant Automation",
    buyer_name: "Faisal Sakware",
    quotations_count: 2,
    line_items: [
      {
        id: 3,
        item_code: "SEN-HT-400",
        description: "Thermocouple Type K High Temp Hermetic Probe",
        quantity: 120,
        unit: "PCS",
        target_unit_price: 8500,
      },
    ],
  },
  {
    id: 103,
    rfq_number: "RFQ-2025-0720",
    title: "Raw Polycarbonate Polymer Granules (Optical Grade Injection)",
    category: "Raw Polymers & Resins",
    target_delivery_date: "2025-10-31",
    status: "awaiting_quotes",
    budget: 4200000,
    currency: "INR",
    created_at: "2025-09-28T14:15:00Z",
    due_date: "2025-10-28T18:00:00Z",
    department: "Molding Divison",
    buyer_name: "Faisal Sakware",
    quotations_count: 1,
    line_items: [
      {
        id: 4,
        item_code: "POLY-OPT-55",
        description: "UV-Stabilized Optical Grade Polycarbonate Granules",
        quantity: 12000,
        unit: "KG",
        target_unit_price: 350,
      },
    ],
  },
];

export const MOCK_VALIDATION_ISSUES_RFQ_101: ValidationIssue[] = [
  {
    id: "VAL-ISSUE-001",
    quotation_id: 202,
    supplier_name: "Schneider & Bauer Automation GmbH",
    field_name: "incoterms",
    severity: "warning",
    issue_type: "mandatory_missing",
    title: "Missing Incoterms Clause in Letterhead",
    description: "Extracted German quotation specifies carriage to port without standardized Incoterms 2020 definition.",
    current_value: null,
    suggested_value: "FOB Hamburg Port",
    is_resolved: false,
    resolution_type: undefined,
  },
  {
    id: "VAL-ISSUE-002",
    quotation_id: 204,
    supplier_name: "Bharat Forge & Allied Industries",
    field_name: "gst_percentage",
    severity: "blocking_error",
    issue_type: "type_range_discrepancy",
    title: "GST Rate Discrepancy (32.0% Exceeds 28% Legal Ceiling)",
    description: "Extracted line-tax row contains 32.0% GST, violating Central Board of Indirect Taxes tax slab brackets.",
    current_value: "32.0%",
    suggested_value: "18.0%",
    is_resolved: false,
    resolution_type: undefined,
  },
  {
    id: "VAL-ISSUE-003",
    quotation_id: 203,
    supplier_name: "Precision Dynamics Corporation",
    field_name: "duplicate_reference",
    severity: "warning",
    issue_type: "duplicate_detected",
    title: "Duplicate Quote Reference Sequence Detected",
    description: "Quotation reference sequence #PDC-2025-Q19 was previously recorded on historical archive.",
    current_value: "PDC-2025-Q19",
    suggested_value: "PDC-2025-Q19-REV2",
    is_resolved: false,
    resolution_type: undefined,
  },
  {
    id: "VAL-ISSUE-004",
    quotation_id: 204,
    supplier_name: "Bharat Forge & Allied Industries",
    field_name: "delivery_date",
    severity: "blocking_error",
    issue_type: "type_range_discrepancy",
    title: "Delivery Lead Date Conflict",
    description: "Quoted delivery lead period of 12 days conflicts with material hardening SLA window (minimum 18 days).",
    current_value: "12 days",
    suggested_value: "21 days",
    is_resolved: false,
    resolution_type: undefined,
  },
];

export const MOCK_QUOTATIONS_RFQ_101: QuotationSubmission[] = [
  {
    id: 201,
    rfq_id: 101,
    supplier_id: 1,
    supplier_name: "Apex Industrial Technologies Ltd",
    quote_number: "QT-APEX-2025-441",
    submission_date: "2025-09-29T10:15:00Z",
    currency: "INR",
    unit_price: 3120,
    total_amount: 3145000,
    base_total_amount: 3145000,
    delivery_time_days: 28,
    incoterms: "DDP (Bhiwandi Warehouse)",
    payment_terms: "30 Days Net from Delivery",
    warranty_months: 18,
    gst_percentage: 18.0,
    moq: 100,
    country: "India",
    is_iso_certified: true,
    validation_status: "passed",
    validation_summary: {
      quotation_id: 201,
      supplier_id: 1,
      supplier_name: "Apex Industrial Technologies Ltd",
      quote_number: "QT-APEX-2025-441",
      total_fields_validated: 26,
      error_count: 0,
      warning_count: 0,
      duplicate_alert: false,
      hygiene_score: 98,
      is_blocking: false,
      issues: [],
    },
    is_selected: true,
  },
  {
    id: 202,
    rfq_id: 101,
    supplier_id: 2,
    supplier_name: "Schneider & Bauer Automation GmbH",
    quote_number: "QT-SB-DE-8821",
    submission_date: "2025-09-28T14:40:00Z",
    currency: "EUR",
    unit_price: 38.5,
    total_amount: 34200,
    base_total_amount: 3084840, // 34,200 EUR * 90.2 = 3,084,840 INR
    delivery_time_days: 21,
    incoterms: "FOB Hamburg (Pending Confirmation)",
    payment_terms: "LC at Sight (Irrevocable)",
    warranty_months: 24,
    gst_percentage: 0.0, // Export invoice
    moq: 200,
    country: "Germany",
    is_iso_certified: true,
    validation_status: "action_required",
    validation_summary: {
      quotation_id: 202,
      supplier_id: 2,
      supplier_name: "Schneider & Bauer Automation GmbH",
      quote_number: "QT-SB-DE-8821",
      total_fields_validated: 26,
      error_count: 0,
      warning_count: 1,
      duplicate_alert: false,
      hygiene_score: 89,
      is_blocking: false,
      issues: [MOCK_VALIDATION_ISSUES_RFQ_101[0]],
    },
    is_selected: true,
  },
  {
    id: 203,
    rfq_id: 101,
    supplier_id: 3,
    supplier_name: "Precision Dynamics Corporation",
    quote_number: "PDC-2025-Q19",
    submission_date: "2025-09-30T08:20:00Z",
    currency: "USD",
    unit_price: 42.0,
    total_amount: 38900,
    base_total_amount: 3248150, // 38,900 USD * 83.5 = 3,248,150 INR
    delivery_time_days: 19,
    incoterms: "CIF Nhava Sheva Port",
    payment_terms: "Net 45 Days Wire Transfer",
    warranty_months: 36,
    gst_percentage: 0.0,
    moq: 150,
    country: "United States",
    is_iso_certified: true,
    validation_status: "action_required",
    validation_summary: {
      quotation_id: 203,
      supplier_id: 3,
      supplier_name: "Precision Dynamics Corporation",
      quote_number: "PDC-2025-Q19",
      total_fields_validated: 26,
      error_count: 0,
      warning_count: 1,
      duplicate_alert: true,
      hygiene_score: 91,
      is_blocking: false,
      issues: [MOCK_VALIDATION_ISSUES_RFQ_101[2]],
    },
    is_selected: true,
  },
  {
    id: 204,
    rfq_id: 101,
    supplier_id: 4,
    supplier_name: "Bharat Forge & Allied Industries",
    quote_number: "BF-IND-9902",
    submission_date: "2025-09-29T16:55:00Z",
    currency: "INR",
    unit_price: 2950,
    total_amount: 2980000,
    base_total_amount: 2980000,
    delivery_time_days: 35,
    incoterms: "Ex-Works Pune",
    payment_terms: "100% Advance Payment",
    warranty_months: 12,
    gst_percentage: 32.0, // flagged error
    moq: 50,
    country: "India",
    is_iso_certified: false,
    validation_status: "rejected",
    validation_summary: {
      quotation_id: 204,
      supplier_id: 4,
      supplier_name: "Bharat Forge & Allied Industries",
      quote_number: "BF-IND-9902",
      total_fields_validated: 26,
      error_count: 2,
      warning_count: 0,
      duplicate_alert: false,
      hygiene_score: 64,
      is_blocking: true,
      issues: [MOCK_VALIDATION_ISSUES_RFQ_101[1], MOCK_VALIDATION_ISSUES_RFQ_101[3]],
    },
    is_selected: false,
  },
];

export function computeComparisonResponse(
  rfqId: number = 101,
  weights: CriteriaWeights = INITIAL_WEIGHTS,
  quotations: QuotationSubmission[] = MOCK_QUOTATIONS_RFQ_101
): ComparisonEngineResponse {
  // Filter only eligible quotes (not rejected, or selected)
  const eligibleQuotes = quotations.filter((q) => q.is_selected !== false && q.validation_status !== "rejected");
  const quotesToProcess = eligibleQuotes.length > 0 ? eligibleQuotes : quotations;

  // Find min and max for criteria
  const prices = quotesToProcess.map((q) => q.base_total_amount);
  const leadTimes = quotesToProcess.map((q) => q.delivery_time_days);
  const warranties = quotesToProcess.map((q) => q.warranty_months || 12);
  const ratings: Record<number, number> = { 1: 4.6, 2: 4.8, 3: 4.9, 4: 3.4 };
  const esgScores: Record<number, number> = { 1: 82, 2: 94, 3: 88, 4: 55 };

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDelivery = Math.min(...leadTimes);
  const maxDelivery = Math.max(...leadTimes);
  const minWarranty = Math.min(...warranties);
  const maxWarranty = Math.max(...warranties);

  // Normalize and calculate scores
  const evaluatedSuppliers: SupplierComparisonItem[] = quotesToProcess.map((q) => {
    const rawPrice = q.total_amount;
    const basePrice = q.base_total_amount;
    const leadTime = q.delivery_time_days;
    const warranty = q.warranty_months || 12;
    const rating = ratings[q.supplier_id] || 4.0;
    const esg = esgScores[q.supplier_id] || 75;

    // Cost criteria (lower is better): score = (max - val) / (max - min) * 100
    const priceScore = maxPrice === minPrice ? 100 : ((maxPrice - basePrice) / (maxPrice - minPrice)) * 100;
    const deliveryScore = maxDelivery === minDelivery ? 100 : ((maxDelivery - leadTime) / (maxDelivery - minDelivery)) * 100;

    // Benefit criteria (higher is better): score = (val - min) / (max - min) * 100
    const warrantyScore = maxWarranty === minWarranty ? 100 : ((warranty - minWarranty) / (maxWarranty - minWarranty)) * 100;
    const ratingScore = (rating / 5.0) * 100;
    const esgScore = esg;

    // Composite score
    const composite =
      priceScore * weights.price +
      deliveryScore * weights.delivery_time +
      ratingScore * weights.quality_rating +
      warrantyScore * weights.warranty +
      esgScore * weights.esg_compliance;

    const fxRate = FX_RATES_TO_INR[q.currency] || 1.0;

    return {
      supplier_id: q.supplier_id,
      supplier_name: q.supplier_name,
      quotation_id: q.id,
      quote_number: q.quote_number,
      country: q.country,
      is_iso_certified: q.is_iso_certified,
      currency: q.currency,
      raw_unit_price: q.unit_price || null,
      raw_total_amount: rawPrice,
      base_unit_price: q.unit_price ? Math.round(q.unit_price * fxRate) : null,
      base_total_amount: basePrice,
      fx_audit: {
        original_currency: q.currency,
        target_currency: "INR",
        exchange_rate: fxRate,
        conversion_timestamp: "2025-09-30T10:00:00Z",
        source: "RBI_Live_Feed_S2.4",
      },
      delivery_time_days: leadTime,
      warranty_months: warranty,
      payment_terms: q.payment_terms || "N/A",
      incoterms: q.incoterms || "N/A",
      supplier_rating: rating,
      esg_score: esg,
      composite_score: Math.round(composite * 10) / 10,
      rank: 1, // calculated next
      badges: [],
      criteria_scores: {
        price: {
          criterion_name: "price",
          criterion_type: "cost",
          raw_value: rawPrice,
          raw_unit: q.currency,
          normalized_base_value: basePrice,
          score: Math.round(priceScore * 10) / 10,
          weight: weights.price,
          weighted_score: Math.round(priceScore * weights.price * 10) / 10,
          is_best_in_class: basePrice === minPrice,
        },
        delivery_time: {
          criterion_name: "delivery_time",
          criterion_type: "cost",
          raw_value: leadTime,
          raw_unit: "days",
          normalized_base_value: leadTime,
          score: Math.round(deliveryScore * 10) / 10,
          weight: weights.delivery_time,
          weighted_score: Math.round(deliveryScore * weights.delivery_time * 10) / 10,
          is_best_in_class: leadTime === minDelivery,
        },
        quality_rating: {
          criterion_name: "quality_rating",
          criterion_type: "benefit",
          raw_value: rating,
          raw_unit: "stars",
          normalized_base_value: rating,
          score: Math.round(ratingScore * 10) / 10,
          weight: weights.quality_rating,
          weighted_score: Math.round(ratingScore * weights.quality_rating * 10) / 10,
          is_best_in_class: rating >= 4.8,
        },
        warranty: {
          criterion_name: "warranty",
          criterion_type: "benefit",
          raw_value: warranty,
          raw_unit: "months",
          normalized_base_value: warranty,
          score: Math.round(warrantyScore * 10) / 10,
          weight: weights.warranty,
          weighted_score: Math.round(warrantyScore * weights.warranty * 10) / 10,
          is_best_in_class: warranty === maxWarranty,
        },
        esg_compliance: {
          criterion_name: "esg_compliance",
          criterion_type: "benefit",
          raw_value: esg,
          raw_unit: "score",
          normalized_base_value: esg,
          score: Math.round(esgScore * 10) / 10,
          weight: weights.esg_compliance,
          weighted_score: Math.round(esgScore * weights.esg_compliance * 10) / 10,
          is_best_in_class: esg >= 90,
        },
      },
    };
  });

  // Sort by composite score descending
  evaluatedSuppliers.sort((a, b) => b.composite_score - a.composite_score);

  // Assign ranks and badges
  evaluatedSuppliers.forEach((s, idx) => {
    s.rank = idx + 1;
    const badges: any[] = [];
    if (idx === 0) badges.push("Best Overall");
    if (s.base_total_amount === minPrice) badges.push("Lowest Price");
    if (s.delivery_time_days === minDelivery) badges.push("Fastest Delivery");
    if (s.supplier_rating >= 4.8) badges.push("Highest Quality");
    if (s.warranty_months === maxWarranty) badges.push("Longest Warranty");
    if (s.esg_score >= 90) badges.push("ESG Leader");
    if (idx === 1 && !badges.includes("Best Overall")) badges.push("Runner Up");
    s.badges = badges;
  });

  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const priceVariance = Math.round(((maxPrice - minPrice) / minPrice) * 100);

  return {
    rfq_id: rfqId,
    rfq_title: "Precision CNC Machined Shafts & Bearing Assemblies (Grade 316 Stainless)",
    base_currency: "INR",
    comparison_timestamp: new Date().toISOString(),
    weights_applied: weights,
    benchmark_summary: {
      total_suppliers_compared: evaluatedSuppliers.length,
      lowest_price_base: minPrice,
      highest_price_base: maxPrice,
      price_variance_percent: priceVariance,
      fastest_delivery_days: minDelivery,
      slowest_delivery_days: maxDelivery,
      max_warranty_months: maxWarranty,
      benchmarks_by_criterion: {
        price: {
          criterion_name: "Total Cost (Normalized INR)",
          criterion_type: "cost",
          unit: "INR",
          best_value: minPrice,
          worst_value: maxPrice,
          average_value: avgPrice,
          best_supplier_name: evaluatedSuppliers.find((s) => s.base_total_amount === minPrice)?.supplier_name || null,
        },
        delivery_time: {
          criterion_name: "Delivery Lead Time",
          criterion_type: "cost",
          unit: "Days",
          best_value: minDelivery,
          worst_value: maxDelivery,
          average_value: Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length),
          best_supplier_name: evaluatedSuppliers.find((s) => s.delivery_time_days === minDelivery)?.supplier_name || null,
        },
      },
    },
    recommended_supplier_id: evaluatedSuppliers[0]?.supplier_id || 1,
    recommended_supplier_name: evaluatedSuppliers[0]?.supplier_name || "Apex Industrial Technologies Ltd",
    suppliers: evaluatedSuppliers,
  };
}
