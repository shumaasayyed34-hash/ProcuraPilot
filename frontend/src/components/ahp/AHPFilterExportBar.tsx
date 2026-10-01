"use client";

import React from "react";
import {
  Search,
  Filter,
  Download,
  Sliders,
  Sparkles,
} from "lucide-react";

interface AHPFilterExportBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  minScoreFilter: number;
  onMinScoreChange: (score: number) => void;
  totalSuppliers: number;
  filteredCount: number;
  onOpenExport: () => void;
  onConfigureClick: () => void;
}

export function AHPFilterExportBar({
  searchTerm,
  onSearchChange,
  minScoreFilter,
  onMinScoreChange,
  totalSuppliers,
  filteredCount,
  onOpenExport,
  onConfigureClick,
}: AHPFilterExportBarProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search vendor by name, country..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Quick Score Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => onMinScoreChange(0)}
              className={`px-3 py-1 rounded-md transition-all ${
                minScoreFilter === 0
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({totalSuppliers})
            </button>
            <button
              type="button"
              onClick={() => onMinScoreChange(0.7)}
              className={`px-3 py-1 rounded-md transition-all ${
                minScoreFilter === 0.7
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Score ≥ 70%
            </button>
            <button
              type="button"
              onClick={() => onMinScoreChange(0.8)}
              className={`px-3 py-1 rounded-md transition-all ${
                minScoreFilter === 0.8
                  ? "bg-white text-blue-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Score ≥ 80%
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={onConfigureClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Adjust AHP Weights</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Evaluation</span>
          </button>
        </div>
      </div>
    </div>
  );
}
