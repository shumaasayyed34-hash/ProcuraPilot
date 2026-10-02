"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { RiskHeatmapSupplier, RiskCategory } from "@/lib/risk-types";
import { cn } from "@/lib/utils";

interface RiskHeatmapGridProps {
  suppliers: RiskHeatmapSupplier[];
  onRecalculate?: () => void;
  isRecalculating?: boolean;
}

export function RiskHeatmapGrid({
  suppliers,
  onRecalculate,
  isRecalculating = false,
}: RiskHeatmapGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score_desc" | "score_asc" | "name">("score_desc");

  // Filter & Sort
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        const matchesSearch =
          s.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.country && s.country.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory =
          selectedCategory === "all" || s.risk_category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "score_desc") return b.composite_risk_score - a.composite_risk_score;
        if (sortBy === "score_asc") return a.composite_risk_score - b.composite_risk_score;
        return a.supplier_name.localeCompare(b.supplier_name);
      });
  }, [suppliers, searchQuery, selectedCategory, sortBy]);

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = [
      "Supplier ID",
      "Supplier Name",
      "Country",
      "Composite Risk",
      "Risk Category",
      "Financial",
      "Compliance",
      "Delivery",
      "Country Risk",
      "ESG",
      "Fraud",
      "News Sentiment",
    ];

    const rows = filteredSuppliers.map((s) => [
      s.supplier_id,
      `"${s.supplier_name}"`,
      s.country || "N/A",
      s.composite_risk_score,
      s.risk_category.toUpperCase(),
      s.financial_risk,
      s.compliance_risk,
      s.delivery_risk,
      s.country_risk,
      s.esg_risk,
      s.fraud_risk,
      s.news_sentiment_score ?? "N/A",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `procurapilot_risk_heatmap_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for color-coding cells: Green / Yellow / Orange / Red
  const getScoreStyle = (score: number) => {
    if (score <= 30) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (score <= 60) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    } else if (score <= 80) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    } else {
      return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
    }
  };

  const getCategoryBadge = (category: RiskCategory) => {
    switch (category) {
      case "low":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            LOW
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            MEDIUM
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <ShieldAlert className="w-3 h-3 text-orange-600" />
            HIGH
          </span>
        );
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            CRITICAL
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Control Bar: Search, Filters, Recalculate, CSV Export */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search supplier by name or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["all", "low", "medium", "high", "critical"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              {cat === "all" ? "All Suppliers" : cat}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() =>
              setSortBy(
                sortBy === "score_desc"
                  ? "score_asc"
                  : sortBy === "score_asc"
                  ? "name"
                  : "score_desc"
              )
            }
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs"
            title="Sort Heatmap"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {sortBy === "score_desc"
                ? "Highest Risk"
                : sortBy === "score_asc"
                ? "Lowest Risk"
                : "Alphabetical"}
            </span>
          </button>

          {onRecalculate && (
            <button
              onClick={onRecalculate}
              disabled={isRecalculating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-all shadow-xs"
            >
              <RotateCcw
                className={cn("w-3.5 h-3.5 text-blue-600", isRecalculating && "animate-spin")}
              />
              <span>{isRecalculating ? "Evaluating..." : "Recalculate"}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4 min-w-[220px]">Supplier & Country</th>
              <th className="py-3 px-3 text-center min-w-[130px]">Composite Rating</th>
              <th className="py-3 px-3 text-center">Financial</th>
              <th className="py-3 px-3 text-center">Compliance</th>
              <th className="py-3 px-3 text-center">Delivery</th>
              <th className="py-3 px-3 text-center">Country</th>
              <th className="py-3 px-3 text-center">ESG</th>
              <th className="py-3 px-3 text-center">Fraud</th>
              <th className="py-3 px-3 text-center">News Sentiment</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium">No suppliers match the active search or category filters.</p>
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((s) => {
                return (
                  <tr
                    key={s.supplier_id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Supplier Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            s.risk_category === "critical"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : s.risk_category === "high"
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : s.risk_category === "medium"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          )}
                        >
                          {s.supplier_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/risk/${s.supplier_id}`}
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate block"
                          >
                            {s.supplier_name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>{s.country || "Global"}</span>
                            {s.rfq_id && <span>• RFQ #{s.rfq_id}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Composite Score & Badge */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-extrabold text-sm text-slate-900">
                          {s.composite_risk_score.toFixed(1)}
                          <span className="text-[10px] text-slate-400 font-normal">/100</span>
                        </span>
                        {getCategoryBadge(s.risk_category)}
                      </div>
                    </td>

                    {/* 6 Dimensions Heatmap Cells */}
                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.financial_risk)
                        )}
                        title={`Financial Risk: ${s.financial_risk}/100`}
                      >
                        {s.financial_risk.toFixed(0)}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.compliance_risk)
                        )}
                        title={`Compliance Risk: ${s.compliance_risk}/100`}
                      >
                        {s.compliance_risk.toFixed(0)}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.delivery_risk)
                        )}
                        title={`Delivery Risk: ${s.delivery_risk}/100`}
                      >
                        {s.delivery_risk.toFixed(0)}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.country_risk)
                        )}
                        title={`Country Risk: ${s.country_risk}/100`}
                      >
                        {s.country_risk.toFixed(0)}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.esg_risk)
                        )}
                        title={`ESG Risk: ${s.esg_risk}/100`}
                      >
                        {s.esg_risk.toFixed(0)}
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <div
                        className={cn(
                          "px-2.5 py-1.5 rounded-md border text-center font-bold inline-block min-w-[50px]",
                          getScoreStyle(s.fraud_risk)
                        )}
                        title={`Fraud Risk: ${s.fraud_risk}/100`}
                      >
                        {s.fraud_risk.toFixed(0)}
                      </div>
                    </td>

                    {/* News Sentiment Cell */}
                    <td className="py-3 px-2 text-center">
                      {s.news_sentiment_score !== undefined ? (
                        <div
                          className={cn(
                            "px-2.5 py-1.5 rounded-md border text-center font-semibold inline-flex items-center gap-1",
                            s.news_sentiment_score < -0.2
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : s.news_sentiment_score > 0.2
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          )}
                          title={`News Sentiment Score: ${s.news_sentiment_score}`}
                        >
                          <span>{s.news_sentiment_score > 0 ? `+${s.news_sentiment_score.toFixed(2)}` : s.news_sentiment_score.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/risk/${s.supplier_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs"
                      >
                        <span>Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Heatmap Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-600 text-[11px]">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Risk Color Spectrum:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Low (0 - 30)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Medium (31 - 60)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
            <span>High (61 - 80)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Critical (81 - 100)</span>
          </span>
        </div>
        <p className="text-slate-500 italic">
          Multi-dimensional scoring synthesized from statutory compliance, delivery logs, financial audit, and real-time news intelligence.
        </p>
      </div>
    </div>
  );
}
