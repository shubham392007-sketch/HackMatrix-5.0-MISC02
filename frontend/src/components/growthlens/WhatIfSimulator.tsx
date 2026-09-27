"use client";

import React, { useState } from "react";
import { Sparkles, Sliders, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";
import PillButton from "./PillButton";
import TrendIndicator from "./TrendIndicator";
import { trajectory as trajectoryApi } from "@/lib/api";
import type { WhatIfSimulationResponse } from "@/lib/types";

interface WhatIfSimulatorProps {
  employeeId: string;
  competencyId: string;
  competencyName: string;
  currentTrend?: string;
  currentConfidence?: number;
  className?: string;
}

export default function WhatIfSimulator({
  employeeId,
  competencyId,
  competencyName,
  currentTrend = "stagnating",
  currentConfidence = 75,
  className = "",
}: WhatIfSimulatorProps) {
  const [actionType, setActionType] = useState<string>("course_completion");
  const [simulatedScore, setSimulatedScore] = useState<number>(85);
  const [description, setDescription] = useState<string>("Advanced Systems Architecture & Verification");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<WhatIfSimulationResponse | null>(null);
  const [error, setError] = useState<string>("");

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await trajectoryApi.simulateTrajectory({
        employee_id: employeeId,
        competency_id: competencyId,
        action_type: actionType,
        simulated_score: simulatedScore,
        simulated_description: description,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to execute counterfactual simulation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
            COUNTERFACTUAL SIMULATION
          </span>
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            What if you took the next step?
          </h3>
          <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/70 mt-0.5">
            Test hypothetical learning interventions in an isolated sandbox with zero production database mutations.
          </p>
        </div>

        <div className="p-2 px-3 rounded-full border border-[#1C1C1C] bg-white text-[10px] font-bold text-[#1C1C1C]">
          Target: <span className="font-black">{competencyName}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form */}
        <form onSubmit={handleSimulate} className="lg:col-span-5 space-y-5">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
              Reinforcement Action
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="pill-input text-xs"
            >
              <option value="course_completion">Course Completion & Certification</option>
              <option value="project_outcome">Core Project Delivery / PR Merge</option>
              <option value="assessment">Quarterly Technical Assessment</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                Hypothetical Score: {simulatedScore} pts
              </label>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              value={simulatedScore}
              onChange={(e) => setSimulatedScore(Number(e.target.value))}
              className="w-full accent-[#1C1C1C] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#1C1C1C]/50 mt-1">
              <span>50 pts (Baseline)</span>
              <span>100 pts (Mastery)</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
              Action Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g. Completed Distributed Systems Exam"
              className="pill-input text-xs"
            />
          </div>

          <PillButton
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="w-full justify-center"
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {loading ? "COMPUTING TENSOR PROJECTION..." : "SIMULATE ACTION →"}
          </PillButton>

          <p className="text-[10px] text-[#1C1C1C]/60 text-center italic">
            Counterfactual simulation • Projected result, not a guarantee.
          </p>
        </form>

        {/* Right Column: Comparative Results */}
        <div className="lg:col-span-7">
          {error && (
            <div className="p-4 rounded-2xl border border-[#C85A54] bg-[#F6C8D6]/40 text-xs font-bold text-[#C85A54] mb-4">
              {error}
            </div>
          )}

          {result ? (
            <div className="p-5 md:p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] shadow-[3px_3px_0px_#1C1C1C] space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1C]/15">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70">
                  Projected Trajectory Impact
                </span>
                {result.trend_changed && (
                  <span className="px-2.5 py-0.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black text-[#1C1C1C]">
                    TRAJECTORY ACCELERATED
                  </span>
                )}
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Current Baseline */}
                <div className="p-4 rounded-2xl border border-[#1C1C1C] bg-white">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                    CURRENT BASELINE
                  </span>
                  <div className="mb-2">
                    <TrendIndicator trend={result.baseline?.trend || currentTrend} size="sm" />
                  </div>
                  <div className="text-xs font-mono font-bold text-[#1C1C1C]">
                    Conf: {Math.round((result.baseline?.confidence || 0) * 100)}%
                  </div>
                  <div className="text-[10px] text-[#1C1C1C]/60 mt-1">
                    {result.baseline?.evidence_count || 0} evidence points
                  </div>
                </div>

                {/* Simulated Projection */}
                <div className="p-4 rounded-2xl border-2 border-[#1C1C1C] bg-[#DFE968]/40 shadow-[2px_2px_0px_#1C1C1C]">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C] block mb-1">
                    SIMULATED PROJECTION
                  </span>
                  <div className="mb-2">
                    <TrendIndicator trend={result.projected?.trend || "improving"} size="sm" />
                  </div>
                  <div className="text-xs font-mono font-black text-[#1C1C1C]">
                    Conf: {Math.round((result.projected?.confidence || 0) * 100)}%
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800 mt-1">
                    +{result.projected?.evidence_count ? 1 : 0} simulated signal
                  </div>
                </div>
              </div>

              {/* Model Explanation */}
              <div className="p-3.5 rounded-xl border border-[#1C1C1C]/20 bg-white/70 text-xs font-medium text-[#1C1C1C]/85 leading-relaxed">
                {result.projected?.explanation || "Simulated evidence reinforces positive momentum."}
              </div>

              {/* Disclaimer */}
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#1C1C1C]/50 text-right">
                {result.disclaimer || "Isolated simulation. Not saved to production database."}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[220px] rounded-[28px] border border-dashed border-[#1C1C1C]/30 bg-white/40 flex flex-col items-center justify-center p-6 text-center">
              <Sliders className="w-8 h-8 text-[#1C1C1C]/30 mb-2" />
              <p className="text-xs font-bold text-[#1C1C1C]/60">
                Adjust intervention parameters on the left and run simulation to project trajectory delta.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
