"use client";

import React, { useState, useMemo } from "react";
import { SkillItem, ProficiencyLevel } from "@/types/passport";
import { EvidenceItem } from "@/types/evidence";
import { ShieldCheck, HelpCircle, Sparkles, Filter, Info, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface CompetencyQuadrantScatterPlotProps {
  skills: SkillItem[];
  evidenceItems?: EvidenceItem[];
}

const PROFICIENCY_SCORE_MAP: Record<ProficiencyLevel, number> = {
  "Not Established": 15,
  "Foundation": 30,
  "Working": 50,
  "Practitioner": 70,
  "Advanced": 85,
  "Expert": 95,
};

interface TooltipData {
  x: number;
  y: number;
  skill: SkillItem & {
    evidenceCount: number;
    compositeScore: number;
    quadrantName: string;
    quadrantKey: string;
  };
}

export default function CompetencyQuadrantScatterPlot({
  skills,
  evidenceItems = [],
}: CompetencyQuadrantScatterPlotProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [hoveredPoint, setHoveredPoint] = useState<TooltipData | null>(null);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set(skills.map((s) => s.category).filter(Boolean));
    return Array.from(set);
  }, [skills]);

  // Compute plot data points with strict data preservation and subtle visual distinction for overlapping bubbles
  const plotPoints = useMemo(() => {
    // 1. Raw mapping according to actual evidence density (X) and competency depth (Y)
    const raw = skills.map((skill, index) => {
      const evidenceCount = skill.evidenceIds?.length || 1;
      const baseScore = PROFICIENCY_SCORE_MAP[skill.verifiedProficiency] ?? 50;
      // Composite depth: 85% base proficiency + 15% extraction confidence
      const compositeScore = Math.min(
        98,
        Math.max(10, Math.round(baseScore * 0.85 + (skill.confidence || 50) * 0.15))
      );

      // SVG Canvas dimensions: 840w x 420h
      // X-range: 85px (0 citations) to 790px (25+ citations)
      const xClamped = Math.min(25, evidenceCount);
      const exactCx = 85 + (xClamped / 25) * (790 - 85);

      // Y-range: 370px (0% score) to 45px (100% score)
      const exactCy = 370 - (compositeScore / 100) * (370 - 45);

      // Bubble radius proportional to evidence density (5.5px to 11px)
      const radius = Math.min(11, Math.max(5.5, 5 + Math.sqrt(evidenceCount) * 1.3));

      // Determine Quadrant
      const isHighEvidence = evidenceCount >= 8;
      const isHighScore = compositeScore >= 60;
      let quadrantKey: "Q1" | "Q2" | "Q3" | "Q4";
      let quadrantName: string;
      if (isHighEvidence && isHighScore) {
        quadrantKey = "Q1";
        quadrantName = "Q1: Core Verified Pillar";
      } else if (!isHighEvidence && isHighScore) {
        quadrantKey = "Q2";
        quadrantName = "Q2: High Potential / Needs Proof";
      } else if (isHighEvidence && !isHighScore) {
        quadrantKey = "Q3";
        quadrantName = "Q3: Active Production Volume";
      } else {
        quadrantKey = "Q4";
        quadrantName = "Q4: Nascent Exploration";
      }

      return {
        ...skill,
        evidenceCount,
        compositeScore,
        exactCx,
        exactCy,
        radius,
        quadrantKey,
        quadrantName,
      };
    });

    // 2. Identify exact coordinate collisions and apply minimal sub-pixel jitter (<= 2px)
    // to keep both outlines cleanly visible without distorting real coordinates
    const collisionMap = new Map<string, number>();

    return raw.map((point) => {
      const coordKey = `${Math.round(point.exactCx)},${Math.round(point.exactCy)}`;
      const collisionIndex = collisionMap.get(coordKey) || 0;
      collisionMap.set(coordKey, collisionIndex + 1);

      let cx = point.exactCx;
      let cy = point.exactCy;

      if (collisionIndex > 0) {
        // Minimal deterministic angle offset of 2px
        const angle = (collisionIndex * Math.PI * 2) / 3;
        cx += Math.cos(angle) * 2;
        cy += Math.sin(angle) * 2;
      }

      return {
        ...point,
        cx,
        cy,
      };
    });
  }, [skills]);

  // Filter points by category
  const filteredPoints = useMemo(() => {
    if (activeCategoryFilter === "all") return plotPoints;
    return plotPoints.filter((p) => p.category === activeCategoryFilter);
  }, [plotPoints, activeCategoryFilter]);

  // Default selected skill
  const selectedPoint = useMemo(() => {
    if (selectedSkillId) {
      return plotPoints.find((p) => p.id === selectedSkillId) || plotPoints[0];
    }
    return plotPoints[0] || null;
  }, [plotPoints, selectedSkillId]);

  if (!skills || skills.length === 0) {
    return (
      <div className="bg-[#F8F5EF] border-[1.5px] border-[#171717] rounded-2xl p-8 shadow-[2.5px_2.5px_0_#171717] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border-[1.5px] border-[#171717] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_#171717]">
          <Sparkles className="w-6 h-6 text-[#E6AC70]" />
        </div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#171717]">No Skills in Passport Yet</h4>
        <p className="text-xs text-[#171717]/70 max-w-md mx-auto">
          Verify proposed candidate skills or sync your connected repositories to populate the Competency Quadrant Matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F5EF] border-[1.5px] border-[#171717] rounded-2xl p-6 shadow-[2.5px_2.5px_0_#171717] space-y-5">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#171717]/12 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E6AC70] border border-[#171717]" />
            <h3 className="text-base font-black uppercase tracking-wider text-[#171717]">
              Competency Quadrant Matrix (Evidence Density vs. Capability Depth)
            </h3>
          </div>
          <p className="text-xs text-[#171717]/70 mt-0.5">
            X-Axis: Linked Workplace Artifacts • Y-Axis: Verified Capability Depth • Bubble size reflects artifact density. Hover for details; click to inspect.
          </p>
        </div>

        {/* Category Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#FAF8F5] border border-[#171717]/20 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter("all")}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeCategoryFilter === "all"
                ? "bg-[#171717] text-[#FAF8F5] font-black"
                : "text-[#171717] font-bold hover:bg-[#171717]/5"
            }`}
          >
            All ({plotPoints.length})
          </button>
          {categories.slice(0, 4).map((cat) => {
            const count = plotPoints.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCategoryFilter === cat
                    ? "bg-[#171717] text-[#FAF8F5] font-black"
                    : "text-[#171717] font-bold hover:bg-[#171717]/5"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Scatter Plot Canvas Container */}
      <div className="relative w-full overflow-hidden bg-[#FAF8F5] rounded-xl border border-[#171717]/15 p-2">
        <svg
          viewBox="0 0 840 420"
          className="w-full h-auto select-none overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <pattern id="matrixDotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#171717" fillOpacity="0.04" />
            </pattern>
          </defs>

          {/* Background subtle paper dot grid */}
          <rect x="85" y="20" width="730" height="350" fill="url(#matrixDotPattern)" />

          {/* 4 Quadrants Soft Tints */}
          {/* Q1: Top Right - Core Verified Pillars (Muted Green) */}
          <rect x="445" y="20" width="370" height="175" fill="#DDEBE1" fillOpacity="0.35" rx="8" />
          {/* Q2: Top Left - High Potential / Needs Evidence (Amber) */}
          <rect x="85" y="20" width="360" height="175" fill="#E6AC70" fillOpacity="0.16" rx="8" />
          {/* Q3: Bottom Right - Active Production Volume (Soft Blue) */}
          <rect x="445" y="195" width="370" height="175" fill="#DCE5F2" fillOpacity="0.3" rx="8" />
          {/* Q4: Bottom Left - Nascent Exploration (Neutral Tint) */}
          <rect x="85" y="195" width="360" height="175" fill="#171717" fillOpacity="0.02" rx="8" />

          {/* Quadrant Headers with Pill Badges */}
          <g transform="translate(100, 36)">
            <rect width="195" height="22" rx="11" fill="#FAF8F5" stroke="#171717" strokeWidth="1" filter="drop-shadow(1px 1px 0px #171717)" />
            <circle cx="12" cy="11" r="3.5" fill="#E6AC70" stroke="#171717" />
            <text x="24" y="15" fontSize="9" fontWeight="900" fill="#171717" letterSpacing="0.4">
              Q2 · HIGH POTENTIAL / NEEDS PROOF
            </text>
          </g>

          <g transform="translate(615, 36)">
            <rect width="185" height="22" rx="11" fill="#171717" stroke="#171717" strokeWidth="1" filter="drop-shadow(1px 1px 0px #171717)" />
            <circle cx="12" cy="11" r="3.5" fill="#DDEBE1" />
            <text x="24" y="15" fontSize="9" fontWeight="900" fill="#FAF8F5" letterSpacing="0.4">
              Q1 · CORE VERIFIED PILLARS ★
            </text>
          </g>

          <g transform="translate(100, 345)">
            <rect width="165" height="20" rx="10" fill="#FAF8F5" stroke="#171717" strokeOpacity="0.4" />
            <text x="82" y="14" fontSize="8.5" fontWeight="bold" fill="#171717" fillOpacity="0.7" textAnchor="middle">
              Q4 · NASCENT EXPLORATION
            </text>
          </g>

          <g transform="translate(625, 345)">
            <rect width="175" height="20" rx="10" fill="#FAF8F5" stroke="#171717" strokeOpacity="0.4" />
            <text x="87" y="14" fontSize="8.5" fontWeight="bold" fill="#171717" fillOpacity="0.7" textAnchor="middle">
              Q3 · PRODUCTION VOLUME
            </text>
          </g>

          {/* Horizontal Gridlines & Y-Axis Markings */}
          <g stroke="#171717" strokeOpacity="0.08" strokeDasharray="3 3">
            <line x1="85" y1="20" x2="815" y2="20" />
            <line x1="85" y1="107" x2="815" y2="107" />
            <line x1="85" y1="282" x2="815" y2="282" />
          </g>

          {/* Center Quadrant Axis Crosshairs */}
          <line x1="445" y1="20" x2="445" y2="370" stroke="#171717" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.35" />
          <line x1="85" y1="195" x2="815" y2="195" stroke="#171717" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.35" />

          {/* Solid Canvas Boundary Axes */}
          <line x1="85" y1="370" x2="815" y2="370" stroke="#171717" strokeWidth="1.5" />
          <line x1="85" y1="20" x2="85" y2="370" stroke="#171717" strokeWidth="1.5" />

          {/* Y Axis Rubrics & Percentages */}
          <g fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">
            <text x="75" y="24">100% · Expert</text>
            <text x="75" y="111">75% · Advanced</text>
            <text x="75" y="199">50% · Working</text>
            <text x="75" y="286">25% · Foundation</text>
            <text x="75" y="373">0%</text>
          </g>

          {/* X Axis Numeric Ticks & Thresholds */}
          <g fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="middle">
            <text x="85" y="392">0 Artifacts</text>
            <text x="226" y="392">5 Citations</text>
            <text x="367" y="392">10 Citations</text>
            <text x="508" y="392">15 Citations</text>
            <text x="649" y="392">20 Citations</text>
            <text x="790" y="392">25+ Citations</text>
          </g>

          {/* Axis Titles */}
          <text
            x="450"
            y="412"
            fontSize="10"
            fontWeight="900"
            fill="#171717"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            DEMONSTRATED EVIDENCE VOLUME (CITATIONS / ARTIFACTS) →
          </text>

          {/* Render All Filtered Points (Clean, appropriately sized bubbles ONLY - no text labels or abbreviations beside bubbles) */}
          {filteredPoints.map((pt) => {
            const isSelected = selectedPoint?.id === pt.id;
            const isHovered = hoveredPoint?.skill.id === pt.id;
            const isVerified = pt.verificationState === "verified";
            const isCandidate = pt.verificationState === "candidate";

            // Palette tokens
            const bubbleFill = isVerified
              ? "#DDEBE1"
              : isCandidate
              ? "#E6AC70"
              : "#DCE5F2";

            return (
              <g
                key={pt.id}
                onClick={() => setSelectedSkillId(pt.id)}
                onMouseEnter={() =>
                  setHoveredPoint({
                    x: pt.cx,
                    y: pt.cy,
                    skill: pt,
                  })
                }
                className="cursor-pointer"
              >
                {/* Native Tooltip fallback */}
                <title>{`${pt.canonicalName} (${pt.verifiedProficiency}) — ${pt.compositeScore}% Depth • ${pt.evidenceCount} Citations`}</title>

                {/* Outer Selection / Focus Ring if selected or hovered */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={pt.radius + 5}
                    fill="none"
                    stroke="#171717"
                    strokeWidth="1.5"
                    strokeDasharray={isSelected ? "2 2" : "none"}
                  />
                )}

                {/* Clean, appropriately sized Semi-transparent Bubble with Solid Outline */}
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r={isSelected ? pt.radius + 1.5 : pt.radius}
                  fill={bubbleFill}
                  fillOpacity={0.85}
                  stroke="#171717"
                  strokeWidth={isSelected ? "2" : "1.5"}
                  filter="drop-shadow(1px 1px 0px #171717)"
                />

                {/* Inner verification pip */}
                {isVerified && (
                  <circle cx={pt.cx} cy={pt.cy} r="2" fill="#171717" />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Rich Tooltip on Hover */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-[#FAF8F5] border-[1.5px] border-[#171717] shadow-[2.5px_2.5px_0_#171717] text-xs max-w-xs transition-opacity duration-150"
            style={{
              left: `${Math.min(75, Math.max(5, (hoveredPoint.x / 840) * 100))}%`,
              top: `${Math.max(10, (hoveredPoint.y / 420) * 100 - 25)}%`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#171717]/10 pb-1.5 mb-1.5">
              <span className="font-black text-[#171717]">{hoveredPoint.skill.canonicalName}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#171717] text-[#FAF8F5]">
                {hoveredPoint.skill.compositeScore}% Depth
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-[#171717]/80">
              <div className="flex justify-between">
                <span>Category:</span>
                <strong className="text-[#171717]">{hoveredPoint.skill.category}</strong>
              </div>
              <div className="flex justify-between">
                <span>Verified Level:</span>
                <strong className="text-[#171717]">{hoveredPoint.skill.verifiedProficiency}</strong>
              </div>
              <div className="flex justify-between">
                <span>Evidence Density:</span>
                <strong className="text-[#171717]">{hoveredPoint.skill.evidenceCount} linked artifacts</strong>
              </div>
              <div className="flex justify-between">
                <span>Quadrant:</span>
                <strong className="text-[#2D5A43]">{hoveredPoint.skill.quadrantKey}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Selected Skill Inspector HUD Card */}
      {selectedPoint && (
        <div className="bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-xl p-4 shadow-[2px_2px_0_#171717] transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#171717]/12 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-xs border border-[#171717] ${
                  selectedPoint.verificationState === "verified"
                    ? "bg-[#DDEBE1] text-[#171717]"
                    : selectedPoint.verificationState === "candidate"
                    ? "bg-[#E6AC70] text-[#171717]"
                    : "bg-[#DCE5F2] text-[#171717]"
                }`}
              >
                {selectedPoint.canonicalName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-[#171717]">{selectedPoint.canonicalName}</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-[#171717] ${
                      selectedPoint.verificationState === "verified"
                        ? "bg-[#171717] text-[#FAF8F5]"
                        : selectedPoint.verificationState === "candidate"
                        ? "bg-[#E6AC70] text-[#171717]"
                        : "bg-[#DCE5F2] text-[#171717]"
                    }`}
                  >
                    {selectedPoint.verificationState}
                  </span>
                </div>
                <p className="text-xs text-[#171717]/70 mt-0.5">
                  {selectedPoint.category} • Assessed as <strong>{selectedPoint.verifiedProficiency}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-[10px] uppercase text-[#171717]/60 block">Capability Depth</span>
                <span className="font-bold text-[#171717]">{selectedPoint.compositeScore}%</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-[#171717]/60 block">Evidence Density</span>
                <span className="font-bold text-[#171717]">{selectedPoint.evidenceCount} Citations</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-[#171717]/60 block">Quadrant</span>
                <span className="font-bold text-[#2D5A43]">{selectedPoint.quadrantKey}</span>
              </div>
            </div>
          </div>

          {/* Rationale & Strategic Next Action */}
          <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[#171717]/80">
            <p className="line-clamp-2 italic">
              "{selectedPoint.assessmentRationale || "Corroborated across continuous git commits and sprint tickets with verifiable code artifacts."}"
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#F8F5EF] border border-[#171717]/20">
                {selectedPoint.quadrantName}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
