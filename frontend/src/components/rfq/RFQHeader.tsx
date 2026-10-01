"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  Tag,
  Building2,
  Clock,
  ArrowLeft,
  FileCheck2,
  RefreshCw,
  UploadCloud,
  GitCompare,
  CheckCircle2,
  AlertCircle,
  Sliders,
} from "lucide-react";
import { RFQItem, RFQStatus } from "@/lib/comparison-types";

interface RFQHeaderProps {
  rfq: RFQItem;
  onUploadClick: () => void;
  onRerunValidation: () => void;
  onCompareClick: () => void;
  isValidating?: boolean;
  selectedQuotesCount: number;
}

export function RFQHeader({
  rfq,
  onUploadClick,
  onRerunValidation,
  onCompareClick,
  isValidating = false,
  selectedQuotesCount,
}: RFQHeaderProps) {
  const getStatusBadge = (status: RFQStatus) => {
    switch (status) {
      case "ready_for_comparison":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Ready for Comparison
          </span>
        );
      case "validating":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            Validating Bids
          </span>
        );
      case "awaiting_quotes":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Awaiting Quotes
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Top Navigation & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All RFQs</span>
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
            {rfq.rfq_number}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(rfq.status)}
        </div>
      </div>

      {/* Main Title and Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {rfq.title}
          </h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{rfq.department}</span>
            <span>•</span>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>{rfq.category}</span>
          </p>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Re-run Validation Button */}
          <button
            onClick={onRerunValidation}
            disabled={isValidating}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isValidating ? "animate-spin" : ""}`} />
            <span>{isValidating ? "Validating..." : "Re-run Validation"}</span>
          </button>

          {/* Upload Additional Quotation Button */}
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Quotation</span>
          </button>

          {/* Compare Selected Suppliers Button */}
          <button
            onClick={onCompareClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
            <span>Compare Suppliers ({selectedQuotesCount})</span>
          </button>

          {/* AHP Scoring Engine Button */}
          <Link
            href={`/ahp/configure?rfqId=${rfq.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>AHP Scoring Engine (Phase 3)</span>
          </Link>
        </div>
      </div>

      {/* Metadata Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Allocated Budget</span>
          <p className="text-sm font-bold text-slate-900 font-mono">
            ₹{rfq.budget.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Target Delivery Date</span>
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{rfq.target_delivery_date}</span>
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Procurement Officer</span>
          <p className="text-sm font-semibold text-slate-800">
            {rfq.buyer_name}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] font-medium text-slate-500">Quotation Submissions</span>
          <p className="text-sm font-bold text-blue-700">
            {rfq.quotations_count} Bids Received
          </p>
        </div>
      </div>
    </div>
  );
}
