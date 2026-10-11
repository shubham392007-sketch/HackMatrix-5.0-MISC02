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
} from "lucide-react";
import { GapRecord } from "@/types/career";

export default function GapPrioritizationPage() {
  const { activeRole, activeGaps } = useEvidence();

  const [strategyFilter, setStrategyFilter] = useState<
    "all" | "top3" | "quick_wins" | "critical_blockers"
  >("all");
  const [effortWeight, setEffortWeight] = useState<number>(1.0); // 0.5 to 2.0
  const [leverageBoost, setLeverageBoost] = useState<number>(1.0); // 1.0 to 2.0
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);
  const [expandedGapId, setExpandedGapId] = useState<string | null>(null);

  // Dynamic re-ranking based on interactive sliders
  const dynamicRankedGaps = useMemo(() => {
    const list = [...activeGaps].map((gap) => {
      const inputs = gap.priority_inputs;
      // Recalculate score with user-adjusted parameters
      const adjustedScore =
        (inputs.criticality *
          inputs.level_gap *
          inputs.dependency_impact *
          (inputs.evidence_leverage * leverageBoost) *
          inputs.user_fit *
          inputs.marginal_gain) /
        (inputs.estimated_effort * effortWeight);

      return {
        ...gap,
        dynamic_score: adjustedScore,
      };
    });

    // Sort descending by dynamic_score
    list.sort((a, b) => b.dynamic_score - a.dynamic_score);

    // Apply filters
    if (strategyFilter === "top3") {
      return list.slice(0, 3);
    }
    if (strategyFilter === "quick_wins") {
      return list.filter(
        (g) =>
          g.priority_inputs.evidence_leverage >= 2 ||
          g.priority_inputs.estimated_effort <= 2
      );
    }
    if (strategyFilter === "critical_blockers") {
      return list.filter(
        (g) => g.importance === "critical" || g.requirement_type === "core_required"
      );
    }

    return list;
  }, [activeGaps, effortWeight, leverageBoost, strategyFilter]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime/40 text-ink border border-ink/20 font-bold">
              Domain 4 &bull; Feature 8
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              Strategic Prioritization
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              DEMO DATA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">
            Gap Prioritization & Leverage Engine
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Rank development actions by expected career impact rather than chronological listing.
            Leverage existing projects to close gaps with minimum incremental effort.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Target Role Selector */}
      <TargetRoleSelectorBar />

      {/* Formula & Interactive Strategy Controls */}
      <div className="gl-card p-5 md:p-6 space-y-5 bg-gradient-to-r from-cream via-white to-sand/20 border-ink/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-ink" />
              Prioritization Formula Architecture
            </span>
            <p className="text-xs text-ink-muted max-w-xl">
              <code className="bg-sand/40 px-2 py-0.5 rounded text-[11px] font-mono text-ink">
                Priority = (Criticality &times; &Delta;Level &times; DepImpact &times; EvLeverage &times; UserFit &times; MarginalGain) / Effort
              </code>
            </p>
          </div>

          {/* Strategy Preset Chips */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => {
                setStrategyFilter("all");
                setEffortWeight(1.0);
                setLeverageBoost(1.0);
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
                setLeverageBoost(1.6);
                setEffortWeight(1.4);
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

        {/* Real-time Weight Sliders */}
        <div className="pt-4 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 p-3 rounded-xl bg-white border border-ink/10">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-ink">Effort Sensitivity Discount:</span>
              <span className="font-mono font-bold text-ink">{effortWeight.toFixed(1)}&times;</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={effortWeight}
              onChange={(e) => setEffortWeight(parseFloat(e.target.value))}
              className="w-full accent-ink h-1.5 bg-sand/40 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-ink-muted block">
              Higher values penalize high-effort skills and prioritize low-effort wins.
            </span>
          </div>

          <div className="space-y-1.5 p-3 rounded-xl bg-white border border-ink/10">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-ink">Existing Evidence Leverage Multiplier:</span>
              <span className="font-mono font-bold text-ink">{leverageBoost.toFixed(1)}&times;</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.1"
              value={leverageBoost}
              onChange={(e) => setLeverageBoost(parseFloat(e.target.value))}
              className="w-full accent-ink h-1.5 bg-sand/40 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-ink-muted block">
              Boosts skills where you already have existing project repositories that can be extended.
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
                  ? "bg-gradient-to-r from-lime/10 via-white to-white border-lime-400"
                  : index === 1
                  ? "bg-gradient-to-r from-amber-50/40 via-white to-white"
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
                      <strong className="font-mono text-ink">{gap.priority_inputs.criticality} / 5</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Level Gap</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.level_gap} Steps</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Dep Impact</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.dependency_impact} / 3</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Ev Leverage</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.evidence_leverage} / 3</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">User Fit</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.user_fit} / 3</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Marginal Gain</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.marginal_gain} / 3</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-ink/5">
                      <span className="text-[10px] text-ink-muted block">Effort</span>
                      <strong className="font-mono text-ink">{gap.priority_inputs.estimated_effort} / 5</strong>
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
  );
}
