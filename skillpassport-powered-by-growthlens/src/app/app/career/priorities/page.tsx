"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  TrendingUp,
  Sparkles,
  Zap,
  FolderGit2,
  Sliders,
  ArrowRight,
  Info,
  Scale,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Compass,
  Briefcase,
} from "lucide-react";
import { GapRecord } from "@/types/career";

export default function GapPrioritizationPage() {
  const { activeRole, activeGaps } = useEvidence();

  const [strategyFilter, setStrategyFilter] = useState<
    "all" | "top3" | "quick_wins" | "critical_blockers"
  >("all");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);

  // System-calculated gap priorities via topological DAG prerequisite sequencing
  const dynamicRankedGaps = useMemo(() => {
    const list = [...activeGaps].map((gap) => ({
      ...gap,
      dynamic_score: gap.priority_score,
    }));

    // Sort descending by system priority score
    list.sort((a, b) => b.dynamic_score - a.dynamic_score);

    // Apply filters
    if (strategyFilter === "top3") {
      return list.slice(0, 3);
    }
    if (strategyFilter === "quick_wins") {
      return list.filter(
        (g) =>
          g.priority_inputs.evidence_leverage >= 1.2 ||
          g.priority_inputs.estimated_effort <= 2.0
      );
    }
    if (strategyFilter === "critical_blockers") {
      return list.filter(
        (g) => g.importance === "critical" || g.requirement_type === "core_required"
      );
    }

    return list;
  }, [activeGaps, strategyFilter]);

  if (!activeRole) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar
          title="Gap Prioritization & Leverage Engine"
          description="Rank development actions by expected career impact rather than chronological listing."
          badge="Strategic Prioritization"
          badgeColor="border-ink/20 text-ink bg-lime/40"
        />
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <TargetRoleSelectorBar />
          <div className="gl-card p-12 bg-white border border-ink/10 text-center space-y-4 max-w-xl mx-auto my-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-sand/40 border border-ink/10 flex items-center justify-center mx-auto text-ink">
              <Compass className="w-6 h-6 text-ink" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-ink">No active target role selected</h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Select a target role from our curated catalogue or parse a custom job description to calculate prioritized learning actions and prerequisite sequences.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/app/career/roles"
                className="pill-btn pill-btn-primary text-xs py-2 px-4 font-bold inline-flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Select Target Role
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Gap Prioritization & Leverage Engine"
        description="Rank development actions by expected career impact rather than chronological listing. Leverage existing projects to close gaps with minimum incremental effort."
        badge="Strategic Prioritization"
        badgeColor="border-ink/20 text-ink bg-lime/40"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Formula Explanation
        </button>
        <Link
          href="/app/career/readiness"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Career Readiness Index →
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector */}
      <TargetRoleSelectorBar />

      {/* Formula & Interactive Strategy Controls */}
      <div className="gl-card p-5 md:p-6 space-y-5 bg-[#FAF8F5] border-ink/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-ink" />
              Normalized Prioritization Formula Architecture (0–100 Scale)
            </span>
            <p className="text-xs text-ink-muted max-w-xl">
              <code className="bg-sand/40 px-2 py-0.5 rounded text-[11px] font-mono text-ink">
                Priority = (100 &times; Gap &times; Criticality &times; Urgency) &times; EffortDiscount &times; LeverageBoost
              </code>
            </p>
          </div>

          {/* Strategy Preset Chips */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => {
                setStrategyFilter("all");
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                strategyFilter === "all"
                  ? "bg-ink text-white"
                  : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
              }`}
            >
              Default Ranking
            </button>
            <button
              onClick={() => {
                setStrategyFilter("top3");
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                strategyFilter === "top3"
                  ? "bg-ink text-white"
                  : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
              }`}
            >
              Top 3 Focus
            </button>
            <button
              onClick={() => {
                setStrategyFilter("quick_wins");
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1 ${
                strategyFilter === "quick_wins"
                  ? "bg-ink text-white"
                  : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              Quick Wins
            </button>
            <button
              onClick={() => {
                setStrategyFilter("critical_blockers");
              }}
              className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                strategyFilter === "critical_blockers"
                  ? "bg-ink text-white"
                  : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
              }`}
            >
              Core Blockers
            </button>
          </div>
        </div>

        {/* System DAG Prerequisite & Priority Notice */}
        <div className="pt-4 border-t border-ink/10 flex items-center justify-between text-xs bg-sand/10 p-3 rounded-xl border border-ink/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ink shrink-0" />
            <span className="text-ink text-[11px] font-medium">
              Priority scores are strictly calculated by the system using <strong>topological DAG prerequisite sequencing</strong>, requirement criticality, and proficiency gap distance. No manual tuning required.
            </span>
          </div>
        </div>
      </div>

      {/* Prioritized Ranked Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-ink-muted px-1">
          <span>
            Displaying <strong>{dynamicRankedGaps.length}</strong> prioritized actions for <strong>{activeRole.title}</strong>
          </span>
          <span className="font-mono text-[10px]">
            Sorted by Dynamic Priority Score
          </span>
        </div>

        {dynamicRankedGaps.map((gap, index) => {
          const isExpanded = expandedGapId === gap.gap_id;

          return (
            <div
              key={gap.gap_id}
              className={`gl-card p-5 md:p-6 transition-all border-ink/15 space-y-4 ${
                index === 0
                  ? "bg-[#FAF8F5] border-lime-400"
                  : index === 1
                  ? "bg-[#FAF8F5]"
                  : "bg-white"
              }`}
            >
              {/* Card Top Row */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className="w-12 h-12 rounded-2xl bg-ink text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                    <span className="text-[10px] font-mono text-sand/80 uppercase">
                      Rank
                    </span>
                    <span className="text-lg font-black leading-none">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Title & Badges */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GapTypeBadge type={gap.gap_type} />
                      <RequirementTypeBadge type={gap.requirement_type} />
                      <ImportanceBadge importance={gap.importance} />
                    </div>
                    <h3 className="text-lg font-bold text-ink">
                      {gap.canonical_name}
                    </h3>
                    <p className="text-xs text-ink-muted max-w-xl leading-relaxed">
                      {gap.diagnosis}
                    </p>
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-ink-muted block">
                      Priority Score
                    </span>
                    <span className="text-xl font-mono font-black text-ink">
                      {gap.dynamic_score.toFixed(1)}
                    </span>
                  </div>

                  <Link
                    href={`/app/career/gaps/${gap.gap_id}`}
                    className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    Why This Gap?
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Existing Project Leverage Highlight */}
              {gap.project_leverage_example && (
                <div className="p-3.5 rounded-2xl bg-lime/15 border border-lime-300 flex items-start gap-3 text-xs">
                  <div className="w-7 h-7 rounded-xl bg-lime border border-ink/20 flex items-center justify-center shrink-0 mt-0.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-ink" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">
                        Existing Project Leverage: {gap.project_leverage_example.project_name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-white text-ink border border-ink/10">
                        High Efficiency
                      </span>
                    </div>
                    <p className="text-ink/80 text-[11px] leading-relaxed">
                      <strong>Extension Path:</strong> {gap.project_leverage_example.extension_idea}
                    </p>
                  </div>
                </div>
              )}

              {/* Expandable Variable Details */}
              <div className="pt-2 border-t border-ink/10">
                <button
                  onClick={() =>
                    setExpandedGapId(isExpanded ? null : gap.gap_id)
                  }
                  className="text-xs text-ink-muted hover:text-ink font-medium flex items-center gap-1.5"
                >
                  <span>
                    {isExpanded
                      ? "Hide factor calculation details"
                      : "Inspect 7 formula input variables"}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 p-3 rounded-xl bg-sand/20 border border-ink/10 text-center animate-fade-in text-xs">
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Criticality</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.criticality.toFixed(1)} / 5</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Level Gap</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.level_gap} Step{gap.priority_inputs.level_gap !== 1 ? 's' : ''}</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Dep Impact</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.dependency_impact.toFixed(1)} &times;</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Ev Leverage</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.evidence_leverage.toFixed(1)} &times;</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">User Fit</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.user_fit.toFixed(1)} &times;</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Marginal Gain</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.marginal_gain.toFixed(1)} / 3</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Effort</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.estimated_effort.toFixed(1)} / 5</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
    </div>
  </div>
);
}
