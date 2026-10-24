"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface DonutSegment {
  key: string;
  label: string;
  count: number;
  color: string;
  hoverColor: string;
  textColor: string;
  bgColor: string;
  description: string;
}

interface EvidenceHealthDonutProps {
  sufficientCount: number;
  incompleteCount: number;
  insufficientCount: number;
  conflictingCount: number;
  activeFilter: string;
  onSelectFilter: (filterKey: string) => void;
}

export default function EvidenceHealthDonut({
  sufficientCount,
  incompleteCount,
  insufficientCount,
  conflictingCount,
  activeFilter,
  onSelectFilter,
}: EvidenceHealthDonutProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const total = sufficientCount + incompleteCount + insufficientCount + conflictingCount;

  // Harmonious theme palette complimenting #1A1918, #FBF1CF, #DFE968, #D4E09B, #CBDFBD
  const segments: DonutSegment[] = [
    {
      key: "sufficient",
      label: "Sufficient",
      count: sufficientCount,
      color: "#4A7A4E", // Forest Sage Green
      hoverColor: "#39633D",
      textColor: "text-[#4A7A4E]",
      bgColor: "bg-[#4A7A4E]/10",
      description: "Meets full workplace evidence corroboration thresholds",
    },
    {
      key: "incomplete",
      label: "Incomplete",
      count: incompleteCount,
      color: "#C4A446", // Warm Ochre / Honey Amber
      hoverColor: "#A38531",
      textColor: "text-[#9E822B]",
      bgColor: "bg-[#C4A446]/10",
      description: "Partially supported; requires additional commit or PR citations",
    },
    {
      key: "insufficient",
      label: "Insufficient",
      count: insufficientCount,
      color: "#C25450", // Muted Terracotta Crimson
      hoverColor: "#A0403C",
      textColor: "text-[#C25450]",
      bgColor: "bg-[#C25450]/10",
      description: "Low or unverified evidence claims needing workplace proof",
    },
    {
      key: "conflicting",
      label: "Conflicting",
      count: conflictingCount,
      color: "#5C6B73", // Slate Graphite Steel
      hoverColor: "#475359",
      textColor: "text-[#5C6B73]",
      bgColor: "bg-[#5C6B73]/10",
      description: "Contradictory timeline or contribution claims flagged for review",
    },
  ];

  // SVG Geometry
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets
  let accumulatedPercent = 0;
  const renderedSegments = segments.map((seg) => {
    const percent = total > 0 ? seg.count / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...seg,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = segments.find((s) => s.key === (hoveredKey || activeFilter)) || null;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white border border-[#1A1918]/15 shadow-[2.5px_2.5px_0_0_#1A1918]">
      {/* SVG Donut Visual */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Base Empty Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#EAE6DD"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {total > 0 &&
            renderedSegments.map((seg) => {
              if (seg.count === 0) return null;
              const isHovered = hoveredKey === seg.key;
              const isFiltered = activeFilter === seg.key;

              return (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={isHovered ? seg.hoverColor : seg.color}
                  strokeWidth={isHovered || isFiltered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => onSelectFilter(activeFilter === seg.key ? "all" : seg.key)}
                />
              );
            })}
        </svg>

        {/* Donut Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          {activeSegment ? (
            <>
              <span className={`text-2xl font-black ${activeSegment.textColor}`}>
                {activeSegment.count}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/70">
                {activeSegment.label}
              </span>
              <span className="text-[9px] font-mono text-[#1A1918]/50">
                {total > 0 ? Math.round((activeSegment.count / total) * 100) : 0}%
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-black text-[#1A1918]">{total}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/60">
                Total Skills
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Segment Cards & Legend */}
      <div className="flex-1 w-full space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {segments.map((seg) => {
            const isSelected = activeFilter === seg.key;
            const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;

            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSelectFilter(isSelected ? "all" : seg.key)}
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "ring-2 ring-[#1A1918] bg-[#FAF8F5] border-[#1A1918] shadow-sm -translate-y-0.5"
                    : "bg-white border-[#1A1918]/15 hover:border-[#1A1918]/50 hover:bg-[#FAF8F5]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[10px] font-mono font-bold text-[#1A1918]/50">
                    {pct}%
                  </span>
                </div>
                <div className={`text-xl font-black ${seg.textColor}`}>{seg.count}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/70 truncate">
                  {seg.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Context Banner */}
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#1A1918]/80">
            <span className="font-bold text-[#1A1918]">Active Slice:</span>
            <span>
              {activeSegment
                ? activeSegment.description
                : "Hover a donut segment or click a card above to inspect evidence health details."}
            </span>
          </div>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => onSelectFilter("all")}
              className="text-[10px] font-bold uppercase text-[#C25450] hover:underline shrink-0"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
