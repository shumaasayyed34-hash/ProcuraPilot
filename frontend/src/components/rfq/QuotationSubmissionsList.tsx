"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Building,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { QuotationSubmission, QuotationValidationStatus } from "@/lib/comparison-types";

interface QuotationSubmissionsListProps {
  quotations: QuotationSubmission[];
  onToggleSelect: (id: number) => void;
  onSelectAll: (select: boolean) => void;
  onViewValidation: (quotationId: number) => void;
}

export function QuotationSubmissionsList({
  quotations,
  onToggleSelect,
  onSelectAll,
  onViewValidation,
}: QuotationSubmissionsListProps) {
  const allSelected = quotations.length > 0 && quotations.every((q) => q.is_selected);
  const someSelected = quotations.some((q) => q.is_selected);

  const getValidationBadge = (status: QuotationValidationStatus, summary: any) => {
    const s = summary || { warning_count: 0, error_count: 0, hygiene_score: 100 };
    switch (status) {
      case "passed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Passed (100%)
          </span>
        );
      case "action_required":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {s.warning_count} Warning{s.warning_count > 1 ? "s" : ""}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Blocked ({s.error_count} Errors)
          </span>
        );
      case "validating":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600 animate-spin" />
            Validating...
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number, curr: string) => {
    const symbolMap: Record<string, string> = {
      INR: "₹",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    const sym = symbolMap[curr] || curr + " ";
    return `${sym}${amount.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Incoming Vendor Quotation Submissions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select quotations to include in the normalized multi-criteria comparison matrix.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Select All Validated</span>
          </label>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-3 px-4">Supplier & Reference</th>
              <th className="py-3 px-4">Origin / ISO</th>
              <th className="py-3 px-4">Quoted Amount</th>
              <th className="py-3 px-4">Normalized (INR Base)</th>
              <th className="py-3 px-4">Lead Time & Terms</th>
              <th className="py-3 px-4">Validation Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {quotations.map((quote) => {
              const isSelected = quote.is_selected;
              const isBlocked = quote.validation_status === "rejected";

              return (
                <tr
                  key={quote.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isSelected ? "bg-blue-50/30" : ""
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td className="py-3.5 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={!!isSelected}
                      disabled={isBlocked}
                      onChange={() => onToggleSelect(quote.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </td>

                  {/* Supplier & Reference */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{quote.supplier_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>{quote.quote_number}</span>
                      <span>•</span>
                      <span>Sub: {new Date(quote.submission_date).toLocaleDateString()}</span>
                    </div>
                  </td>

                  {/* Origin & ISO */}
                  <td className="py-3.5 px-4">
                    <span className="text-slate-700 font-medium">{quote.country}</span>
                    <div className="mt-0.5">
                      {quote.is_iso_certified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          ISO 9001
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Non-certified</span>
                      )}
                    </div>
                  </td>

                  {/* Quoted Amount */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold font-mono text-slate-900">
                      {formatCurrency(quote.total_amount, quote.currency)}
                    </div>
                    {quote.unit_price && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        {formatCurrency(quote.unit_price, quote.currency)} / unit
                      </div>
                    )}
                  </td>

                  {/* Normalized (INR Base) */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold font-mono text-blue-700">
                      ₹{(quote.base_total_amount ?? 0).toLocaleString("en-IN")}
                    </div>
                    {quote.currency !== "INR" && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Live FX @ {quote.currency}
                      </span>
                    )}
                  </td>

                  {/* Lead Time & Terms */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">
                      {quote.delivery_time_days} Days Lead Time
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                      {quote.incoterms || "Standard Freight"}
                    </div>
                  </td>

                  {/* Validation Status */}
                  <td className="py-3.5 px-4">
                    {getValidationBadge(quote.validation_status, quote.validation_summary)}
                    <div className="text-[10px] text-slate-500 mt-1">
                      Hygiene: {quote.validation_summary?.hygiene_score ?? 100}%
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onViewValidation(quote.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                    >
                      <span>Inspect Report</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
