"use client";

import React, { useState } from "react";
import { Download, FileText, CheckCircle2, X, FileSpreadsheet, Code2 } from "lucide-react";
import { ComparisonEngineResponse } from "@/lib/comparison-types";

interface ExportReportModalProps {
  comparisonData: ComparisonEngineResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
}

export function ExportReportModal({
  comparisonData,
  isOpen,
  onClose,
  onSuccessToast,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<"csv" | "json" | "pdf">("csv");

  if (!isOpen) return null;

  const handleDownload = () => {
    if (format === "json") {
      const jsonBlob = new Blob([JSON.stringify(comparisonData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comparison_RFQ_${comparisonData.rfq_id}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      // Build CSV
      const headers = [
        "Rank",
        "Supplier Name",
        "Quote Number",
        "Country",
        "Currency",
        "Raw Total Amount",
        "Normalized INR Total",
        "Delivery Days",
        "Warranty Months",
        "Incoterms",
        "Payment Terms",
        "Rating",
        "ESG Score",
        "Composite Score",
      ];
      const rows = comparisonData.suppliers.map((s) => [
        s.rank,
        `"${s.supplier_name}"`,
        s.quote_number,
        s.country,
        s.currency,
        s.raw_total_amount,
        s.base_total_amount,
        s.delivery_time_days,
        s.warranty_months,
        `"${s.incoterms}"`,
        `"${s.payment_terms}"`,
        s.supplier_rating,
        s.esg_score,
        s.composite_score,
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comparison_RFQ_${comparisonData.rfq_id}_Matrix.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF Simulation
      window.print();
    }

    onSuccessToast(`Comparison report exported successfully as ${format.toUpperCase()}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Export Supplier Comparison Report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Generate an executive procurement memorandum containing the multi-vendor scoring matrix, FX normalization audit, and Paramita algorithm recommendation.
          </p>

          <div className="space-y-2">
            <label
              onClick={() => setFormat("csv")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                format === "csv"
                  ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">CSV Spreadsheet</p>
                  <p className="text-[11px] text-slate-500">Structured data with FX audit columns</p>
                </div>
              </div>
              <input
                type="radio"
                name="export_format"
                checked={format === "csv"}
                onChange={() => setFormat("csv")}
                className="text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label
              onClick={() => setFormat("json")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                format === "json"
                  ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">JSON Schema Payload</p>
                  <p className="text-[11px] text-slate-500">P2.4 Comparison Engine standardized format</p>
                </div>
              </div>
              <input
                type="radio"
                name="export_format"
                checked={format === "json"}
                onChange={() => setFormat("json")}
                className="text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label
              onClick={() => setFormat("pdf")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                format === "pdf"
                  ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-rose-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Printable Executive Summary (PDF)</p>
                  <p className="text-[11px] text-slate-500">C-suite procurement evaluation layout</p>
                </div>
              </div>
              <input
                type="radio"
                name="export_format"
                checked={format === "pdf"}
                onChange={() => setFormat("pdf")}
                className="text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/60">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate & Download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
