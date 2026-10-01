"use client";

import React, { useState } from "react";
import {
  AHPRankedSupplier,
  AHPCriteriaWeights,
  AHP_CRITERIA_METADATA,
} from "@/lib/ahp-types";
import {
  Trophy,
  Medal,
  Award,
  ChevronRight,
  ChevronDown,
  Info,
  CheckCircle2,
  DollarSign,
  Clock,
  ShieldCheck,
  Leaf,
  ExternalLink,
} from "lucide-react";

interface LeaderboardTableProps {
  rankings: AHPRankedSupplier[];
  weights: AHPCriteriaWeights;
  onSelectSupplier: (supplier: AHPRankedSupplier) => void;
}

export function LeaderboardTable({
  rankings,
  weights,
  onSelectSupplier,
}: LeaderboardTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>1st Place</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs shadow-2xs">
            <Medal className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>2nd Place</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-bold text-xs shadow-2xs">
            <Award className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>3rd Place</span>
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono text-xs font-semibold">
            Rank #{rank}
          </div>
        );
    }
  };

  const toggleExpand = (supplierId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === supplierId ? null : supplierId);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Banner */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            AHP Supplier Leaderboard & Utility Ranking
          </h3>
          <p className="text-xs text-slate-500">
            Ranked by multi-attribute additive synthesis (S_i = Σ w_k · u_ik). Click any vendor for full telemetry.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
          {rankings.length} Vendors Evaluated
        </span>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
              <th className="p-3.5 w-14 text-center">Rank</th>
              <th className="p-3.5 min-w-[220px]">Supplier Name & Origin</th>
              <th className="p-3.5 text-center min-w-[150px]">Composite Utility Score</th>
              <th className="p-3.5 min-w-[130px]">Landed Pricing</th>
              <th className="p-3.5 min-w-[110px]">Lead Time</th>
              <th className="p-3.5 min-w-[130px]">Quality & Specs</th>
              <th className="p-3.5 min-w-[110px]">ESG Score</th>
              <th className="p-3.5 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rankings.map((supplier) => {
              const isExpanded = expandedId === supplier.supplier_id;
              const isFirst = supplier.rank === 1;

              return (
                <React.Fragment key={supplier.supplier_id}>
                  <tr
                    onClick={() => onSelectSupplier(supplier)}
                    className={`cursor-pointer transition-colors ${
                      isFirst
                        ? "bg-blue-50/30 hover:bg-blue-50/60"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="p-3.5 text-center">
                      <div className="flex justify-center">
                        {getRankBadge(supplier.rank)}
                      </div>
                    </td>

                    {/* Supplier Name */}
                    <td className="p-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                            {supplier.supplier_name}
                          </span>
                          {supplier.is_iso_certified && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200" title="ISO Certified">
                              ISO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{supplier.country}</span>
                          <span>•</span>
                          <span className="font-mono">{supplier.quote_number}</span>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {supplier.badges.map((b) => (
                            <span
                              key={b}
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                b === "Top Utility Rank" || b === "AI Recommended"
                                  ? "bg-blue-100 text-blue-800"
                                  : b === "Lowest Cost"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b === "Fastest Lead Time"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Composite Utility Score */}
                    <td className="p-3.5 text-center">
                      <div className="space-y-1.5 max-w-[130px] mx-auto">
                        <div className="flex items-baseline justify-center gap-1.5">
                          <span className="text-base font-bold font-mono text-slate-900">
                            {(supplier.ahp_score * 100).toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({supplier.ahp_score.toFixed(3)})
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFirst
                                ? "bg-blue-600"
                                : supplier.rank === 2
                                ? "bg-emerald-600"
                                : "bg-slate-500"
                            }`}
                            style={{ width: `${supplier.ahp_score * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Landed Price */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">
                        ₹{supplier.raw_metrics.price.toLocaleString("en-IN")}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Utility: {(supplier.normalized_scores.price * 100).toFixed(0)}%
                      </div>
                    </td>

                    {/* Delivery Time */}
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">
                        {supplier.raw_metrics.delivery_time} days
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Utility: {(supplier.normalized_scores.delivery * 100).toFixed(0)}%
                      </div>
                    </td>

                    {/* Quality */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">
                        {supplier.raw_metrics.quality_raw}/100
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {supplier.raw_metrics.warranty_months} mo warranty
                      </div>
                    </td>

                    {/* ESG */}
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">
                        {supplier.raw_metrics.esg_raw}/100
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {supplier.raw_metrics.msme_registered ? "MSME Active" : "Standard"}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(supplier.supplier_id, e)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Quick row expansion"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-b border-slate-200">
                      <td colSpan={8} className="p-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Detailed Telemetry for {supplier.supplier_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectSupplier(supplier)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                            >
                              <span>Open Full Detail Drawer</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                              <span className="text-[10px] font-semibold text-blue-700 block">
                                Cost Contribution
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                +{(supplier.criteria_contributions.price * 100).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Weight: {Math.round(weights.price * 100)}%
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                              <span className="text-[10px] font-semibold text-emerald-700 block">
                                Quality Contribution
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                +{(supplier.criteria_contributions.quality * 100).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Weight: {Math.round(weights.quality * 100)}%
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-sky-50/50 border border-sky-100">
                              <span className="text-[10px] font-semibold text-sky-700 block">
                                Lead Time Contribution
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                +{(supplier.criteria_contributions.delivery * 100).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Weight: {Math.round(weights.delivery * 100)}%
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
                              <span className="text-[10px] font-semibold text-amber-700 block">
                                ESG Contribution
                              </span>
                              <span className="font-mono font-bold text-slate-800">
                                +{(supplier.criteria_contributions.esg * 100).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Weight: {Math.round(weights.esg * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 italic">
                            &ldquo;{supplier.agent_rationale}&rdquo;
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
