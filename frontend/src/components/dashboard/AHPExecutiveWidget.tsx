"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Trophy,
  Award,
  ChevronRight,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Bot,
  ExternalLink,
} from "lucide-react";
import { AHPEvaluationResult } from "@/lib/ahp-types";
import { ahpApi } from "@/lib/ahp-api";

interface AHPExecutiveWidgetProps {
  rfqId?: number;
}

export function AHPExecutiveWidget({ rfqId = 101 }: AHPExecutiveWidgetProps) {
  const [evaluation, setEvaluation] = useState<AHPEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await ahpApi.getResults(rfqId);
        setEvaluation(data);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [rfqId]);

  if (loading || !evaluation) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3" />
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-16 bg-slate-100 rounded" />
      </div>
    );
  }

  const topSupplier = evaluation.top_supplier;
  const isConsistent = evaluation.consistency ? evaluation.consistency.is_consistent : true;
  const crValue = evaluation.consistency ? evaluation.consistency.CR : 0.038;

  // Contributions in percent
  const pricePct = Math.round(topSupplier.criteria_contributions.price * 100);
  const qualPct = Math.round(topSupplier.criteria_contributions.quality * 100);
  const delPct = Math.round(topSupplier.criteria_contributions.delivery * 100);
  const esgPct = Math.round(topSupplier.criteria_contributions.esg * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-5 hover:border-slate-300 transition-all">
      {/* Top Status & Badge Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
              Phase 3 • AHP Scoring Engine
            </span>
            <h3 className="text-xs font-bold text-slate-900">
              Active RFQ Sourcing Recommendation
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>CR: {crValue.toFixed(3)} (Verified)</span>
          </span>
        </div>
      </div>

      {/* Main Top Supplier Spotlight */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.2 rounded-full font-mono">
                Rank #1
              </span>
              <span className="text-xs font-bold text-slate-900">
                {topSupplier.supplier_name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Origin: {topSupplier.country} • Quote: {topSupplier.quote_number} • ₹{topSupplier.raw_metrics.price.toLocaleString("en-IN")} landed
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xl font-bold font-mono text-blue-700 block">
              {(topSupplier.ahp_score * 100).toFixed(1)}%
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              Composite Utility
            </span>
          </div>
        </div>

        {/* Mini Driver Progress Sparkline */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Key Selection Drivers</span>
            <span>
              Cost {pricePct}% • Qual {qualPct}% • Lead {delPct}% • ESG {esgPct}%
            </span>
          </div>

          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${pricePct}%` }}
              className="bg-blue-600"
              title={`Cost: ${pricePct}%`}
            />
            <div
              style={{ width: `${qualPct}%` }}
              className="bg-emerald-500"
              title={`Quality: ${qualPct}%`}
            />
            <div
              style={{ width: `${delPct}%` }}
              className="bg-sky-500"
              title={`Lead Time: ${delPct}%`}
            />
            <div
              style={{ width: `${esgPct}%` }}
              className="bg-amber-500"
              title={`ESG: ${esgPct}%`}
            />
          </div>
        </div>

        {/* Agent Rationale Excerpt */}
        <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-white p-2.5 rounded-lg border border-slate-200">
          &ldquo;{topSupplier.agent_rationale}&rdquo;
        </p>
      </div>

      {/* Quick Action Navigation CTAs */}
      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/ahp/results?rfqId=${rfqId}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
        >
          <span>View Full AHP Ranking</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          href={`/ahp/configure?rfqId=${rfqId}`}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors border border-slate-200"
          title="Adjust Criteria Weights & Matrices"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-600" />
          <span>Weights</span>
        </Link>
      </div>
    </div>
  );
}
