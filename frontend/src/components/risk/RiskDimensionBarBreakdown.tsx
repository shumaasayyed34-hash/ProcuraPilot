"use client";

import React from "react";
import {
  DollarSign,
  ShieldCheck,
  Truck,
  Globe,
  Leaf,
  AlertOctagon,
  Info,
} from "lucide-react";
import { RiskDimensions } from "@/lib/risk-types";
import { cn } from "@/lib/utils";

interface RiskDimensionBarBreakdownProps {
  dimensions: RiskDimensions;
  className?: string;
}

interface DimensionConfig {
  key: keyof RiskDimensions;
  title: string;
  weight: number;
  weightLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  safeTolerance: number;
}

const DIMENSION_CONFIGS: DimensionConfig[] = [
  {
    key: "financial",
    title: "Financial Stability",
    weight: 0.25,
    weightLabel: "25% Weight",
    icon: DollarSign,
    description: "Evaluates annual turnover, working capital liquidity, and bankruptcy probability.",
    safeTolerance: 50,
  },
  {
    key: "compliance",
    title: "Compliance & Regulatory",
    weight: 0.2,
    weightLabel: "20% Weight",
    icon: ShieldCheck,
    description: "Evaluates ISO certifications, statutory tax compliance (GSTIN), and sanctions.",
    safeTolerance: 40,
  },
  {
    key: "delivery",
    title: "Delivery Performance",
    weight: 0.2,
    weightLabel: "20% Weight",
    icon: Truck,
    description: "Historical on-time fulfillment rate, transit consistency, and logistics resilience.",
    safeTolerance: 40,
  },
  {
    key: "country",
    title: "Country & Geopolitical",
    weight: 0.15,
    weightLabel: "15% Weight",
    icon: Globe,
    description: "Sovereign credit risk, cross-border tariffs, trade embargoes, and regional stability.",
    safeTolerance: 50,
  },
  {
    key: "esg",
    title: "ESG & Sustainability",
    weight: 0.1,
    weightLabel: "10% Weight",
    icon: Leaf,
    description: "Environmental compliance, labor ethics standards, and carbon footprint reduction.",
    safeTolerance: 40,
  },
  {
    key: "fraud",
    title: "Fraud & Shell Entity Risk",
    weight: 0.1,
    weightLabel: "10% Weight",
    icon: AlertOctagon,
    description: "Detects phantom vendors, unverified physical addresses, and fake MSME credentials.",
    safeTolerance: 35,
  },
];

function getScoreTheme(score: number) {
  if (score < 30) {
    return {
      barColor: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      badgeColor: "bg-emerald-100 text-emerald-800",
      label: "LOW",
    };
  }
  if (score < 60) {
    return {
      barColor: "bg-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      badgeColor: "bg-amber-100 text-amber-800",
      label: "MEDIUM",
    };
  }
  if (score < 80) {
    return {
      barColor: "bg-orange-500",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      badgeColor: "bg-orange-100 text-orange-800",
      label: "HIGH",
    };
  }
  return {
    barColor: "bg-red-600",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badgeColor: "bg-red-100 text-red-800",
    label: "CRITICAL",
  };
}

export function RiskDimensionBarBreakdown({
  dimensions,
  className,
}: RiskDimensionBarBreakdownProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            6-Dimensional Risk Breakdown
          </h3>
          <p className="text-[11px] text-slate-500">
            Weighted risk contribution across operational, financial, and compliance dimensions
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>&lt;30 Low</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-1"></span>
          <span>30-59 Med</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 ml-1"></span>
          <span>60-79 High</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 ml-1"></span>
          <span>80+ Crit</span>
        </div>
      </div>

      <div className="space-y-4">
        {DIMENSION_CONFIGS.map((cfg) => {
          const score = dimensions[cfg.key] ?? 0;
          const theme = getScoreTheme(score);
          const Icon = cfg.icon;
          const isBreached = score > cfg.safeTolerance;

          return (
            <div
              key={cfg.key}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isBreached
                  ? `${theme.bgColor} ${theme.borderColor}`
                  : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-50"
              )}
            >
              {/* Header: Title + Weight + Score */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center text-xs",
                      isBreached ? theme.badgeColor : "bg-slate-200 text-slate-700"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {cfg.title}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {cfg.weightLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isBreached && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-100/80 px-1.5 py-0.2 rounded">
                      Exceeds Tolerance ({cfg.safeTolerance})
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      theme.badgeColor
                    )}
                  >
                    {theme.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">
                    {score.toFixed(1)}
                    <span className="text-[10px] font-normal text-slate-500">/100</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar with safe limit indicator */}
              <div className="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                <div
                  className={cn("h-full transition-all duration-500 rounded-full", theme.barColor)}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                />
                {/* Safe limit mark line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10 opacity-75"
                  style={{ left: `${cfg.safeTolerance}%` }}
                  title={`Safe Tolerance Limit: ${cfg.safeTolerance}`}
                />
              </div>

              {/* Context text */}
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <p className="line-clamp-1">{cfg.description}</p>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                  Contrib: +{(score * cfg.weight).toFixed(1)} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
