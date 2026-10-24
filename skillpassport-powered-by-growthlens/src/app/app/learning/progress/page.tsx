"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  MasteryProgressBar,
  TopicDifficultyBadge,
  StepStatusBadge,
  MasteryFormulaModal,
} from "@/components/app/LearningBadges";
import {
  TrendingUp,
  BarChart3,
  Award,
  Sparkles,
  GitBranch,
  Info,
  CheckCircle,
  Clock,
  ArrowRight,
  Sliders,
  Layers,
  HelpCircle,
  FileCheck2,
} from "lucide-react";
import { calculateTopicMastery } from "@/lib/learningCalculations";
import AppTopBar from "@/components/app/AppTopBar";
import TopicMasteryComponentBars from "@/components/learning/TopicMasteryComponentBars";
import { LayoutGrid, Table as TableIcon } from "lucide-react";

export default function LearningProgressPage() {
  const { activeBlueprint, activeRoadmap, activeDiagnosticResult } = useEvidence();

  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const allTopics = activeBlueprint?.modules ? activeBlueprint.modules.flatMap((m) => m.topics || []) : [];
  const [selectedTopicId, setSelectedTopicId] = useState<string>("topic-outlier-winsorization");
  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");

  const selectedTopic = (selectedTopicId ? allTopics.find((t) => t.id === selectedTopicId) : null) || allTopics[0] || null;

  // Interactive formula simulator state for the selected topic
  const [simK, setSimK] = useState<number>(selectedTopic?.knowledge_signal ?? 70);
  const [simP, setSimP] = useState<number>(selectedTopic?.practice_signal ?? 60);
  const [simA, setSimA] = useState<number>(selectedTopic?.assessment_signal ?? 75);
  const [simPrj, setSimPrj] = useState<number>(selectedTopic?.project_signal ?? 65);

  React.useEffect(() => {
    if (selectedTopic) {
      setSimK(selectedTopic.knowledge_signal ?? 70);
      setSimP(selectedTopic.practice_signal ?? 60);
      setSimA(selectedTopic.assessment_signal ?? 75);
      setSimPrj(selectedTopic.project_signal ?? 65);
    } else {
      setSimK(0);
      setSimP(0);
      setSimA(0);
      setSimPrj(0);
    }
  }, [selectedTopic]);

  const simulatedMastery = calculateTopicMastery(simK ?? 0, simP ?? 0, simA ?? 0, simPrj ?? 0);

  // Overall summary stats
  const avgMastery = Math.round(
    allTopics.length > 0
      ? allTopics.reduce((acc, t) => acc + (t.current_mastery || 0), 0) / allTopics.length
      : (activeRoadmap?.current_mastery || 0)
  );
  const baseline = activeDiagnosticResult?.overall_score || activeRoadmap?.baseline_mastery || 0;
  const target = activeBlueprint?.target_mastery || 85;
  const growthDelta = avgMastery - baseline;

  const getTierLabel = (score: number) => {
    if (score >= 85) return { label: "Advanced", color: "bg-emerald-100 text-emerald-800" };
    if (score >= 70) return { label: "Proficient", color: "bg-blue-100 text-blue-800" };
    if (score >= 40) return { label: "Developing", color: "bg-amber-100 text-amber-800" };
    return { label: "Novice", color: "bg-stone-200 text-stone-800" };
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Progress & Topic Mastery"
        description={`Inspect your verified progress across ${activeBlueprint.title}. Unlike opaque AI estimations, our mastery model uses an exact deterministic formula: 0.30 K + 0.25 P + 0.20 A + 0.25 Prj.`}
        badge="Domain 5 Â· Mastery Analytics"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFormulaModal(true)}
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5" />
            Inspect Formula
          </button>
          <Link
            href="/app/learning/capability"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Bridge to SkillPassport &rarr;
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

        {/* Baseline vs Current vs Target Trio */}
        <div className="gl-card p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
              <span className="text-xs font-semibold text-ink/60">Diagnostic Baseline</span>
              <div className="text-2xl font-extrabold text-ink">{baseline}%</div>
              <p className="text-[11px] text-ink/50">Initial pre-test benchmark</p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border-2 border-peach/50 space-y-1">
              <span className="text-xs font-semibold text-ink/60">Current Domain Mastery</span>
              <div className="text-2xl font-extrabold text-ink">{avgMastery}%</div>
              <p className="text-[11px] text-emerald-700 font-bold">
                +{growthDelta > 0 ? growthDelta : 0}% Growth Delta
              </p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
              <span className="text-xs font-semibold text-ink/60">Target Domain Goal</span>
              <div className="text-2xl font-extrabold text-ink">{target}%</div>
              <p className="text-[11px] text-ink/50">Production practitioner benchmark</p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
              <span className="text-xs font-semibold text-ink/60">Pacing Telemetry</span>
              <div className="text-lg font-extrabold text-ink">
                {activeRoadmap.pace === "fast_track" ? "Fast-Track" : "Standard Pace"}
              </div>
              <p className="text-[11px] text-ink/50">{activeRoadmap.study_hours_per_week} hrs/week planned</p>
            </div>
          </div>
        </div>

      {/* Topic Mastery Matrix Table */}
      <div className="gl-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-peach" />
              Topic Mastery Matrix
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Every topic tracks four independent signals. Hover or click to simulate in the sandbox below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-paper rounded-xl border border-ink/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === "visual"
                    ? "bg-ink text-[#FAF8F5] shadow-sm"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Component Bars</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-ink text-[#FAF8F5] shadow-sm"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Data Table</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-ink/70">
              <span className="px-2 py-0.5 rounded border border-ink/15 bg-white text-ink">Novice (&lt;40%)</span>
              <span className="px-2 py-0.5 rounded border border-ink/15 bg-white text-ink">Dev (40-69%)</span>
              <span className="px-2 py-0.5 rounded border border-ink/15 bg-white text-ink">Prof (70-84%)</span>
              <span className="px-2 py-0.5 rounded border border-ink/15 bg-white text-ink">Adv (85%+)</span>
            </div>
          </div>
        </div>

        {viewMode === "visual" ? (
          <TopicMasteryComponentBars
            topics={allTopics}
            selectedTopicId={selectedTopicId}
            onSelectTopic={(topicId) => {
              setSelectedTopicId(topicId);
              const t = allTopics.find((x) => x.id === topicId);
              if (t) {
                setSimK(t.knowledge_signal);
                setSimP(t.practice_signal);
                setSimA(t.assessment_signal);
                setSimPrj(t.project_signal);
              }
            }}
          />
        ) : (
        <div className="overflow-x-auto border border-ink/10 rounded-2xl bg-paper">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-ink/10 bg-card text-ink font-bold">
                <th className="p-3.5">Topic & Objective</th>
                <th className="p-3.5 text-center">Knowledge (30%)</th>
                <th className="p-3.5 text-center">Practice (25%)</th>
                <th className="p-3.5 text-center">Assessment (20%)</th>
                <th className="p-3.5 text-center">Project (25%)</th>
                <th className="p-3.5 text-center">Mastery Score</th>
                <th className="p-3.5 text-center">Proficiency Tier</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {allTopics.map((topic) => {
                const tier = getTierLabel(topic.current_mastery);
                const isSelected = selectedTopicId === topic.id;

                return (
                  <tr
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      setSimK(topic.knowledge_signal);
                      setSimP(topic.practice_signal);
                      setSimA(topic.assessment_signal);
                      setSimPrj(topic.project_signal);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-peach/15 font-medium" : "hover:bg-card-hover"
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="font-bold text-ink">{topic.title}</div>
                      <div className="text-[11px] text-ink/60 line-clamp-1">
                        {topic.learning_objective}
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-ink/5 font-semibold">
                        {topic.knowledge_signal}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-ink/5 font-semibold">
                        {topic.practice_signal}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-ink/5 font-semibold">
                        {topic.assessment_signal}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-ink/5 font-semibold">
                        {topic.project_signal}%
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="w-24 mx-auto">
                        <MasteryProgressBar
                          current={topic.current_mastery}
                          target={topic.target_mastery}
                        />
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${tier.color}`}>
                        {tier.label}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      {(() => {
                        const matchingStep = activeRoadmap?.steps?.find(
                          (s) => s.topic_id === topic.id || s.step_id === `step-${topic.id}` || s.step_id === topic.id
                        );
                        const stepHref = matchingStep
                          ? `/app/learning/steps/${matchingStep.step_id}?roadmap_id=${encodeURIComponent(activeRoadmap.path_id || activeRoadmap.id || "")}`
                          : `/app/learning/steps/step-${topic.id}`;
                        return (
                          <Link
                            href={stepHref}
                            className="text-xs font-bold text-ink hover:underline inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Learn â†’
                          </Link>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Interactive Mastery Simulator Sandbox */}
      <div className="gl-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink/60">
              <Sliders className="w-3.5 h-3.5 text-peach" />
              Real-Time What-If Mastery Simulator
            </div>
            <h2 className="text-xl font-extrabold text-ink mt-1">
              Simulate Score Lift for: {selectedTopic.title}
            </h2>
            <p className="text-xs text-ink/70">
              Adjust individual signals to see how passing an assessment or submitting a project directly alters the computed mastery.
            </p>
          </div>

          <div className="p-4 bg-paper rounded-2xl border-2 border-ink/20 shadow-sm text-center shrink-0 min-w-[200px]">
            <div className="text-xs text-ink/60 font-semibold">Simulated Mastery</div>
            <div className="text-3xl font-extrabold text-ink mt-0.5">
              {simulatedMastery}%
            </div>
            <div className="text-[11px] font-bold mt-1">
              {simulatedMastery >= selectedTopic.target_mastery ? (
                <span className="text-emerald-700">âœ“ Meets Target ({selectedTopic.target_mastery}%)</span>
              ) : (
                <span className="text-amber-700">Needs +{selectedTopic.target_mastery - simulatedMastery}% to Pass</span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-ink/10">
          <div className="space-y-2 p-3 bg-paper/60 rounded-xl border border-ink/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Knowledge (30%)</span>
              <span className="font-mono font-bold text-ink">{simK}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simK ?? 0}
              onChange={(e) => setSimK(Number(e.target.value) || 0)}
              className="w-full accent-ink"
            />
            <p className="text-[10px] text-ink/50">Driven by reading packet & knowledge checks</p>
          </div>

          <div className="space-y-2 p-3 bg-paper/60 rounded-xl border border-ink/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Practice (25%)</span>
              <span className="font-mono font-bold text-ink">{simP}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simP ?? 0}
              onChange={(e) => setSimP(Number(e.target.value) || 0)}
              className="w-full accent-ink"
            />
            <p className="text-[10px] text-ink/50">Driven by completed coding exercises</p>
          </div>

          <div className="space-y-2 p-3 bg-paper/60 rounded-xl border border-ink/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Assessment (20%)</span>
              <span className="font-mono font-bold text-ink">{simA}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simA ?? 0}
              onChange={(e) => setSimA(Number(e.target.value) || 0)}
              className="w-full accent-ink"
            />
            <p className="text-[10px] text-ink/50">Driven by timed objective evaluations</p>
          </div>

          <div className="space-y-2 p-3 bg-paper/60 rounded-xl border border-ink/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-ink">Project (25%)</span>
              <span className="font-mono font-bold text-ink">{simPrj}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={simPrj ?? 0}
              onChange={(e) => setSimPrj(Number(e.target.value) || 0)}
              className="w-full accent-ink"
            />
            <p className="text-[10px] text-ink/50">Driven by mini-project rubric score</p>
          </div>
        </div>
      </div>

      {/* Formula Modal */}
      {showFormulaModal && (
        <MasteryFormulaModal
          isOpen={showFormulaModal}
          onClose={() => setShowFormulaModal(false)}
        />
      )}
      </div>
    </div>
  );
}
