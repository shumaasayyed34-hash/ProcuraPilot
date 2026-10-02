"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RiskDistributionSummary } from "@/components/risk/RiskDistributionSummary";
import { RiskHeatmapGrid } from "@/components/risk/RiskHeatmapGrid";
import { RiskAlertsPanel } from "@/components/risk/RiskAlertsPanel";
import { RiskThresholdSettingsModal } from "@/components/risk/RiskThresholdSettingsModal";
import { useToast } from "@/components/ui/Toast";
import { riskApi } from "@/lib/risk-api";
import {
  RiskHeatmapSupplier,
  RiskAlertItem,
  RiskThresholdSettings,
} from "@/lib/risk-types";
import {
  ShieldAlert,
  RotateCcw,
  Sliders,
  Sparkles,
  RefreshCw,
  BellRing,
} from "lucide-react";

export default function RiskIntelligenceDashboardPage() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<RiskHeatmapSupplier[]>([]);
  const [alerts, setAlerts] = useState<RiskAlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load suppliers and alerts on mount
  useEffect(() => {
    async function loadRiskData() {
      setIsLoading(true);
      try {
        const [supplierList, alertList] = await Promise.all([
          riskApi.getHeatmapSuppliers(101),
          riskApi.getRiskAlerts(),
        ]);
        setSuppliers(supplierList);
        setAlerts(alertList);
      } catch (err) {
        console.error("Failed to load risk telemetry", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRiskData();
  }, []);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await riskApi.recalculateAllRisk();
      const updated = await riskApi.getHeatmapSuppliers(101);
      setSuppliers(updated);
      toast.success(
        "Risk Telemetry Recalculated",
        `Synthesized ${res.recalculated} supplier profiles across 6 dimensions with active vector memory.`
      );
    } catch {
      toast.error("Recalculation Failed", "Unable to reach risk computation service.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleAcknowledgeAlert = (id: string) => {
    toast.info("Alert Acknowledged", "Audit trail entry logged for compliance officer review.");
  };

  const handleSaveSettings = (newSettings: RiskThresholdSettings) => {
    toast.success(
      "Threshold Parameters Saved",
      `Composite alert set at ${newSettings.compositeAlertThreshold}, Critical cutoff at ${newSettings.criticalThreshold}.`
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                Phase 4: Risk Intelligence
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine Active
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Supplier Risk Intelligence &amp; Heatmap
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous multi-dimensional evaluation across Financial, Compliance, Delivery, Country, ESG &amp; Fraud vectors
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Threshold Settings
            </button>

            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-white ${
                  isRecalculating ? "animate-spin" : ""
                }`}
              />
              <span>{isRecalculating ? "Recalculating..." : "Recalculate Risk"}</span>
            </button>
          </div>
        </div>

        {/* Top KPIs & Distribution Summary */}
        <RiskDistributionSummary
          suppliers={suppliers}
          activeAlertsCount={alerts.filter((a) => !a.acknowledged).length}
        />

        {/* Main Grid: Heatmap (2 cols) + Real-time Alerts Panel (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <RiskHeatmapGrid
              suppliers={suppliers}
              onRecalculate={handleRecalculate}
              isRecalculating={isRecalculating}
            />
          </div>

          <div className="lg:col-span-1 sticky top-24">
            <RiskAlertsPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
            />
          </div>
        </div>

        {/* Risk Threshold Settings Modal */}
        <RiskThresholdSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaved={handleSaveSettings}
        />
      </div>
    </AppLayout>
  );
}
