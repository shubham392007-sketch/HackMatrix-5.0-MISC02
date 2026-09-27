"use client";

import React from "react";
import type { TrajectoryProbabilities } from "@/lib/types";

interface ProbabilityBreakdownProps {
  probabilities: TrajectoryProbabilities;
  predictedTrend?: string;
  className?: string;
}

export default function ProbabilityBreakdown({
  probabilities,
  predictedTrend = "improving",
  className = "",
}: ProbabilityBreakdownProps) {
  const imp = Math.round((probabilities.improving || 0) * 100);
  const sta = Math.round((probabilities.stagnating || 0) * 100);
  const dec = Math.round((probabilities.declining || 0) * 100);

  return (
    <div className={`p-4 rounded-[22px] border border-[#1C1C1C] bg-[#FBF6DF] shadow-[2px_2px_0px_#1C1C1C] ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70">
          LSTM Softmax Likelihoods
        </span>
        <span className="text-[10px] font-mono font-bold uppercase text-[#1C1C1C]/60">
          Argmax: {predictedTrend.replace("_", " ")}
        </span>
      </div>

      {/* Segmented compact bar */}
      <div className="w-full h-3 rounded-full border border-[#1C1C1C] flex overflow-hidden mb-3 p-0.5 bg-[#1C1C1C]/5">
        {imp > 0 && (
          <div
            title={`Improving: ${imp}%`}
            style={{ width: `${imp}%` }}
            className="h-full bg-[#DFE968] rounded-l-full transition-all duration-300"
          />
        )}
        {sta > 0 && (
          <div
            title={`Stagnating: ${sta}%`}
            style={{ width: `${sta}%` }}
            className="h-full bg-[#F3A878] transition-all duration-300"
          />
        )}
        {dec > 0 && (
          <div
            title={`Declining: ${dec}%`}
            style={{ width: `${dec}%` }}
            className="h-full bg-[#F6C8D6] rounded-r-full transition-all duration-300"
          />
        )}
      </div>

      {/* Legend & numeric stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 rounded-lg border border-[#1C1C1C]/15 bg-[#DFE968]/30">
          <div className="text-[9px] font-extrabold uppercase text-[#1C1C1C]/70">Improving</div>
          <div className="text-xs font-black font-mono text-[#1C1C1C]">{imp}%</div>
        </div>
        <div className="p-1.5 rounded-lg border border-[#1C1C1C]/15 bg-[#F3A878]/30">
          <div className="text-[9px] font-extrabold uppercase text-[#1C1C1C]/70">Stagnating</div>
          <div className="text-xs font-black font-mono text-[#1C1C1C]">{sta}%</div>
        </div>
        <div className="p-1.5 rounded-lg border border-[#1C1C1C]/15 bg-[#F6C8D6]/40">
          <div className="text-[9px] font-extrabold uppercase text-[#1C1C1C]/70">Declining</div>
          <div className="text-xs font-black font-mono text-[#1C1C1C]">{dec}%</div>
        </div>
      </div>
    </div>
  );
}
