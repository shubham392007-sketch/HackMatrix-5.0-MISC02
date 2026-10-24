"use client";

import React, { useState } from "react";

interface RadialReadinessDialProps {
  readinessIndex: number;
  readinessTier: string;
  requiredCoveragePct: number;
  proficiencyAlignmentPct: number;
  evidenceQualityPct: number;
}

export default function RadialReadinessDial({
  readinessIndex,
  readinessTier,
  requiredCoveragePct,
  proficiencyAlignmentPct,
  evidenceQualityPct,
}: RadialReadinessDialProps) {
  const [hoveredArc, setHoveredArc] = useState<string | null>(null);

  const size = 190;
  const center = size / 2;

  // Arc configs with user-specified hex codes:
  // #D4E09B (Outer: Overall Readiness)
  // #CBDFBD (Middle: Core Required Coverage)
  // #F6F4D2 (Inner: Proficiency Alignment)
  const arcs = [
    {
      key: "readiness",
      label: "Overall Readiness",
      pct: readinessIndex,
      radius: 74,
      strokeWidth: 10,
      color: "#D4E09B",
      trackColor: "rgba(212, 224, 155, 0.22)",
    },
    {
      key: "required",
      label: "Core Coverage",
      pct: requiredCoveragePct,
      radius: 58,
      strokeWidth: 9,
      color: "#CBDFBD",
      trackColor: "rgba(203, 223, 189, 0.22)",
    },
    {
      key: "proficiency",
      label: "Proficiency Alignment",
      pct: proficiencyAlignmentPct,
      radius: 43,
      strokeWidth: 8,
      color: "#F6F4D2",
      trackColor: "rgba(246, 244, 210, 0.22)",
    },
  ];

  const activeArc = arcs.find((a) => a.key === hoveredArc) || null;

  return (
    <div className="shrink-0 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#1A1918] border border-[#1A1918] shadow-[3px_3px_0_0_rgba(26,25,24,0.3)]">
      {/* SVG Radial Graph */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 overflow-visible"
        >
          {arcs.map((arc) => {
            const circ = 2 * Math.PI * arc.radius;
            const strokeDashoffset = circ - (circ * Math.min(100, Math.max(0, arc.pct))) / 100;
            const isHovered = hoveredArc === arc.key;

            return (
              <g
                key={arc.key}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredArc(arc.key)}
                onMouseLeave={() => setHoveredArc(null)}
              >
                {/* Background Track Ring */}
                <circle
                  cx={center}
                  cy={center}
                  r={arc.radius}
                  fill="none"
                  stroke={arc.trackColor}
                  strokeWidth={arc.strokeWidth}
                />
                {/* Active Progress Arc */}
                <circle
                  cx={center}
                  cy={center}
                  r={arc.radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isHovered ? arc.strokeWidth + 2.5 : arc.strokeWidth}
                  strokeDasharray={circ}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </g>
            );
          })}
        </svg>

        {/* High-Readability Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {activeArc ? (
            <>
              <span
                className="text-2xl font-black tracking-tight transition-all drop-shadow-sm"
                style={{ color: activeArc.color }}
              >
                {activeArc.pct}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAF8F5]/80 truncate max-w-[95px] mt-0.5">
                {activeArc.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#FAF8F5]/50 font-bold">
                READINESS
              </span>
              <span className="text-3xl font-black text-[#FAF8F5] leading-none my-1 tracking-tight">
                {readinessIndex}%
              </span>
              <span className="text-[9.5px] font-mono font-bold text-[#D4E09B] uppercase tracking-wider truncate max-w-[90px]">
                {readinessTier.split(" ")[0]}
              </span>
            </>
          )}
        </div>
      </div>

      {/* High-Contrast Interactive Arc Legend */}
      <div className="mt-3.5 pt-3 border-t border-white/10 w-full flex flex-col gap-1.5 text-[10.5px]">
        {arcs.map((arc) => {
          const isHovered = hoveredArc === arc.key;
          return (
            <div
              key={arc.key}
              onMouseEnter={() => setHoveredArc(arc.key)}
              onMouseLeave={() => setHoveredArc(null)}
              className={`flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-all ${
                isHovered ? "bg-white/10 font-bold" : "text-[#FAF8F5]/85 font-medium"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: arc.color }}
                />
                <span className="text-[#FAF8F5]">{arc.label}</span>
              </div>
              <span
                className="font-mono font-bold"
                style={{ color: arc.color }}
              >
                {arc.pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
