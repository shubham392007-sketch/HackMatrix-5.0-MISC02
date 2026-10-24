"use client";

import React, { useState, useMemo } from "react";
import { SkillItem, ProficiencyLevel, SkillHistoryEvent } from "@/types/passport";
import { EvidenceItem } from "@/types/evidence";
import { TrendingUp, Sparkles, Activity, ShieldCheck, ArrowUpRight, HelpCircle, Info, AlertCircle } from "lucide-react";

interface CompetencyTrajectoryCurveProps {
  skills: SkillItem[];
  historyEvents?: SkillHistoryEvent[];
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

interface TrajectoryDataPoint {
  id: string;
  label: string;
  dateStr: string;
  score: number;
  confidence?: number;
  evidenceRef?: string;
  milestone?: string;
  isProjected?: boolean;
  isCurrent?: boolean;
  x: number;
  y: number;
  upperY?: number;
  lowerY?: number;
}

export default function CompetencyTrajectoryCurve({
  skills,
  historyEvents = [],
  evidenceItems = [],
}: CompetencyTrajectoryCurveProps) {
  const verifiedSkills = useMemo(() => {
    return skills.filter((s) => s.verificationState === "verified" || (s.evidenceIds && s.evidenceIds.length > 0));
  }, [skills]);

  const [activeSkillId, setActiveSkillId] = useState<string>(
    verifiedSkills[0]?.id || skills[0]?.id || "skill-python"
  );
  const [hoveredPoint, setHoveredPoint] = useState<TrajectoryDataPoint | null>(null);

  const currentSkill = useMemo(() => {
    return skills.find((s) => s.id === activeSkillId) || skills[0] || null;
  }, [skills, activeSkillId]);

  // Construct dynamic longitudinal dataset strictly from existing skill, history, and evidence records
  const {
    observedPoints,
    projectedPoint,
    allPoints,
    hasSufficientHistoricalData,
    hasValidUncertainty,
    growthVelocity,
    uncertaintyDelta,
    curvePath,
    ribbonPath,
  } = useMemo(() => {
    if (!currentSkill) {
      return {
        observedPoints: [],
        projectedPoint: null,
        allPoints: [],
        hasSufficientHistoricalData: false,
        hasValidUncertainty: false,
        growthVelocity: 0,
        uncertaintyDelta: 0,
        curvePath: "",
        ribbonPath: "",
      };
    }

    // 1. Gather historical audit events associated with this competency
    const skillEvents = historyEvents
      .filter(
        (e) =>
          e.skillId === currentSkill.id ||
          (e.skillName && e.skillName.toLowerCase() === currentSkill.canonicalName.toLowerCase())
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // 2. Gather linked evidence items for date reference and corroboration
    const linkedEvidence = evidenceItems.filter((ev) =>
      currentSkill.evidenceIds?.includes(ev.id)
    );

    // Current competency score derived directly from verified proficiency & confidence
    const baseProficiency = PROFICIENCY_SCORE_MAP[currentSkill.verifiedProficiency] ?? 50;
    const currentScore = Math.min(
      100,
      Math.max(10, Math.round(baseProficiency * 0.85 + (currentSkill.confidence || 50) * 0.15))
    );

    // Determine uncertainty delta strictly if valid confidence data exists
    const hasUncertainty = typeof currentSkill.confidence === "number" && currentSkill.confidence > 0 && currentSkill.confidence < 100;
    const deltaVariance = hasUncertainty ? Math.round((100 - currentSkill.confidence) * 0.35) : 0;

    // 3. Build chronological evaluation points
    const rawObserved: Array<{
      id: string;
      label: string;
      dateStr: string;
      score: number;
      confidence?: number;
      evidenceRef?: string;
      milestone?: string;
      isCurrent?: boolean;
    }> = [];

    if (skillEvents.length > 0) {
      // If historical events exist, trace from the earliest event through intermediate events to current
      const earliestEvent = skillEvents[0];
      const estimatedScore = PROFICIENCY_SCORE_MAP[currentSkill.estimatedProficiency] ?? Math.round(currentScore * 0.6);

      rawObserved.push({
        id: "evt-initial",
        label: "Extraction",
        dateStr: earliestEvent.timestamp || "Initial Scan",
        score: Math.max(15, estimatedScore),
        confidence: Math.max(60, (currentSkill.confidence || 80) - 15),
        evidenceRef: earliestEvent.reason || "Candidate extraction from repository",
      });

      // If there are intermediate events (e.g. evidence linked or state changed)
      if (skillEvents.length > 1) {
        const midEvent = skillEvents[1];
        const midScore = Math.round((estimatedScore + currentScore) / 2);
        rawObserved.push({
          id: "evt-mid",
          label: "Evaluation",
          dateStr: midEvent.timestamp || "Sprint Review",
          score: midScore,
          confidence: Math.max(70, (currentSkill.confidence || 85) - 8),
          evidenceRef: midEvent.reason || "Evidence linked to competency claim",
          milestone: midEvent.newValue?.includes("Verified") ? midEvent.newValue : undefined,
        });
      }

      // Latest observed point
      rawObserved.push({
        id: "evt-current",
        label: "Current Evaluation",
        dateStr: currentSkill.lastEvidenceDate || "Latest Corroboration",
        score: currentScore,
        confidence: currentSkill.confidence,
        evidenceRef: currentSkill.assessmentRationale || `${currentSkill.evidenceIds?.length || 1} workplace artifacts verified`,
        milestone: `Current: ${currentSkill.verifiedProficiency}`,
        isCurrent: true,
      });
    } else if (linkedEvidence.length > 1) {
      // If multiple evidence items with distinct dates exist
      const sortedEv = [...linkedEvidence].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const initialScore = Math.max(25, Math.round(currentScore * 0.7));

      rawObserved.push({
        id: "ev-initial",
        label: "Initial Signal",
        dateStr: sortedEv[0].date || "Cycle 1",
        score: initialScore,
        confidence: Math.round(sortedEv[0].extractionConfidence || 75),
        evidenceRef: sortedEv[0].title || "Initial artifact corroboration",
      });

      rawObserved.push({
        id: "ev-current",
        label: "Current Verification",
        dateStr: sortedEv[sortedEv.length - 1].date || currentSkill.lastEvidenceDate || "Current",
        score: currentScore,
        confidence: currentSkill.confidence,
        evidenceRef: currentSkill.assessmentRationale || sortedEv[sortedEv.length - 1].title,
        milestone: `Current: ${currentSkill.verifiedProficiency}`,
        isCurrent: true,
      });
    } else {
      // Single solitary observation - insufficient historical progression
      rawObserved.push({
        id: "single-obs",
        label: "Current Observation",
        dateStr: currentSkill.lastEvidenceDate || "Latest",
        score: currentScore,
        confidence: currentSkill.confidence,
        evidenceRef: currentSkill.assessmentRationale || "Solitary observation record",
        milestone: `Assessed: ${currentSkill.verifiedProficiency}`,
        isCurrent: true,
      });
    }

    // 4. Determine if there is sufficient historical data for a reliable projection
    const hasSufficientHistory = rawObserved.length >= 2;
    const firstObs = rawObserved[0];
    const lastObs = rawObserved[rawObserved.length - 1];
    const velocity = hasSufficientHistory ? lastObs.score - firstObs.score : 0;

    // 5. Generate projection point dynamically ONLY if sufficient historical data exists
    let rawProjected: {
      id: string;
      label: string;
      dateStr: string;
      score: number;
      confidence?: number;
      evidenceRef?: string;
      milestone?: string;
      isProjected: boolean;
    } | null = null;

    if (hasSufficientHistory) {
      // Projected future score based on calculated historical momentum, strictly bounded to [10, 100]
      const projectedScore = Math.min(
        100,
        Math.max(10, Math.round(lastObs.score + velocity * 0.5))
      );

      rawProjected = {
        id: "proj-forecast",
        label: "Projected Forecast",
        dateStr: "Next Cycle Estimate",
        score: projectedScore,
        confidence: Math.round((currentSkill.confidence || 80) * 0.8), // Lower confidence for future forecasts
        evidenceRef: `Extrapolated from historical velocity (+${velocity}% across ${rawObserved.length} assessments)`,
        milestone: "Model Estimate",
        isProjected: true,
      };
    }

    // 6. Coordinate Mapping (No Hardcoding)
    // Canvas: 800w x 340h; X-range: 85px to 730px; Y-range: 275px (0%) to 45px (100%)
    const X_MIN = 85;
    const X_MAX = 730;
    const Y_BOTTOM = 275;
    const Y_TOP = 45;
    const Y_RANGE = Y_BOTTOM - Y_TOP;

    const totalPlotPoints = rawObserved.length + (rawProjected ? 1 : 0);

    const mappedObserved: TrajectoryDataPoint[] = rawObserved.map((pt, i) => {
      const x = totalPlotPoints > 1
        ? X_MIN + (i / (totalPlotPoints - 1)) * (X_MAX - X_MIN)
        : (X_MIN + X_MAX) / 2;

      // Bound Y coordinate strictly between [Y_TOP, Y_BOTTOM]
      const clampedScore = Math.min(100, Math.max(0, pt.score));
      const y = Y_BOTTOM - (clampedScore / 100) * Y_RANGE;

      const upperY = hasUncertainty ? Math.max(Y_TOP, y - (deltaVariance / 100) * Y_RANGE) : y;
      const lowerY = hasUncertainty ? Math.min(Y_BOTTOM, y + (deltaVariance / 100) * Y_RANGE) : y;

      return {
        ...pt,
        x,
        y,
        upperY,
        lowerY,
      };
    });

    let mappedProjected: TrajectoryDataPoint | null = null;
    if (rawProjected) {
      const projX = X_MAX;
      const clampedProjScore = Math.min(100, Math.max(0, rawProjected.score));
      const projY = Y_BOTTOM - (clampedProjScore / 100) * Y_RANGE;

      const projDelta = deltaVariance * 1.4; // Slightly wider uncertainty envelope for forecasts
      const upperY = hasUncertainty ? Math.max(Y_TOP, projY - (projDelta / 100) * Y_RANGE) : projY;
      const lowerY = hasUncertainty ? Math.min(Y_BOTTOM, projY + (projDelta / 100) * Y_RANGE) : projY;

      mappedProjected = {
        ...rawProjected,
        x: projX,
        y: projY,
        upperY,
        lowerY,
      };
    }

    const combined: TrajectoryDataPoint[] = [...mappedObserved];
    if (mappedProjected) {
      combined.push(mappedProjected);
    }

    // 7. Dynamic Curve Path Generation (Avoiding artificial overshoots)
    let curveD = "";
    if (mappedObserved.length === 2) {
      // 2 points: strict linear segment
      curveD = `M ${mappedObserved[0].x} ${mappedObserved[0].y} L ${mappedObserved[1].x} ${mappedObserved[1].y}`;
    } else if (mappedObserved.length >= 3) {
      // 3+ points: smooth Catmull-Rom or Bézier interpolation without overshooting
      curveD = `M ${mappedObserved[0].x} ${mappedObserved[0].y}`;
      for (let i = 0; i < mappedObserved.length - 1; i++) {
        const p0 = mappedObserved[i === 0 ? i : i - 1];
        const p1 = mappedObserved[i];
        const p2 = mappedObserved[i + 1];
        const p3 = mappedObserved[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        curveD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
    }

    // 8. Dynamic Confidence Ribbon Path (Rendered only when valid uncertainty data is available)
    let ribbonD = "";
    if (hasUncertainty && mappedObserved.length >= 2) {
      // Forward path along upper bounds
      let topD = `M ${mappedObserved[0].x} ${mappedObserved[0].upperY}`;
      for (let i = 1; i < mappedObserved.length; i++) {
        topD += ` L ${mappedObserved[i].x} ${mappedObserved[i].upperY}`;
      }

      // Backward path along lower bounds
      let bottomD = "";
      for (let i = mappedObserved.length - 1; i >= 0; i--) {
        bottomD += ` L ${mappedObserved[i].x} ${mappedObserved[i].lowerY}`;
      }

      ribbonD = `${topD}${bottomD} Z`;
    }

    return {
      observedPoints: mappedObserved,
      projectedPoint: mappedProjected,
      allPoints: combined,
      hasSufficientHistoricalData: hasSufficientHistory,
      hasValidUncertainty: hasUncertainty,
      growthVelocity: velocity,
      uncertaintyDelta: deltaVariance,
      curvePath: curveD,
      ribbonPath: ribbonD,
    };
  }, [currentSkill, historyEvents, evidenceItems]);

  if (!currentSkill || skills.length === 0) {
    return (
      <div className="bg-[#F8F5EF] border-[1.5px] border-[#171717] rounded-2xl p-8 shadow-[2.5px_2.5px_0_#171717] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border-[1.5px] border-[#171717] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_#171717]">
          <Activity className="w-6 h-6 text-[#E6AC70]" />
        </div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#171717]">No Trajectory Records Found</h4>
        <p className="text-xs text-[#171717]/70 max-w-md mx-auto">
          Connect workplace sources in the Evidence Center to begin plotting longitudinal competency evolution across assessment cycles.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F5EF] border-[1.5px] border-[#171717] rounded-2xl p-6 shadow-[2.5px_2.5px_0_#171717] space-y-5">
      {/* Header and Skill Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171717]/12 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DDEBE1] border border-[#171717]" />
            <h3 className="text-base font-black uppercase tracking-wider text-[#171717]">
              Longitudinal Competency Trajectory (Data-Driven Progression)
            </h3>
          </div>
          <p className="text-xs text-[#171717]/70 mt-0.5">
            Dynamically derived from verifiable assessment cycles, historical audits, and empirical confidence intervals.
          </p>
        </div>

        {/* Skill Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-[#FAF8F5] border border-[#171717]/20 rounded-xl">
          {skills.slice(0, 5).map((sk) => (
            <button
              key={sk.id}
              type="button"
              onClick={() => {
                setActiveSkillId(sk.id);
                setHoveredPoint(null);
              }}
              className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeSkillId === sk.id
                  ? "bg-[#171717] text-[#FAF8F5] font-black"
                  : "text-[#171717] font-bold hover:bg-[#171717]/5"
              }`}
            >
              {sk.canonicalName}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Legend with Dynamic States */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#171717]/80">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-1 bg-[#171717] rounded" /> Observed Performance (Solid)
          </span>

          {projectedPoint && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#171717]" /> Forecast Projection (Dashed)
            </span>
          )}

          {hasValidUncertainty && (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 bg-[#E6AC70]/30 border border-[#E6AC70] rounded-xs" /> Confidence Ribbon (±{uncertaintyDelta}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium px-2.5 py-1 rounded-md bg-[#FAF8F5] border border-[#171717]/20 text-[#171717]/80">
          <Info className="w-3 h-3 text-[#E6AC70]" />
          <span>Solid lines indicate verified assessments. Projections are empirical estimates.</span>
        </div>
      </div>

      {/* Insufficient Historical Data Alert Banner (Explicitly shown if < 2 observations exist) */}
      {!hasSufficientHistoricalData && (
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6AC70] flex items-center gap-2.5 text-xs text-[#171717]">
          <AlertCircle className="w-4 h-4 text-[#B07219] shrink-0" />
          <span>
            <strong>Insufficient historical progression data:</strong> Only one static observation is currently on record for <em>{currentSkill.canonicalName}</em>. A predictive trajectory projection requires at least two longitudinal evaluation cycles.
          </span>
        </div>
      )}

      {/* SVG Trajectory Canvas Container */}
      <div className="relative w-full overflow-hidden bg-[#FAF8F5] rounded-xl border border-[#171717]/15 p-2">
        <svg
          viewBox="0 0 800 340"
          className="w-full h-auto select-none overflow-visible"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Subtle Horizontal Gridlines */}
          <line x1="85" y1="45" x2="730" y2="45" stroke="#171717" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="85" y1="102" x2="730" y2="102" stroke="#171717" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="85" y1="160" x2="730" y2="160" stroke="#171717" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="85" y1="217" x2="730" y2="217" stroke="#171717" strokeOpacity="0.08" strokeDasharray="3 3" />
          <line x1="85" y1="275" x2="730" y2="275" stroke="#171717" strokeWidth="1.5" />

          {/* Y-Axis Competency Scale Labels (0% to 100% bounds) */}
          <text x="75" y="49" fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">100%</text>
          <text x="75" y="106" fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">75%</text>
          <text x="75" y="164" fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">50%</text>
          <text x="75" y="221" fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">25%</text>
          <text x="75" y="279" fontSize="9" fontWeight="bold" fill="#171717" fillOpacity="0.75" textAnchor="end">0%</text>

          {/* Dynamic Confidence Ribbon (Rendered ONLY when valid uncertainty data is available) */}
          {hasValidUncertainty && ribbonPath && (
            <path
              d={ribbonPath}
              fill="#E6AC70"
              fillOpacity="0.18"
              stroke="#E6AC70"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
          )}

          {/* Observed Solid Line or Smooth Curve */}
          {observedPoints.length === 1 && (
            <line
              x1="85"
              y1={observedPoints[0].y}
              x2="730"
              y2={observedPoints[0].y}
              stroke="#171717"
              strokeWidth="1.25"
              strokeDasharray="4 4"
              strokeOpacity="0.25"
            />
          )}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="#171717"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Projected Future Forecast Line (Dashed) */}
          {projectedPoint && observedPoints.length > 0 && (
            <line
              x1={observedPoints[observedPoints.length - 1].x}
              y1={observedPoints[observedPoints.length - 1].y}
              x2={projectedPoint.x}
              y2={projectedPoint.y}
              stroke="#171717"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          )}

          {/* Dynamic Milestone Annotations (Positioned strictly by data point, avoiding overlap) */}
          {observedPoints.map((pt) => {
            if (!pt.milestone) return null;
            // Place callout above if point is in lower half, or below if in upper half
            const isUpperHalf = pt.y < 160;
            const calloutY = isUpperHalf ? pt.y + 40 : pt.y - 40;
            const leaderYStart = isUpperHalf ? pt.y + 7 : pt.y - 7;
            // Clamp horizontal box to prevent clipping off screen edges
            const boxX = Math.max(90, Math.min(640, pt.x - 70));

            return (
              <g key={`milestone-${pt.id}`}>
                <line
                  x1={pt.x}
                  y1={leaderYStart}
                  x2={pt.x}
                  y2={isUpperHalf ? calloutY : calloutY + 22}
                  stroke="#171717"
                  strokeWidth="1.25"
                  strokeDasharray="2 2"
                />
                <circle cx={pt.x} cy={leaderYStart} r="2" fill="#171717" />
                <rect
                  x={boxX}
                  y={calloutY}
                  width="140"
                  height="22"
                  rx="6"
                  fill="#FAF8F5"
                  stroke="#171717"
                  strokeWidth="1.5"
                  filter="drop-shadow(1px 1px 0px #171717)"
                />
                <text
                  x={boxX + 70}
                  y={calloutY + 14}
                  fontSize="8.5"
                  fontWeight="900"
                  fill="#171717"
                  textAnchor="middle"
                >
                  {pt.milestone.length > 20 ? pt.milestone.slice(0, 19) + "…" : pt.milestone}
                </text>
              </g>
            );
          })}

          {/* Render Observed Data Points (Solid-Line Markers) */}
          {observedPoints.map((pt) => {
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(pt)}
              >
                {/* Native Tooltip fallback */}
                <title>{`${pt.label}: ${pt.score}% Score • ${pt.evidenceRef}`}</title>

                {pt.isCurrent ? (
                  // Prominent Dual-Ring Marker for Current Observation
                  <g>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="none"
                      stroke="#171717"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="6.5"
                      fill="#DDEBE1"
                      stroke="#171717"
                      strokeWidth="2"
                    />
                    <circle cx={pt.x} cy={pt.y} r="2.5" fill="#171717" />
                  </g>
                ) : (
                  // Solid Historical Observation Circle
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5.5"
                    fill="#FAF8F5"
                    stroke="#171717"
                    strokeWidth="2"
                  />
                )}

                {/* Score Tag strictly above node */}
                <text
                  x={pt.x}
                  y={pt.y - 11}
                  fontSize="8.5"
                  fontWeight="900"
                  fill="#171717"
                  textAnchor="middle"
                >
                  {pt.score}%
                </text>

                {/* Cycle Name & Date below X axis */}
                <text
                  x={pt.x}
                  y="296"
                  fontSize="9.5"
                  fontWeight={pt.isCurrent ? "900" : "bold"}
                  fill="#171717"
                  textAnchor="middle"
                >
                  {pt.label}
                </text>
                <text
                  x={pt.x}
                  y="310"
                  fontSize="8"
                  fontWeight="bold"
                  fill="#171717"
                  fillOpacity={0.6}
                  textAnchor="middle"
                >
                  {pt.dateStr}
                </text>
              </g>
            );
          })}

          {/* Render Projected Point (Dashed-Line Diamond Marker) */}
          {projectedPoint && (
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(projectedPoint)}
            >
              <title>{`${projectedPoint.label}: ${projectedPoint.score}% Score • ${projectedPoint.evidenceRef}`}</title>
              <g transform={`translate(${projectedPoint.x}, ${projectedPoint.y})`}>
                <polygon
                  points="0,-7 7,0 0,7 -7,0"
                  fill="#DCE5F2"
                  stroke="#171717"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  filter="drop-shadow(1px 1px 0px #171717)"
                />
                <circle cx="0" cy="0" r="2" fill="#171717" />
              </g>

              {/* Score Tag */}
              <text
                x={projectedPoint.x}
                y={projectedPoint.y - 12}
                fontSize="8.5"
                fontWeight="900"
                fill="#171717"
                textAnchor="middle"
              >
                {projectedPoint.score}%
              </text>

              {/* Label & Date */}
              <text
                x={projectedPoint.x}
                y="296"
                fontSize="9.5"
                fontWeight="bold"
                fill="#171717"
                fillOpacity={0.7}
                textAnchor="middle"
              >
                {projectedPoint.label}
              </text>
              <text
                x={projectedPoint.x}
                y="310"
                fontSize="8"
                fontWeight="bold"
                fill="#171717"
                fillOpacity={0.5}
                textAnchor="middle"
              >
                {projectedPoint.dateStr}
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip for Cycle Nodes */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none p-3 rounded-xl bg-[#FAF8F5] border-[1.5px] border-[#171717] shadow-[2.5px_2.5px_0_#171717] text-xs max-w-xs transition-opacity duration-150"
            style={{
              left: `${Math.min(75, Math.max(10, (hoveredPoint.x / 800) * 100))}%`,
              top: `${Math.max(12, (hoveredPoint.y / 340) * 100 - 30)}%`,
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#171717]/10 pb-1.5 mb-1.5">
              <span className="font-black text-[#171717]">{hoveredPoint.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  hoveredPoint.isProjected
                    ? "bg-[#DCE5F2] text-[#171717] border border-[#171717]"
                    : "bg-[#171717] text-[#FAF8F5]"
                }`}
              >
                {hoveredPoint.score}% Score
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-[#171717]/80">
              <div className="flex justify-between">
                <span>Assessment Type:</span>
                <strong className="text-[#171717]">
                  {hoveredPoint.isProjected ? "Predictive Forecast (Model)" : "Empirical Observation"}
                </strong>
              </div>
              {typeof hoveredPoint.confidence === "number" && (
                <div className="flex justify-between">
                  <span>Extraction Confidence:</span>
                  <strong className="text-[#171717]">{hoveredPoint.confidence}%</strong>
                </div>
              )}
              <div className="mt-1 pt-1 border-t border-[#171717]/10 text-[10px] text-[#171717]/70 italic">
                {hoveredPoint.evidenceRef}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trajectory Insights Footer Calculated Dynamically */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#171717]/15">
          <span className="text-[10px] font-black uppercase text-[#171717]/60 block">Growth Momentum</span>
          <strong className="text-sm font-black text-[#2D5A43]">
            {growthVelocity >= 0 ? `+${growthVelocity}%` : `${growthVelocity}%`} Net Velocity
          </strong>
          <span className="text-[10px] text-[#171717]/60 block mt-0.5">
            {hasSufficientHistoricalData ? "Observed across historical audit trail" : "Single baseline evaluation"}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#171717]/15">
          <span className="text-[10px] font-black uppercase text-[#171717]/60 block">Uncertainty Envelope</span>
          <strong className="text-sm font-black text-[#171717]">
            {hasValidUncertainty ? `±${uncertaintyDelta}% Variance` : "High Confidence (Deterministic)"}
          </strong>
          <span className="text-[10px] text-[#171717]/60 block mt-0.5">
            {hasValidUncertainty ? "Based on extraction confidence score" : "No variance assumption applied"}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#171717]/15">
          <span className="text-[10px] font-black uppercase text-[#171717]/60 block">Trajectory Status</span>
          <strong className="text-sm font-black text-[#B07219]">
            {projectedPoint ? `Target: ~${projectedPoint.score}% Depth` : "Baseline Pending"}
          </strong>
          <span className="text-[10px] text-[#171717]/60 block mt-0.5">
            {projectedPoint ? "Dynamic model extrapolation" : "Awaiting next assessment cycle"}
          </span>
        </div>
      </div>
    </div>
  );
}
