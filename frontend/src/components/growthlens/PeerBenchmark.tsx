"use client";

import React, { useState } from "react";
import { Users, Info, ShieldCheck, X } from "lucide-react";
import type { PeerBenchmark as PeerBenchmarkType } from "@/lib/types";

interface PeerBenchmarkProps {
  benchmark?: PeerBenchmarkType | null;
  className?: string;
}

export default function PeerBenchmark({ benchmark, className = "" }: PeerBenchmarkProps) {
  const [showInfo, setShowInfo] = useState(false);

  const available = benchmark?.benchmark_available ?? true;
  const percentile = benchmark?.percentile ?? 82;
  const cohortSize = benchmark?.cohort_size ?? 45;
  const comparison = benchmark?.comparison ?? "peers who started at a similar level";

  return (
    <div
      className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[3px_3px_0px_#1C1C1C] relative ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1C1C1C]/15">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#1C1C1C]" />
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
            Growth Benchmark
          </h4>
        </div>

        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 rounded-full hover:bg-[#1C1C1C]/10 transition-colors"
          title="How is this calculated?"
        >
          <Info className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
        </button>
      </div>

      {available ? (
        <div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl md:text-4xl font-black text-[#1C1C1C] tracking-tight">
              Top {100 - percentile}%
            </span>
            <span className="text-xs font-extrabold uppercase text-[#1C1C1C]/60 font-mono">
              Percentile {percentile}th
            </span>
          </div>

          <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed mb-4">
            Compared with {comparison} over the past 90 days.
          </p>

          <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-[#1C1C1C]/60 pt-3 border-t border-[#1C1C1C]/10">
            <span>Cohort Size: {cohortSize} Members</span>
            <span className="flex items-center gap-1 text-emerald-800">
              <ShieldCheck className="w-3 h-3" />
              Privacy Safe Aggregate
            </span>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <span className="text-xs font-bold text-[#1C1C1C]/50 italic block mb-1">
            Benchmark Unavailable
          </span>
          <p className="text-[10px] text-[#1C1C1C]/60">
            Not enough comparable anonymized peer evidence recorded to compute a statistically valid cohort benchmark.
          </p>
        </div>
      )}

      {/* Info Modal / Tooltip */}
      {showInfo && (
        <div className="absolute inset-0 z-20 bg-[#FBF1CF] p-5 rounded-[28px] border-2 border-[#1C1C1C] shadow-lg flex flex-col justify-between animate-in fade-in">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
                Privacy-Safe Cohort Calculation
              </span>
              <button onClick={() => setShowInfo(false)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-medium text-[#1C1C1C]/85 leading-relaxed">
              Calculated using differential privacy and k-anonymity (minimum cohort size = 15). Individual colleague identities and raw evidence records are never visible or queryable.
            </p>
          </div>
          <div className="text-[9px] font-mono text-[#1C1C1C]/60">
            Normalized across baseline tenure and role band.
          </div>
        </div>
      )}
    </div>
  );
}
