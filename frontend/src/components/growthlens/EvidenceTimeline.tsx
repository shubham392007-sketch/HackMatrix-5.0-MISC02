"use client";

import React from "react";
import { GitPullRequest, CheckSquare, Award, Terminal, Calendar, ChevronRight } from "lucide-react";
import type { Evidence } from "@/lib/types";
import StatusBadge from "./StatusBadge";

interface EvidenceTimelineProps {
  items: Evidence[];
  onSelectEvidence?: (ev: Evidence) => void;
  className?: string;
}

export default function EvidenceTimeline({
  items,
  onSelectEvidence,
  className = "",
}: EvidenceTimelineProps) {
  // Sort chronological oldest to newest or newest to oldest
  const chronological = [...items].slice(0, 8);

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
            LONGITUDINAL CADENCE
          </span>
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Evidence Accumulation Timeline
          </h3>
          <p className="text-xs font-medium text-[#1C1C1C]/70 mt-0.5">
            Chronological progression of work signals forming longitudinal competency trajectories.
          </p>
        </div>

        <div className="text-[11px] font-bold font-mono text-[#1C1C1C]">
          {items.length} Chronological Records
        </div>
      </div>

      {/* Horizontal timeline on desktop, vertical on mobile */}
      <div className="relative">
        {/* Desktop horizontal track line */}
        <div className="hidden lg:block absolute top-[27px] left-4 right-4 h-0.5 bg-[#1C1C1C]/20 z-0" />

        {/* Desktop horizontal view */}
        <div className="hidden lg:grid grid-cols-4 xl:grid-cols-8 gap-3 relative z-10">
          {chronological.map((item, idx) => {
            const dateStr = item.occurred_at
              ? new Date(item.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : `Event ${idx + 1}`;
            const primaryComp = item.competencies?.[0] || item.skills?.[0] || "Backend";

            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectEvidence && onSelectEvidence(item)}
                className="cursor-pointer group flex flex-col items-center text-center p-3 rounded-2xl border border-[#1C1C1C] bg-white hover:bg-[#DFE968]/30 transition-all shadow-[2px_2px_0px_#1C1C1C] hover:-translate-y-1"
              >
                {/* Node dot on line */}
                <div className="w-5 h-5 rounded-full border-2 border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center text-[9px] font-black mb-2 shadow-[1px_1px_0px_#1C1C1C]">
                  {idx + 1}
                </div>

                <span className="text-[10px] font-black font-mono text-[#1C1C1C] block mb-1">
                  {dateStr}
                </span>

                <StatusBadge type="source" source={item.source} size="sm" className="mb-1.5" />

                <div className="text-[10px] font-bold text-[#1C1C1C] line-clamp-1">
                  {primaryComp}
                </div>

                <div className="text-[9px] text-[#1C1C1C]/60 line-clamp-2 mt-1 leading-snug">
                  {item.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile vertical view */}
        <div className="lg:hidden space-y-3 relative">
          <div className="absolute top-4 bottom-4 left-4 w-0.5 bg-[#1C1C1C]/20" />
          {chronological.map((item, idx) => {
            const dateStr = item.occurred_at
              ? new Date(item.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : `Event ${idx + 1}`;
            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectEvidence && onSelectEvidence(item)}
                className="relative pl-10 cursor-pointer group"
              >
                <div className="absolute left-2.5 top-3 -translate-x-1/2 w-4 h-4 rounded-full border border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center text-[8px] font-black" />
                <div className="p-3.5 rounded-2xl border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C] group-hover:bg-[#DFE968]/20 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[#1C1C1C]">
                      {dateStr}
                    </span>
                    <StatusBadge type="source" source={item.source} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-[#1C1C1C] line-clamp-1 mb-1">
                    {item.title}
                  </h4>
                  <div className="flex gap-1">
                    {(item.competencies || []).slice(0, 1).map((c) => (
                      <span key={c} className="text-[9px] font-bold text-[#1C1C1C]/70">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
