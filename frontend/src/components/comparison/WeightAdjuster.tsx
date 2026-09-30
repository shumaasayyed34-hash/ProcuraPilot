"use client";

import React, { useState } from "react";
import { Sliders, RotateCcw, Check, Sparkles, X } from "lucide-react";
import { CriteriaWeights } from "@/lib/comparison-types";
import { INITIAL_WEIGHTS } from "@/lib/mock-data";

interface WeightAdjusterProps {
  weights: CriteriaWeights;
  onUpdateWeights: (newWeights: CriteriaWeights) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function WeightAdjuster({
  weights,
  onUpdateWeights,
  isOpen,
  onClose,
}: WeightAdjusterProps) {
  const [localWeights, setLocalWeights] = useState<CriteriaWeights>(weights);

  if (!isOpen) return null;

  const handleChange = (key: keyof CriteriaWeights, rawVal: number) => {
    setLocalWeights((prev) => ({
      ...prev,
      [key]: rawVal / 100,
    }));
  };

  const handleReset = () => {
    setLocalWeights(INITIAL_WEIGHTS);
    onUpdateWeights(INITIAL_WEIGHTS);
  };

  const handleApply = () => {
    // Normalize to 100%
    const total =
      localWeights.price +
      localWeights.delivery_time +
      localWeights.quality_rating +
      localWeights.warranty +
      localWeights.esg_compliance;

    if (total === 0) return;

    const normalized: CriteriaWeights = {
      price: Math.round((localWeights.price / total) * 100) / 100,
      delivery_time: Math.round((localWeights.delivery_time / total) * 100) / 100,
      quality_rating: Math.round((localWeights.quality_rating / total) * 100) / 100,
      warranty: Math.round((localWeights.warranty / total) * 100) / 100,
      esg_compliance: Math.round((localWeights.esg_compliance / total) * 100) / 100,
    };

    onUpdateWeights(normalized);
    onClose();
  };

  const criteriaList: Array<{
    key: keyof CriteriaWeights;
    label: string;
    description: string;
    type: "Cost (Lower is better)" | "Benefit (Higher is better)";
  }> = [
    {
      key: "price",
      label: "Total Landed Price",
      description: "Direct unit and grand total bid cost converted to uniform base currency",
      type: "Cost (Lower is better)",
    },
    {
      key: "delivery_time",
      label: "Lead Time / Delivery",
      description: "Calendar days required for manufacturing and transit",
      type: "Cost (Lower is better)",
    },
    {
      key: "quality_rating",
      label: "Supplier Quality Rating",
      description: "Historical performance rating and ISO 9001 compliance standards",
      type: "Benefit (Higher is better)",
    },
    {
      key: "warranty",
      label: "Warranty & SLA Coverage",
      description: "Duration of comprehensive parts and service guarantee (months)",
      type: "Benefit (Higher is better)",
    },
    {
      key: "esg_compliance",
      label: "ESG & Sustainability Score",
      description: "Environmental compliance, carbon footprint, and labor standards",
      type: "Benefit (Higher is better)",
    },
  ];

  const totalSum = Math.round(
    (localWeights.price +
      localWeights.delivery_time +
      localWeights.quality_rating +
      localWeights.warranty +
      localWeights.esg_compliance) *
      100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                MCDM Criteria Weight Calibration
              </h3>
              <p className="text-[11px] text-slate-500">
                Adjust multi-criteria decision weights to simulate ranking shifts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Sliders */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between bg-blue-50/80 p-3 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 text-xs text-blue-900 font-semibold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Current Allocation Total</span>
            </div>
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                totalSum === 100
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {totalSum}%
            </span>
          </div>

          {criteriaList.map((crit) => {
            const currentPct = Math.round(localWeights[crit.key] * 100);

            return (
              <div
                key={crit.key}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {crit.label}
                    </span>
                    <span className="ml-2 text-[10px] text-slate-400 font-medium">
                      ({crit.type})
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {currentPct}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentPct}
                  onChange={(e) => handleChange(crit.key, Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <p className="text-[11px] text-slate-500 leading-tight">
                  {crit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/60">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Re-Score Matrix</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
