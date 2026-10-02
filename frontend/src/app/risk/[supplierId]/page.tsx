"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { RiskDimensionRadarChart } from "@/components/risk/RiskDimensionRadarChart";
import { RiskDimensionBarBreakdown } from "@/components/risk/RiskDimensionBarBreakdown";
import { RiskNarrativeViewer } from "@/components/risk/RiskNarrativeViewer";
import { useToast } from "@/components/ui/Toast";
import { riskApi } from "@/lib/risk-api";
import { SupplierRiskProfileFull } from "@/lib/risk-types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Download,
  FileCheck,
  Globe,
  Mail,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SupplierRiskProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const supplierId = params?.supplierId as string;

  const [profile, setProfile] = useState<SupplierRiskProfileFull | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const data = await riskApi.getSupplierRiskProfile(supplierId);
        setProfile(data);
      } catch (err) {
        console.error("Failed to load supplier risk profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (supplierId) {
      loadProfile();
    }
  }, [supplierId]);

  const handleExportDossier = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk_dossier_${profile.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Risk Dossier Exported", "Comprehensive telemetry exported as audit-ready JSON dossier.");
  };

  const handleReAudit = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await riskApi.getSupplierRiskProfile(supplierId);
      setProfile(refreshed);
      toast.success("Risk Profile Refreshed", "Latest multi-agent telemetry and vector memory synced.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            Synthesizing 6-dimensional risk profile and LLM narrative...
          </p>
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="p-12 text-center max-w-md mx-auto space-y-4">
          <AlertOctagon className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Supplier Not Found</h2>
          <p className="text-xs text-slate-500">
            Could not find a risk dossier for supplier ID &#34;{supplierId}&#34;.
          </p>
          <Link
            href="/risk"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Risk Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isCritical = profile.risk_category === "critical";
  const isHigh = profile.risk_category === "high";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Back Link */}
        <div>
          <Link
            href="/risk"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Risk Dashboard &amp; Heatmap
          </Link>
        </div>

        {/* Supplier Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  ID: #{profile.supplier_id}
                </span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                    profile.risk_category === "critical"
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : profile.risk_category === "high"
                      ? "bg-orange-100 text-orange-800 border border-orange-300"
                      : profile.risk_category === "medium"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  )}
                >
                  {profile.risk_category} Risk Category
                </span>
                {profile.gstin ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <FileCheck className="w-3 h-3 text-emerald-600" />
                    GSTIN Verified: {profile.gstin}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-red-600" />
                    No Statutory GSTIN on File
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {profile.supplier_name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {profile.address || "Corporate address unverified"}
                </p>
              </div>

              {/* Quick Metadata chips */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  {profile.country}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {profile.years_in_business} {profile.years_in_business === 1 ? "Year" : "Years"} Operating
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  Annual Rev: ${(profile.annual_revenue / 1000000).toFixed(2)}M
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {profile.email}
                </span>
              </div>
            </div>

            {/* Composite Score Pill & Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
              <div className="text-left lg:text-right">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Composite Risk Exposure
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      "text-3xl font-black",
                      isCritical
                        ? "text-red-600"
                        : isHigh
                        ? "text-orange-600"
                        : profile.risk_category === "medium"
                        ? "text-amber-600"
                        : "text-emerald-600"
                    )}
                  >
                    {profile.composite_risk_score.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">/ 100</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReAudit}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  Re-Audit
                </button>
                <button
                  onClick={handleExportDossier}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Dossier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Visual Dimension Analytics (Left) vs AI Deep Narrative (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols): Visual Dimension Analytics */}
          <div className="lg:col-span-5 space-y-6">
            {/* Polar Radar Chart */}
            <RiskDimensionRadarChart
              dimensions={profile.dimension_breakdown}
              supplierName={profile.supplier_name}
            />

            {/* Granular 6-Dimension Bar Breakdown */}
            <RiskDimensionBarBreakdown
              dimensions={profile.dimension_breakdown}
            />

            {/* Governance Recommendations Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Procurement Governance Guardrails
              </h3>
              <ul className="space-y-2 text-xs">
                {profile.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-start gap-2"
                  >
                    <span className="font-bold text-blue-600 shrink-0 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column (7 cols): LLM Risk Narrative & Telemetry */}
          <div className="lg:col-span-7 space-y-6">
            <RiskNarrativeViewer
              narrative={profile.structured_narrative}
              newsSentiment={profile.news_sentiment}
              historicalEvents={profile.historical_events}
              riskCategory={profile.risk_category}
              compositeScore={profile.composite_risk_score}
              supplierName={profile.supplier_name}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
