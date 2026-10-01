"use client";

import React, { useMemo } from "react";
import {
  AHPCriterionKey,
  AHP_CRITERIA_METADATA,
} from "@/lib/ahp-types";
import {
  ORDERED_CRITERIA_KEYS,
  normalizeMatrix,
  calculateWeights,
  calculateConsistencyRatio,
  SAATY_SCALE_OPTIONS,
} from "@/lib/ahp-engine";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";

interface PairwiseMatrixGridProps {
  matrix: number[][];
  onChange: (updatedMatrix: number[][]) => void;
  onReset: () => void;
}

export function PairwiseMatrixGrid({
  matrix,
  onChange,
  onReset,
}: PairwiseMatrixGridProps) {
  const criteria = ORDERED_CRITERIA_KEYS;
  const n = criteria.length;

  // Real-time calculation of normalized weights & consistency ratio
  const { normalizedWeights, consistency } = useMemo(() => {
    const norm = normalizeMatrix(matrix);
    const weights = calculateWeights(norm);
    const cr = calculateConsistencyRatio(matrix, weights);
    return {
      normalizedWeights: weights,
      consistency: cr,
    };
  }, [matrix]);

  // Handle cell change with dynamic reciprocal population
  const handleCellChange = (rowIndex: number, colIndex: number, rawVal: number) => {
    if (rowIndex === colIndex) return; // diagonal always 1.0

    const updated = matrix.map((row) => [...row]);
    updated[rowIndex][colIndex] = Number(rawVal);
    // Dynamic reciprocal invariant: a_ji = 1 / a_ij
    updated[colIndex][rowIndex] = Number((1 / rawVal).toFixed(4));

    onChange(updated);
  };

  const formatFraction = (val: number): string => {
    if (Math.abs(val - 1) < 0.01) return "1";
    if (Math.abs(val - 3) < 0.01) return "3";
    if (Math.abs(val - 5) < 0.01) return "5";
    if (Math.abs(val - 7) < 0.01) return "7";
    if (Math.abs(val - 9) < 0.01) return "9";
    if (Math.abs(val - 1 / 3) < 0.02) return "1/3";
    if (Math.abs(val - 1 / 5) < 0.02) return "1/5";
    if (Math.abs(val - 1 / 7) < 0.02) return "1/7";
    if (Math.abs(val - 1 / 9) < 0.02) return "1/9";
    if (Math.abs(val - 2) < 0.01) return "2";
    if (Math.abs(val - 4) < 0.01) return "4";
    if (Math.abs(val - 1 / 2) < 0.02) return "1/2";
    if (Math.abs(val - 1 / 4) < 0.02) return "1/4";
    return val.toFixed(2);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header and Consistency Ratio Status Indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Saaty AHP Pairwise Comparison Matrix (4×4)
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Axiom: a_ji = 1 / a_ij
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare row criteria against column criteria using Saaty&apos;s 1–9 fundamental scale. Reciprocals populate automatically.
          </p>
        </div>

        {/* Real-Time CR Badge */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
              consistency.is_consistent
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200 animate-pulse"
            }`}
          >
            {consistency.is_consistent ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span>CR: {consistency.CR.toFixed(4)}</span>
                <span className="text-[10px] font-normal">
                  {consistency.is_consistent ? "(< 0.10 Transitivity Verified)" : "(≥ 0.10 Inconsistent Judgments)"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Reset Matrix"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Consistency Mathematical Details Accordion Pill */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans">Principal Eigenvalue (λmax)</span>
          <span className="font-bold text-slate-800">{consistency.lambda_max.toFixed(4)}</span>
          <span className="text-[10px] text-slate-400 ml-1">(Ideal: 4.00)</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans">Consistency Index (CI)</span>
          <span className="font-bold text-slate-800">{consistency.CI.toFixed(4)}</span>
          <span className="text-[10px] text-slate-400 ml-1">((λmax-n)/(n-1))</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans">Random Index (RI n=4)</span>
          <span className="font-bold text-slate-800">0.9000</span>
          <span className="text-[10px] text-slate-400 ml-1">(Saaty Standard)</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-sans">Consistency Ratio (CR)</span>
          <span className={`font-bold ${consistency.is_consistent ? "text-emerald-700" : "text-rose-700"}`}>
            {consistency.CR.toFixed(4)}
          </span>
          <span className="text-[10px] text-slate-400 ml-1">(CI / RI)</span>
        </div>
      </div>

      {/* Inconsistency Alert Notice if CR >= 0.10 */}
      {!consistency.is_consistent && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Pairwise Judgments Require Revision</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              The Consistency Ratio is {consistency.CR.toFixed(4)} (threshold is &lt; 0.10). This indicates transitive contradictions in your comparisons (e.g., A is preferred to B, and B to C, but C is heavily preferred to A). Adjust relative intensities closer to 1 or load a pre-calibrated template.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Matrix Grid Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
              <th className="p-3.5 min-w-[140px]">Criteria / Attribute</th>
              {criteria.map((c) => (
                <th key={c} className="p-3.5 text-center min-w-[120px]">
                  <div className="font-bold text-slate-900">
                    {AHP_CRITERIA_METADATA[c].shortLabel}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal font-mono">
                    Column Criterion
                  </div>
                </th>
              ))}
              <th className="p-3.5 text-center bg-blue-50/60 border-l border-blue-200 min-w-[120px]">
                <div className="font-bold text-blue-900">Derived Weight (w)</div>
                <div className="text-[10px] text-blue-600 font-mono">Normalized</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {criteria.map((rowKey, rIdx) => {
              const rowMeta = AHP_CRITERIA_METADATA[rowKey];
              const derivedWeight = normalizedWeights[rIdx];

              return (
                <tr key={rowKey} className="hover:bg-slate-50/50 transition-colors">
                  {/* Row Criterion Header */}
                  <td className="p-3.5 bg-slate-50/60 font-semibold border-r border-slate-200">
                    <div className="text-slate-900 font-bold">{rowMeta.shortLabel}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {rowMeta.key === "price" || rowMeta.key === "delivery" ? "Cost Metric" : "Benefit Metric"}
                    </div>
                  </td>

                  {/* Matrix Cells */}
                  {criteria.map((colKey, cIdx) => {
                    const isDiagonal = rIdx === cIdx;
                    const isUpperTriangular = rIdx < cIdx;
                    const rawVal = matrix[rIdx][cIdx];

                    if (isDiagonal) {
                      return (
                        <td
                          key={colKey}
                          className="p-3 text-center bg-slate-100/60 text-slate-400 font-mono font-bold border-r border-slate-100"
                        >
                          1.0
                        </td>
                      );
                    }

                    return (
                      <td
                        key={colKey}
                        className={`p-2.5 text-center border-r border-slate-100 ${
                          isUpperTriangular ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <select
                            value={rawVal}
                            onChange={(e) =>
                              handleCellChange(rIdx, cIdx, parseFloat(e.target.value))
                            }
                            className="w-full text-center px-1.5 py-1 text-xs font-mono font-semibold bg-white border border-slate-200 rounded-md hover:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-2xs"
                          >
                            {SAATY_SCALE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {formatFraction(opt.value)}
                              </option>
                            ))}
                          </select>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {formatFraction(rawVal)}
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Derived Weight Column */}
                  <td className="p-3 text-center bg-blue-50/40 border-l border-blue-200">
                    <div className="font-mono font-bold text-sm text-blue-900">
                      {(derivedWeight * 100).toFixed(1)}%
                    </div>
                    <div className="w-16 mx-auto bg-blue-200 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, derivedWeight * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Saaty Scale Legend Reference Helper */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Scale className="w-4 h-4 text-blue-600" />
          <span>Saaty Fundamental 1–9 Importance Scale Reference</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px] text-slate-600">
          <div className="p-2 rounded bg-white border border-slate-200">
            <strong>1 - Equal:</strong> Both criteria contribute equally
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <strong>3 - Moderate:</strong> Experience slightly favors row
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <strong>5 - Strong:</strong> Strongly favors row over column
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <strong>7 - Very Strong:</strong> Demonstrated dominance
          </div>
          <div className="p-2 rounded bg-white border border-slate-200">
            <strong>9 - Extreme:</strong> Highest possible affirmation
          </div>
        </div>
      </div>
    </div>
  );
}
