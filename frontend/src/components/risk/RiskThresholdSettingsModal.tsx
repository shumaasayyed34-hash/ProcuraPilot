"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  RotateCcw,
  Check,
  ShieldAlert,
  AlertTriangle,
  Info,
  Save,
  CheckCircle2,
} from "lucide-react";
import { RiskThresholdSettings } from "@/lib/risk-types";
import { riskApi, DEFAULT_RISK_THRESHOLDS } from "@/lib/risk-api";

interface RiskThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: RiskThresholdSettings) => void;
}

export function RiskThresholdSettingsModal({
  isOpen,
  onClose,
  onSaved,
}: RiskThresholdSettingsModalProps) {
  const [settings, setSettings] = useState<RiskThresholdSettings>(
    DEFAULT_RISK_THRESHOLDS
  );
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(riskApi.getThresholdSettings());
      setHasSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSliderChange = (key: keyof RiskThresholdSettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key: keyof RiskThresholdSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSettings(DEFAULT_RISK_THRESHOLDS);
  };

  const handleSave = () => {
    riskApi.saveThresholdSettings(settings);
    setHasSaved(true);
    if (onSaved) {
      onSaved(settings);
    }
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Risk Sensitivity &amp; Threshold Settings
              </h3>
              <p className="text-xs text-slate-500">
                Tune anomaly sensitivity parameters and automated governance controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Global Sensitivity Sliders */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Global Alert Triggers
            </h4>

            {/* Composite Alert Threshold */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-900">
                    Composite Risk Alert Cutoff
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Triggers warning flags when a supplier&#39;s overall score breaches this limit.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {settings.compositeAlertThreshold} / 100
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="90"
                step="1"
                value={settings.compositeAlertThreshold}
                onChange={(e) =>
                  handleSliderChange("compositeAlertThreshold", Number(e.target.value))
                }
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Critical Threshold */}
            <div className="p-3.5 rounded-xl bg-red-50/40 border border-red-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-slate-900">
                    Critical Risk Threshold (Auto-Block Level)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Scores exceeding this trigger mandatory executive escalation and PO halt.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                  {settings.criticalThreshold} / 100
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                step="1"
                value={settings.criticalThreshold}
                onChange={(e) =>
                  handleSliderChange("criticalThreshold", Number(e.target.value))
                }
                className="w-full accent-red-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Section 2: Granular Dimension Tolerance Limits */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Dimension Tolerance Caps
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Financial Risk Cap */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Financial Cap</span>
                  <span className="font-mono font-bold text-slate-900">{settings.financialRiskCap}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={settings.financialRiskCap}
                  onChange={(e) => handleSliderChange("financialRiskCap", Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Max tolerable balance sheet leverage</p>
              </div>

              {/* Compliance Cutoff */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Compliance Cutoff</span>
                  <span className="font-mono font-bold text-slate-900">{settings.complianceFailureCutoff}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={settings.complianceFailureCutoff}
                  onChange={(e) => handleSliderChange("complianceFailureCutoff", Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Tax &amp; certification breach ceiling</p>
              </div>

              {/* Delivery Delay Tolerance */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Delivery Delay Cap</span>
                  <span className="font-mono font-bold text-slate-900">{settings.deliveryDelayTolerance}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={settings.deliveryDelayTolerance}
                  onChange={(e) => handleSliderChange("deliveryDelayTolerance", Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Logistics fulfillment anomaly ceiling</p>
              </div>

              {/* Fraud Sensitivity */}
              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Fraud Sensitivity</span>
                  <span className="font-mono font-bold text-slate-900">{settings.fraudSensitivity}</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="70"
                  value={settings.fraudSensitivity}
                  onChange={(e) => handleSliderChange("fraudSensitivity", Number(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">Phantom vendor &amp; shell entity sensitivity</p>
              </div>
            </div>
          </div>

          {/* Section 3: Automated Actions / Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Automated Guardrail Toggles
            </h4>

            {/* Auto Block Critical PO */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">
                  Auto-Block PO Issuance on Critical Risk
                </span>
                <span className="text-[11px] text-slate-500">
                  Automatically freezes ERP purchase orders if supplier breaches critical threshold.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleChange("autoBlockCriticalPO", !settings.autoBlockCriticalPO)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoBlockCriticalPO ? "bg-red-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoBlockCriticalPO ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* News Sentiment Alerts */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-slate-900 block">
                  Real-time News Sentiment Spike Alerts (P4.1)
                </span>
                <span className="text-[11px] text-slate-500">
                  Emit immediate dashboard push alerts when external negative press velocity spikes.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleChange("enableNewsSpikeAlerts", !settings.enableNewsSpikeAlerts)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enableNewsSpikeAlerts ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enableNewsSpikeAlerts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5"
            >
              {hasSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Parameters
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
