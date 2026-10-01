"use client";

import React from "react";
import {
  AHPCriteriaWeights,
  AHPCriterionKey,
  AHP_CRITERIA_METADATA,
} from "@/lib/ahp-types";
import {
  DollarSign,
  Clock,
  ShieldCheck,
  Leaf,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface SimpleWeightConfigProps {
  weights: AHPCriteriaWeights;
  onChange: (weights: AHPCriteriaWeights) => void;
  onNormalize: () => void;
  onReset: () => void;
}

export function SimpleWeightConfig({
  weights,
  onChange,
  onNormalize,
  onReset,
}: SimpleWeightConfigProps) {
  const criteriaKeys: AHPCriterionKey[] = ["price", "quality", "delivery", "esg"];

  // Compute total percentage (weights stored as 0.0 - 1.0, convert to %)
  const pricePct = Math.round(weights.price * 100);
  const qualPct = Math.round(weights.quality * 100);
  const delPct = Math.round(weights.delivery * 100);
  const esgPct = Math.round(weights.esg * 100);
  const totalPct = pricePct + qualPct + delPct + esgPct;
  const isExact100 = totalPct === 100;

  const handleSliderChange = (key: AHPCriterionKey, val: number) => {
    const updated = {
      ...weights,
      [key]: Number((val / 100).toFixed(4)),
    };
    onChange(updated);
  };

  const getIcon = (key: AHPCriterionKey) => {
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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header and Total Sum Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Direct Criteria Weight Allocation
          </h3>
          <p className="text-xs text-slate-500">
            Adjust individual criteria importance sliders. Weights are automatically synthesized by the MAUT utility engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Real-time Sum Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold transition-all ${
              isExact100
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {isExact100 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              Total: <strong>{totalPct}%</strong> / 100%
            </span>
          </div>

          {!isExact100 && (
            <button
              type="button"
              onClick={onNormalize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Normalize to 100%</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Reset to Balanced Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual Proportional Distribution Stacked Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Weighted Portfolio Composition</span>
          <span className="font-mono">
            {pricePct}% Cost • {qualPct}% Quality • {delPct}% Lead Time • {esgPct}% ESG
          </span>
        </div>
        <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${(pricePct / Math.max(1, totalPct)) * 100}%` }}
            className="bg-blue-600 transition-all duration-300 relative group"
            title={`Cost / Price: ${pricePct}%`}
          />
          <div
            style={{ width: `${(qualPct / Math.max(1, totalPct)) * 100}%` }}
            className="bg-emerald-500 transition-all duration-300 relative group"
            title={`Quality & Specs: ${qualPct}%`}
          />
          <div
            style={{ width: `${(delPct / Math.max(1, totalPct)) * 100}%` }}
            className="bg-sky-500 transition-all duration-300 relative group"
            title={`Lead Time: ${delPct}%`}
          />
          <div
            style={{ width: `${(esgPct / Math.max(1, totalPct)) * 100}%` }}
            className="bg-amber-500 transition-all duration-300 relative group"
            title={`ESG / Compliance: ${esgPct}%`}
          />
        </div>
      </div>

      {/* 4 Interactive Criteria Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {criteriaKeys.map((key) => {
          const meta = AHP_CRITERIA_METADATA[key];
          const pct = Math.round(weights[key] * 100);

          return (
            <div
              key={key}
              className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    {getIcon(key)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {meta.label}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {meta.direction === "cost" ? "Cost Metric (Lower is Better)" : "Benefit Metric (Higher is Better)"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => {
                      const v = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      handleSliderChange(key, v);
                    }}
                    className="w-14 px-2 py-1 text-center font-mono text-xs font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={pct}
                  onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {meta.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
