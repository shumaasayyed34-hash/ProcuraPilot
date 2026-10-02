"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { ValidationIssue } from "@/lib/comparison-types";

interface ValidationSummaryCardsProps {
  issues: ValidationIssue[];
  totalFieldsValidated?: number;
}

export function ValidationSummaryCards({
  issues,
  totalFieldsValidated = 104,
}: ValidationSummaryCardsProps) {
  const unresolvedIssues = (issues || []).filter((i) => !i.is_resolved);
  const errorCount = unresolvedIssues.filter((i) => i.severity === "blocking_error").length;
  const warningCount = unresolvedIssues.filter((i) => i.severity === "warning").length;
  const duplicateCount = (issues || []).filter((i) => i.issue_type === "duplicate_detected").length;

  // Calculate hygiene score: 100 - (errors * 15 + warnings * 4) capped at 0-100
  const computedScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (errorCount * 18 + warningCount * 5)))
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* Total Fields Validated */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Fields Validated</span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 font-mono">
            {totalFieldsValidated}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">4 Quotes</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">S2.4 Schema Verification</p>
      </div>

      {/* Blocking Errors */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Blocking Errors</span>
          <div className={`p-1.5 rounded-lg ${errorCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${errorCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {errorCount}
          </span>
          {errorCount > 0 ? (
            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
              Blocks Comparison
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-600">All Clear</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Requires user rectification</p>
      </div>

      {/* Non-blocking Warnings */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Active Warnings</span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-600 font-mono">
            {warningCount}
          </span>
          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
            Non-blocking
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Acknowledge or override</p>
      </div>

      {/* Duplicate Alert Indicator */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Duplicate Alerts</span>
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <Copy className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-800 font-mono">
            {duplicateCount}
          </span>
          {duplicateCount > 0 ? (
            <span className="text-[11px] font-semibold text-amber-600">Flagged Ref</span>
          ) : (
            <span className="text-[11px] text-slate-400">Unique</span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Historical deduplication</p>
      </div>

      {/* Data Hygiene Score */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Hygiene Score</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-emerald-600 font-mono">
            {computedScore}%
          </span>
          <span className="text-[11px] font-semibold text-emerald-700">
            {computedScore >= 90 ? "High Trust" : "Action Needed"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Calculated via S2.4 checks</p>
      </div>
    </div>
  );
}
