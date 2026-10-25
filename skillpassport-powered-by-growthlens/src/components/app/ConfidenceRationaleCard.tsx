"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Sparkles,
  Layers,
} from "lucide-react";
import { ConfidenceRationale } from "@/types/career";

interface ConfidenceScoreExplainerProps {
  score?: number;
  explanation?: string;
  rationale?: ConfidenceRationale;
  skillName?: string;
  className?: string;
  defaultExpanded?: boolean;
  compactBadgeOnly?: boolean;
}

export function ConfidenceScoreExplainer({
  score,
  explanation,
  rationale,
  skillName,
  className = "",
  defaultExpanded = false,
  compactBadgeOnly = false,
}: ConfidenceScoreExplainerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  // Normalize score percent
  const rawScore = score ?? rationale?.score ?? 0;
  const scorePercent =
    rationale?.score_percent ??
    (rawScore <= 1.0 ? Math.round(rawScore * 100) : Math.round(rawScore));

  // Determine badge styling based on score
  let badgeClass = "bg-sand/30 text-ink-muted border-ink/20";
  if (scorePercent >= 85) {
    badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (scorePercent >= 60) {
    badgeClass = "bg-amber-50 text-amber-800 border-amber-300";
  } else if (scorePercent > 0) {
    badgeClass = "bg-purple-50 text-purple-800 border-purple-300";
  }

  // Summary fallback
  const summaryText =
    rationale?.summary ||
    explanation ||
    (scorePercent === 0
      ? "Assigned 0% confidence because no verifiable work evidence is currently connected in your Skill Passport."
      : `Assigned ${scorePercent}% confidence based on available source evidence records.`);

  if (compactBadgeOnly) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeClass}`}
        title={`Confidence: ${scorePercent}%`}
      >
        {scorePercent}% Conf.
      </span>
    );
  }

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      {/* Confidence Pill & Toggle Button */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badgeClass}`}
        >
          {scorePercent}% Confidence
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-ink hover:text-ink/70 underline underline-offset-2 transition-colors focus:outline-none"
          aria-expanded={isExpanded}
        >
          <HelpCircle className="w-3.5 h-3.5 text-ink-muted" />
          <span>{isExpanded ? "Hide rationale" : "Why this score?"}</span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-ink-muted" />
          ) : (
            <ChevronDown className="w-3 h-3 text-ink-muted" />
          )}
        </button>

        {rationale?.model_assisted && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-50 text-sky-800 border border-sky-200">
            <Sparkles className="w-2.5 h-2.5" /> Ollama Qwen3 8B
          </span>
        )}
      </div>

      {/* Expanded Explanation Card */}
      {isExpanded && (
        <div className="p-4 rounded-xl bg-sand/15 border border-ink/15 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-ink/10 pb-2">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-ink-muted block">
                Evidence Rationale
              </span>
              <h4 className="text-xs font-bold text-ink">
                Why was {scorePercent}% confidence assigned{skillName ? ` for ${skillName}` : ""}?
              </h4>
            </div>
            <span className="text-[10px] font-mono text-ink-muted shrink-0">
              Score: {scorePercent}/100
            </span>
          </div>

          {/* Score Meaning */}
          {rationale?.score_meaning && (
            <p className="text-[11px] text-ink-muted italic border-l-2 border-ink/20 pl-2.5 py-0.5">
              {rationale.score_meaning}
            </p>
          )}

          {/* Concise Summary */}
          <div className="p-3 rounded-lg bg-white border border-ink/10 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-ink-muted block">
              Assessment Summary
            </span>
            <p className="text-xs text-ink/90 leading-relaxed font-sans font-normal">
              {summaryText}
            </p>
          </div>

          {/* Supporting Factors */}
          {rationale?.supporting_factors && rationale.supporting_factors.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Supporting Evidence & Capabilities
              </span>
              <ul className="space-y-1">
                {rationale.supporting_factors.map((factor: string, idx: number) => (
                  <li
                    key={idx}
                    className="text-[11px] text-ink/80 bg-emerald-50/60 p-2 rounded-md border border-emerald-200/50 flex items-start gap-1.5"
                  >
                    <span className="text-emerald-700 font-bold shrink-0">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Limitations */}
          {rationale?.evidence_limitations && rationale.evidence_limitations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> Evidence Limitations & Shortfalls
              </span>
              <ul className="space-y-1">
                {rationale.evidence_limitations.map((limitation: string, idx: number) => (
                  <li
                    key={idx}
                    className="text-[11px] text-ink/80 bg-amber-50/60 p-2 rounded-md border border-amber-200/50 flex items-start gap-1.5"
                  >
                    <span className="text-amber-700 font-bold shrink-0">•</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Uncertainty & Ethical Assessment Note */}
          <div className="p-2.5 rounded-lg bg-sand/30 border border-ink/10 text-[10px] text-ink-muted leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-0.5" />
            <div>
              <strong className="text-ink font-semibold">Evaluation Principle: </strong>
              {rationale?.uncertainty_notes?.[0] ||
                "A skill gap indicates that verifiable work evidence has not yet been connected under the current evaluation policy; it does not serve as proof that you lack the capability to perform the work."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
