"use client";

import React from "react";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign,
  ShieldCheck,
  Calendar,
  Building,
  Sparkles,
} from "lucide-react";
import {
  SupplierComparisonItem,
  BenchmarkSummary,
  ComparisonBadge,
} from "@/lib/comparison-types";

interface StackedComparisonCardsProps {
  suppliers: SupplierComparisonItem[];
  benchmarkSummary: BenchmarkSummary;
  currencyMode: "normalized" | "original";
  onSelectSupplierForAHP: (supplier: SupplierComparisonItem) => void;
}

export function StackedComparisonCards({
  suppliers,
  benchmarkSummary,
  currencyMode,
  onSelectSupplierForAHP,
}: StackedComparisonCardsProps) {
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
      default:
        return "bg-slate-100 text-slate-700 border border-slate-200";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {suppliers.map((supplier) => {
        const isBestPrice = supplier.base_total_amount === benchmarkSummary.lowest_price_base;
        const isFastest = supplier.delivery_time_days === benchmarkSummary.fastest_delivery_days;
        const isWinner = supplier.rank === 1;

        return (
          <div
            key={supplier.supplier_id}
            className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
              isWinner
                ? "border-blue-300 ring-2 ring-blue-500/10"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {/* Top row */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isWinner
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    #{supplier.rank}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {supplier.supplier_name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {supplier.quote_number} • {supplier.country}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-base font-extrabold text-blue-700">
                    {supplier.composite_score}
                  </span>
                  <span className="text-[10px] text-slate-400 block -mt-0.5">Score</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {supplier.badges.map((b) => (
                  <span
                    key={b}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getBadgeStyle(b)}`}
                  >
                    {b}
                  </span>
                ))}
              </div>

              {/* Key Commercial Metrics Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-500 font-medium">Landed Price:</span>
                  <div className="text-right">
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      ₹{supplier.base_total_amount?.toLocaleString("en-IN")}
                    </span>
                    {supplier.currency !== "INR" && (
                      <span className="block text-[10px] text-slate-400 font-mono">
                        ({supplier.currency} {supplier.raw_total_amount?.toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Lead Time:</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.delivery_time_days} Days
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Incoterms:</span>
                  <span className="font-mono text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {supplier.incoterms || "EXW"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Warranty & Terms:</span>
                  <span className="font-semibold text-slate-800">
                    {supplier.warranty_months} Mos • {supplier.payment_terms || "30 Days"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Quality Rating:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    ★ {supplier.supplier_rating}
                    {supplier.is_iso_certified && (
                      <span className="text-[10px] text-emerald-700 font-normal">
                        (ISO 9001)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom action button */}
            <div className="pt-4 mt-2">
              <button
                onClick={() => onSelectSupplierForAHP(supplier)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs ${
                  isWinner
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                }`}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Select AHP (Phase 3)</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
