"use client";

import React from "react";
import {
  DollarSign,
  Clock,
  ShieldCheck,
  Award,
  TrendingDown,
  Zap,
  Calendar,
} from "lucide-react";
import { BenchmarkSummary, SupplierComparisonItem } from "@/lib/comparison-types";

interface ComparisonBenchmarkCardsProps {
  summary: BenchmarkSummary;
  suppliers: SupplierComparisonItem[];
}

export function ComparisonBenchmarkCards({
  summary,
  suppliers,
}: ComparisonBenchmarkCardsProps) {
  const lowestPriceSupplier = suppliers.find(
    (s) => s.base_total_amount === summary.lowest_price_base
  );
  const fastestDeliverySupplier = suppliers.find(
    (s) => s.delivery_time_days === summary.fastest_delivery_days
  );
  const highestRatedSupplier = [...suppliers].sort(
    (a, b) => b.supplier_rating - a.supplier_rating
  )[0];
  const maxWarrantySupplier = suppliers.find(
    (s) => s.warranty_months === summary.max_warranty_months
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Lowest Landed Cost */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Lowest Landed Price</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900 font-mono">
            ₹{summary.lowest_price_base?.toLocaleString("en-IN")}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            -{summary.price_variance_percent}% Variance
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-1">
          Offered by <span className="font-semibold text-slate-700">{lowestPriceSupplier?.supplier_name}</span>
        </p>
      </div>

      {/* 2. Fastest Delivery Lead Time */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Fastest Lead Time</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900 font-mono">
            {summary.fastest_delivery_days} Days
          </span>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            High Velocity
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-1">
          Offered by <span className="font-semibold text-slate-700">{fastestDeliverySupplier?.supplier_name}</span>
        </p>
      </div>

      {/* 3. Highest Quality Rating */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Quality Benchmark</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900 font-mono">
            {highestRatedSupplier?.supplier_rating} / 5.0
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            ISO Certified
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-1">
          {highestRatedSupplier?.supplier_name}
        </p>
      </div>

      {/* 4. Longest Warranty */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Warranty Coverage</span>
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900 font-mono">
            {summary.max_warranty_months} Months
          </span>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
            Extended SLA
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate mt-1">
          Offered by <span className="font-semibold text-slate-700">{maxWarrantySupplier?.supplier_name}</span>
        </p>
      </div>
    </div>
  );
}
