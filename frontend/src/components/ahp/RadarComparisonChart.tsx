"use client";

import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import { AHPRankedSupplier } from "@/lib/ahp-types";

interface RadarComparisonChartProps {
  rankings: AHPRankedSupplier[];
}

export function RadarComparisonChart({ rankings }: RadarComparisonChartProps) {
  // Take top 3 suppliers for clear legibility
  const topSuppliers = rankings.slice(0, 3);

  // Criteria categories for the radar axes
  const categories = [
    { key: "price", label: "Cost Efficiency" },
    { key: "quality", label: "Quality & Specs" },
    { key: "delivery", label: "Lead Time Speed" },
    { key: "esg", label: "ESG Compliance" },
  ];

  // Colors for top 3 suppliers: Blue (Rank 1), Emerald (Rank 2), Amber (Rank 3)
  const colors = [
    { stroke: "#2563EB", fill: "#2563EB", name: "Rank #1" },
    { stroke: "#10B981", fill: "#10B981", name: "Rank #2" },
    { stroke: "#F59E0B", fill: "#F59E0B", name: "Rank #3" },
  ];

  // Reformat for Recharts Radar
  const radarData = categories.map((cat) => {
    const entry: Record<string, any> = {
      subject: cat.label,
      fullMark: 100,
    };

    topSuppliers.forEach((sup, idx) => {
      const normalizedScore =
        (sup.normalized_scores as any)[cat.key] || 0;
      entry[sup.supplier_name] = Math.round(normalizedScore * 100);
    });

    return entry;
  });

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-md text-xs space-y-1.5 font-sans">
          <p className="font-bold text-slate-800 border-b border-slate-100 pb-1">
            {payload[0]?.payload?.subject}
          </p>
          {payload.map((entry: any) => (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-3 text-[11px]"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.stroke }}
                />
                <span className="text-slate-600 truncate max-w-[140px]">
                  {entry.dataKey}:
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                {entry.value}%
              </span>
            </div>
          ))}
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
            Top-3 Multi-Dimensional Tradeoff Radar
          </h4>
          <p className="text-xs text-slate-500">
            Normalized utility comparison across all 4 criteria dimensions simultaneously
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
          Scale: 0–100%
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#E2E8F0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#94A3B8" }}
              tickCount={5}
            />
            <Tooltip content={<CustomRadarTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="circle"
              iconSize={8}
            />

            {topSuppliers.map((sup, idx) => {
              const color = colors[idx] || colors[0];
              return (
                <Radar
                  key={sup.supplier_id}
                  name={`${sup.supplier_name.split(" ")[0]} (#${sup.rank})`}
                  dataKey={sup.supplier_name}
                  stroke={color.stroke}
                  fill={color.fill}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
