"use client";

import React, { useState } from "react";
import { SkillItem, ProficiencyLevel } from "@/types/passport";
import { Award, ShieldCheck, Info, CheckCircle2, AlertCircle } from "lucide-react";

interface CompetencyRadarChartProps {
  skills: SkillItem[];
}

const PROFICIENCY_NUMERIC: Record<ProficiencyLevel, number> = {
  "Not Established": 0,
  "Foundation": 1,
  "Working": 2,
  "Practitioner": 3,
  "Advanced": 4,
  "Expert": 5,
};

const NUMERIC_TO_LABEL: Record<number, string> = {
  0: "Not Established",
  1: "Foundation",
  2: "Working",
  3: "Practitioner",
  4: "Advanced",
  5: "Expert",
};

export default function CompetencyRadarChart({ skills }: CompetencyRadarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Graceful empty state: UI never breaks if skills array is empty
  if (!skills || skills.length === 0) {
    return (
      <div className="p-8 rounded-2xl border-[1.5px] border-[#171717] bg-[#F8F5EF] text-center space-y-3 shadow-[2.5px_2.5px_0_#171717]">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border-[1.5px] border-[#171717] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_#171717]">
          <Award className="w-6 h-6 text-[#E6AC70]" />
        </div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#171717]">No Competency Data Available</h4>
        <p className="text-xs text-[#171717]/70 max-w-md mx-auto">
          Add or verify skills in your Skill Passport to plot your multi-axis competency topology radar.
        </p>
      </div>
    );
  }

  // Extract distinct real categories from the actual skills dataset
  const userCategories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));
  
  // Standard taxonomy categories for topological balance if user has < 3 categories
  const fallbackCategories = [
    "Backend Engineering",
    "Cloud Infrastructure",
    "Applied AI & ML",
    "System Architecture",
    "Languages & Runtime",
    "Data & Analytics",
  ];

  // Prioritize real user categories first; fill remaining slots up to 5 or 6 axes
  const distinctCategories = Array.from(new Set([...userCategories, ...fallbackCategories]));
  const targetCategories = distinctCategories.slice(0, Math.max(3, Math.min(6, distinctCategories.length)));

  // Calculate real competency depth per category from actual skills
  const categoryData = targetCategories.map((cat) => {
    const catSkills = skills.filter(
      (s) => (s.category || "").toLowerCase() === cat.toLowerCase()
    );
    const verifiedSkills = catSkills.filter(
      (s) => s.verificationState === "verified" || (s as any).verified
    );
    const candidateSkills = catSkills.filter(
      (s) => s.verificationState === "candidate"
    );

    const verifiedScores = verifiedSkills.map(
      (s) => PROFICIENCY_NUMERIC[s.verifiedProficiency] ?? 0
    );
    // If no verified skills exist in this category yet, factor candidate claims with a standard calibration factor
    const candidateScores = candidateSkills.map(
      (s) => (PROFICIENCY_NUMERIC[s.estimatedProficiency] ?? 2) * 0.7
    );
    const combinedScores = [...verifiedScores, ...candidateScores];

    const avgScore = combinedScores.length > 0
      ? combinedScores.reduce((a, b) => a + b, 0) / combinedScores.length
      : 0;
    const maxScore = verifiedScores.length > 0
      ? Math.max(...verifiedScores)
      : (candidateScores.length > 0 ? Math.max(...candidateScores) : 0);

    // Composite depth calculation: 70% depth of strongest skill + 30% breadth
    const composite = Math.min(5, Math.max(0, maxScore * 0.7 + avgScore * 0.3));

    return {
      category: cat,
      score: Math.round(composite * 10) / 10,
      verifiedCount: verifiedSkills.length,
      candidateCount: candidateSkills.length,
      totalCount: catSkills.length,
      topSkills: (verifiedSkills.length > 0 ? verifiedSkills : catSkills).slice(0, 3).map((s) => s.canonicalName),
    };
  });

  // SVG Geometry - Sized to 420x420 with ample clearance so labels never clip
  const size = 420;
  const center = size / 2;
  const radius = size * 0.33; // ~138px radius
  const totalAxes = targetCategories.length;
  const angleStep = (Math.PI * 2) / Math.max(3, totalAxes);

  // Helper to convert polar to cartesian
  const getCoordinates = (axisIndex: number, valueRatio: number) => {
    const angle = axisIndex * angleStep - Math.PI / 2;
    return {
      x: center + radius * valueRatio * Math.cos(angle),
      y: center + radius * valueRatio * Math.sin(angle),
    };
  };

  // Concentric web rings (levels 1 to 5)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Polygon points for candidate verified level
  const candidatePolygonPoints = categoryData
    .map((d, i) => {
      const ratio = Math.max(0.08, d.score / 5.0);
      const pt = getCoordinates(i, ratio);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Benchmark polygon points (Practitioner baseline = 3/5 = 0.6)
  const benchmarkPolygonPoints = categoryData
    .map((_, i) => {
      const pt = getCoordinates(i, 0.6);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");

  // Helper to split category names into 2 lines for wrapping
  const splitCategoryLabel = (label: string): [string, string] => {
    const words = label.split(" ");
    if (words.length <= 1) return [label, ""];
    if (words.length === 2) return [words[0], words[1]];
    if (words.length === 3) return [`${words[0]} ${words[1]}`, words[2]];
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
  };

  return (
    <div className="p-6 rounded-2xl border-[1.5px] border-[#171717] bg-[#F8F5EF] space-y-6 shadow-[2.5px_2.5px_0_#171717]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171717]/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717]/60 block mb-1">
            Domain 2 · Competency Topology
          </span>
          <h3 className="text-lg font-black text-[#171717] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#E6AC70]" />
            Category Proficiency Radar
          </h3>
          <p className="text-xs text-[#171717]/70 mt-0.5">
            Verified competency depth evaluated against practitioner benchmark across core disciplines.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-[#171717]">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#DDEBE1] border-[1.5px] border-[#171717]" />
            <span>Verified Depth</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#171717]/80">
            <span className="w-3.5 h-2 rounded-xs bg-[#DCE5F2]/40 border-t-2 border-dashed border-[#171717]" />
            <span>Practitioner Target (3.0)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* SVG Radar Visual (7 cols) */}
        <div className="lg:col-span-7 flex justify-center relative">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[420px] h-auto select-none overflow-visible"
          >
            {/* Background Web Concentric Rings */}
            {rings.map((ringRatio, rIdx) => {
              const ringPoints = Array.from({ length: totalAxes })
                .map((_, i) => {
                  const pt = getCoordinates(i, ringRatio);
                  return `${pt.x},${pt.y}`;
                })
                .join(" ");

              return (
                <g key={rIdx}>
                  <polygon
                    points={ringPoints}
                    fill={rIdx % 2 === 0 ? "#171717" : "none"}
                    fillOpacity={rIdx % 2 === 0 ? 0.02 : 0}
                    stroke="#171717"
                    strokeOpacity={0.14}
                    strokeWidth={1}
                  />
                  {/* Numeric score mark on top radial axis */}
                  <text
                    x={center + 5}
                    y={center - radius * ringRatio + 3}
                    fontSize="7.5"
                    fontWeight="bold"
                    fill="#171717"
                    fillOpacity={0.4}
                  >
                    {Math.round(ringRatio * 5)}
                  </text>
                </g>
              );
            })}

            {/* Axis Rays */}
            {Array.from({ length: totalAxes }).map((_, i) => {
              const pt = getCoordinates(i, 1.0);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={pt.x}
                  y2={pt.y}
                  stroke="#171717"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              );
            })}

            {/* Benchmark Level Polygon (Practitioner Target Level 3.0 / 60%) */}
            <polygon
              points={benchmarkPolygonPoints}
              fill="#DCE5F2"
              fillOpacity={0.25}
              stroke="#171717"
              strokeOpacity={0.65}
              strokeWidth={1.75}
              strokeDasharray="5 4"
            />

            {/* Candidate Verified Area Polygon (Muted Green) */}
            <polygon
              points={candidatePolygonPoints}
              fill="#DDEBE1"
              fillOpacity={0.65}
              stroke="#171717"
              strokeWidth={2.5}
              className="transition-all duration-300 drop-shadow-sm"
            />

            {/* Data Vertex Points */}
            {categoryData.map((d, i) => {
              const ratio = Math.max(0.08, d.score / 5.0);
              const pt = getCoordinates(i, ratio);
              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6.5 : 4.5}
                    fill={isHovered ? "#171717" : "#DDEBE1"}
                    stroke="#171717"
                    strokeWidth={2}
                    className="transition-all"
                  />
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="none"
                      stroke="#171717"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  )}
                </g>
              );
            })}

            {/* Category Axis Two-Line Text Labels (Zero Truncation) */}
            {categoryData.map((d, i) => {
              const labelPt = getCoordinates(i, 1.28);
              const isHovered = hoveredIndex === i;
              const [line1, line2] = splitCategoryLabel(d.category);

              // Dynamic text-anchor based on angle
              let textAnchor: "start" | "middle" | "end" = "middle";
              let dx = 0;
              if (labelPt.x > center + 15) {
                textAnchor = "start";
                dx = 6;
              } else if (labelPt.x < center - 15) {
                textAnchor = "end";
                dx = -6;
              }

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <text
                    x={labelPt.x + dx}
                    y={line2 ? labelPt.y - 6 : labelPt.y}
                    textAnchor={textAnchor}
                    className={`text-[9.5px] transition-all ${
                      isHovered
                        ? "fill-[#171717] font-black text-[10.5px]"
                        : "fill-[#171717] font-bold"
                    }`}
                  >
                    <tspan x={labelPt.x + dx} dy="0">
                      {line1}
                    </tspan>
                    {line2 && (
                      <tspan x={labelPt.x + dx} dy="12">
                        {line2}
                      </tspan>
                    )}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Category Breakdown & Progress Indicators (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {categoryData.map((d, idx) => {
            const isSelected = hoveredIndex === idx;
            const levelLabel = NUMERIC_TO_LABEL[Math.round(d.score)] || "Not Established";
            const isAboveTarget = d.score >= 3.0;

            return (
              <div
                key={d.category}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#FAF8F5] border-[#171717] shadow-[2px_2px_0_#171717] -translate-y-0.5"
                    : "bg-[#FAF8F5]/70 border-[#171717]/15 hover:bg-[#FAF8F5]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#171717]">
                    {d.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#171717] ${
                      isAboveTarget
                        ? "bg-[#DDEBE1] text-[#171717]"
                        : d.score > 0
                        ? "bg-[#E6AC70] text-[#171717]"
                        : "bg-[#FAF8F5] text-[#171717]/60"
                    }`}
                  >
                    {levelLabel} ({d.score}/5.0)
                  </span>
                </div>

                {/* Micro Progress Bar with Practitioner Target Marker */}
                <div className="mt-2 space-y-1">
                  <div className="relative w-full h-2 rounded-full bg-[#171717]/10 overflow-hidden border border-[#171717]/20">
                    <div
                      className="h-full rounded-full bg-[#171717] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, (d.score / 5.0) * 100))}%` }}
                    />
                    {/* Practitioner benchmark line at 60% */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[#E6AC70] border-r border-[#171717]"
                      style={{ left: "60%" }}
                      title="Practitioner Target (3.0)"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#171717]/70 mt-2">
                  <span>
                    {d.verifiedCount > 0
                      ? `${d.verifiedCount} verified capabilities`
                      : d.candidateCount > 0
                      ? `${d.candidateCount} candidate signals`
                      : "0 recorded skills"}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold ${
                      isAboveTarget
                        ? "text-[#2D5A43]"
                        : d.score > 0
                        ? "text-[#B07219]"
                        : "text-[#171717]/50"
                    }`}
                  >
                    {isAboveTarget ? "Target Exceeded ✓" : d.score > 0 ? "Approaching Target" : "Pending Signals"}
                  </span>
                </div>

                {isSelected && d.topSkills.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#171717]/10 text-[10px] text-[#171717]/80 font-medium">
                    Top Capabilities: {d.topSkills.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
