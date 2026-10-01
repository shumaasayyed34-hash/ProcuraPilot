"use client";

import React from "react";
import { Sliders, Grid3X3, Sparkles } from "lucide-react";

interface AHPModeToggleProps {
  mode: "simple" | "pairwise";
  onModeChange: (mode: "simple" | "pairwise") => void;
}

export function AHPModeToggle({ mode, onModeChange }: AHPModeToggleProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Weight Derivation Methodology
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
              Saaty AHP Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose between direct percentage allocation or rigorous pairwise comparison matrix.
          </p>
        </div>

        {/* Segmented Mode Control */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onModeChange("simple")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === "simple"
                ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Simple Mode (Direct Weights)</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("pairwise")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === "pairwise"
                ? "bg-white text-blue-700 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 text-blue-600" />
            <span className="flex items-center gap-1.5">
              <span>Advanced (Pairwise Matrix)</span>
              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono">
                CR &lt; 0.10
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
