"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { AHPModeToggle } from "@/components/ahp/AHPModeToggle";
import { SimpleWeightConfig } from "@/components/ahp/SimpleWeightConfig";
import { PairwiseMatrixGrid } from "@/components/ahp/PairwiseMatrixGrid";
import { TemplatePresetsBar } from "@/components/ahp/TemplatePresetsBar";
import { useToast } from "@/components/ui/Toast";
import {
  AHPCriteriaWeights,
  AHPWeightTemplate,
  AHPTemplateVersion,
} from "@/lib/ahp-types";
import {
  DEFAULT_WEIGHT_TEMPLATES,
  ORDERED_CRITERIA_KEYS,
  calculateWeights,
  normalizeMatrix,
  calculateConsistencyRatio,
} from "@/lib/ahp-engine";
import { ahpApi } from "@/lib/ahp-api";
import {
  ArrowLeft,
  Sliders,
  Sparkles,
  Award,
  GitCompare,
  FolderGit2,
  CheckCircle2,
  Play,
  RotateCcw,
} from "lucide-react";

function AHPConfigureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const rfqId = Number(searchParams?.get("rfqId")) || 101;

  const [mode, setMode] = useState<"simple" | "pairwise">("simple");
  const [templates, setTemplates] = useState<AHPWeightTemplate[]>(DEFAULT_WEIGHT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("balanced");
  
  // Current active weights
  const [weights, setWeights] = useState<AHPCriteriaWeights>(
    DEFAULT_WEIGHT_TEMPLATES[0].weights
  );

  // Pairwise matrix
  const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>(
    DEFAULT_WEIGHT_TEMPLATES[0].pairwiseMatrix || [
      [1.0, 1.2, 1.5, 3.0],
      [1 / 1.2, 1.0, 1.2, 3.0],
      [1 / 1.5, 1 / 1.2, 1.0, 2.5],
      [1 / 3.0, 1 / 3.0, 1 / 2.5, 1.0],
    ]
  );

  const [isCalculating, setIsCalculating] = useState(false);

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      const loaded = await ahpApi.getTemplates();
      setTemplates(loaded);
      if (loaded.length > 0) {
        setWeights(loaded[0].weights);
        if (loaded[0].pairwiseMatrix) {
          setPairwiseMatrix(loaded[0].pairwiseMatrix);
        }
      }
    }
    loadTemplates();
  }, []);

  const handleSelectTemplate = (template: AHPWeightTemplate) => {
    setSelectedTemplateId(template.id);
    setWeights(template.weights);
    if (template.pairwiseMatrix) {
      setPairwiseMatrix(template.pairwiseMatrix);
    }
    toast.info(
      `Loaded Preset: ${template.name}`,
      `Weights adjusted to ${template.currentVersion} profile.`
    );
  };

  const handleSaveNewVersion = (templateId: string, newVersion: AHPTemplateVersion) => {
    const updated = templates.map((t) => {
      if (t.id === templateId) {
        return {
          ...t,
          currentVersion: newVersion.version,
          versionHistory: [newVersion, ...t.versionHistory],
        };
      }
      return t;
    });
    setTemplates(updated);
    toast.success(
      "Version Snapshot Saved",
      `New template version "${newVersion.version}" recorded in audit trail.`
    );
  };

  const handleNormalizeSimpleWeights = () => {
    const sum = weights.price + weights.quality + weights.delivery + weights.esg;
    if (sum === 0) return;
    setWeights({
      price: Number((weights.price / sum).toFixed(4)),
      quality: Number((weights.quality / sum).toFixed(4)),
      delivery: Number((weights.delivery / sum).toFixed(4)),
      esg: Number((weights.esg / sum).toFixed(4)),
    });
    toast.success(
      "Weights Normalized",
      "Proportionally scaled all criteria weights to sum exactly to 100%."
    );
  };

  const handleResetSimple = () => {
    const defaultBalanced = DEFAULT_WEIGHT_TEMPLATES[0].weights;
    setWeights(defaultBalanced);
    toast.info("Reset Weights", "Restored standard balanced 35/30/25/10 weighting.");
  };

  const handleResetMatrix = () => {
    const defaultMatrix = [
      [1.0, 1.2, 1.5, 3.0],
      [1 / 1.2, 1.0, 1.2, 3.0],
      [1 / 1.5, 1 / 1.2, 1.0, 2.5],
      [1 / 3.0, 1 / 3.0, 1 / 2.5, 1.0],
    ];
    setPairwiseMatrix(defaultMatrix);
    toast.info("Matrix Reset", "Restored transitive pairwise matrix (CR < 0.05).");
  };

  const handleExecuteEngine = async () => {
    setIsCalculating(true);
    try {
      if (mode === "simple") {
        await ahpApi.calculateSimpleMode(rfqId, weights);
        toast.success(
          "AHP Scoring Pipeline Completed",
          "Calculated composite utility scores and supplier rankings."
        );
      } else {
        // Pairwise mode: verify CR first
        const norm = normalizeMatrix(pairwiseMatrix);
        const wList = calculateWeights(norm);
        const cr = calculateConsistencyRatio(pairwiseMatrix, wList);

        if (!cr.is_consistent) {
          toast.warning(
            "Matrix Inconsistency Detected",
            `Consistency Ratio is ${cr.CR} ≥ 0.10. Proceeding with approximate principal eigenvector ranking.`
          );
        }

        await ahpApi.calculatePairwiseMode(
          rfqId,
          pairwiseMatrix,
          ORDERED_CRITERIA_KEYS
        );
        toast.success(
          "Pairwise AHP Calculation Complete",
          `Eigenvector weights synthesized. Consistency Ratio: ${cr.CR}.`
        );
      }

      router.push(`/ahp/results?rfqId=${rfqId}`);
    } catch (e) {
      toast.error("Calculation Error", "Failed to compute AHP rankings.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href={`/comparison/${rfqId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Comparison Matrix</span>
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 font-mono">
                RFQ #{rfqId} AHP Engine
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/rfq/${rfqId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>RFQ Workspace</span>
              </Link>
              <Link
                href={`/ahp/results?rfqId=${rfqId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                <span>View Current Rankings</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  AHP Multi-Criteria Weight Configuration
                </h1>
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-mono">
                  Phase 3 • Faisal Sakware
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure decision weights using direct allocation or Saaty&apos;s 1–9 pairwise comparison matrix with automated Consistency Ratio (CR) auditing.
              </p>
            </div>

            {/* Execute CTA in Header */}
            <button
              type="button"
              onClick={handleExecuteEngine}
              disabled={isCalculating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50 self-start lg:self-auto"
            >
              {isCalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing AHP Rankings...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute AHP Scoring Engine</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 1. Presets Bar & Version Control */}
        <TemplatePresetsBar
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onSaveNewVersion={handleSaveNewVersion}
          currentWeights={weights}
        />

        {/* 2. Mode Toggle: Simple Mode vs Advanced Pairwise Matrix */}
        <AHPModeToggle mode={mode} onModeChange={setMode} />

        {/* 3. Dual-Mode Body */}
        {mode === "simple" ? (
          <SimpleWeightConfig
            weights={weights}
            onChange={setWeights}
            onNormalize={handleNormalizeSimpleWeights}
            onReset={handleResetSimple}
          />
        ) : (
          <PairwiseMatrixGrid
            matrix={pairwiseMatrix}
            onChange={setPairwiseMatrix}
            onReset={handleResetMatrix}
          />
        )}

        {/* Bottom Execution Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-300" />
              <h3 className="text-sm font-bold">
                Ready to Synthesize Supplier Utility Scores?
              </h3>
            </div>
            <p className="text-xs text-blue-100 max-w-xl">
              The engine will normalize multi-currency bids via MAUT Min-Max utility functions, apply criteria weights, and generate ranked leaderboards and score breakdown charts.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExecuteEngine}
            disabled={isCalculating}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 shadow-md transition-all shrink-0 disabled:opacity-50"
          >
            {isCalculating ? (
              <span>Processing Decision Pipeline...</span>
            ) : (
              <>
                <Award className="w-4 h-4 text-blue-700" />
                <span>Calculate & View Results →</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AHPConfigurePage() {
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
      <AHPConfigureContent />
    </Suspense>
  );
}
