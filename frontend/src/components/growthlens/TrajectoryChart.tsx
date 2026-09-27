"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { Sparkles, Eye, BrainCircuit } from "lucide-react";

interface TimelinePoint {
  date: string;
  score: number;
  source?: string;
  title?: string;
  isObserved?: boolean;
}

interface TrajectoryChartProps {
  timeline: TimelinePoint[];
  survivalCurve?: Array<{ day: number; probability: number }>;
  confidence?: number;
  trend?: string;
  className?: string;
}

export default function TrajectoryChart({
  timeline,
  survivalCurve = [],
  confidence = 85,
  trend = "improving",
  className = "",
}: TrajectoryChartProps) {
  // Format data for chart
  const data = (timeline || []).map((t, idx) => ({
    date: t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `T-${idx + 1}`,
    score: Math.round(t.score),
    source: t.source || "Activity",
    title: t.title || "Evidence update",
    // Confidence envelope upper and lower bounds
    upperBand: Math.min(100, Math.round(t.score + (100 - confidence) * 0.2)),
    lowerBand: Math.max(0, Math.round(t.score - (100 - confidence) * 0.2)),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#1C1C1C] text-[#FBF1CF] shadow-[3px_3px_0px_#DFE968] text-xs">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-mono font-bold text-[10px] text-[#DFE968]">
              {d.date}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20">
              {d.source}
            </span>
          </div>
          <div className="text-sm font-black mb-1">Score: {d.score} pts</div>
          <p className="text-[10px] opacity-80 max-w-[200px] line-clamp-2">
            {d.title}
          </p>
          <div className="mt-2 pt-1 border-t border-white/20 text-[9px] font-mono opacity-60">
            Confidence Envelope: {d.lowerBand}–{d.upperBand}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      {/* Legend & Visual Distinctions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
            TEMPORAL ATTENTION LSTM
          </span>
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Competency Trajectory & Confidence Envelope
          </h3>
        </div>

        {/* Distinction badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[10px] font-black">
            <Eye className="w-3 h-3 text-[#1C1C1C]" />
            OBSERVED SIGNALS
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black">
            <BrainCircuit className="w-3 h-3 text-[#1C1C1C]" />
            MODEL INTERPRETATION
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[300px] md:h-[340px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DFE968" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#DFE968" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1C" strokeOpacity={0.1} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontWeight: 700, fill: "#1C1C1C" }}
                axisLine={{ stroke: "#1C1C1C", strokeWidth: 1.5 }}
                tickLine={false}
              />
              <YAxis
                domain={[40, 100]}
                tick={{ fontSize: 11, fontWeight: 700, fill: "#1C1C1C" }}
                axisLine={{ stroke: "#1C1C1C", strokeWidth: 1.5 }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Confidence Band Area */}
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                name="Confidence Envelope"
              />

              {/* Trajectory Main Line */}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#1C1C1C"
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: "#DFE968",
                  stroke: "#1C1C1C",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 7,
                  fill: "#F6BB84",
                  stroke: "#1C1C1C",
                  strokeWidth: 2,
                }}
                name="Capability Score"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs font-bold text-[#1C1C1C]/50 italic">
            Insufficient longitudinal observations to plot trajectory curve.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#1C1C1C]/15 flex flex-wrap items-center justify-between text-[10px] font-bold text-[#1C1C1C]/70">
        <span>Clean minimal axes with bounded uncertainty envelope</span>
        <span>Hover markers to inspect source references and commit telemetry</span>
      </div>
    </div>
  );
}
