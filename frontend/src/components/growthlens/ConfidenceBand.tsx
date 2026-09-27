"use client";

import React from "react";
import { Info, ShieldAlert, Sparkles } from "lucide-react";

interface ConfidenceBandProps {
  confidence: number; // 0-100 or 0-1
  freshness?: "fresh" | "recent" | "aging" | "stale";
  daysSinceLast?: number;
  evidenceCount?: number;
  showExplanation?: boolean;
  className?: string;
}

export default function ConfidenceBand({
  confidence,
  freshness = "fresh",
  daysSinceLast = 0,
  evidenceCount = 0,
  showExplanation = true,
  className = "",
}: ConfidenceBandProps) {
  const normConfidence = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);

  const freshnessInfo = {
    fresh: { label: "High Freshness", barColor: "bg-[#DFE968]", text: "Active work signals within recent weeks" },
    recent: { label: "Recent Signals", barColor: "bg-[#DFE968]/80", text: "Signals recorded within expected cadence" },
    aging: { label: "Aging Evidence", barColor: "bg-[#F6BB84]", text: "Confidence is decaying due to lack of recent signals" },
    stale: { label: "Stale Baseline", barColor: "bg-[#F6C8D6]", text: "Historical baseline only. New work evidence needed to recalibrate" },
  };

  const currentFresh = freshnessInfo[freshness] || freshnessInfo.fresh;

  return (
    <div className={`p-4 rounded-[22px] border border-[#1C1C1C] bg-[#FBF1CF]/70 shadow-[2px_2px_0px_#1C1C1C] ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]">
            Model Confidence & Freshness
          </span>
        </div>
        <span className="text-xs font-black font-mono text-[#1C1C1C]">
          {normConfidence}%
        </span>
      </div>

      {/* Confidence Visual Gauge */}
      <div className="w-full h-3 bg-[#1C1C1C]/10 rounded-full border border-[#1C1C1C] overflow-hidden p-0.5 mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${currentFresh.barColor}`}
          style={{ width: `${Math.max(5, normConfidence)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-[#1C1C1C]/70">
        <span>{evidenceCount} Evidence Points</span>
        <span>
          {daysSinceLast <= 0 ? "Last: Today" : `Last: ${daysSinceLast}d ago`} • {currentFresh.label}
        </span>
      </div>

      {showExplanation && (
        <div className="mt-3 pt-2.5 border-t border-[#1C1C1C]/15 flex items-start gap-1.5 text-[10px] font-medium text-[#1C1C1C]/75 leading-relaxed">
          <Info className="w-3 h-3 shrink-0 mt-0.5 text-[#1C1C1C]/60" />
          <span>
            {currentFresh.text}. <em className="italic">Confidence decreases when recent evidence is unavailable, but this does not imply skill loss.</em>
          </span>
        </div>
      )}
    </div>
  );
}
