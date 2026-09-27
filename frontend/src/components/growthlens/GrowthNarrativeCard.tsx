"use client";

import React from "react";
import { Sparkles, ArrowRight, Quote, CheckCircle2 } from "lucide-react";
import PillButton from "./PillButton";
import Link from "next/link";

interface GrowthNarrativeCardProps {
  narrativeText?: string;
  evidenceCount?: number;
  competenciesAnalyzed?: number;
  onViewEvidence?: () => void;
  className?: string;
}

export default function GrowthNarrativeCard({
  narrativeText = "Backend Engineering & API Development competency improved steadily, supported by recent asynchronous queuing pull requests and connection pool resolution, while technical collaboration remained consistent.",
  evidenceCount = 21,
  competenciesAnalyzed = 6,
  onViewEvidence,
  className = "",
}: GrowthNarrativeCardProps) {
  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[#1C1C1C]/15">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-700" />
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Your quarter, in context
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white">
            Derived from {evidenceCount} Verified Signals
          </span>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968]">
            {competenciesAnalyzed} Competencies
          </span>
        </div>
      </div>

      {/* Narrative Editorial Text */}
      <div className="relative pl-6 border-l-2 border-[#1C1C1C] mb-6">
        <p className="text-sm md:text-base font-semibold text-[#1C1C1C] leading-relaxed">
          {narrativeText}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1C1C1C]/15">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
          Synthesized by Local Qwen3 8B with strict citation boundaries
        </span>

        {onViewEvidence ? (
          <PillButton variant="secondary" size="sm" onClick={onViewEvidence}>
            VIEW SUPPORTING EVIDENCE →
          </PillButton>
        ) : (
          <Link href="/employee/evidence">
            <PillButton variant="secondary" size="sm">
              VIEW SUPPORTING EVIDENCE →
            </PillButton>
          </Link>
        )}
      </div>
    </div>
  );
}
