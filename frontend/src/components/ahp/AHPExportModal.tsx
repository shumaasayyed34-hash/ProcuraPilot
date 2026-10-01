"use client";

import React, { useState } from "react";
import { AHPEvaluationResult } from "@/lib/ahp-types";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Code,
  CheckCircle2,
  Printer,
} from "lucide-react";

interface AHPExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: AHPEvaluationResult;
  onSuccessToast: (msg: string) => void;
}

export function AHPExportModal({
  isOpen,
  onClose,
  evaluation,
  onSuccessToast,
}: AHPExportModalProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "print">("csv");

  if (!isOpen) return null;

  const handleDownload = () => {
    if (exportFormat === "csv") {
      const headers = [
        "Rank",
        "Supplier Name",
        "Quote Number",
        "Country",
        "ISO Certified",
        "Landed Price (INR)",
        "Delivery Days",
        "Warranty Months",
        "Quality Score",
        "ESG Score",
        "AHP Composite Utility Score",
      ];

      const rows = evaluation.rankings.map((r) => [
        r.rank,
        `"${r.supplier_name}"`,
        r.quote_number,
        r.country,
        r.is_iso_certified ? "Yes" : "No",
        r.raw_metrics.price,
        r.raw_metrics.delivery_time,
        r.raw_metrics.warranty_months,
        r.raw_metrics.quality_raw,
        r.raw_metrics.esg_raw,
        r.ahp_score,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `AHP_Evaluation_RFQ_${evaluation.rfq_id}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onSuccessToast("AHP Decision Ledger CSV downloaded successfully.");
    } else if (exportFormat === "json") {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(evaluation, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute(
        "download",
        `AHP_Decision_Audit_RFQ_${evaluation.rfq_id}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onSuccessToast("AHP Audit Snapshot JSON exported.");
    } else {
      window.print();
      onSuccessToast("Print dialog launched for executive review.");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Export AHP Evaluation & Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                RFQ #{evaluation.rfq_id} Multi-Criteria Sourcing Decision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Select export format for procurement governance, executive approvals, or ERP integration:
          </p>

          <div className="space-y-2.5">
            <label
              onClick={() => setExportFormat("csv")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                exportFormat === "csv"
                  ? "bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/20"
                  : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Structured CSV Data Ledger
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Full table with raw parameters, normalized utilities, and rankings
                  </span>
                </div>
              </div>
              <input
                type="radio"
                name="export_fmt"
                checked={exportFormat === "csv"}
                onChange={() => setExportFormat("csv")}
                className="text-blue-600 accent-blue-600"
              />
            </label>

            <label
              onClick={() => setExportFormat("json")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                exportFormat === "json"
                  ? "bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/20"
                  : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    JSON MCDM Snapshot
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Pairwise matrix, consistency ratio, weights, and agent logs
                  </span>
                </div>
              </div>
              <input
                type="radio"
                name="export_fmt"
                checked={exportFormat === "json"}
                onChange={() => setExportFormat("json")}
                className="text-blue-600 accent-blue-600"
              />
            </label>

            <label
              onClick={() => setExportFormat("print")}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                exportFormat === "print"
                  ? "bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/20"
                  : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Executive PDF / Print Format
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Print-ready summary report with leaderboard and charts
                  </span>
                </div>
              </div>
              <input
                type="radio"
                name="export_fmt"
                checked={exportFormat === "print"}
                onChange={() => setExportFormat("print")}
                className="text-blue-600 accent-blue-600"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Confirm & Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
