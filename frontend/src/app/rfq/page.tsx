"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FolderGit2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowRight,
  GitCompare,
  DollarSign,
  Calendar,
  Building2,
  FileCheck2,
  Layers,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { RFQItem, RFQStatus } from "@/lib/comparison-types";
import { comparisonApi } from "@/lib/comparison-api";

function RFQDirectoryContent() {
  const searchParams = useSearchParams();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const q = searchParams?.get("search");
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await comparisonApi.getRFQs();
        setRfqs(data);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredRfqs = rfqs.filter((rfq) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (rfq.title || "").toLowerCase().includes(q) ||
      (rfq.rfq_number || "").toLowerCase().includes(q) ||
      (rfq.category || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || rfq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: RFQStatus) => {
    switch (status) {
      case "ready_for_comparison":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Ready for Comparison
          </span>
        );
      case "validating":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
            Validating Bids
          </span>
        );
      case "awaiting_quotes":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Awaiting Quotes
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active RFQ
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const totalBudget = rfqs.reduce((acc, r) => acc + r.budget, 0);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                RFQ Sourcing Workspaces
              </h1>
              <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                Phase 2
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Requests for Quotation, review incoming supplier bids, and trigger multi-vendor comparison.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/comparison"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <GitCompare className="w-4 h-4 text-blue-600" />
              <span>Active Comparison Matrix</span>
            </Link>

            <Link
              id="btn-create-rfq-primary"
              href="/rfq/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create RFQ</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Active Workspaces</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                {rfqs.length}
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Enterprise Pipeline</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sourcing categories active</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Ready for Comparison</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600 font-mono">
                {rfqs.filter((r) => r.status === "ready_for_comparison").length}
              </span>
              <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                Matrix Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Multi-quote bids validated</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Under Validation</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600 font-mono">
                {rfqs.filter((r) => r.status === "validating").length}
              </span>
              <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                Engine S2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cross-referencing quotes</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">Total Sourcing Budget</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 font-mono">
                ₹{totalBudget.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across 3 industrial categories</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, RFQ ID, category..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter("ready_for_comparison")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "ready_for_comparison"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              Ready to Compare
            </button>
            <button
              onClick={() => setStatusFilter("validating")}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === "validating"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              Validating
            </button>
          </div>
        </div>

        {/* RFQ Directory Cards List */}
        <div className="space-y-3.5">
          {filteredRfqs.map((rfq) => (
            <div
              key={rfq.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                    {rfq.rfq_number}
                  </span>
                  {getStatusBadge(rfq.status)}
                  <span className="text-xs text-slate-500 font-medium">
                    • {rfq.department}
                  </span>
                </div>

                <Link
                  href={`/rfq/${rfq.id}`}
                  className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                >
                  {rfq.title}
                </Link>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rfq.category}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target Delivery: {rfq.target_delivery_date}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold text-slate-800">
                    Budget: ₹{rfq.budget.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Right Bid Count & Actions */}
              <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="text-right px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-sm font-bold font-mono text-blue-700">
                      {rfq.quotations_count || 0}
                    </span>
                    <span className="text-[11px] text-slate-400">/</span>
                    <span className="text-xs font-bold font-mono text-slate-600">
                      {(rfq as any).invited_count || (rfq as any).invited_suppliers?.length || 3}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block -mt-0.5">Bids / Invited</span>
                </div>

                {rfq.status === "ready_for_comparison" && (
                  <Link
                    href={`/comparison/${rfq.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </Link>
                )}

                <Link
                  href={`/rfq/${rfq.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filteredRfqs.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No RFQs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "No RFQs match your current search or status filters. Try clearing the filter."
                  : "No Requests for Quotation have been created yet. Start by generating your first RFQ sourcing workspace."}
              </p>
              <div className="pt-2">
                <Link
                  href="/rfq/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create RFQ</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function RFQDirectoryPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-44 bg-white rounded-xl border border-slate-200 animate-pulse p-6" />
          </div>
        </AppLayout>
      }
    >
      <RFQDirectoryContent />
    </Suspense>
  );
}
