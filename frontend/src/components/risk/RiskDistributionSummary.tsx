"use client";

import React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Users,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { RiskHeatmapSupplier } from "@/lib/risk-types";

interface RiskDistributionSummaryProps {
  suppliers: RiskHeatmapSupplier[];
  activeAlertsCount?: number;
}

export function RiskDistributionSummary({
  suppliers,
  activeAlertsCount = 0,
}: RiskDistributionSummaryProps) {
  const total = suppliers.length;

  const lowCount = suppliers.filter((s) => s.risk_category === "low").length;
  const medCount = suppliers.filter((s) => s.risk_category === "medium").length;
  const highCount = suppliers.filter((s) => s.risk_category === "high").length;
  const critCount = suppliers.filter((s) => s.risk_category === "critical").length;

  const avgComposite =
    total > 0
      ? (suppliers.reduce((acc, s) => acc + s.composite_risk_score, 0) / total).toFixed(1)
      : "0.0";

  const lowPct = total > 0 ? ((lowCount / total) * 100).toFixed(0) : "0";
  const medPct = total > 0 ? ((medCount / total) * 100).toFixed(0) : "0";
  const highPct = total > 0 ? ((highCount / total) * 100).toFixed(0) : "0";
  const critPct = total > 0 ? ((critCount / total) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-4">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Suppliers */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Monitored Suppliers
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{total}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Across active procurement pipelines</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Average Risk Score */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Risk Score
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-slate-900">{avgComposite}</span>
              <span className="text-xs text-slate-400 font-semibold">/100</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Weighted composite baseline</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Safe / Low Risk Suppliers */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Low-Risk Commercial Tier
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-700">{lowCount}</span>
              <span className="text-xs font-bold text-emerald-600">({lowPct}%)</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Approved for expedited contracting</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: High / Critical Risk Flags */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High & Critical Risks
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-rose-700">{highCount + critCount}</span>
              <span className="text-xs font-bold text-rose-600">
                ({activeAlertsCount} active alert{activeAlertsCount !== 1 ? "s" : ""})
              </span>
            </div>
            <p className="text-[11px] text-rose-600 font-medium mt-0.5">Requires VP / Legal sign-off</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Segmented Distribution Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Portfolio Risk Profile Distribution
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {lowCount} Low • {medCount} Medium • {highCount} High • {critCount} Critical
          </span>
        </div>

        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${lowPct}%` }}
            className="bg-emerald-500 transition-all duration-500 hover:opacity-90"
            title={`Low Risk: ${lowCount} (${lowPct}%)`}
          />
          <div
            style={{ width: `${medPct}%` }}
            className="bg-amber-400 transition-all duration-500 hover:opacity-90"
            title={`Medium Risk: ${medCount} (${medPct}%)`}
          />
          <div
            style={{ width: `${highPct}%` }}
            className="bg-orange-500 transition-all duration-500 hover:opacity-90"
            title={`High Risk: ${highCount} (${highPct}%)`}
          />
          <div
            style={{ width: `${critPct}%` }}
            className="bg-rose-500 transition-all duration-500 hover:opacity-90 animate-pulse"
            title={`Critical Risk: ${critCount} (${critPct}%)`}
          />
        </div>

        <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Low Risk: {lowPct}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Medium Risk: {medPct}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span>High Risk: {highPct}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="font-semibold text-rose-700">Critical Risk: {critPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
