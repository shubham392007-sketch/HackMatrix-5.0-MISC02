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
      trackColor: "rgba(212, 224, 155, 0.18)",
    },
    {
      key: "required",
      label: "Core Coverage",
      pct: requiredCoveragePct,
      radius: 58,
      strokeWidth: 9,
      color: "#CBDFBD",
      trackColor: "rgba(203, 223, 189, 0.18)",
    },
    {
      key: "proficiency",
      label: "Proficiency Alignment",
      pct: proficiencyAlignmentPct,
      radius: 43,
      strokeWidth: 8,
      color: "#F6F4D2",
      trackColor: "rgba(246, 244, 210, 0.18)",
    },
  ];

  const activeArc = arcs.find((a) => a.key === hoveredArc) || null;

  return (
    <div className="shrink-0 flex flex-col items-center justify-center p-5 rounded-3xl bg-[#1A1918] border-2 border-[#1A1918] ring-1 ring-white/15 ring-inset shadow-[5px_5px_0px_0px_rgba(26,25,24,0.85),0_14px_28px_-4px_rgba(0,0,0,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(26,25,24,0.9),0_18px_32px_-4px_rgba(0,0,0,0.4)]">
      {/* SVG Radial Graph with 3D Arc Shadows */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 overflow-visible"
        >
          <defs>
            <filter id="arc3dShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

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
                {/* Active Progress Arc with 3D Drop Shadow */}
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
                  filter="url(#arc3dShadow)"
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
                className="text-2xl font-black tracking-tight transition-all drop-shadow-md"
                style={{ color: activeArc.color }}
              >
                {activeArc.pct}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FAF8F5]/85 truncate max-w-[95px] mt-0.5">
                {activeArc.label}
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-mono uppercase tracking-widest text-[#FAF8F5]/50 font-bold">
                READINESS
              </span>
              <span className="text-3xl font-black text-[#FAF8F5] leading-none my-1 tracking-tight drop-shadow-sm">
                {readinessIndex}%
              </span>
              <span className="text-[9.5px] font-mono font-bold text-[#D4E09B] uppercase tracking-wider truncate max-w-[90px]">
                {readinessTier.split(" ")[0]}
              </span>
            </>
          )}
        </div>
      </div>

      {/* High-Contrast Interactive Arc Legend with Bevel */}
      <div className="mt-4 pt-3.5 border-t border-white/10 w-full flex flex-col gap-1.5 text-[10.5px]">
        {arcs.map((arc) => {
          const isHovered = hoveredArc === arc.key;
          return (
            <div
              key={arc.key}
              onMouseEnter={() => setHoveredArc(arc.key)}
              onMouseLeave={() => setHoveredArc(null)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isHovered
                  ? "bg-white/15 border-white/20 font-bold shadow-inner"
                  : "bg-white/5 border-white/5 text-[#FAF8F5]/85 font-medium hover:bg-white/10"
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
