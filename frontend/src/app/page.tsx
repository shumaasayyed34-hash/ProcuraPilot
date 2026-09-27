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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UploadedDocument } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [docCount, setDocCount] = useState(2);
  const [totalValue, setTotalValue] = useState(61350);

  useEffect(() => {
    const saved = localStorage.getItem("procurapilot_docs");
    if (saved) {
      try {
        const docs: UploadedDocument[] = JSON.parse(saved);
        setDocCount(docs.length);
        const sum = docs.reduce(
          (acc, d) => acc + (d.extracted_data?.total_amount || 0),
          0
        );
        if (sum > 0) setTotalValue(sum);
      } catch (e) {}
    }
  }, []);

  const phases = [
    { num: 1, title: "Document Ingestion", status: "Active (Current)", role: "Faisal (UI) + Iqra (OCR) + Paramita (LLM) + Shumaaila (DB)", active: true },
    { num: 2, title: "Validation & Comparison", status: "Upcoming", role: "Comparison Matrix & Vector DB", active: false },
    { num: 3, title: "AHP Scoring Engine", status: "Upcoming", role: "Eigenvector Pairwise Weights", active: false },
    { num: 4, title: "Risk Intelligence", status: "Upcoming", role: "6 Dimensions Scoring & Alerts", active: false },
    { num: 5, title: "Market Intelligence", status: "Upcoming", role: "Price Benchmarking & Explainable AI", active: false },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-purple-950/60 border border-indigo-800/40 p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Semester 7 • Phase 1 Execution</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user?.full_name || "Faisal Sakware"}
              </h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                ProcuraPilot AI platform architecture is live. Document ingestion, OCR extraction pipelines, and PostgreSQL user authentication are initialized for quotation analysis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/upload"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Ingest Quotation PDF</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Ingested Quotations</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{docCount}</span>
              <span className="text-xs text-emerald-400 font-semibold">+100% Phase 1</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Multi-format bids processed</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Total Extracted Value</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-mono">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Structured pricing proposals</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">OCR & Schema Match</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">97.8%</span>
              <span className="text-xs text-emerald-400 font-medium">High Precision</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">PaddleOCR + Tesseract hybrid</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Database Schema</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">16 Tables</span>
              <span className="text-xs text-blue-400 font-mono">PostgreSQL</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Ready for RFQ & PO models</p>
          </div>
        </div>

        {/* Semester 7 Roadmap Progress Section */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-200">Semester 7 Milestone Roadmap</h2>
              <p className="text-xs text-slate-400">
                End-to-End Pipeline: Document Upload → OCR/LLM Extraction → Validation → AHP Scoring → Risk & Final Recommendation
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 w-fit">
              Checkpoint: Phase 1 to 5
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {phases.map((p) => (
              <div
                key={p.num}
                className={`p-4 rounded-xl border transition-all ${
                  p.active
                    ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/50"
                    : "bg-slate-950/40 border-slate-800/80 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      p.active
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Phase {p.num}
                  </span>
                  {p.active && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-200 text-xs">{p.title}</h3>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Team Responsibilities Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Ingestion Callout */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/90 p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Test Document Ingestion UI</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Experience the drag-and-drop file upload zone, simulated OCR (Tesseract / PaddleOCR), and structured JSON schema inspection built in Phase 1.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/upload"
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span>Launch Document Ingestion</span>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </Link>
            </div>
          </div>

          {/* Team Roles Breakdown */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Phase 1 Team Roles & Alignment
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between">
                <div>
                  <span className="font-bold text-indigo-300">Faisal Sakware (You):</span>
                  <p className="text-[11px] text-slate-400">Next.js 16 + Tailwind UI, JWT Auth, Upload UI, Navigation</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Complete</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">Shumaaila Naaz Sayyad:</span>
                  <p className="text-[11px] text-slate-400">Core FastAPI backend, 16 DB tables, PostgreSQL + MongoDB</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Backend</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">Iqra Kotawdekar:</span>
                  <p className="text-[11px] text-slate-400">Document Upload Module, Tesseract & PaddleOCR integration</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">OCR Engine</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">Paramita Roy:</span>
                  <p className="text-[11px] text-slate-400">LLM Data Extraction Engine, Standard schema mapping</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">LLM Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
