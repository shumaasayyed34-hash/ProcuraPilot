"use client";

import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  SupplierComparisonItem,
  BenchmarkSummary,
  ComparisonBadge,
} from "@/lib/comparison-types";

interface StickyComparisonTableProps {
  suppliers: SupplierComparisonItem[];
  benchmarkSummary: BenchmarkSummary;
  currencyMode: "normalized" | "original";
  onSelectSupplierForAHP: (supplier: SupplierComparisonItem) => void;
}

export function StickyComparisonTable({
  suppliers,
  benchmarkSummary,
  currencyMode,
  onSelectSupplierForAHP,
}: StickyComparisonTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getBadgeStyle = (badge: ComparisonBadge) => {
    switch (badge) {
      case "Best Overall":
        return "bg-blue-600 text-white shadow-xs";
      case "Lowest Price":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "Fastest Delivery":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Highest Quality":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "Longest Warranty":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      case "ESG Leader":
        return "bg-teal-50 text-teal-700 border border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  const formatPrice = (item: SupplierComparisonItem) => {
    if (currencyMode === "original" && item.currency !== "INR") {
      const symbolMap: Record<string, string> = {
        USD: "$",
        EUR: "€",
        GBP: "£",
      };
      const sym = symbolMap[item.currency] || item.currency + " ";
      return (
        <div>
          <div className="font-bold font-mono text-slate-900">
            {sym}{item.raw_total_amount?.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            ≈ ₹{item.base_total_amount?.toLocaleString("en-IN")}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="font-bold font-mono text-slate-900">
          ₹{item.base_total_amount?.toLocaleString("en-IN")}
        </div>
        {item.currency !== "INR" && (
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Orig: {item.currency} {item.raw_total_amount?.toLocaleString()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto w-full max-w-full">
      {/* Table Container with Sticky Column */}
      <div className="overflow-x-auto relative w-full">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          {/* Header */}
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              {/* Sticky Left Column: Rank & Supplier */}
              <th className="sticky left-0 z-20 bg-slate-50/95 backdrop-blur-xs py-3.5 px-4 shadow-[1px_0_0_0_#e2e8f0] w-64">
                Rank & Supplier Name
              </th>

              {/* Group 1: MCDM Score & Badges */}
              <th className="py-3.5 px-4 text-center">Composite Score</th>
              <th className="py-3.5 px-4">Highlight Badges</th>

              {/* Group 2: Commercials */}
              <th className="py-3.5 px-4">Total Bid Amount</th>
              <th className="py-3.5 px-4">Payment Terms</th>

              {/* Group 3: Logistics & Delivery */}
              <th className="py-3.5 px-4">Lead Time</th>
              <th className="py-3.5 px-4">Incoterms</th>

              {/* Group 4: Compliance & Quality */}
              <th className="py-3.5 px-4">Rating / ISO</th>
              <th className="py-3.5 px-4">Warranty</th>
              <th className="py-3.5 px-4">ESG Score</th>

              {/* Sticky Right Column or End Action */}
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {suppliers.map((supplier) => {
              const isBestPrice = supplier.base_total_amount === benchmarkSummary.lowest_price_base;
              const isFastest = supplier.delivery_time_days === benchmarkSummary.fastest_delivery_days;
              const isBestWarranty = supplier.warranty_months === benchmarkSummary.max_warranty_months;
              const isExpanded = !!expandedRows[supplier.supplier_id];

              return (
                <React.Fragment key={supplier.supplier_id}>
                  <tr
                    className={`hover:bg-slate-50/80 transition-colors ${
                      supplier.rank === 1 ? "bg-blue-50/20" : ""
                    }`}
                  >
                    {/* Sticky Left Column */}
                    <td className="sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0] py-4 px-4">
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            supplier.rank === 1
                              ? "bg-blue-600 text-white shadow-xs"
                              : supplier.rank === 2
                              ? "bg-slate-200 text-slate-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          #{supplier.rank}
                        </div>

                        <div className="min-w-0">
                          <button
                            onClick={() => toggleRow(supplier.supplier_id)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors flex items-center gap-1 group"
                          >
                            <span className="truncate">{supplier.supplier_name}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                            )}
                          </button>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {supplier.quote_number} • {supplier.country}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Composite Score Bar & Number */}
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-mono text-sm font-extrabold ${
                            supplier.rank === 1 ? "text-blue-700" : "text-slate-800"
                          }`}
                        >
                          {supplier.composite_score}
                          <span className="text-[10px] text-slate-400 font-normal">/100</span>
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              supplier.rank === 1 ? "bg-blue-600" : "bg-slate-400"
                            }`}
                            style={{ width: `${supplier.composite_score}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Highlight Badges */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {supplier.badges.map((b) => (
                          <span
                            key={b}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getBadgeStyle(b)}`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Total Bid Amount (with Min-Max highlight) */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {formatPrice(supplier)}
                        {isBestPrice && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Lowest
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payment Terms */}
                    <td className="py-4 px-4">
                      <span className="text-slate-700 font-medium truncate block max-w-[140px]">
                        {supplier.payment_terms || "Standard 30 Days"}
                      </span>
                    </td>

                    {/* Lead Time (with Min-Max highlight) */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 font-mono">
                          {supplier.delivery_time_days} Days
                        </span>
                        {isFastest && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Fastest
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Incoterms */}
                    <td className="py-4 px-4">
                      <span className="text-slate-700 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        {supplier.incoterms || "EXW"}
                      </span>
                    </td>

                    {/* Rating / ISO */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                          ★ {supplier.supplier_rating}
                        </span>
                        {supplier.is_iso_certified && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold border border-emerald-100">
                            ISO
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Warranty */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {supplier.warranty_months || 12} Mo
                        </span>
                        {isBestWarranty && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Max
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ESG Score */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-semibold text-slate-700">
                        {supplier.esg_score}/100
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onSelectSupplierForAHP(supplier)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors shadow-xs ${
                          supplier.rank === 1
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                        }`}
                      >
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span>Select AHP</span>
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Criteria Scoring Breakdown Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-50/70 border-b border-slate-200">
                      <td colSpan={11} className="py-3 px-6">
                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-800">
                              Paramita Engine Scoring Breakdown • {supplier.supplier_name}
                            </h4>
                            <span className="text-[11px] text-slate-500 font-mono">
                              FX Audit: 1 {supplier.fx_audit.original_currency} = {supplier.fx_audit.exchange_rate} {supplier.fx_audit.target_currency} ({supplier.fx_audit.source})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
                            {Object.entries(supplier.criteria_scores).map(([key, detail]) => (
                              <div
                                key={key}
                                className={`p-3 rounded-lg border text-xs ${
                                  detail.is_best_in_class
                                    ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                                    : "bg-slate-50 border-slate-200 text-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold capitalize">{key.replace("_", " ")}</span>
                                  {detail.is_best_in_class && (
                                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                                      Best
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 font-mono text-slate-700">
                                  Raw: {detail.raw_value} {detail.raw_unit}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Score: <strong className="text-slate-800">{detail.score}/100</strong> × {(detail.weight * 100).toFixed(0)}%
                                </div>
                                <div className="mt-1 pt-1 border-t border-slate-200/60 font-bold font-mono text-blue-700 text-right">
                                  +{detail.weighted_score} pts
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
