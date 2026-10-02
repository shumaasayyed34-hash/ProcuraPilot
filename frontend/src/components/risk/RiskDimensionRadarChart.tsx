"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { RiskDimensions } from "@/lib/risk-types";

interface RiskDimensionRadarChartProps {
  dimensions: RiskDimensions;
  supplierName: string;
}

export function RiskDimensionRadarChart({
  dimensions,
  supplierName,
}: RiskDimensionRadarChartProps) {
  const chartData = [
    {
      subject: "Financial (25%)",
      Score: dimensions.financial,
      ToleranceThreshold: 50,
      fullMark: 100,
    },
    {
      subject: "Compliance (20%)",
      Score: dimensions.compliance,
      ToleranceThreshold: 40,
      fullMark: 100,
    },
    {
      subject: "Delivery (20%)",
      Score: dimensions.delivery,
      ToleranceThreshold: 40,
      fullMark: 100,
    },
    {
      subject: "Country (15%)",
      Score: dimensions.country,
      ToleranceThreshold: 50,
      fullMark: 100,
    },
    {
      subject: "ESG (10%)",
      Score: dimensions.esg,
      ToleranceThreshold: 40,
      fullMark: 100,
    },
    {
      subject: "Fraud (10%)",
      Score: dimensions.fraud,
      ToleranceThreshold: 35,
      fullMark: 100,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Multi-Dimensional Risk Vector
          </h3>
          <p className="text-[11px] text-slate-500">
            Polar radar breakdown across 6 risk dimensions vs safe enterprise tolerance
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
          Scale: 0-100
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
            />
            <Radar
              name={supplierName}
              dataKey="Score"
              stroke="#ef4444"
              fill="#f87171"
              fillOpacity={0.45}
            />
            <Radar
              name="Safe Tolerance Cap"
              dataKey="ToleranceThreshold"
              stroke="#0ea5e9"
              fill="#38bdf8"
              fillOpacity={0.15}
              strokeDasharray="3 3"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg space-y-1">
                      <p className="font-bold text-slate-200">
                        {payload[0].payload.subject}
                      </p>
                      <p className="text-rose-400 font-semibold">
                        Assessed Risk: {payload[0].value}/100
                      </p>
                      <p className="text-sky-300 text-[11px]">
                        Tolerance Cap: {payload[1]?.value}/100
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              iconType="circle"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500">
        <span className="font-medium text-rose-600">Note: </span>
        Areas where the red perimeter exceeds the dashed blue line indicate risk policy violations.
      </div>
    </div>
  );
}
