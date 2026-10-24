"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Info, Sparkles } from "lucide-react";

interface ConfidenceClaimItem {
  id: string;
  skill_name: string;
  extraction_confidence: number;
  evidence_strength: "high" | "medium" | "low";
  coverage_score: number;
}

interface ConfidenceCalibrationMatrixProps {
  claims: ConfidenceClaimItem[];
  selectedClaimId: string;
  onSelectClaim: (claimId: string) => void;
}

export default function ConfidenceCalibrationMatrix({
  claims,
  selectedClaimId,
  onSelectClaim,
}: ConfidenceCalibrationMatrixProps) {
  const [hoveredClaimId, setHoveredClaimId] = useState<string | null>(null);

  if (!claims || claims.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-white text-center text-xs text-[#1C1C1C]/60">
        No confidence claims available to plot. Ingest evidence artifacts to calibrate trust.
      </div>
    );
  }

  // Y-axis mapping: High = 85%, Medium = 50%, Low = 18%
  const strengthToY = (strength: "high" | "medium" | "low") => {
    switch (strength) {
      case "high":
        return 22; // % from top
      case "medium":
        return 52;
      case "low":
        return 80;
    }
  };

  const activeClaim =
    claims.find((c) => c.id === (hoveredClaimId || selectedClaimId)) || null;

  return (
    <div className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
            Domain 5 · 2D Uncertainty Calibration
          </span>
          <h3 className="text-base font-black text-[#1C1C1C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4A7A4E]" />
            NLP Extraction Certainty vs Workplace Evidence Strength
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-[#2E6941] flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E6941]" /> Verified Ground Truth
          </span>
          <span className="text-[#BA1A1A] flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#BA1A1A]" /> High-Risk Uncorroborated
          </span>
        </div>
      </div>

      {/* 2D Interactive Scatter / Matrix Canvas */}
      <div className="relative w-full h-[260px] bg-white rounded-2xl border border-[#1C1C1C]/20 p-6 overflow-hidden shadow-inner">
        {/* Quadrant Background Tints */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-35 pointer-events-none">
          <div className="bg-blue-50 border-r border-b border-[#1C1C1C]/15" />
          <div className="bg-emerald-100/60 border-b border-[#1C1C1C]/15" />
          <div className="bg-sand/30 border-r border-[#1C1C1C]/15" />
          <div className="bg-rose-100/50" />
        </div>

        {/* Quadrant Labels */}
        <div className="absolute top-2 left-4 text-[9px] font-mono font-bold text-[#1C1C1C]/40 uppercase pointer-events-none">
          Under-Extracted Artifacts
        </div>
        <div className="absolute top-2 right-4 text-[9px] font-mono font-bold text-[#2E6941] uppercase pointer-events-none">
          ★ Robust Ground Truth (Verified)
        </div>
        <div className="absolute bottom-6 left-4 text-[9px] font-mono font-bold text-[#1C1C1C]/40 uppercase pointer-events-none">
          Candidate Baseline
        </div>
        <div className="absolute bottom-6 right-4 text-[9px] font-mono font-bold text-[#BA1A1A] uppercase pointer-events-none">
          ⚠ Hallucination Risk (High NLP / Low Proof)
        </div>

        {/* Y-Axis Guidelines & Labels */}
        <div className="absolute left-2 top-0 bottom-6 flex flex-col justify-between text-[9px] font-mono font-bold text-[#1C1C1C]/60 py-3 pointer-events-none">
          <span>HIGH</span>
          <span>MEDIUM</span>
          <span>LOW</span>
        </div>

        {/* X-Axis Baseline & Scale */}
        <div className="absolute bottom-1.5 left-12 right-6 flex justify-between text-[9px] font-mono font-bold text-[#1C1C1C]/50 pointer-events-none">
          <span>0% NLP Certainty</span>
          <span>50%</span>
          <span>100% NLP Certainty</span>
        </div>

        {/* Plotted Data Points */}
        <div className="absolute inset-0 left-10 right-4 top-2 bottom-6">
          {claims.map((claim) => {
            const x = Math.min(95, Math.max(5, claim.extraction_confidence));
            const y = strengthToY(claim.evidence_strength);
            const isSelected = selectedClaimId === claim.id;
            const isHovered = hoveredClaimId === claim.id;

            // Determine point color
            const isTopRight = claim.extraction_confidence >= 65 && claim.evidence_strength === "high";
            const isBottomRight = claim.extraction_confidence >= 70 && claim.evidence_strength === "low";
            const dotColor = isTopRight ? "#2E6941" : isBottomRight ? "#BA1A1A" : "#B07219";

            return (
              <button
                key={claim.id}
                type="button"
                onClick={() => onSelectClaim(claim.id)}
                onMouseEnter={() => setHoveredClaimId(claim.id)}
                onMouseLeave={() => setHoveredClaimId(null)}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all p-1 group z-20`}
                title={`${claim.skill_name}: ${claim.extraction_confidence}% NLP, Strength: ${claim.evidence_strength}`}
              >
                <span
                  style={{ backgroundColor: dotColor }}
                  className={`block rounded-full border border-[#1C1C1C] transition-all ${
                    isSelected
                      ? "w-4 h-4 ring-2 ring-[#1C1C1C] scale-125"
                      : isHovered
                      ? "w-3.5 h-3.5 scale-110 shadow-sm"
                      : "w-2.5 h-2.5"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Point Inspector Footer Banner */}
      {activeClaim && (
        <div className="p-3 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-[#1C1C1C]">{activeClaim.skill_name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1C1C1C] text-[#FAF8F5]">
              {activeClaim.extraction_confidence}% NLP
            </span>
            <span className="text-[10px] font-bold uppercase text-[#1C1C1C]/70">
              Strength: {activeClaim.evidence_strength}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#4A7A4E] font-bold">
            Coverage Score: {activeClaim.coverage_score}%
          </span>
        </div>
      )}
    </div>
  );
}
