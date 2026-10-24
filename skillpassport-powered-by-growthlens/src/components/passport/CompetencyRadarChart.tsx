"use client";

import React, { useState } from "react";
import { SkillItem, ProficiencyLevel } from "@/types/passport";
import { Award, ShieldCheck, Info } from "lucide-react";

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

  // Group verified skills by category
  const categories = Array.from(new Set(skills.map((s) => s.category || "General")));

  // Fallback to canonical categories if skills have few categories
  const targetCategories =
    categories.length >= 3
      ? categories.slice(0, 6)
      : [
          "Backend Engineering",
          "Cloud Infrastructure",
          "Applied AI & ML",
          "System Architecture",
          "Languages & Runtime",
        ];

  // Calculate score per category (0 to 5)
  const categoryData = targetCategories.map((cat) => {
    const catSkills = skills.filter(
      (s) => (s.category || "").toLowerCase() === cat.toLowerCase()
    );
    const verifiedSkills = catSkills.filter(
      (s) => s.verificationState === "verified" || (s as any).verified
    );

    const scores = verifiedSkills.map(
      (s) => PROFICIENCY_NUMERIC[s.verifiedProficiency] ?? 0
    );
    const avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    // Composite depth: 70% max skill depth + 30% breadth
    const composite = Math.min(5, maxScore * 0.7 + avgScore * 0.3);

    return {
      category: cat,
      score: Math.round(composite * 10) / 10,
      verifiedCount: verifiedSkills.length,
      totalCount: catSkills.length,
      topSkills: verifiedSkills.slice(0, 3).map((s) => s.canonicalName),
    };
  });

  // SVG Geometry
  const size = 320;
  const center = size / 2;
  const radius = size * 0.36;
  const totalAxes = targetCategories.length;
  const angleStep = (Math.PI * 2) / totalAxes;

  // Helper to convert polar to cartesian
  const getCoordinates = (axisIndex: number, valueRatio: number) => {
    const angle = axisIndex * angleStep - Math.PI / 2;
    return {
      x: center + radius * valueRatio * Math.cos(angle),
      y: center + radius * valueRatio * Math.sin(angle),
    };
  };

  // Generate web rings (levels 1 to 5)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Polygon points for candidate verified level
  const candidatePolygonPoints = categoryData
    .map((d, i) => {
      const ratio = Math.max(0.1, d.score / 5.0);
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

  const activeCategory = hoveredIndex !== null ? categoryData[hoveredIndex] : null;

  return (
    <div className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-6 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
            Domain 2 · Competency Topology
          </span>
          <h3 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
            <Award className="w-5 h-5 text-[#B07219]" />
            Category Proficiency Radar
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
            <span className="w-3 h-3 rounded-sm bg-[#DFE968] border border-[#1C1C1C]" />
            <span>Verified Depth</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]/60">
            <span className="w-3 h-1 border-t-2 border-dashed border-[#1C1C1C]/50" />
            <span>Practitioner Target</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Radar Visual (7 cols) */}
        <div className="lg:col-span-7 flex justify-center relative">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {/* Background Web Rings */}
            {rings.map((ringRatio, rIdx) => {
              const ringPoints = Array.from({ length: totalAxes })
                .map((_, i) => {
                  const pt = getCoordinates(i, ringRatio);
                  return `${pt.x},${pt.y}`;
                })
                .join(" ");

              return (
                <polygon
                  key={rIdx}
                  points={ringPoints}
                  fill="none"
                  stroke="#1C1C1C"
                  strokeOpacity={0.12}
                  strokeWidth={1}
                />
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
                  stroke="#1C1C1C"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              );
            })}

            {/* Benchmark Level Polygon (Dashed Line) */}
            <polygon
              points={benchmarkPolygonPoints}
              fill="none"
              stroke="#1C1C1C"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {/* Candidate Verified Area Polygon */}
            <polygon
              points={candidatePolygonPoints}
              fill="#DFE968"
              fillOpacity={0.55}
              stroke="#1C1C1C"
              strokeWidth={2}
              className="transition-all duration-300 drop-shadow-sm"
            />

            {/* Data Vertex Points */}
            {categoryData.map((d, i) => {
              const ratio = Math.max(0.1, d.score / 5.0);
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
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? "#1C1C1C" : "#DFE968"}
                    stroke="#1C1C1C"
                    strokeWidth={2}
                    className="transition-all"
                  />
                </g>
              );
            })}

            {/* Category Axis Text Labels */}
            {categoryData.map((d, i) => {
              const labelPt = getCoordinates(i, 1.25);
              const isHovered = hoveredIndex === i;

              return (
                <text
                  key={i}
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[10px] font-black transition-all cursor-pointer ${
                    isHovered ? "fill-[#1C1C1C] font-extrabold text-[11px]" : "fill-[#1C1C1C]/75"
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {d.category.length > 18 ? d.category.slice(0, 16) + "…" : d.category}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Category Breakdown & Active Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {categoryData.map((d, idx) => {
            const isSelected = hoveredIndex === idx;
            const levelLabel = NUMERIC_TO_LABEL[Math.round(d.score)] || "Novice";

            return (
              <div
                key={d.category}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white border-[#1C1C1C] shadow-sm ring-1 ring-[#1C1C1C] -translate-y-0.5"
                    : "bg-[#FBF1CF]/60 border-[#1C1C1C]/15 hover:bg-white/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1C1C1C] truncate max-w-[170px]">
                    {d.category}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1C1C1C] text-[#FAF8F5]">
                    {levelLabel} ({d.score}/5)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/70 mt-1">
                  <span>{d.verifiedCount} verified capabilities</span>
                  <span className="font-mono text-[10px] text-[#4A7A4E] font-bold">
                    {d.verifiedCount > 0 ? "Corroborated" : "Unverified"}
                  </span>
                </div>
                {isSelected && d.topSkills.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1C1C1C]/10 text-[10px] text-[#1C1C1C]/80 font-medium">
                    Top Verified: {d.topSkills.join(", ")}
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
