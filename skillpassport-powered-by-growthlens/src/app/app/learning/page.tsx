"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  Check,
  Loader2,
  Compass,
  Trash2,
  FolderGit2,
} from "lucide-react";
import SkillProvenanceModal from "@/components/app/SkillProvenanceModal";
import {
  RequirementTypeBadge,
  ImportanceBadge,
} from "@/components/app/CareerBadges";
import {
  getLearningPriorities,
  refreshCareerGaps,
  generatePersonalizedRoadmap,
  listUserRoadmaps,
  getRoadmapByPathId,
  deleteLearningRoadmap,
} from "@/lib/evidenceApi";
import { listRoles as listCareerRoles } from "@/lib/careerApi";
import { RoleDemandModel } from "@/types/career";
import { LearningRoadmap } from "@/types/learning";
import { learningCache } from "@/lib/learningCache";

export default function LearningOverviewPage() {
  const {
    blueprints,
    activeBlueprint,
    activeRoadmap,
    learningHistory,
    miniProjects,
    activeDomainId,
    activeTargetRole,
    setActiveTargetRole,
    refreshLearningState,
    addToast,
    currentUserId,
  } = useEvidence();

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [upstreamPriorities, setUpstreamPriorities] = useState<any[]>([]);
  const [targetRoleTitle, setTargetRoleTitle] = useState<string>("Target Career Role");
  const [remediatingGapId, setRemediatingGapId] = useState<string | null>(null);
  const [realRoadmaps, setRealRoadmaps] = useState<any[]>([]);
  const [activeRealRoadmap, setActiveRealRoadmap] = useState<LearningRoadmap | null>(null);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState(true);
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<RoleDemandModel[]>([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const [provenanceTarget, setProvenanceTarget] = useState<{
    skillId: string;
    skillTitle?: string;
    roleId?: string;
    gapId?: string;
  } | null>(null);
  const router = useRouter();

  // Close role dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    if (isRoleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRoleDropdownOpen]);

  // Load available roles from Career Intelligence
  useEffect(() => {
    listCareerRoles()
      .then((roles) => {
        if (Array.isArray(roles)) setAvailableRoles(roles);
      })
      .catch((e) => console.warn("Failed to load career roles:", e));
  }, []);

  const loadRoadmaps = async (force: boolean = false) => {
    const targetRoleId = activeTargetRole?.target_role_id || null;
    const uid = currentUserId || "default_user";

    if (!force) {
      const cached = learningCache.get<{ roadmaps: any[]; activeRoadmap: any }>(
        uid,
        targetRoleId,
        "roadmaps"
      );
      if (cached && Array.isArray(cached.roadmaps)) {
        setRealRoadmaps(cached.roadmaps);
        setActiveRealRoadmap(cached.activeRoadmap || null);
        setIsLoadingRoadmaps(false);
        return;
      }
    }

    setIsLoadingRoadmaps(true);
    try {
      const res = await listUserRoadmaps();
      if (res && Array.isArray(res.roadmaps) && res.roadmaps.length > 0) {
        setRealRoadmaps(res.roadmaps);
        const active = res.roadmaps.find((r: any) => r.status === "in_progress") || res.roadmaps[0];
        const full = await getRoadmapByPathId(active.path_id);
        const resolvedActive = full && full.steps ? full : null;
        setActiveRealRoadmap(resolvedActive);
        learningCache.set(uid, targetRoleId, "roadmaps", {
          roadmaps: res.roadmaps,
          activeRoadmap: resolvedActive,
        });
      } else {
        setRealRoadmaps([]);
        setActiveRealRoadmap(null);
        learningCache.set(uid, targetRoleId, "roadmaps", {
          roadmaps: [],
          activeRoadmap: null,
        });
      }
    } catch (e) {
      setRealRoadmaps([]);
      setActiveRealRoadmap(null);
    } finally {
      setIsLoadingRoadmaps(false);
    }
  };

  const [deletingRoadmapId, setDeletingRoadmapId] = useState<string | null>(null);

  const handleDeleteRoadmap = async (pathId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the roadmap "${title}"? This will permanently remove its curriculum steps and progress.`)) {
      return;
    }
    setDeletingRoadmapId(pathId);
    try {
      await deleteLearningRoadmap(pathId);
      const uid = currentUserId || "default_user";
      learningCache.invalidate(uid);
      addToast("Roadmap Removed", `Successfully deleted "${title}".`, "info");
      const res = await listUserRoadmaps().catch(() => ({ roadmaps: [] }));
      const remaining = res?.roadmaps || [];
      setRealRoadmaps(remaining);
      if (activeRealRoadmap?.path_id === pathId) {
        if (remaining.length > 0) {
          const next = await getRoadmapByPathId(remaining[0].path_id).catch(() => null);
          setActiveRealRoadmap(next);
        } else {
          setActiveRealRoadmap(null);
        }
      }
      learningCache.set(uid, activeTargetRole?.target_role_id || null, "roadmaps", {
        roadmaps: remaining,
        activeRoadmap: activeRealRoadmap?.path_id === pathId ? null : activeRealRoadmap,
      });
    } catch (err: any) {
      addToast("Delete Error", err.message || "Failed to delete roadmap.", "error");
    } finally {
      setDeletingRoadmapId(null);
    }
  };

  const loadPriorities = async (explicitRoleId?: string, force: boolean = false) => {
    const targetRoleId = explicitRoleId || activeTargetRole?.target_role_id || null;
    const uid = currentUserId || "default_user";

    if (!force) {
      const cached = learningCache.get<any>(uid, targetRoleId, "priorities");
      if (cached && Array.isArray(cached.priorities)) {
        setUpstreamPriorities(cached.priorities);
        if (cached.target_role_title) {
          setTargetRoleTitle(cached.target_role_title);
        }
        setIsLoadingPriorities(false);
        return;
      }
    }

    setIsLoadingPriorities(true);
    try {
      const data: any = await getLearningPriorities(targetRoleId || undefined);
      if (data && Array.isArray(data.priorities)) {
        setUpstreamPriorities(data.priorities);
        if (data.target_role_title) {
          setTargetRoleTitle(data.target_role_title);
        } else if (data.priorities[0]?.role_title) {
          setTargetRoleTitle(data.priorities[0].role_title);
        }
        learningCache.set(uid, targetRoleId, "priorities", data);
      } else {
        setUpstreamPriorities([]);
      }
    } catch (e) {
      setUpstreamPriorities([]);
    } finally {
      setIsLoadingPriorities(false);
    }
  };

  useEffect(() => {
    loadPriorities();
    loadRoadmaps();
  }, [activeTargetRole?.target_role_id]);

  const handleRoleSelect = async (role: RoleDemandModel) => {
    setIsSwitchingRole(true);
    setIsRoleDropdownOpen(false);
    const resolvedTitle = role.role_title || role.title;
    const resolvedVersion = role.role_version || role.version || "v2026.1";
    try {
      setTargetRoleTitle(resolvedTitle);
      const uid = currentUserId || "default_user";
      learningCache.invalidate(uid);
      await setActiveTargetRole(role.role_id, resolvedTitle, resolvedVersion);
      await Promise.all([
        loadPriorities(role.role_id, true),
        loadRoadmaps(true),
      ]);
      addToast(
        "Target Role Aligned",
        `Synchronized curriculum and skill gaps for ${resolvedTitle}.`,
        "success"
      );
    } catch (err: any) {
      addToast(
        "Role Update Notice",
        err.message || "Failed to update target role.",
        "error"
      );
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleRemediatePriorityGap = async (gap: any) => {
    const gapId = gap.skill_id || gap.gap_id;
    setRemediatingGapId(gapId);
    try {
      const res = await generatePersonalizedRoadmap({
        target_role_id: gap.role_id || activeTargetRole?.target_role_id,
        skill_gap_id: gap.gap_id || gap.skill_id,
        skill_id: gap.skill_id,
      });
      addToast(
        "Roadmap Generated with AI",
        `Created personalized curriculum for ${gap.canonical_name || gap.skill_name || "selected gap"}.`,
        "success"
      );
      const uid = currentUserId || "default_user";
      learningCache.invalidate(uid, activeTargetRole?.target_role_id || null);
      await loadRoadmaps(true);
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
      const uid = currentUserId || "default_user";
      learningCache.invalidate(uid);
      const res: any = await refreshCareerGaps();
      await loadPriorities(undefined, true);
      await loadRoadmaps(true);
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

  const effectiveRoleTitle = activeTargetRole?.role_title || targetRoleTitle;
  const currentDisplayRoadmap: LearningRoadmap | null = activeRealRoadmap;

  // Active step is first in-progress or available step in real roadmap
  const activeStep = currentDisplayRoadmap
    ? currentDisplayRoadmap.steps.find((s) => s.status === "in_progress") ||
      currentDisplayRoadmap.steps.find((s) => s.status === "available") ||
      currentDisplayRoadmap.steps[0]
    : null;

  const completedStepsCount = currentDisplayRoadmap
    ? currentDisplayRoadmap.steps.filter((s) => s.status === "completed").length
    : 0;

  const improvement = currentDisplayRoadmap
    ? currentDisplayRoadmap.current_mastery - currentDisplayRoadmap.baseline_mastery
    : 0;

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
        {currentDisplayRoadmap && (
          <Link
            href={`/app/learning/roadmaps/${currentDisplayRoadmap.path_id}`}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Open Active Roadmap &rarr;
          </Link>
        )}
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector Bar (Synchronized Bidirectionally with Career Intelligence) */}
      <div className="gl-card p-4 sm:p-5 bg-white/95 border-ink/15 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-lime/40 border border-ink/20 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-ink" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">
                Target Career Role Alignment
              </span>
              {activeTargetRole?.has_target && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime/30 text-ink border border-ink/15 font-bold">
                  {activeTargetRole.target_role_version || "v2026.1"}
                </span>
              )}
              {isSwitchingRole && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  <Loader2 className="w-3 h-3 animate-spin" /> Synchronizing...
                </span>
              )}
            </div>
            <span className="font-bold text-ink text-base truncate block">
              {activeTargetRole?.has_target ? effectiveRoleTitle : "No Target Career Role Selected"}
            </span>
          </div>
        </div>

        {/* Interactive Target Role Dropdown */}
        <div className="relative shrink-0" ref={roleDropdownRef}>
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isRoleDropdownOpen}
            className="pill-btn bg-[#FAF8F5] hover:bg-sand/40 border border-ink/20 text-xs py-2 px-3.5 text-ink flex items-center justify-between gap-2.5 shadow-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-lime min-w-[210px] max-w-full"
          >
            <Compass className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="truncate font-semibold">
              {activeTargetRole?.has_target ? "Change Target Role" : "Select Target Role"}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform duration-200 shrink-0 ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isRoleDropdownOpen && (
            <div
              role="listbox"
              className="absolute right-0 mt-1.5 w-72 sm:w-88 bg-[#FAF8F5] border border-ink/20 rounded-2xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="px-3.5 py-1.5 border-b border-ink/10 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                  Career Intelligence Roles ({availableRoles.length})
                </span>
                <Link
                  href="/app/career/roles"
                  className="text-[10px] font-mono text-indigo-700 hover:underline"
                >
                  Manage Roles &rarr;
                </Link>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-ink/5">
                {availableRoles.length === 0 ? (
                  <div className="p-4 text-center text-ink-muted text-xs">
                    No roles discovered yet.
                  </div>
                ) : (
                  availableRoles.map((role) => {
                    const isSelected = activeTargetRole?.target_role_id === role.role_id;
                    return (
                      <button
                        key={role.role_id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleRoleSelect(role)}
                        className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-lime/25 text-ink font-semibold"
                            : "hover:bg-sand/20 text-ink"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate font-bold text-ink">
                            {role.role_title || role.title}
                          </span>
                          <span className="text-[10px] text-ink-muted font-mono block">
                            {role.seniority || "Senior"} &bull; {role.context_domain || role.context || "Engineering"}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-ink shrink-0 font-bold" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Untargeted Role Empty State Alert */}
      {!activeTargetRole?.has_target && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-900 font-bold">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs block">Select a Target Career Role to Personalize Learning</span>
              <span className="text-[11px] text-amber-900/80">Your curriculum and gap remediation are driven by the authenticated requirements of your desired role.</span>
            </div>
          </div>
          <button
            onClick={() => setIsRoleDropdownOpen(true)}
            className="pill-btn bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-xs py-1.5 px-3 shrink-0 self-start sm:self-auto border border-amber-500/40"
          >
            Select Target Role &rarr;
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {(isLoadingRoadmaps || isSwitchingRole) ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="gl-card p-4 h-24 animate-pulse bg-sand/30 border-ink/10 rounded-2xl" />
            ))}
          </div>
          <div className="gl-card p-8 h-64 animate-pulse bg-sand/20 border-ink/10 rounded-2xl flex flex-col justify-center items-center text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-ink-muted" />
            <p className="text-xs font-mono text-ink-muted">Resolving verified Career Intelligence evaluations & roadmaps...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="gl-card p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-ink-muted">
                Active AI Roadmaps
              </span>
              <div className="text-2xl font-bold text-ink">
                {realRoadmaps.length}
              </div>
              <span className="text-[11px] text-ink-muted block truncate">
                {currentDisplayRoadmap ? `Current: ${currentDisplayRoadmap.domain_title}` : "None generated"}
              </span>
            </div>

            <div className="gl-card p-4 space-y-1 border-lime-300 bg-lime/10">
              <span className="text-[10px] font-mono uppercase text-ink font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-ink" /> Overall Mastery
              </span>
              <div className="text-2xl font-bold text-ink flex items-baseline gap-1.5">
                <span>{currentDisplayRoadmap ? `${currentDisplayRoadmap.current_mastery}%` : "0%"}</span>
                {currentDisplayRoadmap && (
                  <span className="text-xs text-emerald-700 font-normal">
                    (+{improvement}%)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-ink-muted block">
                {currentDisplayRoadmap
                  ? `Baseline: ${currentDisplayRoadmap.baseline_mastery}% • Target: ${currentDisplayRoadmap.target_mastery}%`
                  : "Awaiting curriculum generation"}
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
                {completedStepsCount} / {currentDisplayRoadmap?.steps?.length || 0}
              </div>
              <span className="text-[11px] text-ink-muted block">
                Progress: {currentDisplayRoadmap?.steps?.length ? Math.round((completedStepsCount / Math.max(1, currentDisplayRoadmap.steps.length)) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Clean Empty State when No Roadmaps Exist */}
          {realRoadmaps.length === 0 && (
            <div className="gl-card p-6 md:p-8 space-y-4 bg-[#FAF8F5] border-ink/15 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sand/30 border border-ink/15 flex items-center justify-center mx-auto text-ink">
                <GraduationCap className="w-6 h-6 text-ink" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-ink">No Personalized Learning Roadmap Yet</h3>
                <p className="text-xs text-ink/70">
                  {activeTargetRole?.has_target
                    ? `You have not yet generated a learning roadmap for ${effectiveRoleTitle}. Remediate one of your top priority skill gaps below to synthesize a tailored curriculum.`
                    : "Select a target career role to identify your skill gaps and generate a personalized curriculum."}
                </p>
              </div>
              {upstreamPriorities.length > 0 && (
                <button
                  onClick={() => handleRemediatePriorityGap(upstreamPriorities[0])}
                  disabled={remediatingGapId !== null}
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {remediatingGapId === (upstreamPriorities[0].skill_id || upstreamPriorities[0].gap_id) ? (
                    "Synthesizing with AI..."
                  ) : (
                    `Remediate Top Gap: ${upstreamPriorities[0].canonical_name || upstreamPriorities[0].skill_name} →`
                  )}
                </button>
              )}
            </div>
          )}
        </>
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
                  r.path_id === currentDisplayRoadmap?.path_id ? "ring-2 ring-ink bg-white" : "bg-white/80"
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteRoadmap(r.path_id, r.domain_title)}
                      disabled={deletingRoadmapId === r.path_id}
                      title="Delete roadmap"
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors disabled:opacity-50"
                    >
                      {deletingRoadmapId === r.path_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Link
                      href={`/app/learning/roadmaps/${r.path_id}`}
                      className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      Open Roadmap &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout: Priorities & Applied Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Role Gap Priorities */}
        <div className="lg:col-span-7 gl-card p-6 space-y-4 bg-white border-ink/15 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime/40 border border-ink/15 flex items-center justify-center text-ink shrink-0">
                <Target className="w-4 h-4 text-ink" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Target Role Skill Gaps
                </h3>
                <span className="text-[11px] text-ink-muted">
                  Career Intelligence remediation triggers for {effectiveRoleTitle}
                </span>
              </div>
            </div>
            <Link
              href="/app/career/priorities"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1 shrink-0"
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
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-ink/15 hover:border-ink/30 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-ink text-lime flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {gap.requirement_type ? (
                              <RequirementTypeBadge type={gap.requirement_type} />
                            ) : (
                              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                                {gap.reason_code || "Target Role Gap"}
                              </span>
                            )}
                            {gap.importance && (
                              <ImportanceBadge importance={gap.importance} />
                            )}
                          </div>
                          <h4 className="font-bold text-ink text-sm sm:text-base">
                            {gap.canonical_name || gap.skill_name || "Identified Gap"}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-ink/75 leading-relaxed">
                      {gap.explanation || `Proficiency deficit detected for target role ${effectiveRoleTitle}.`}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-ink/5">
                      <span>
                        Target: <strong className="text-ink">{gap.target_proficiency || "Practitioner"}</strong>
                      </span>
                      <span className="font-mono text-[10px] truncate max-w-[200px]">
                        {gap.requirement_source || `${effectiveRoleTitle} • Benchmark`}
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setProvenanceTarget({
                            skillId: gap.skill_id || gap.canonical_name || "data-preprocessing",
                            skillTitle: gap.canonical_name || gap.skill_name,
                            roleId: gap.role_id,
                            gapId: gap.gap_id,
                          })
                        }
                        className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 text-ink flex items-center gap-1.5 font-medium shadow-xs"
                      >
                        <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
                        Evidence Analysis
                      </button>

                      <button
                        onClick={() => handleRemediatePriorityGap(gap)}
                        disabled={remediatingGapId === gapKey}
                        className="pill-btn bg-lime/40 hover:bg-lime border border-ink/20 text-xs py-1.5 px-3 text-ink font-bold flex items-center gap-1.5 shadow-xs"
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
                );
              })
            ) : (
              <div className="p-6 text-center rounded-xl bg-[#FAF8F5] border border-ink/15 space-y-3">
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
        <div className="lg:col-span-5 gl-card p-6 space-y-4 bg-white border-ink/15 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sand/40 border border-ink/15 flex items-center justify-center text-ink shrink-0">
                <FileCode className="w-4 h-4 text-ink" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Applied Milestones & Practice
                </h3>
                <span className="text-[11px] text-ink-muted">
                  Hands-on verification & assessment
                </span>
              </div>
            </div>
            <Link
              href="/app/learning/projects"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1 shrink-0"
            >
              All Projects &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {/* Practical Project Card */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-ink/15 hover:border-ink/30 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-lime/30 text-ink flex items-center justify-center shrink-0">
                    <FolderGit2 className="w-4 h-4 text-ink" />
                  </div>
                  <span className="font-bold text-ink text-sm">
                    Applied Mini-Project
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime/40 text-ink font-bold border border-ink/15">
                  Evidence Generation
                </span>
              </div>
              <p className="text-xs text-ink/75 leading-relaxed">
                Implement production code, test suites, or services audited directly by the Evidence Engine.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-ink/5">
                <span className="text-ink-muted text-[11px]">Automated Rubric Audit</span>
                <Link
                  href="/app/learning/projects"
                  className="font-bold text-ink hover:underline flex items-center gap-1"
                >
                  Open Projects &rarr;
                </Link>
              </div>
            </div>

            {/* Assessment Milestone */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-ink/15 hover:border-ink/30 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sand/40 text-ink flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4 text-ink" />
                  </div>
                  <span className="font-bold text-ink text-sm">
                    Adaptive Skill Assessment
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sand/40 text-ink font-bold border border-ink/15">
                  70% Pass Threshold
                </span>
              </div>
              <p className="text-xs text-ink/75 leading-relaxed">
                Step-specific evaluations measuring conceptual comprehension, architecture decisions, and edge cases.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-ink/5">
                <span className="text-ink-muted text-[11px]">Interactive Evaluation</span>
                <Link
                  href="/app/learning/assessments"
                  className="font-bold text-ink hover:underline flex items-center gap-1"
                >
                  Take Assessment &rarr;
                </Link>
              </div>
            </div>

            {/* Mastery Analytics */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-ink/15 hover:border-ink/30 transition-all space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-indigo-700" />
                  </div>
                  <span className="font-bold text-ink text-sm">
                    Mastery Progression
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                  4-Factor Model
                </span>
              </div>
              <p className="text-xs text-ink/75 leading-relaxed">
                Track multidimensional skill mastery: Knowledge (30%), Practice (25%), Assessment (25%), and Projects (20%).
              </p>
              <div className="pt-2 flex items-center justify-between text-xs border-t border-ink/5">
                <span className="text-ink-muted text-[11px]">Simulate Projections</span>
                <Link
                  href="/app/learning/progress"
                  className="font-bold text-ink hover:underline flex items-center gap-1"
                >
                  View Analytics &rarr;
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
