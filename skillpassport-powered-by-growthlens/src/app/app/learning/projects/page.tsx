"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
} from "@/components/app/LearningBadges";
import {
  FolderGit2,
  GitBranch,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Layers,
  FileCheck2,
  AlertCircle,
  RotateCw,
  Award,
  Calendar,
  Cpu,
  RefreshCw,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { listMiniProjects, generateMiniProjects } from "@/lib/evidenceApi";
import { MiniProject } from "@/types/learning";

export default function MiniProjectsCatalogPage() {
  const { activeBlueprint } = useEvidence();

  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (domainId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listMiniProjects({ domain_id: domainId });
      if (res && Array.isArray(res.projects) && res.projects.length > 0) {
        setProjects(res.projects);
      } else {
        setProjects([]);
      }
    } catch (err: any) {
      console.warn("Could not load persisted projects from backend:", err);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeBlueprint?.domain_id) {
      fetchProjects(activeBlueprint.domain_id);
    }
  }, [activeBlueprint?.domain_id, fetchProjects]);

  const handleGenerate = async (forceRegenerate: boolean = false) => {
    if (!activeBlueprint?.domain_id) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await generateMiniProjects({
        domain_id: activeBlueprint.domain_id,
        domain_title: activeBlueprint.title,
        force_regenerate: forceRegenerate,
        count: 3,
      });
      if (res && Array.isArray(res.projects) && res.projects.length > 0) {
        setProjects(res.projects);
      }
    } catch (err: any) {
      console.error("Failed to generate mini-projects:", err);
      setError(err?.message || "Failed to generate mini-projects. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const domainProjects = projects;
  const submittedCount = domainProjects.filter(
    (p) => p.status === "submitted" || p.status === "evaluated"
  ).length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence-Generating Mini-Projects"
        description="Solve realistic engineering and architecture challenges. Completing a project updates your Project Signal (Prj = 25%) and registers a verifiable Candidate Evidence item in the Human Review Queue."
        badge="Domain 5 · Applied Mini-Projects"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <Link
          href="/app/learning/capability"
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          View Candidate Evidence Bridge &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

        {/* Critical Rule Callout */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold block mb-0.5">
              Architectural Principle: Learning Project Completion ≠ Automatically Verified Skill!
            </span>
            Submitting a completed mini-project generates a{" "}
            <span className="font-semibold">Candidate Learning Evidence item</span> in Domain 1. It enters the{" "}
            <span className="font-semibold">Human Review Queue (Domain 3)</span> with full provenance. Only after peer or managerial verification does it promote candidate skills into your verified SkillPassport.
          </div>
        </div>

        {/* Projects Grid Header & Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-peach" />
                Available Projects for {activeBlueprint?.title || "Active Blueprint"}
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                {isLoading
                  ? "Loading persisted project specifications..."
                  : isGenerating
                  ? "Generating domain-specific projects via AI Advisor..."
                  : `${domainProjects.length} Available Projects (${submittedCount} Submitted)`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {domainProjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating || isLoading}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
                  title="Generate alternative projects for this skill gap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  {isGenerating ? "Regenerating..." : "Regenerate Projects"}
                </button>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                onClick={() => handleGenerate(false)}
                className="pill-btn pill-btn-ghost text-xs underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center rounded-2xl border border-dashed border-ink/20 bg-paper/40 space-y-3">
              <RotateCw className="w-6 h-6 animate-spin text-ink/40 mx-auto" />
              <p className="text-xs font-medium text-ink/60">
                Retrieving persisted mini-projects for {activeBlueprint?.title}...
              </p>
            </div>
          )}

          {/* Generating State */}
          {!isLoading && isGenerating && (
            <div className="p-12 text-center rounded-2xl border border-ink/20 bg-amber-50/50 space-y-4 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-peach/20 border border-peach/40 flex items-center justify-center mx-auto text-peach">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-ink">
                  Generating Real Engineering Projects
                </h3>
                <p className="text-xs text-ink/70 max-w-md mx-auto">
                  Architecting targeted project specifications with rubrics, milestones, and deliverable criteria for{" "}
                  <span className="font-semibold">{activeBlueprint?.title}</span>...
                </p>
              </div>
            </div>
          )}

          {/* Empty State / Generate CTA */}
          {!isLoading && !isGenerating && domainProjects.length === 0 && (
            <div className="p-10 md:p-14 text-center rounded-2xl border-2 border-dashed border-ink/20 bg-paper/60 space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-peach/20 border border-peach/40 flex items-center justify-center mx-auto text-peach">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="text-base font-extrabold text-ink">
                  No Mini-Projects Yet for {activeBlueprint?.title}
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Generate domain-specific, verifiable engineering projects aligned with your diagnosed skill gap.
                  Each project includes a problem statement, rubric matrix, milestones, and submission workflow.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating}
                  className="pill-btn pill-btn-primary text-xs px-6 py-3 shadow-md flex items-center gap-2 mx-auto"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Mini-Projects for {activeBlueprint?.title}
                </button>
              </div>
            </div>
          )}

          {/* Projects Grid */}
          {!isLoading && !isGenerating && domainProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {domainProjects.map((project) => {
                const isEvaluated = project.status === "evaluated";
                const isSubmitted = project.status === "submitted";
                const isAiGenerated =
                  project.generation_method === "ollama_qwen" ||
                  project.generation_method === "saved_ai_packet";

                return (
                  <div
                    key={project.id}
                    className={`gl-card p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                      isEvaluated
                        ? "border-l-4 border-l-emerald-500"
                        : isSubmitted
                        ? "border-l-4 border-l-amber-500"
                        : ""
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink/5 text-ink">
                            {project.difficulty || "Intermediate"}
                          </span>
                          {project.estimated_hours && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-paper border border-ink/10 text-ink/70 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-ink/50" />
                              {project.estimated_hours}h estimated
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              isAiGenerated
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            }`}
                          >
                            {isAiGenerated ? "AI Generated (qwen3:8b)" : "Curated Catalogue"}
                          </span>
                        </div>

                        {/* Status Indicator */}
                        {isEvaluated ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            Evaluated · {project.submitted_attempt?.total_score || 85}%
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            Submitted · Pending Evaluation
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-ink/50 bg-paper px-2.5 py-0.5 rounded-full border border-ink/10 shrink-0">
                            Ready to Start
                          </span>
                        )}
                      </div>

                      <h3 className="text-base md:text-lg font-extrabold text-ink leading-snug">
                        {project.title}
                      </h3>

                      <p className="text-xs text-ink/70 mt-2 line-clamp-3 leading-relaxed">
                        {project.problem_statement}
                      </p>

                      {/* Learning Objectives Preview */}
                      {project.learning_objectives && project.learning_objectives.length > 0 && (
                        <div className="mt-3.5 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                            Target Objectives
                          </div>
                          <ul className="text-xs text-ink/80 space-y-1">
                            {project.learning_objectives.slice(0, 2).map((obj, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-peach mt-0.5">&bull;</span>
                                <span className="line-clamp-1">{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Rubric Preview */}
                      {project.rubric && project.rubric.length > 0 && (
                        <div className="mt-4 p-3 bg-paper/60 rounded-xl border border-ink/10">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50 mb-1.5 flex items-center justify-between">
                            <span>Evaluation Rubric</span>
                            <span>Total: 100%</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {project.rubric.map((r, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-ink/5 text-ink/80"
                              >
                                {r.criterion} ({r.weight_pct}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="mt-6 pt-4 border-t border-ink/10 flex items-center justify-between gap-3">
                      <div className="text-xs text-ink/60 truncate">
                        Target Skill:{" "}
                        <span className="font-semibold text-ink">
                          {project.skill_name || activeBlueprint?.title || "Engineering"}
                        </span>
                      </div>

                      <Link
                        href={`/app/learning/projects/${project.id}`}
                        className={`pill-btn text-xs flex items-center gap-1.5 shrink-0 ${
                          isEvaluated
                            ? "pill-btn-ghost"
                            : isSubmitted
                            ? "pill-btn-ghost text-amber-800"
                            : "pill-btn-primary"
                        }`}
                      >
                        {isEvaluated
                          ? "Inspect Submission & Rubric →"
                          : isSubmitted
                          ? "View Pending Submission →"
                          : "Launch Project Workspace →"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}