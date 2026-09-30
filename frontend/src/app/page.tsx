"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  FileText,
  UploadCloud,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Database,
  Sliders,
  DollarSign,
  FolderGit2,
  GitCompare,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [docCount, setDocCount] = useState(4);
  const [totalValue, setTotalValue] = useState(9473150);

  const phases = [
    { num: 1, title: "Document Ingestion & OCR", status: "Completed", role: "Iqra (OCR) + Paramita (LLM) + Shumaaila (DB) + Faisal (UI)", active: false, done: true },
    { num: 2, title: "Validation Engine & Comparison", status: "Active (Current Phase)", role: "Faisal (UI & Tables) + Paramita (Engine) + Shumaaila (Validation S2.4)", active: true, done: false },
    { num: 3, title: "AHP Scoring Engine", status: "Upcoming", role: "Pairwise Multi-Criteria Matrix & Consistency Ratio", active: false, done: false },
    { num: 4, title: "Risk Intelligence", status: "Upcoming", role: "6-Dimension Supplier Financial & Geopolitical Risk", active: false, done: false },
    { num: 5, title: "Market Intelligence & Explainability", status: "Upcoming", role: "Price Benchmarking & Explainable Sourcing Rationales", active: false, done: false },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner - Enterprise Corporate Blue Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-7 shadow-sm border border-blue-950/20">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-white text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Semester 7 • Phase 2 Execution Active</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                Welcome, {user?.full_name || "Faisal Sakware"}
              </h1>
              <p className="text-xs text-blue-100 leading-relaxed">
                Validation Engine S2.4 and Multi-Vendor Supplier Comparison Matrix (Paramita P2.4) are operational. Normalize multi-currency vendor quotes, rectify compliance discrepancies inline, and evaluate weighted procurement rankings.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/comparison/101"
                className="px-4 py-2.5 rounded-lg bg-white text-blue-900 hover:bg-blue-50 font-semibold text-xs shadow-sm flex items-center gap-2 transition-all"
              >
                <GitCompare className="w-4 h-4 text-blue-700" />
                <span>Launch Comparison Matrix</span>
              </Link>
              <Link
                href="/rfq/101"
                className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white border border-blue-500 font-semibold text-xs flex items-center gap-2 transition-all"
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Manage Active RFQ</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Crisp Enterprise Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Active RFQ Pipelines</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <FolderGit2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">3</span>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                Sourcing Open
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Industrial Machinery, Sensors, Polymers</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Total Pipeline Value</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                ₹{totalValue.toLocaleString("en-IN")}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Multi-currency bids normalized via FX</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Validation Data Hygiene</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600">94.5%</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Engine S2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tax bracket & duplicate detection</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Supplier Quotes Ingested</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{docCount}</span>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                4 Vendors
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">India, Germany, US suppliers</p>
          </div>
        </div>

        {/* Phase 2 Spotlight & Quick Action Workspaces */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Card 1: RFQ Workspace */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                RFQ Workspace Management
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review active RFQ-2025-0841, inspect incoming vendor quotation bids, verify delivery milestones, and coordinate procurement approvals.
              </p>
            </div>
            <Link
              href="/rfq/101"
              className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-800 hover:text-blue-700 font-semibold text-xs transition-colors"
            >
              <span>Open RFQ-2025-0841</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Validation Engine */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Validation Engine & Hygiene
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Identify mandatory field misses, rectify 32% GST rate discrepancy inline, acknowledge non-blocking Incoterms warnings, and filter duplicate quotes.
              </p>
            </div>
            <Link
              href="/rfq/101"
              className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-800 hover:text-emerald-700 font-semibold text-xs transition-colors"
            >
              <span>Inspect Validation Report</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Multi-Criteria Comparison */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <GitCompare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Supplier Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Side-by-side sticky column comparison matrix with min-max badges, dynamic MCDM weight adjustment sliders, and multi-currency FX triangulation.
              </p>
            </div>
            <Link
              href="/comparison/101"
              className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <span>Launch Comparison Matrix</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Semester 7 Roadmap Progress Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ProcuraPilot Semester 7 Pipeline Roadmap
              </h2>
              <p className="text-xs text-slate-500">
                Progress tracker across all 5 engineering milestones for the AI decision platform.
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 w-fit font-semibold">
              Current Milestone: Phase 2
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {phases.map((p) => (
              <div
                key={p.num}
                className={`p-4 rounded-xl border transition-all ${
                  p.active
                    ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20 shadow-xs"
                    : p.done
                    ? "bg-emerald-50/30 border-emerald-200"
                    : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      p.active
                        ? "bg-blue-600 text-white"
                        : p.done
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    Phase {p.num}
                  </span>
                  {p.active && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                    </span>
                  )}
                  {p.done && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-xs">{p.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{p.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
