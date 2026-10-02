"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sliders,
  Download,
  Award,
  DollarSign,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { ComparisonEngineResponse } from "@/lib/comparison-types";

interface ComparisonHeaderProps {
  comparisonData: ComparisonEngineResponse;
  viewMode: "table" | "cards";
  onToggleViewMode: (mode: "table" | "cards") => void;
  currencyMode: "normalized" | "original";
  onToggleCurrencyMode: (mode: "normalized" | "original") => void;
  onOpenWeightsDrawer: () => void;
  onOpenExportModal: () => void;
  onSelectForAHP: () => void;
}

export function ComparisonHeader({
  comparisonData,
  viewMode,
  onToggleViewMode,
  currencyMode,
  onToggleCurrencyMode,
  onOpenWeightsDrawer,
  onOpenExportModal,
  onSelectForAHP,
}: ComparisonHeaderProps) {
  const winner = comparisonData.suppliers[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Breadcrumb and View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/rfq/${comparisonData.rfq_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to RFQ Workspace</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 font-mono">
            RFQ #{comparisonData.rfq_id} Comparison Matrix
          </span>
        </div>

        {/* Currency & Layout Toggle Controls */}
        <div className="flex items-center gap-3 overflow-x-auto max-w-full pb-1">
          {/* Currency Normalizer Switch */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap">
            <button
              onClick={() => onToggleCurrencyMode("normalized")}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                currencyMode === "normalized"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Normalized Base (INR)
            </button>
            <button
              onClick={() => onToggleCurrencyMode("original")}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                currencyMode === "original"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Original Currencies
            </button>
          </div>

          {/* Table vs Cards Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap">
            <button
              onClick={() => onToggleViewMode("table")}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Matrix Table
            </button>
            <button
              onClick={() => onToggleViewMode("cards")}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vendor Cards
            </button>
          </div>
        </div>
      </div>

      {/* Main Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Supplier Comparison Engine
            </h1>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              Paramita P2.4 Engine Output
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {comparisonData.rfq_title || "Multi-Vendor Quotation Analysis & MCDM Scoring Matrix"}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Adjust Weights */}
          <button
            onClick={onOpenWeightsDrawer}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Adjust MCDM Weights</span>
          </button>

          {/* Export Report */}
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Report</span>
          </button>

          {/* Transition to Phase 3: AHP */}
          <button
            onClick={onSelectForAHP}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Select for AHP (Phase 3)</span>
          </button>
        </div>
      </div>

      {/* Recommended Winner Pill Banner */}
      {winner && (
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-2 py-0.5 rounded">
                  Algorithm Recommendation (Rank #1)
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {winner.supplier_name}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Top composite score of <strong className="text-blue-700 font-mono">{winner.composite_score}/100</strong> across weighted Price (40%), Lead Time (25%), Quality (15%), Warranty (10%), and ESG (10%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs">
              Landed: ₹{winner.base_total_amount?.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
