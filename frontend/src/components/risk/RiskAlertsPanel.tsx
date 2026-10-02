"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ExternalLink,
  Filter,
  Check,
  RotateCcw,
  Search,
  BellRing,
} from "lucide-react";
import { RiskAlertItem, RiskSeverity } from "@/lib/risk-types";
import { cn } from "@/lib/utils";

interface RiskAlertsPanelProps {
  alerts: RiskAlertItem[];
  onAcknowledge?: (alertId: string) => void;
  className?: string;
}

export function RiskAlertsPanel({
  alerts: initialAlerts,
  onAcknowledge,
  className,
}: RiskAlertsPanelProps) {
  const [alerts, setAlerts] = useState<RiskAlertItem[]>(initialAlerts);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync state if initialAlerts changes
  React.useEffect(() => {
    setAlerts(initialAlerts);
  }, [initialAlerts]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    if (onAcknowledge) {
      onAcknowledge(id);
    }
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity =
      severityFilter === "ALL" || alert.severity === severityFilter;
    const matchesSearch =
      alert.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.primary_risk_reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <BellRing className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Risk Alerts</h3>
              {unacknowledgedCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                  {unacknowledgedCount} Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  All Clear
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Live threshold breaches and supplier anomalies
            </p>
          </div>
        </div>

        {unacknowledgedCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
            title="Mark all alerts as acknowledged"
          >
            <Check className="w-3.5 h-3.5" />
            Dismiss All
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-slate-100 bg-white space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter alerts by supplier or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map((sev) => {
            const count =
              sev === "ALL"
                ? alerts.length
                : alerts.filter((a) => a.severity === sev).length;

            return (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-all shrink-0 flex items-center gap-1",
                  severityFilter === sev
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{sev}</span>
                <span
                  className={cn(
                    "text-[10px] px-1 rounded-full",
                    severityFilter === sev
                      ? "bg-slate-700 text-slate-200"
                      : "bg-slate-200 text-slate-700"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px]">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">No Risk Alerts Matching Filter</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              All suppliers are operating within configured risk thresholds.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === "CRITICAL";
            const isHigh = alert.severity === "HIGH";

            return (
              <div
                key={alert.id}
                className={cn(
                  "p-3.5 transition-colors flex items-start gap-3",
                  alert.acknowledged
                    ? "bg-slate-50/50 opacity-60"
                    : isCritical
                    ? "bg-red-50/40 hover:bg-red-50/70"
                    : isHigh
                    ? "bg-orange-50/30 hover:bg-orange-50/60"
                    : "bg-white hover:bg-slate-50"
                )}
              >
                {/* Severity Icon */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5",
                    isCritical
                      ? "bg-red-100 text-red-600"
                      : isHigh
                      ? "bg-orange-100 text-orange-600"
                      : "bg-amber-100 text-amber-600"
                  )}
                >
                  {isCritical ? (
                    <Flame className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>

                {/* Alert Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Link
                      href={`/risk/${alert.supplier_id}`}
                      className="text-xs font-bold text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{alert.supplier_name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                          isCritical
                            ? "bg-red-100 text-red-800"
                            : isHigh
                            ? "bg-orange-100 text-orange-800"
                            : "bg-amber-100 text-amber-800"
                        )}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {alert.composite_risk_score.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-snug line-clamp-2 mb-1.5">
                    {alert.primary_risk_reason}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recent"}
                    </span>

                    {alert.acknowledged ? (
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Acknowledged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
