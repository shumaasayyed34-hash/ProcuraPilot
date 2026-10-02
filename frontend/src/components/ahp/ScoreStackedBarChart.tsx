"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AHPRankedSupplier } from "@/lib/ahp-types";

interface ScoreStackedBarChartProps {
  rankings: AHPRankedSupplier[];
}

export function ScoreStackedBarChart({ rankings }: ScoreStackedBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format data for Recharts stacked bar with safe fallbacks
  const chartData = (rankings || []).map((s) => ({
    name: (s.supplier_name || "Supplier").split(" ")[0] + ` (#${s.rank ?? "-"})`,
    fullName: s.supplier_name || "Unknown Supplier",
    rank: s.rank ?? 0,
    // Store contributions as percentage points safely
    "Cost / Price": Number(((s.criteria_contributions?.price ?? 0) * 100).toFixed(1)),
    "Quality & Specs": Number(((s.criteria_contributions?.quality ?? 0) * 100).toFixed(1)),
    "Lead Time": Number(((s.criteria_contributions?.delivery ?? 0) * 100).toFixed(1)),
    "ESG / Compliance": Number(((s.criteria_contributions?.esg ?? 0) * 100).toFixed(1)),
    totalScore: Number(((s.ahp_score ?? 0) * 100).toFixed(1)),
  }));

  if (!mounted) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-96 animate-pulse">
        <div className="h-6 bg-slate-100 rounded w-1/3 mb-2" />
        <div className="h-4 bg-slate-50 rounded w-1/2 mb-6" />
        <div className="flex-1 bg-slate-50 rounded" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2 font-sans">
          <div className="border-b border-slate-100 pb-1.5">
            <p className="font-bold text-slate-900">{dataItem.fullName}</p>
            <p className="text-[11px] text-blue-600 font-mono font-semibold">
              Rank #{dataItem.rank} • Composite Utility: {dataItem.totalScore}%
            </p>
          </div>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-4 text-[11px]"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            AHP Utility Score Decomposition
          </h4>
          <p className="text-xs text-slate-500">
            Stacked breakdown of composite scores by weighted criteria contribution
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
          Max: 100%
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#64748B" }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="Cost / Price"
              stackId="a"
              fill="#2563EB" // Blue
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Quality & Specs"
              stackId="a"
              fill="#10B981" // Emerald
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Lead Time"
              stackId="a"
              fill="#0EA5E9" // Sky
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="ESG / Compliance"
              stackId="a"
              fill="#F59E0B" // Amber
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
