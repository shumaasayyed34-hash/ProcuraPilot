"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { ComparisonHeader } from "@/components/comparison/ComparisonHeader";
import { ComparisonBenchmarkCards } from "@/components/comparison/ComparisonBenchmarkCards";
import { StickyComparisonTable } from "@/components/comparison/StickyComparisonTable";
import { StackedComparisonCards } from "@/components/comparison/StackedComparisonCards";
import { WeightAdjuster } from "@/components/comparison/WeightAdjuster";
import { ExportReportModal } from "@/components/comparison/ExportReportModal";
import { useToast } from "@/components/ui/Toast";
import {
  ComparisonEngineResponse,
  CriteriaWeights,
  SupplierComparisonItem,
} from "@/lib/comparison-types";
import { comparisonApi } from "@/lib/comparison-api";
import { INITIAL_WEIGHTS } from "@/lib/mock-data";

export default function SupplierComparisonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const rfqId = Number(params?.rfqId) || 101;

  const [comparisonData, setComparisonData] = useState<ComparisonEngineResponse | null>(null);
  const [weights, setWeights] = useState<CriteriaWeights>(INITIAL_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currencyMode, setCurrencyMode] = useState<"normalized" | "original">("normalized");

  // Modals state
  const [isWeightsDrawerOpen, setIsWeightsDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    async function loadComparison() {
      setLoading(true);
      try {
        const data = await comparisonApi.getComparisonMatrix(rfqId, weights);
        setComparisonData(data);
      } finally {
        setLoading(false);
      }
    }
    loadComparison();
    if (typeof window !== "undefined" && rfqId) {
      localStorage.setItem("procurapilot_active_rfq_id", String(rfqId));
    }
  }, [rfqId, weights]);

  const handleUpdateWeights = async (newWeights: CriteriaWeights) => {
    setWeights(newWeights);
    const updated = await comparisonApi.getComparisonMatrix(rfqId, newWeights);
    setComparisonData(updated);
    toast.success(
      "MCDM Weights Recalculated",
      "Composite scores and supplier rankings updated dynamically across all criteria."
    );
  };

  const handleSelectSupplierForAHP = (supplier: SupplierComparisonItem) => {
    toast.success(
      "Supplier Nominated for AHP",
      `${supplier.supplier_name} (Rank #${supplier.rank}) selected for Phase 3 Analytic Hierarchy Process scoring.`
    );
  };

  const handleSelectAllForAHP = () => {
    toast.success(
      "Transferred to AHP Engine",
      "Forwarding qualified vendors to Phase 3 Pairwise Comparison Matrix..."
    );
    router.push(`/ahp/configure?rfqId=${rfqId}`);
  };

  if (loading || !comparisonData) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          <div className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          <div className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Comparison Header */}
        <ComparisonHeader
          comparisonData={comparisonData}
          viewMode={viewMode}
          onToggleViewMode={setViewMode}
          currencyMode={currencyMode}
          onToggleCurrencyMode={setCurrencyMode}
          onOpenWeightsDrawer={() => setIsWeightsDrawerOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onSelectForAHP={handleSelectAllForAHP}
        />

        {/* Benchmark Overview Cards */}
        <ComparisonBenchmarkCards
          summary={comparisonData.benchmark_summary}
          suppliers={comparisonData.suppliers}
        />

        {/* View Mode Switching: Responsive Sticky Table or Stacked Vendor Cards */}
        {viewMode === "table" ? (
          <StickyComparisonTable
            suppliers={comparisonData.suppliers}
            benchmarkSummary={comparisonData.benchmark_summary}
            currencyMode={currencyMode}
            onSelectSupplierForAHP={handleSelectSupplierForAHP}
          />
        ) : (
          <StackedComparisonCards
            suppliers={comparisonData.suppliers}
            benchmarkSummary={comparisonData.benchmark_summary}
            currencyMode={currencyMode}
            onSelectSupplierForAHP={handleSelectSupplierForAHP}
          />
        )}

        {/* MCDM Weight Adjuster Drawer Modal */}
        <WeightAdjuster
          weights={weights}
          onUpdateWeights={handleUpdateWeights}
          isOpen={isWeightsDrawerOpen}
          onClose={() => setIsWeightsDrawerOpen(false)}
        />

        {/* Export Report Modal */}
        <ExportReportModal
          comparisonData={comparisonData}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onSuccessToast={(msg) => toast.success("Export Complete", msg)}
        />
      </div>
    </AppLayout>
  );
}
