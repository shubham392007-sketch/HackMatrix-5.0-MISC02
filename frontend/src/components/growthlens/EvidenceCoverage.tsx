"use client";

import React from "react";
import { Layers, Info } from "lucide-react";
import type { Evidence } from "@/lib/types";

interface EvidenceCoverageProps {
  items: Evidence[];
  className?: string;
}

export default function EvidenceCoverage({ items, className = "" }: EvidenceCoverageProps) {
  // Aggregate evidence counts per competency
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    (item.competencies || []).forEach((c) => {
      counts[c] = (counts[c] || 0) + 1;
    });
    // Fallback to primary skills if competencies not yet populated
    if (!item.competencies || item.competencies.length === 0) {
      (item.skills || []).forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    }
  });

  const sortedComps = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const maxVal = Math.max(...Object.values(counts), 1);

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
            INGESTION DEPTH
          </span>
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Evidence Coverage
          </h3>
          <p className="text-xs font-medium text-[#1C1C1C]/70 mt-0.5">
            Quantity of verifiable activity signals available across competencies.
          </p>
        </div>

        <div className="p-2 rounded-xl border border-[#1C1C1C]/20 bg-[#FBF1CF] flex items-center gap-1.5 text-[10px] font-bold text-[#1C1C1C]/70">
          <Info className="w-3.5 h-3.5 text-[#1C1C1C]/60 shrink-0" />
          <span>Represents evidence availability, not skill evaluation.</span>
        </div>
      </div>

      <div className="space-y-4">
        {sortedComps.map(([comp, count]) => {
          const pct = Math.round((count / maxVal) * 100);
          return (
            <div key={comp} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-black text-[#1C1C1C]">
                <span className="truncate max-w-[70%]">{comp}</span>
                <span className="font-mono text-[#1C1C1C]/70">{count} Signals</span>
              </div>
              <div className="w-full h-3 rounded-full border border-[#1C1C1C] bg-white p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#DFE968] transition-all duration-500"
                  style={{ width: `${Math.max(6, pct)}%` }}
                />
              </div>
            </div>
          );
        })}

        {sortedComps.length === 0 && (
          <p className="text-xs text-[#1C1C1C]/60 italic text-center py-4">
            No competency signals detected yet. Run sync to populate coverage.
          </p>
        )}
      </div>
    </div>
  );
}
