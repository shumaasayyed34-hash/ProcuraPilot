"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { ValidationIssue } from "@/lib/comparison-types";

interface InlineQuickFixModalProps {
  issue: ValidationIssue | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (
    issueId: string,
    resolution: {
      type: "rectified" | "overridden" | "rejected";
      rectifiedValue?: string | number;
      note?: string;
    }
  ) => void;
}

export function InlineQuickFixModal({
  issue,
  isOpen,
  onClose,
  onResolve,
}: InlineQuickFixModalProps) {
  const [activeTab, setActiveTab] = useState<"rectify" | "override" | "reject">("rectify");
  const [newValue, setNewValue] = useState("");
  const [auditNote, setAuditNote] = useState("");

  useEffect(() => {
    if (issue) {
      setNewValue(issue.suggested_value !== undefined && issue.suggested_value !== null ? String(issue.suggested_value) : "");
      setActiveTab(issue.severity === "blocking_error" ? "rectify" : "override");
      setAuditNote("");
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "rectify") {
      onResolve(issue.id, {
        type: "rectified",
        rectifiedValue: newValue,
        note: auditNote || `Value corrected to ${newValue}`,
      });
    } else if (activeTab === "override") {
      onResolve(issue.id, {
        type: "overridden",
        note: auditNote || "Warning acknowledged & verified by Procurement Lead",
      });
    } else {
      onResolve(issue.id, {
        type: "rejected",
        note: auditNote || "Quotation rejected due to severe data compliance discrepancy",
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${issue.severity === "blocking_error" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
              {issue.severity === "blocking_error" ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Data Hygiene & Validation Fix
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {issue.id} • {issue.supplier_name}
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

        {/* Issue Overview Card */}
        <div className="p-6 space-y-5">
          <div className={`p-3.5 rounded-xl border text-xs ${
            issue.severity === "blocking_error"
              ? "bg-rose-50/60 border-rose-200 text-rose-900"
              : "bg-amber-50/60 border-amber-200 text-amber-900"
          }`}>
            <div className="font-semibold text-xs flex items-center gap-1.5">
              <span>{issue.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                issue.severity === "blocking_error"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {issue.severity === "blocking_error" ? "Blocking" : "Warning"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">
              {issue.description}
            </p>
          </div>

          {/* Current vs Suggested Value pills */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Current Extracted Value
              </span>
              <p className="font-mono font-semibold text-slate-800 mt-1">
                {issue.current_value !== null && issue.current_value !== undefined
                  ? String(issue.current_value)
                  : "(Empty / Not Found)"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                Recommended / Suggested
              </span>
              <p className="font-mono font-semibold text-blue-900 mt-1">
                {issue.suggested_value !== null && issue.suggested_value !== undefined
                  ? String(issue.suggested_value)
                  : "Manual Entry Required"}
              </p>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("rectify")}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === "rectify"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              1. Rectify Value Inline
            </button>
            {issue.severity === "warning" && (
              <button
                type="button"
                onClick={() => setActiveTab("override")}
                className={`pb-2.5 transition-colors border-b-2 ${
                  activeTab === "override"
                    ? "border-amber-600 text-amber-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Acknowledge Warning
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("reject")}
              className={`pb-2.5 transition-colors border-b-2 ${
                activeTab === "reject"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              3. Reject Bid
            </button>
          </div>

          {/* Tab Forms */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "rectify" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Corrected Field Value: <span className="font-mono text-blue-600">{issue.field_name}</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Enter rectified value..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Audit Log Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="e.g., Confirmed with supplier via clarification email"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {activeTab === "override" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Acknowledging this non-blocking warning marks the quotation as verified and unblocks downstream AHP decision weighting without altering the original extracted text.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Procurement Officer Justification
                  </label>
                  <input
                    type="text"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="e.g., Incoterms verified as EXW in attachment page 3"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {activeTab === "reject" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <p className="font-semibold">Caution: Quotation Exclusion</p>
                  <p className="mt-0.5 text-[11px]">
                    Rejecting this quotation will exclude {issue.supplier_name} from the active multi-criteria supplier ranking matrix.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rejection Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    placeholder="e.g., Non-compliant tax structure & delivery infeasibility"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>
            )}

            {/* Actions footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors ${
                  activeTab === "reject"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : activeTab === "override"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {activeTab === "reject"
                  ? "Confirm Rejection"
                  : activeTab === "override"
                  ? "Acknowledge & Clear"
                  : "Save Rectified Value"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
