"use client";

import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Newspaper,
  History,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText,
  BadgeAlert,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  StructuredRiskNarrativeUI,
  NewsSentimentDetailUI,
  HistoricalRiskEventUI,
  RiskCategory,
} from "@/lib/risk-types";
import { cn } from "@/lib/utils";

interface RiskNarrativeViewerProps {
  narrative: StructuredRiskNarrativeUI;
  newsSentiment?: NewsSentimentDetailUI;
  historicalEvents?: HistoricalRiskEventUI[];
  riskCategory: RiskCategory;
  compositeScore: number;
  supplierName: string;
}

export function RiskNarrativeViewer({
  narrative,
  newsSentiment,
  historicalEvents = [],
  riskCategory,
  compositeScore,
  supplierName,
}: RiskNarrativeViewerProps) {
  const [activeTab, setActiveTab] = useState<"narrative" | "news" | "history" | "mitigation">("narrative");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    drivers: true,
    strengths: true,
    mitigation: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const isCritical = riskCategory === "critical";
  const isHigh = riskCategory === "high";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Autonomous Risk Intelligence Narrative
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Model: Gemini 1.5 Pro / GPT-4o Agent
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              AI Risk Dossier &amp; Evaluation Briefing
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Comprehensive telemetry synthesis generated for {supplierName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium">Composite Risk Score</p>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-2xl font-black text-white">{compositeScore.toFixed(1)}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
            </div>
            <span
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm",
                riskCategory === "critical"
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : riskCategory === "high"
                  ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                  : riskCategory === "medium"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              )}
            >
              {riskCategory} Risk
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("narrative")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "narrative"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Executive Narrative
          </button>
          <button
            onClick={() => setActiveTab("mitigation")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "mitigation"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Mitigation Protocol ({narrative.actionable_mitigation_plan?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "news"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <Newspaper className="w-3.5 h-3.5" />
            News Sentiment ({newsSentiment?.article_count ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <History className="w-3.5 h-3.5" />
            Vector Memory Incidents ({historicalEvents.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* TAB 1: EXECUTIVE NARRATIVE */}
        {activeTab === "narrative" && (
          <div className="space-y-6">
            {/* Executive Summary Card */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Autonomous Executive Synthesis
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-800">
                {narrative.executive_summary}
              </p>
              {narrative.risk_category_justification && (
                <div className="mt-3 pt-3 border-t border-indigo-100/80 text-xs text-indigo-950 flex items-start gap-2">
                  <span className="font-bold shrink-0">Classification Rationale:</span>
                  <span>{narrative.risk_category_justification}</span>
                </div>
              )}
            </div>

            {/* Primary Risk Drivers */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("drivers")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Primary Risk Drivers ({narrative.primary_risk_drivers?.length || 0})
                  </h4>
                </div>
                {expandedSections.drivers ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {expandedSections.drivers && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {narrative.primary_risk_drivers?.map((driver, idx) => {
                    const isSevere = driver.severity === "CRITICAL" || driver.severity === "HIGH";
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3.5 rounded-lg border transition-all",
                          isSevere
                            ? "bg-red-50/50 border-red-200"
                            : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-900">
                            {driver.dimension} Risk
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                driver.severity === "CRITICAL"
                                  ? "bg-red-100 text-red-800"
                                  : driver.severity === "HIGH"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-amber-100 text-amber-800"
                              )}
                            >
                              {driver.severity}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {driver.score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mb-1.5">
                          {driver.rationale}
                        </p>
                        {driver.evidence && (
                          <div className="bg-white/90 p-2 rounded border border-slate-200 text-[11px] text-slate-600 flex items-start gap-1.5">
                            <span className="font-semibold text-slate-800 shrink-0">Telemetry:</span>
                            <span className="font-mono">{driver.evidence}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mitigating Strengths */}
            <div className="space-y-3">
              <button
                onClick={() => toggleSection("strengths")}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Mitigating Counterbalances ({narrative.mitigating_strengths?.length || 0})
                  </h4>
                </div>
                {expandedSections.strengths ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {expandedSections.strengths && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {narrative.mitigating_strengths?.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-200 flex items-start gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-emerald-900">
                          {str.dimension} Strength
                        </span>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          {str.strength_description}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!narrative.mitigating_strengths || narrative.mitigating_strengths.length === 0) && (
                    <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                      No significant mitigating strengths identified in current filing records.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MITIGATION PROTOCOL */}
        {activeTab === "mitigation" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Prescriptive Action Items &amp; Governance Guardrails
                </h4>
                <p className="text-xs text-slate-500">
                  Automated risk mitigations tailored to procurement workflow
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                {narrative.actionable_mitigation_plan?.length || 0} Mandates
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3 w-28">Priority</th>
                    <th className="py-2.5 px-3">Mandated Action</th>
                    <th className="py-2.5 px-3">Justification &amp; Policy Basis</th>
                    <th className="py-2.5 px-3 w-36">Owner Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {narrative.actionable_mitigation_plan?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 align-top">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            item.priority === "URGENT"
                              ? "bg-red-100 text-red-800"
                              : item.priority === "HIGH"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top font-semibold text-slate-900">
                        {item.action}
                      </td>
                      <td className="py-3 px-3 align-top text-slate-600">
                        {item.justification}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {item.target_role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: NEWS SENTIMENT (P4.1) */}
        {activeTab === "news" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Newspaper className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    External Media &amp; Web Sentiment Telemetry
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Continuous newsfeed surveillance analyzing financial stability and legal exposure
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase">Sentiment Polarity</p>
                  <p className="text-xs font-mono font-bold text-slate-900">
                    {newsSentiment ? (newsSentiment.sentiment_score > 0 ? `+${newsSentiment.sentiment_score.toFixed(2)}` : newsSentiment.sentiment_score.toFixed(2)) : "0.00"}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold uppercase",
                    newsSentiment?.sentiment_label === "positive"
                      ? "bg-emerald-100 text-emerald-800"
                      : newsSentiment?.sentiment_label === "negative"
                      ? "bg-red-100 text-red-800"
                      : "bg-slate-200 text-slate-800"
                  )}
                >
                  {newsSentiment?.sentiment_label || "Neutral"}
                </span>
              </div>
            </div>

            {/* Risk Signals Chips */}
            {newsSentiment?.risk_signals && newsSentiment.risk_signals.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Detected Risk Signals:</p>
                <div className="flex flex-wrap gap-2">
                  {newsSentiment.risk_signals.map((sig, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      #{sig}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Media Synopsis */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
              <span className="text-xs font-bold text-slate-800">Media Synopsis:</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {narrative.news_market_synopsis || newsSentiment?.summary || "No active press alerts detected."}
              </p>
            </div>

            {/* Headline Snippets */}
            {newsSentiment?.key_snippets && newsSentiment.key_snippets.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800">Key Press Snippets:</span>
                <div className="space-y-1.5">
                  {newsSentiment.key_snippets.map((snip, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                    >
                      <span className="text-slate-400 font-mono text-[10px] mt-0.5">[{idx + 1}]</span>
                      <p>{snip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HISTORICAL VECTOR MEMORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <History className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Enterprise Vector Store Historical Incidents
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                {narrative.historical_risk_summary ||
                  "Matches indexed from enterprise shared agent vector memory (FAISS)."}
              </p>
            </div>

            {historicalEvents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Zero Historical Incident Records</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No previous fulfillment defaults, legal disputes, or quality recalls recorded for this supplier.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historicalEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-red-200 bg-red-50/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">
                          {evt.event_type}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {evt.similarity_score && (
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            Similarity: {(evt.similarity_score * 100).toFixed(0)}%
                          </span>
                        )}
                        {evt.timestamp && (
                          <span>{new Date(evt.timestamp).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700">{evt.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
