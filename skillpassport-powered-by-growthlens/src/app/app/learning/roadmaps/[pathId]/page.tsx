"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  StepStatusBadge,
  TopicDifficultyBadge,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  Map,
  Sliders,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  PlayCircle,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileCode,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Check,
  Bot,
  Flame,
  Award,
  BrainCircuit,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { getRoadmapByPathId, listUserRoadmaps } from "@/lib/evidenceApi";
import { LearningRoadmap } from "@/types/learning";
import SkillProvenanceModal from "@/components/app/SkillProvenanceModal";

export default function PersonalizedRoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const pathId = (params?.pathId as string) || "active";

  const {
    activeRoadmap,
    updateRoadmapPreferences,
    activeDomainId,
    setActiveDomainId,
  } = useEvidence();

  const [remoteRoadmap, setRemoteRoadmap] = useState<LearningRoadmap | null>(null);
  const [allUserRoadmaps, setAllUserRoadmaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      getRoadmapByPathId(pathId).catch(() => null),
      listUserRoadmaps().catch(() => ({ roadmaps: [] })),
    ]).then(([res, listRes]) => {
      if (!isMounted) return;
      if (res && res.steps && res.steps.length > 0) {
        setRemoteRoadmap(res);
        if (res.domain_id) {
          setActiveDomainId(res.domain_id);
        }
      }
      if (listRes && Array.isArray(listRes.roadmaps)) {
        setAllUserRoadmaps(listRes.roadmaps);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [pathId]);

  const displayRoadmap: LearningRoadmap = remoteRoadmap || activeRoadmap;

  const [hoursPerWeek, setHoursPerWeek] = useState(
    displayRoadmap?.study_hours_per_week || 6
  );
  const [preference, setPreference] = useState(
    displayRoadmap?.preference || "practice-first"
  );
  const [pace, setPace] = useState(displayRoadmap?.pace || "standard");
  const [showPreferences, setShowPreferences] = useState(false);

  const handleUpdatePreferences = (
    newHours: number,
    newPref: "text-first" | "video-first" | "practice-first",
    newPace: "standard" | "fast_track"
  ) => {
    setHoursPerWeek(newHours);
    setPreference(newPref);
    setPace(newPace);
    updateRoadmapPreferences(activeDomainId, newHours, newPref, newPace);
  };

  if (isLoading && !displayRoadmap) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-4">
        <Sparkles className="w-8 h-8 animate-spin text-ink/40" />
        <p className="text-xs font-semibold text-ink/70">Hydrating personalized roadmap from backend...</p>
      </div>
    );
  }

  if (!displayRoadmap || !displayRoadmap.steps) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-4">
        <Map className="w-8 h-8 text-ink/40" />
        <p className="text-xs font-semibold text-ink/70">No active roadmap found for this path.</p>
        <Link href="/app/learning" className="pill-btn pill-btn-primary text-xs">
          Return to Learning Hub &rarr;
        </Link>
      </div>
    );
  }

  const completedSteps = (displayRoadmap.steps || []).filter(
    (s) => s.status === "completed"
  ).length;

  const improvement =
    displayRoadmap.current_mastery - displayRoadmap.baseline_mastery;

  const isOllamaGenerated =
    displayRoadmap.generation_method === "ollama_qwen" ||
    displayRoadmap.generation_method === "cached_existing";

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={`Personalized Roadmap: ${displayRoadmap.domain_title}`}
        description="A sequenced, prerequisite-aware learning journey tailored to your skill gaps and target career role. Every step is synthesized with real verified learning resources."
        badge={displayRoadmap.blueprint_version || "v1.0"}
        badgeColor="border-ink/20 text-ink bg-sand/30"
      >
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5" />
          {showPreferences ? "Close Preferences" : "Schedule & Preferences"}
        </button>
        <Link
          href="/app/career/priorities"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Remediate More Gaps
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

        {/* AI Model & Provenance Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cream via-sand/20 to-white border border-ink/15 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-ink text-lime flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5 text-lime" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-ink">
                  {isOllamaGenerated ? "Ollama AI Synthesized Curriculum" : "Heuristic Gap Remediation"}
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  {isOllamaGenerated ? "qwen3:8b Local Model" : "Deterministic Engine"}
                </span>
                {displayRoadmap.latency_seconds ? (
                  <span className="text-[10px] font-mono text-ink-muted">
                    ({displayRoadmap.latency_seconds.toFixed(1)}s generation latency)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-ink/80 mt-0.5">
                Target Role: <strong className="text-ink">{displayRoadmap.target_role_title || "Target Software / AI Role"}</strong> &bull; Tailored for <span className="font-semibold text-ink">{displayRoadmap.domain_title}</span>
              </p>
            </div>
          </div>

          {/* Multi-Roadmap Switcher & Provenance Audit */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setIsProvenanceOpen(true)}
              className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 text-ink font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              Why is this skill lagging? (Audit Evidence)
            </button>

            {allUserRoadmaps.length > 1 && (
              <div className="flex items-center gap-2 text-xs bg-white/80 p-1.5 px-3 rounded-xl border border-ink/10">
                <span className="text-ink-muted font-mono text-[11px]">Your Roadmaps:</span>
                <select
                  value={displayRoadmap.path_id}
                  onChange={(e) => router.push(`/app/learning/roadmaps/${e.target.value}`)}
                  className="bg-transparent font-bold text-ink text-xs focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  {allUserRoadmaps.map((r) => (
                    <option key={r.path_id} value={r.path_id}>
                      {r.domain_title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Personalization Controls Dropdown */}
        {showPreferences && (
          <div className="gl-card p-6 border-ink/20 bg-white space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-ink" />
                Adjust Schedule & Learning Preferences
              </h3>
              <span className="text-[11px] text-ink-muted">
                Preserves prerequisite dependencies automatically
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Hours per week */}
              <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-2">
                <label className="font-semibold text-ink block">
                  Study Budget: {hoursPerWeek} hrs/week
                </label>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={hoursPerWeek}
                  onChange={(e) =>
                    handleUpdatePreferences(
                      parseInt(e.target.value),
                      preference,
                      pace
                    )
                  }
                  className="w-full accent-ink h-1.5 bg-sand/40 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] text-ink-muted block">
                  Estimated completion: ~{Math.ceil(12 / hoursPerWeek)} weeks
                </span>
              </div>

              {/* Preference */}
              <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-2">
                <label className="font-semibold text-ink block">
                  Resource Preference
                </label>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  {(["practice-first", "video-first", "text-first"] as const).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => handleUpdatePreferences(hoursPerWeek, p, pace)}
                        className={`py-1.5 px-2 rounded-lg capitalize text-center ${
                          preference === p
                            ? "bg-ink text-white font-bold"
                            : "bg-white text-ink border border-ink/10"
                        }`}
                      >
                        {p.replace("-first", "")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Pace */}
              <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-2">
                <label className="font-semibold text-ink block">Learning Pace</label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {(["standard", "fast_track"] as const).map((pc) => (
                    <button
                      key={pc}
                      onClick={() =>
                        handleUpdatePreferences(hoursPerWeek, preference, pc)
                      }
                      className={`py-1.5 px-2 rounded-lg capitalize text-center ${
                        pace === pc
                          ? "bg-ink text-white font-bold"
                          : "bg-white text-ink border border-ink/10"
                      }`}
                    >
                      {pc.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-ink-muted block">
                  Fast track prioritizes hands-on code assessments.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Progress & Milestone Summary Card */}
        <div className="gl-card p-6 md:p-8 space-y-6 bg-gradient-to-r from-cream via-white to-sand/20 border-ink/15">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  Current Roadmap Progress
                </span>
                <span className="text-xs font-mono text-ink-muted">
                  Completed {completedSteps} of {displayRoadmap.steps.length} steps
                </span>
              </div>
              <h2 className="text-2xl font-bold text-ink">
                Mastery: {displayRoadmap.current_mastery}% (Target: {displayRoadmap.target_mastery}%)
              </h2>
              <p className="text-xs text-ink-muted max-w-xl">
                {completedSteps > 0
                  ? `Baseline was ${displayRoadmap.baseline_mastery}%. You have gained +${improvement}% mastery across ${completedSteps} completed step${completedSteps === 1 ? "" : "s"}.`
                  : `Baseline is ${displayRoadmap.baseline_mastery}%. Complete the learning packets and assessments below to verify and increase your mastery.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-white border border-ink/10 text-center min-w-[120px]">
                <span className="text-[10px] font-mono text-ink-muted uppercase block">
                  Mastery Gain
                </span>
                <span className="text-2xl font-black text-emerald-700">
                  +{improvement}%
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-ink/10 text-center min-w-[120px]">
                <span className="text-[10px] font-mono text-ink-muted uppercase block">
                  Est. Remaining
                </span>
                <span className="text-2xl font-black text-ink">
                  ~{Math.max(1, Math.round(((displayRoadmap.total_steps || displayRoadmap.steps.length) - completedSteps) * 1.5))} hrs
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10">
            <MasteryProgressBar
              current={displayRoadmap.current_mastery}
              target={displayRoadmap.target_mastery}
              baseline={displayRoadmap.baseline_mastery}
            />
          </div>
        </div>

        {/* Sequential Learning Journey Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Map className="w-5 h-5 text-ink" />
              Roadmap Sequence & Learning Steps
            </h2>
            <span className="text-xs font-mono text-ink-muted">
              Sequenced by Skill Dependencies
            </span>
          </div>

          <div className="space-y-4">
            {displayRoadmap.steps.map((step, idx) => (
              <div
                key={step.step_id}
                className={`gl-card p-5 md:p-6 transition-all border-ink/15 space-y-4 ${
                  step.status === "in_progress"
                    ? "ring-2 ring-ink bg-white shadow-md"
                    : step.status === "completed"
                    ? "bg-emerald-50/20 border-emerald-200"
                    : step.status === "locked"
                    ? "bg-sand/10 opacity-75"
                    : "bg-white"
                }`}
              >
                {/* Step Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Step Sequence Badge */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 font-bold ${
                        step.status === "completed"
                          ? "bg-emerald-600 text-white"
                          : step.status === "in_progress"
                          ? "bg-ink text-white"
                          : "bg-sand/30 text-ink"
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase leading-none">
                        Step
                      </span>
                      <span className="text-base font-black leading-tight">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Title & Objective */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StepStatusBadge status={step.status} />
                        <TopicDifficultyBadge difficulty={step.difficulty} />
                        <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{step.estimated_minutes} min
                        </span>
                      </div>

                      <h3 className="text-base md:text-lg font-bold text-ink">
                        {step.title}
                      </h3>

                      <p className="text-xs text-ink/80 leading-relaxed max-w-2xl">
                        <strong>Objective:</strong> {step.learning_objective}
                      </p>

                      {/* AI Pedagogical Rationale Callout */}
                      <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 text-xs text-ink/80 max-w-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink flex items-center gap-1.5 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-ink" /> AI Pedagogical Rationale:
                          </span>
                          <button
                            onClick={() => setIsProvenanceOpen(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                          >
                            <BrainCircuit className="w-3 h-3 text-indigo-600" />
                            Why is this skill lagging? (Audit Evidence)
                          </button>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {step.recommendation_reason}
                        </p>
                        <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-[10px] text-ink-muted flex-wrap gap-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Briefcase className="w-3 h-3 text-indigo-600" />
                            Source: {displayRoadmap.target_role_title || "Target Career Role"} &bull; Verified Benchmark
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            Authenticity Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mastery & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-ink-muted block">
                        Mastery
                      </span>
                      <span className="text-lg font-mono font-black text-ink">
                        {step.current_mastery}% / {step.target_mastery}%
                      </span>
                    </div>

                    {step.status === "completed" ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Completed
                        </span>
                        <Link
                          href={`/app/learning/steps/${step.step_id}?roadmap_id=${encodeURIComponent(displayRoadmap.path_id || displayRoadmap.id || pathId)}`}
                          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 flex items-center gap-1 text-ink font-medium"
                        >
                          Review Packet
                        </Link>
                      </div>
                    ) : step.status !== "locked" ? (
                      <Link
                        href={`/app/learning/steps/${step.step_id}?roadmap_id=${encodeURIComponent(displayRoadmap.path_id || displayRoadmap.id || pathId)}`}
                        className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Open Learning Packet
                      </Link>
                    ) : (
                      <div className="text-[11px] text-ink-muted font-mono flex items-center gap-1 bg-sand/30 py-1.5 px-3 rounded-full">
                        <Lock className="w-3 h-3 text-ink-muted" /> Prereqs Unmet
                      </div>
                    )}
                  </div>
                </div>

                {/* Step Footer Milestones */}
                <div className="pt-3 border-t border-ink/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                    <span>Prerequisites:</span>
                    {(!step.prerequisite_ids || step.prerequisite_ids.length === 0) ? (
                      <span className="text-emerald-700 font-semibold">None (Foundation Step)</span>
                    ) : (
                      step.prerequisite_ids.map((p) => (
                        <span
                          key={p}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-sand/30 text-ink"
                        >
                          {p.replace("step-", "Step ")}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/app/learning/resources"
                      className="pill-btn bg-sand/20 hover:bg-sand/40 text-[11px] py-1 px-2.5 text-ink"
                    >
                      Resources
                    </Link>
                    <Link
                      href="/app/learning/assessments"
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-[11px] py-1 px-2.5 text-ink flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Take Assessment
                    </Link>
                    {step.project_id && (
                      <Link
                        href={`/app/learning/projects/${step.project_id}`}
                        className="pill-btn bg-lime/40 hover:bg-lime border border-ink/20 text-[11px] py-1 px-2.5 text-ink font-bold flex items-center gap-1"
                      >
                        <FileCode className="w-3 h-3" />
                        Mini-Project
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evidence-Provenance Audit Modal (Phase 9) */}
      <SkillProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        skillId={displayRoadmap.domain_id || "data-preprocessing"}
        skillTitle={displayRoadmap.domain_title}
        roleId={displayRoadmap.target_role_id}
        roadmapId={displayRoadmap.id}
        roadmapPathId={displayRoadmap.path_id}
      />
    </div>
  );
}
