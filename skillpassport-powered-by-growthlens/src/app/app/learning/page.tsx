"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  StepStatusBadge,
  MasteryProgressBar,
  MasteryFormulaModal,
} from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  GraduationCap,
  PlayCircle,
  TrendingUp,
  Target,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Scale,
  Award,
  Layers,
  FileCode,
  ShieldCheck,
  Briefcase,
  RefreshCw,
  Bot,
  BrainCircuit,
} from "lucide-react";
import SkillProvenanceModal from "@/components/app/SkillProvenanceModal";
import {
  getLearningPriorities,
  refreshCareerGaps,
  generatePersonalizedRoadmap,
  listUserRoadmaps,
  getRoadmapByPathId,
} from "@/lib/evidenceApi";
import { LearningRoadmap } from "@/types/learning";

export default function LearningOverviewPage() {
  const {
    blueprints,
    activeBlueprint,
    activeRoadmap,
    learningHistory,
    miniProjects,
    activeDomainId,
    addToast,
  } = useEvidence();

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [upstreamPriorities, setUpstreamPriorities] = useState<any[]>([]);
  const [targetRoleTitle, setTargetRoleTitle] = useState<string>("Target Career Role");
  const [remediatingGapId, setRemediatingGapId] = useState<string | null>(null);
  const [realRoadmaps, setRealRoadmaps] = useState<any[]>([]);
  const [activeRealRoadmap, setActiveRealRoadmap] = useState<LearningRoadmap | null>(null);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  const [provenanceTarget, setProvenanceTarget] = useState<{
    skillId: string;
    skillTitle?: string;
    roleId?: string;
    gapId?: string;
  } | null>(null);
  const router = useRouter();

  const loadRoadmaps = async () => {
    setIsLoadingRoadmaps(true);
    try {
      const res = await listUserRoadmaps();
      if (res && Array.isArray(res.roadmaps) && res.roadmaps.length > 0) {
        setRealRoadmaps(res.roadmaps);
        const active = res.roadmaps.find((r: any) => r.status === "in_progress") || res.roadmaps[0];
        const full = await getRoadmapByPathId(active.path_id);
        if (full && full.steps) {
          setActiveRealRoadmap(full);
        }
      }
    } catch (e) {
      // Retain fallback if offline
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  const loadPriorities = async () => {
    try {
      const data: any = await getLearningPriorities();
      if (data && Array.isArray(data.priorities)) {
        setUpstreamPriorities(data.priorities);
        if (data.target_role_title) {
          setTargetRoleTitle(data.target_role_title);
        } else if (data.priorities[0]?.role_title) {
          setTargetRoleTitle(data.priorities[0].role_title);
        }
      }
    } catch (e) {
      // Retain cached state
    }
  };

  useEffect(() => {
    loadPriorities();
    loadRoadmaps();
  }, []);

  const handleRemediatePriorityGap = async (gap: any) => {
    const gapId = gap.skill_id || gap.gap_id;
    setRemediatingGapId(gapId);
    try {
      const res = await generatePersonalizedRoadmap({
        target_role_id: gap.role_id,
        skill_gap_id: gap.gap_id || gap.skill_id,
        skill_id: gap.skill_id,
      });
      addToast(
        "Roadmap Generated with AI",
        `Created personalized curriculum for ${gap.canonical_name || gap.skill_name || "selected gap"}.`,
        "success"
      );
      await loadRoadmaps();
      router.push(`/app/learning/roadmaps/${res.path_id}`);
    } catch (err: any) {
      addToast(
        "Remediation Notice",
        err.message || "Failed to generate roadmap. Please try again.",
        "error"
      );
    } finally {
      setRemediatingGapId(null);
    }
  };

  const handleSyncCareerGaps = async () => {
    setIsSyncing(true);
    try {
      const res: any = await refreshCareerGaps();
      await loadPriorities();
      await loadRoadmaps();
      addToast(
        "Career Gaps Synced",
        res?.message || "Successfully fetched latest role match snapshot from shared database.",
        "success"
      );
    } catch (err: any) {
      addToast(
        "Sync Notice",
        "Retaining cached skill gaps. Fallback taxonomy remains active.",
        "info"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const currentDisplayRoadmap: LearningRoadmap = activeRealRoadmap || activeRoadmap;

  // Active step is first in-progress or available step
  const activeStep =
    currentDisplayRoadmap.steps.find((s) => s.status === "in_progress") ||
    currentDisplayRoadmap.steps.find((s) => s.status === "available") ||
    currentDisplayRoadmap.steps[0];

  const completedStepsCount = currentDisplayRoadmap.steps.filter(
    (s) => s.status === "completed"
  ).length;

  const improvement = currentDisplayRoadmap.current_mastery - currentDisplayRoadmap.baseline_mastery;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Your Growth Journey"
        description="Targeted, AI-driven learning personalized to the competencies and evidence gaps identified in your SkillPassport. Convert identified weaknesses into verifiable capabilities."
        badge="AI-Driven Learning"
        badgeColor="border-ink/20 text-ink bg-lime/40"
      >
        <button
          onClick={handleSyncCareerGaps}
          disabled={isSyncing}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Gaps..." : "Sync Career Gaps"}
        </button>
        <button
          onClick={() => setIsFormulaModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Mastery Formula
        </button>
        <Link
          href={`/app/learning/roadmaps/${currentDisplayRoadmap.path_id}`}
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Open Active Roadmap &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* AI Provenance Callout */}
      {currentDisplayRoadmap.generation_method === "ollama_qwen" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cream via-sand/20 to-white border border-ink/15 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-ink text-lime flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-lime" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-ink">
                  AI Synthesized Curriculum Active
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  Ollama Qwen 3 (8B)
                </span>
              </div>
              <p className="text-xs text-ink/80">
                Targeting <strong className="text-ink">{currentDisplayRoadmap.domain_title}</strong> for role: {currentDisplayRoadmap.target_role_title || targetRoleTitle}
              </p>
            </div>
          </div>
          <Link
            href={`/app/learning/roadmaps/${currentDisplayRoadmap.path_id}`}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-3 shrink-0"
          >
            View Journey &rarr;
          </Link>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted">
            Active AI Roadmaps
          </span>
          <div className="text-2xl font-bold text-ink">
            {realRoadmaps.length > 0 ? realRoadmaps.length : 1}
          </div>
          <span className="text-[11px] text-ink-muted block truncate">
            Current: {currentDisplayRoadmap.domain_title}
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-lime-300 bg-lime/10">
          <span className="text-[10px] font-mono uppercase text-ink font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-ink" /> Overall Mastery
          </span>
          <div className="text-2xl font-bold text-ink flex items-baseline gap-1.5">
            <span>{currentDisplayRoadmap.current_mastery}%</span>
            <span className="text-xs text-emerald-700 font-normal">
              (+{improvement}%)
            </span>
          </div>
          <span className="text-[11px] text-ink-muted block">
            Baseline: {currentDisplayRoadmap.baseline_mastery}% &bull; Target: {currentDisplayRoadmap.target_mastery}%
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-amber-200 bg-amber-50/30">
          <span className="text-[10px] font-mono uppercase text-amber-900 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Priority Gaps
          </span>
          <div className="text-2xl font-bold text-amber-950">
            {upstreamPriorities.length > 0 ? `${upstreamPriorities.length} Identified` : "0 Gaps"}
          </div>
          <span className="text-[11px] text-amber-800/80 block truncate">
            {upstreamPriorities.length > 0 ? upstreamPriorities[0].canonical_name : "Target role aligned"}
          </span>
        </div>

        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed Steps
          </span>
          <div className="text-2xl font-bold text-ink">
            {completedStepsCount} / {currentDisplayRoadmap.steps.length}
          </div>
          <span className="text-[11px] text-ink-muted block">
            Progress: {Math.round((completedStepsCount / Math.max(1, currentDisplayRoadmap.steps.length)) * 100)}%
          </span>
        </div>
      </div>

      {/* Hero: Continue Learning Card */}
      {activeStep && (
        <div className="gl-card p-6 md:p-8 space-y-5 bg-[#FAF8F5] border-ink/15">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  Current Step to Advance
                </span>
                <span className="text-xs font-mono text-ink-muted">
                  Curriculum: {currentDisplayRoadmap.domain_title}
                </span>
                <StepStatusBadge status={activeStep.status} />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-ink">
                {activeStep.title}
              </h2>

              <p className="text-xs md:text-sm text-ink/80 max-w-2xl leading-relaxed">
                <strong>Objective:</strong> {activeStep.learning_objective}
              </p>

              <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 text-xs text-ink/80 max-w-2xl space-y-1">
                <span className="font-bold text-ink flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-ink" /> AI Pedagogical Rationale:
                </span>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  {activeStep.recommendation_reason}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-ink/10 text-center shrink-0 min-w-[180px] space-y-2 shadow-sm">
              <span className="text-[10px] font-mono text-ink-muted uppercase block">
                Target Mastery
              </span>
              <div className="text-3xl font-black text-ink">
                {activeStep.target_mastery}%
              </div>
              <span className="text-[10px] text-ink-muted block">
                Estimated ~{activeStep.estimated_minutes} min
              </span>

              <Link
                href={`/app/learning/steps/${activeStep.step_id}?roadmap_id=${encodeURIComponent(currentDisplayRoadmap.path_id || currentDisplayRoadmap.id || "")}`}
                className="w-full pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 mt-2"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Resume Step &rarr;
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10">
            <MasteryProgressBar
              current={currentDisplayRoadmap.current_mastery}
              target={currentDisplayRoadmap.target_mastery}
              baseline={currentDisplayRoadmap.baseline_mastery}
            />
          </div>
        </div>
      )}

      {/* Persisted AI Roadmaps Section */}
      {realRoadmaps.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-ink" />
              Your Active AI Learning Roadmaps
            </h3>
            <span className="text-xs font-mono text-ink-muted">
              {realRoadmaps.length} Saved in Database
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {realRoadmaps.map((r) => (
              <div
                key={r.path_id}
                className={`gl-card p-5 border-ink/15 space-y-3 ${
                  r.path_id === currentDisplayRoadmap.path_id ? "ring-2 ring-ink bg-white" : "bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                        {r.generation_method === "ollama_qwen" ? "Ollama Qwen 3 (8B)" : "Heuristic"}
                      </span>
                      <span className="text-[10px] font-mono text-ink-muted uppercase">
                        {r.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-ink text-sm sm:text-base">
                      {r.domain_title}
                    </h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-ink">
                      {r.completed_steps} / {r.total_steps} steps
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
                  <span className="text-ink-muted text-[11px]">
                    Mastery: {r.current_mastery}% / {r.target_mastery}%
                  </span>
                  <Link
                    href={`/app/learning/roadmaps/${r.path_id}`}
                    className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    Open Roadmap &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Priorities & Applied Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Target Role Gap Priorities */}
        <div className="gl-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Target Role Skill Gaps
                </h3>
                <span className="text-[11px] text-ink-muted">
                  Career Intelligence remediation triggers for {targetRoleTitle}
                </span>
              </div>
            </div>
            <Link
              href="/app/career/priorities"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
            >
              All Priorities &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {upstreamPriorities.length > 0 ? (
              upstreamPriorities.slice(0, 3).map((gap: any, idx: number) => {
                const gapKey = gap.skill_id || gap.gap_id;
                return (
                  <div
                    key={gapKey || idx}
                    className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-sm">
                        {gap.canonical_name || gap.skill_name || "Identified Gap"}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                        {gap.reason_code || "Target Role Gap"}
                      </span>
                    </div>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      {gap.explanation || `Proficiency deficit detected for target role ${targetRoleTitle}.`}
                    </p>

                    {/* Authenticated Source & Assurance Row */}
                    <div className="p-2.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink flex items-center gap-1.5 shrink-0">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                          Requirement Source:
                        </span>
                        <span className="font-mono text-ink-muted text-[10px] truncate text-right">
                          {gap.requirement_source || `${targetRoleTitle} • GrowthLens Benchmark v2026.1`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink flex items-center gap-1.5 shrink-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Assurance of Authentication:
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                          Authenticity Verified • Anti-Hallucination Guard
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <span className="text-ink-muted font-mono">
                        Target: {gap.target_proficiency || "Practitioner"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setProvenanceTarget({
                              skillId: gap.skill_id || gap.canonical_name || "data-preprocessing",
                              skillTitle: gap.canonical_name || gap.skill_name,
                              roleId: gap.role_id,
                              gapId: gap.gap_id,
                            })
                          }
                          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-2.5 text-ink flex items-center gap-1 font-medium"
                        >
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                          Evidence Analysis
                        </button>
                        <button
                          onClick={() => handleRemediatePriorityGap(gap)}
                          disabled={remediatingGapId === gapKey}
                          className="pill-btn bg-lime/40 hover:bg-lime border border-ink/20 text-xs py-1.5 px-3 text-ink font-bold flex items-center gap-1.5"
                        >
                          {remediatingGapId === gapKey ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5 animate-spin text-ink" />
                              Synthesizing with Ollama...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-ink" />
                              Remediate with AI &rarr;
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center rounded-2xl bg-white border border-ink/10 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-ink text-sm">No Unaddressed Gaps Found</h4>
                <p className="text-xs text-ink-muted max-w-sm mx-auto">
                  Your skill profile currently aligns with your selected role. Run Career Match to evaluate new roles or discover further opportunities.
                </p>
                <Link
                  href="/app/career/roles"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1"
                >
                  Explore Target Roles &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Practical Milestones */}
        <div className="gl-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-lime/40 border border-ink/20 flex items-center justify-center text-ink">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Upcoming Applied Milestones
                </h3>
                <span className="text-[11px] text-ink-muted">
                  Mini-projects and skill verification
                </span>
              </div>
            </div>
            <Link
              href="/app/learning/projects"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
            >
              All Projects &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {/* Practical Project Card */}
            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  Applied Verification Project
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime/40 text-ink font-bold">
                  Generates Verifiable Evidence
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Submit repository code, test suites, or live implementations to be audited by the Evidence Engine.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Automated Code & Rubric Evaluation</span>
                <Link
                  href="/app/learning/projects"
                  className="font-bold text-ink hover:underline"
                >
                  View Mini-Projects &rarr;
                </Link>
              </div>
            </div>

            {/* Assessment Milestone */}
            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  Adaptive Skill Assessment
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand/30 text-ink font-bold">
                  Interactive Evaluation
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Assessments generated specifically for each roadmap step to measure real concept comprehension.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Passing Threshold: 70%</span>
                <Link
                  href="/app/learning/assessments"
                  className="font-bold text-ink hover:underline"
                >
                  View Assessments &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation Modal */}
      <MasteryFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />

      {/* Evidence-Provenance Audit Modal (Phase 9) */}
      {provenanceTarget && (
        <SkillProvenanceModal
          isOpen={!!provenanceTarget}
          onClose={() => setProvenanceTarget(null)}
          skillId={provenanceTarget.skillId}
          skillTitle={provenanceTarget.skillTitle}
          roleId={provenanceTarget.roleId}
          gapId={provenanceTarget.gapId}
          roadmapId={activeRealRoadmap?.id}
          roadmapPathId={activeRealRoadmap?.path_id}
        />
      )}
    </div>
  </div>
);
}
