"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import {
  FolderGit2,
  GitBranch,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Send,
  Sparkles,
  FileText,
  AlertTriangle,
  ArrowRight,
  Code2,
  Database,
  Check,
  Award,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";
import { INITIAL_MINI_PROJECT } from "@/data/learningMock";
import AppTopBar from "@/components/app/AppTopBar";

export default function MiniProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    miniProjects,
    activeBlueprint,
    submitMiniProject,
    candidateEvidences,
  } = useEvidence();

  const projectId = (params?.projectId as string) || "proj-outlier-pipeline";
  const project = miniProjects.find((p) => p.id === projectId) || INITIAL_MINI_PROJECT;

  // Form inputs
  const [repoUrl, setRepoUrl] = useState<string>(
    project.submitted_attempt?.github_repo_url ||
      "https://github.com/alexrivera/outlier-treatment-pipeline"
  );
  const [notes, setNotes] = useState<string>(
    project.submitted_attempt?.summary_notes ||
      "Implemented custom Scikit-Learn transformer 'PercentileCapper' wrapping vectorized pandas .clip(). Calculated 1st and 99th quantiles strictly on training splits. Pytest suite verified zero dropped rows."
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const attempt = project.submitted_attempt;
  const isPending = project.status === "submitted" || (attempt && attempt.status === "submitted");
  const isEvaluated = project.status === "evaluated" && attempt && attempt.status === "evaluated" && attempt.total_score != null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;
    setIsSubmitting(true);
    setTimeout(() => {
      submitMiniProject(project.id, repoUrl, notes);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={project.title}
        description={`Target Domain: ${activeBlueprint.title}. Complete the engineering pipeline specification and submit your repository for automated rubric scoring.`}
        badge="Domain 5 · Applied Evidence Generator"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/learning/projects"
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
          >
            &larr; Projects Catalog
          </Link>
          {isEvaluated ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Evaluated · {attempt.total_score}/100
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              Submitted · Pending Evaluation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-ink/10 text-ink/70 font-bold text-xs">
              <Clock className="w-3.5 h-3.5" />
              Awaiting Submission
            </span>
          )}
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

        {/* Bridge Notification */}
        <div className="p-4 rounded-2xl bg-paper/80 border border-ink/10 text-xs text-ink/80 flex items-start gap-3">
          <Info className="w-4 h-4 text-peach shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-ink">Verifiable Artifact Pipeline: </span>
            Submitting this mini-project updates your <span className="font-bold text-ink">Project Signal (Prj = 25%)</span> in topic mastery and publishes a <span className="font-bold text-ink">Candidate Evidence item to Domain 1</span>. It is subsequently queued for human review in <span className="font-bold text-ink">Domain 3</span>.
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Project Spec, Objectives, Rubric */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Statement & Context */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <h2 className="text-base font-extrabold text-ink">
              1. Project Problem Statement
            </h2>
            <p className="text-sm text-ink leading-relaxed">
              {project.problem_statement}
            </p>

            <div className="p-3.5 bg-paper rounded-xl border border-ink/10 text-xs">
              <span className="font-bold text-ink block mb-1">
                Relevance to Diagnosed Skill Gap:
              </span>
              <span className="text-ink/80">{project.relevance_to_gap}</span>
            </div>
          </div>

          {/* Dataset & Objectives */}
          <div className="gl-card p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-base font-extrabold text-ink mb-2">
                2. Dataset Description
              </h2>
              <div className="p-4 bg-paper rounded-xl border border-ink/10 flex items-start gap-3">
                <Database className="w-5 h-5 text-peach shrink-0 mt-0.5" />
                <p className="text-xs md:text-sm text-ink/80 leading-relaxed">
                  {project.dataset_description}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-ink mb-3">
                3. Deliverable Objectives
              </h2>
              <div className="space-y-2">
                {project.objectives.map((obj, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs md:text-sm text-ink/80"
                  >
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-extrabold text-ink mb-3">
                4. Required Pipeline Steps
              </h2>
              <div className="space-y-2">
                {project.required_steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-paper/60 rounded-xl border border-ink/5 text-xs text-ink/80 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-ink/10 text-ink font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rubric Matrix */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-ink">
                5. Evaluation Rubric Matrix (100% Total)
              </h2>
              <span className="text-xs font-bold text-ink/60">5 Criteria</span>
            </div>

            <div className="space-y-3">
              {project.rubric.map((r, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-paper rounded-xl border border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-ink">
                        {r.criterion}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-peach/30 text-ink">
                        {r.weight_pct}% Weight
                      </span>
                    </div>
                    <p className="text-xs text-ink/70">{r.description}</p>
                  </div>

                  {isEvaluated && (
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        {attempt.rubric_scores[idx]?.score || 85}% Score
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Submission & Evaluation Outcome */}
        <div className="lg:col-span-1 space-y-6">
          {/* Interactive Submission Form */}
          <div className="gl-card p-6 space-y-4">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Send className="w-4 h-4 text-peach" />
              Project Submission
            </h2>
            <p className="text-xs text-ink/70">
              Submit your code repository and brief engineering trade-off summary for automated rubric evaluation.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-ink block mb-1">
                  GitHub Repository URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-ink/20 bg-paper text-ink font-mono focus:outline-none focus:border-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink block mb-1">
                  Summary & Rationale Notes
                </label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detail your threshold choices, fit/transform isolation, and test cases..."
                  className="w-full text-xs p-3 rounded-xl border border-ink/20 bg-paper text-ink focus:outline-none focus:border-ink resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full pill-btn pill-btn-primary text-xs justify-center flex items-center gap-2 py-3"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    Executing Rubric Scorer...
                  </>
                ) : (
                  <>
                    <Award className="w-3.5 h-3.5" />
                    Submit for Rubric Evaluation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Submitted Pending Evaluation Panel */}
          {isPending && !isEvaluated && (
            <div className="gl-card p-6 border-2 border-amber-300 bg-amber-50/40 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                Submitted · Pending Rubric Evaluation
              </div>

              <p className="text-xs text-amber-950/80 leading-relaxed">
                Your repository has been recorded. The evaluation engine is processing your deliverable against the rubric criteria.
              </p>

              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1 text-xs">
                <div className="text-ink-muted text-[11px]">Submitted Repository:</div>
                <div className="font-mono text-ink text-[11px] truncate">{attempt?.github_repo_url || repoUrl}</div>
                <div className="text-ink-muted text-[10px] pt-1">Status: Pending Evaluation &bull; Mastery signal not applied yet</div>
              </div>
            </div>
          )}

          {/* Evaluated Outcome Panel */}
          {isEvaluated && (
            <div className="gl-card p-6 border-2 border-emerald-400 bg-emerald-50/30 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Rubric Evaluation Result
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between">
                <span className="text-xs font-medium text-ink/70">Overall Score:</span>
                <span className="text-xl font-extrabold text-ink">
                  {attempt.total_score}/100
                </span>
              </div>

              <p className="text-xs text-ink/80 leading-relaxed">
                {attempt.feedback}
              </p>

              {/* Generated Candidate Evidence Link */}
              <div className="pt-3 border-t border-ink/10 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                  Candidate Evidence Created
                </div>
                <div className="p-3 rounded-xl bg-paper border border-ink/10 space-y-2 text-xs">
                  <div className="font-bold text-ink">
                    Artifact ID: <span className="font-mono text-[11px] text-ink/70">{attempt.generated_artifact_id}</span>
                  </div>
                  <div className="text-ink/70 text-[11px]">
                    State: <span className="font-semibold text-amber-700">Awaiting Human Review</span>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link
                      href="/app/evidence/library"
                      className="pill-btn pill-btn-ghost text-[11px] justify-center flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in Domain 1 Evidence Library
                    </Link>
                    <Link
                      href="/app/ai/review-queue"
                      className="pill-btn pill-btn-ghost text-[11px] justify-center flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View in Domain 3 Review Queue
                    </Link>
                    <Link
                      href="/app/learning/capability"
                      className="pill-btn pill-btn-primary text-[11px] justify-center flex items-center gap-1.5"
                    >
                      Inspect Updated Capability Bridge →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
