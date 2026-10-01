"use client";

import React from "react";
import {
  AHPRankedSupplier,
  AHPCriteriaWeights,
  AHP_CRITERIA_METADATA,
} from "@/lib/ahp-types";
import {
  X,
  Award,
  DollarSign,
  Clock,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Bot,
} from "lucide-react";

interface SupplierDetailDrawerProps {
  supplier: AHPRankedSupplier | null;
  isOpen: boolean;
  onClose: () => void;
  weights: AHPCriteriaWeights;
}

export function SupplierDetailDrawer({
  supplier,
  isOpen,
  onClose,
  weights,
}: SupplierDetailDrawerProps) {
  if (!isOpen || !supplier) return null;

  const criteriaKeys = ["price", "quality", "delivery", "esg"] as const;

  const getCriterionIcon = (key: string) => {
    switch (key) {
      case "price":
        return <DollarSign className="w-4 h-4 text-blue-600" />;
      case "quality":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case "delivery":
        return <Clock className="w-4 h-4 text-sky-600" />;
      case "esg":
        return <Leaf className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-slideLeft">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                  supplier.rank === 1
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : supplier.rank === 2
                    ? "bg-slate-200 text-slate-800"
                    : "bg-orange-100 text-orange-800"
                }`}
              >
                Rank #{supplier.rank}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Quote: {supplier.quote_number}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {supplier.supplier_name}
            </h3>
            <p className="text-xs text-slate-500">
              Origin: {supplier.country} • {supplier.is_iso_certified ? "ISO 9001:2015 Certified" : "Uncertified"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Composite Score Card */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Overall AHP Composite Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-blue-900">
                  {(supplier.ahp_score * 100).toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-slate-500">
                  ({supplier.ahp_score.toFixed(4)} utility)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Risk Classification
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>{supplier.risk_status} Risk</span>
              </span>
            </div>
          </div>

          {/* AI Decision Agent Narrative */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Bot className="w-4 h-4 text-blue-600" />
              <span>Paramita&apos;s AHP Decision Agent Rationale</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200/70">
              &ldquo;{supplier.agent_rationale}&rdquo;
            </p>
          </div>

          {/* Detailed Criteria Performance Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Multi-Attribute Criteria Performance Matrix
            </h4>

            <div className="space-y-3">
              {criteriaKeys.map((key) => {
                const meta = AHP_CRITERIA_METADATA[key];
                const weight = weights[key];
                const normScore = supplier.normalized_scores[key];
                const contribution = supplier.criteria_contributions[key];

                let rawDisplay = "";
                if (key === "price") {
                  rawDisplay = `₹${supplier.raw_metrics.price.toLocaleString("en-IN")}`;
                } else if (key === "delivery") {
                  rawDisplay = `${supplier.raw_metrics.delivery_time} calendar days`;
                } else if (key === "quality") {
                  rawDisplay = `${supplier.raw_metrics.quality_raw}/100 (Warranty: ${supplier.raw_metrics.warranty_months} mo)`;
                } else if (key === "esg") {
                  rawDisplay = `${supplier.raw_metrics.esg_raw}/100 (MSME: ${supplier.raw_metrics.msme_registered ? "Yes" : "No"})`;
                }

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          {getCriterionIcon(key)}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Raw: {rawDisplay}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-900 block">
                          +{(contribution * 100).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Contribution
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Normalized Utility Score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Normalized Utility (u_ik): {(normScore * 100).toFixed(1)}%</span>
                        <span>Weight (w_k): {Math.round(weight * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${normScore * 100}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            ProcuraPilot AI • Phase 3 Sourcing
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
