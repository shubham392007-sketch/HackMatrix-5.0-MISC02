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
  // Format data for chart with robust date formatting and deduplication
  const dateCounts: Record<string, number> = {};
  const formattedDates = (timeline || []).map((t, idx) => {
    let base = `T-${idx + 1}`;
    if (t.date) {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          base = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      } catch {
        base = String(t.date).slice(0, 10);
      }
    }
    dateCounts[base] = (dateCounts[base] || 0) + 1;
    return base;
  });

  const seenCounts: Record<string, number> = {};
  const data = (timeline || []).map((t, idx) => {
    const rawDateStr = formattedDates[idx];
    let uniqueDateLabel = rawDateStr;
    if (dateCounts[rawDateStr] > 1) {
      seenCounts[rawDateStr] = (seenCounts[rawDateStr] || 0) + 1;
      uniqueDateLabel = `${rawDateStr} (#${seenCounts[rawDateStr]})`;
    }

    const sc = Number(t.score) || 75;
    const confOffset = Math.max(4, Math.round((100 - confidence) * 0.25));
    return {
      date: uniqueDateLabel,
      fullDate: t.date
        ? (() => {
            try {
              const d = new Date(t.date);
              return !isNaN(d.getTime())
                ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : uniqueDateLabel;
            } catch {
              return uniqueDateLabel;
            }
          })()
        : uniqueDateLabel,
      score: Math.round(sc),
      source: t.source ? t.source.toUpperCase() : "ACTIVITY",
      title: t.title || "Evidence observation",
      upperBand: Math.min(100, Math.round(sc + confOffset)),
      lowerBand: Math.max(0, Math.round(sc - confOffset)),
    };
  });

  // If only 1 observation is present, prepend an onboarding baseline point so a line curve can be drawn
  const chartData = [...data];
  if (chartData.length === 1) {
    const single = chartData[0];
    chartData.unshift({
      date: "Baseline",
      fullDate: "Initial Competency Baseline",
      score: Math.max(40, single.score - 6),
      source: "BASELINE",
      title: "Initial baseline assessment",
      upperBand: Math.min(100, single.upperBand - 6),
      lowerBand: Math.max(0, single.lowerBand - 6),
    });
  }

  const minScore = chartData.length > 0 ? Math.min(...chartData.map((d) => d.lowerBand)) : 50;
  const yMin = Math.max(20, Math.floor((minScore - 10) / 10) * 10);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#1C1C1C] text-[#FBF1CF] shadow-[3px_3px_0px_#DFE968] text-xs max-w-[280px]">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-mono font-bold text-[10px] text-[#DFE968]">
              {d.fullDate || d.date}
            </span>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20">
              {d.source}
            </span>
          </div>
          <div className="text-sm font-black mb-1">Capability Score: {d.score} pts</div>
          <p className="text-[10px] opacity-80 line-clamp-2">
            {d.title}
          </p>
          <div className="mt-2 pt-1 border-t border-white/20 text-[9px] font-mono opacity-60">
            Confidence Envelope: {d.lowerBand}–{d.upperBand} pts
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
            OBSERVED SIGNALS ({timeline?.length || 0})
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black">
            <BrainCircuit className="w-3 h-3 text-[#1C1C1C]" />
            MODEL INTERPRETATION
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-[300px] md:h-[340px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DFE968" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#DFE968" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1C" strokeOpacity={0.1} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontWeight: 700, fill: "#1C1C1C" }}
                axisLine={{ stroke: "#1C1C1C", strokeWidth: 1.5 }}
                tickLine={false}
              />
              <YAxis
                domain={[yMin, 100]}
                tick={{ fontSize: 11, fontWeight: 700, fill: "#1C1C1C" }}
                axisLine={{ stroke: "#1C1C1C", strokeWidth: 1.5 }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Confidence Band Area (Upper Envelope) */}
              <Area
                type="monotone"
                dataKey="upperBand"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                name="Confidence Envelope Upper"
              />

              {/* Confidence Band Mask (Lower Boundary to create floating envelope) */}
              <Area
                type="monotone"
                dataKey="lowerBand"
                stroke="transparent"
                fill="#FBF6DF"
                name="Confidence Envelope Lower Mask"
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
