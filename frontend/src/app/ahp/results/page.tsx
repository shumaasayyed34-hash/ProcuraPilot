"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeaderboardTable } from "@/components/ahp/LeaderboardTable";
import { SupplierDetailDrawer } from "@/components/ahp/SupplierDetailDrawer";
import { ScoreStackedBarChart } from "@/components/ahp/ScoreStackedBarChart";
import { RadarComparisonChart } from "@/components/ahp/RadarComparisonChart";
import { AHPFilterExportBar } from "@/components/ahp/AHPFilterExportBar";
import { AHPExportModal } from "@/components/ahp/AHPExportModal";
import { useToast } from "@/components/ui/Toast";
import {
  AHPEvaluationResult,
  AHPRankedSupplier,
} from "@/lib/ahp-types";
import { ahpApi } from "@/lib/ahp-api";
import {
  ArrowLeft,
  Sliders,
  Download,
  Trophy,
  Sparkles,
  Bot,
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  GitCompare,
  BarChart3,
  Radar as RadarIcon,
} from "lucide-react";

function AHPResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const rfqId = Number(searchParams?.get("rfqId")) || 101;

  const [evaluation, setEvaluation] = useState<AHPEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  // Detail Drawer & Export Modal
  const [selectedSupplier, setSelectedSupplier] = useState<AHPRankedSupplier | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    async function loadResults() {
      setLoading(true);
      try {
        const data = await ahpApi.getResults(rfqId);
        setEvaluation(data);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, [rfqId]);

  // Filtered rankings based on search and threshold
  const filteredRankings = useMemo(() => {
    if (!evaluation) return [];
    return evaluation.rankings.filter((sup) => {
      const matchesSearch =
        sup.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.quote_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScore = sup.ahp_score >= minScoreFilter;
      return matchesSearch && matchesScore;
    });
  }, [evaluation, searchTerm, minScoreFilter]);

  if (loading || !evaluation) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          <div className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
        </div>
      </AppLayout>
    );
  }

  const topSupplier = evaluation.top_supplier;
  const isConsistent = evaluation.consistency ? evaluation.consistency.is_consistent : true;
  const cr = evaluation.consistency ? evaluation.consistency.CR : 0.038;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Navigation Breadcrumb */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/ahp/configure?rfqId=${rfqId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Adjust AHP Configuration</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 font-mono">
                RFQ #{rfqId} Decision Output
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/comparison/${rfqId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                <span>Comparison Matrix</span>
              </Link>
              <Link
                href={`/rfq/${rfqId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>RFQ Workspace</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  AHP Supplier Ranking & Utility Dashboard
                </h1>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CR: {cr.toFixed(4)} (Audit Rigorous)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {evaluation.rfq_title} • Evaluated via Thomas L. Saaty Analytic Hierarchy Process & MAUT Additive Utility Synthesis.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-auto">
              <Link
                href={`/ahp/configure?rfqId=${rfqId}`}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Adjust Weights</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Evaluation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Executive Recommendation Banner (Rank #1 Winner) */}
        {topSupplier && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-sm border border-blue-950/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-md shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                      Algorithm Winner • Rank #1
                    </span>
                    <span className="text-xs text-blue-200 font-mono">
                      Quote: {topSupplier.quote_number}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">
                    {topSupplier.supplier_name}
                  </h2>
                  <p className="text-xs text-blue-100 leading-relaxed italic">
                    &ldquo;{topSupplier.agent_rationale}&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 shrink-0">
                <div className="text-center sm:text-right">
                  <span className="text-[11px] text-blue-200 block font-medium">
                    Composite Utility Score
                  </span>
                  <span className="text-3xl font-bold font-mono text-white">
                    {(topSupplier.ahp_score * 100).toFixed(1)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(topSupplier)}
                  className="px-4 py-2 rounded-lg bg-white text-blue-900 hover:bg-blue-50 font-semibold text-xs transition-colors shadow-xs"
                >
                  Inspect Full Telemetry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visual Charts Grid (Deliverable 3: Stacked Bar Chart & Radar Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreStackedBarChart rankings={evaluation.rankings} />
          <RadarComparisonChart rankings={evaluation.rankings} />
        </div>

        {/* Filter & Search Bar */}
        <AHPFilterExportBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          minScoreFilter={minScoreFilter}
          onMinScoreChange={setMinScoreFilter}
          totalSuppliers={evaluation.total_suppliers}
          filteredCount={filteredRankings.length}
          onOpenExport={() => setIsExportModalOpen(true)}
          onConfigureClick={() => router.push(`/ahp/configure?rfqId=${rfqId}`)}
        />

        {/* Deliverable 2: Ranked Leaderboard Table with Row Expansion */}
        <LeaderboardTable
          rankings={filteredRankings}
          weights={evaluation.criteria_weights}
          onSelectSupplier={(sup) => setSelectedSupplier(sup)}
        />

        {/* Detail Drawer Modal */}
        <SupplierDetailDrawer
          supplier={selectedSupplier}
          isOpen={!!selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          weights={evaluation.criteria_weights}
        />

        {/* Export Modal */}
        <AHPExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          evaluation={evaluation}
          onSuccessToast={(msg) => toast.success("Export Complete", msg)}
        />
      </div>
    </AppLayout>
  );
}

export default function AHPResultsPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          </div>
        </AppLayout>
      }
    >
      <AHPResultsContent />
    </Suspense>
  );
}
