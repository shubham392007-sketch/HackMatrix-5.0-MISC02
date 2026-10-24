"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RoadmapStep } from "@/types/learning";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  GitBranch,
  ArrowRight,
} from "lucide-react";

interface RoadmapMilestoneDagProps {
  steps: RoadmapStep[];
  onSelectStep?: (stepId: string) => void;
}

export default function RoadmapMilestoneDag({
  steps,
  onSelectStep,
}: RoadmapMilestoneDagProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    steps.find((s) => s.status === "in_progress")?.step_id || steps[0]?.step_id || null
  );

  if (!steps || steps.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-ink/20 bg-paper text-center text-xs text-ink/60">
        No roadmap steps generated yet. Run diagnostic or select preferences above.
      </div>
    );
  }

  const selectedStep = steps.find((s) => s.step_id === selectedStepId) || steps[0];

  const getStatusNodeStyle = (status: RoadmapStep["status"]) => {
    switch (status) {
      case "completed":
        return {
          bg: "bg-emerald-50 border-emerald-600 text-emerald-950",
          badge: "bg-emerald-600 text-white",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: "Completed",
        };
      case "in_progress":
        return {
          bg: "bg-[#DFE968]/30 border-ink ring-2 ring-ink text-ink shadow-sm",
          badge: "bg-ink text-[#FAF8F5]",
          icon: <PlayCircle className="w-3.5 h-3.5 text-ink animate-pulse" />,
          label: "In Progress",
        };
      case "needs_remediation":
        return {
          bg: "bg-amber-50 border-amber-500 text-amber-950",
          badge: "bg-amber-600 text-white",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: "Remediation",
        };
      case "available":
        return {
          bg: "bg-white border-ink/40 text-ink hover:border-ink",
          badge: "bg-sand/60 text-ink",
          icon: <PlayCircle className="w-3.5 h-3.5 text-ink/70" />,
          label: "Available",
        };
      default:
        return {
          bg: "bg-sand/20 border-ink/15 text-ink/40 opacity-70",
          badge: "bg-sand/40 text-ink/50",
          icon: <Lock className="w-3.5 h-3.5 text-ink/40" />,
          label: "Locked",
        };
    }
  };

  return (
    <div className="p-6 rounded-[24px] border-[1.5px] border-ink bg-[#FBF6DF] space-y-6 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink/60 block mb-0.5">
            Domain 4 · Topological Progression
          </span>
          <h3 className="text-base font-black text-ink flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-ink" />
            Interactive Milestone Learning DAG
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            {steps.filter((s) => s.status === "completed").length} Completed
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#DFE968] text-ink border border-ink">
            {steps.filter((s) => s.status === "in_progress").length} Active
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sand/40 text-ink/60 border border-ink/20">
            {steps.filter((s) => s.status === "locked").length} Locked
          </span>
        </div>
      </div>

      {/* Horizontal Scrollable Node Pipeline */}
      <div className="overflow-x-auto pb-3 pt-1 scrollbar-thin">
        <div className="flex items-center gap-3 min-w-max px-1">
          {steps.map((st, idx) => {
            const isSelected = selectedStepId === st.step_id;
            const style = getStatusNodeStyle(st.status);
            const isLast = idx === steps.length - 1;

            return (
              <React.Fragment key={st.step_id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStepId(st.step_id);
                    if (onSelectStep) onSelectStep(st.step_id);
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all shrink-0 w-[190px] relative ${
                    style.bg
                  } ${
                    isSelected
                      ? "ring-2 ring-ink shadow-md -translate-y-1 scale-[1.02]"
                      : "hover:scale-[1.01] hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[10px] font-mono font-black uppercase text-ink/60">
                      Step 0{idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {style.icon}
                      <span className="text-[9px] font-bold uppercase">{style.label}</span>
                    </div>
                  </div>

                  <h4 className="text-xs font-black text-ink line-clamp-2 leading-snug mb-2">
                    {st.title}
                  </h4>

                  <div className="mt-auto pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] font-mono text-ink/70">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {st.estimated_minutes}m
                    </span>
                    <span className="font-bold text-ink">
                      {st.current_mastery}% / {st.target_mastery}%
                    </span>
                  </div>
                </button>

                {!isLast && (
                  <div className="shrink-0 flex items-center px-0.5 text-ink/30">
                    <ChevronRight className="w-5 h-5 text-ink/40" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Step Deep Dive Inspector */}
      {selectedStep && (
        <div className="p-4 rounded-2xl bg-white border border-ink/15 space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-ink text-[#FAF8F5]">
                  Milestone Inspector
                </span>
                <span className="text-xs font-bold text-ink">{selectedStep.difficulty} Difficulty</span>
              </div>
              <h4 className="text-base font-black text-ink">{selectedStep.title}</h4>
            </div>

            <Link
              href={`/app/learning/steps/${selectedStep.step_id}`}
              className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shrink-0"
            >
              <span>Launch Step Learning Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-ink block">Learning Objective:</span>
              <p className="text-ink/80 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-ink/10">
                {selectedStep.learning_objective}
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="font-bold text-ink block">Recommendation Context:</span>
              <p className="text-ink/80 leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-ink/10">
                {selectedStep.recommendation_reason || "Selected based on initial diagnostic baseline evaluation."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
