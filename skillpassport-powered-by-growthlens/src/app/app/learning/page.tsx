"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  StepStatusBadge,
  MasteryProgressBar,
  MasteryFormulaModal,
} from "@/components/app/LearningBadges";
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
} from "lucide-react";

export default function LearningOverviewPage() {
  const {
    blueprints,
    activeBlueprint,
    activeRoadmap,
    learningHistory,
    miniProjects,
    activeDomainId,
  } = useEvidence();

  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  // Active step is first in-progress or available step
  const activeStep =
    activeRoadmap.steps.find((s) => s.status === "in_progress") ||
    activeRoadmap.steps.find((s) => s.status === "available") ||
    activeRoadmap.steps[0];

  const completedStepsCount = activeRoadmap.steps.filter(
    (s) => s.status === "completed"
  ).length;

  const improvement = activeRoadmap.current_mastery - activeRoadmap.baseline_mastery;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime/40 text-ink border border-ink/20 font-bold">
              Domain 5 &bull; Learning Intelligence
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              Personalized Growth Engine
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
              DEMO DATA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">
            Your Growth Journey
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Targeted learning personalized to the competencies and evidence gaps identified in your SkillPassport.
            Convert identified weaknesses into measurable, verifiable capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFormulaModalOpen(true)}
            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5" />
            Mastery Formula
          </button>
          <Link
            href={`/app/learning/roadmaps/${activeRoadmap.path_id}`}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Open Full Roadmap &rarr;
          </Link>
        </div>
      </div>

      {/* Domain Switcher */}
      <ActiveDomainSelectorBar />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted">
            Active Learning Paths
          </span>
          <div className="text-2xl font-bold text-ink">{blueprints.length}</div>
          <span className="text-[11px] text-ink-muted block">
            Focus: {activeBlueprint.title}
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-lime-300 bg-lime/10">
          <span className="text-[10px] font-mono uppercase text-ink font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-ink" /> Overall Mastery
          </span>
          <div className="text-2xl font-bold text-ink flex items-baseline gap-1.5">
            <span>{activeRoadmap.current_mastery}%</span>
            <span className="text-xs text-emerald-700 font-normal">
              (+{improvement}%)
            </span>
          </div>
          <span className="text-[11px] text-ink-muted block">
            Baseline was {activeRoadmap.baseline_mastery}% &bull; Target: {activeRoadmap.target_mastery}%
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-amber-200 bg-amber-50/30">
          <span className="text-[10px] font-mono uppercase text-amber-900 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Priority Gaps
          </span>
          <div className="text-2xl font-bold text-amber-950">2 Focus Areas</div>
          <span className="text-[11px] text-amber-800/80 block">
            Outliers & Robust Scaling
          </span>
        </div>

        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed Steps
          </span>
          <div className="text-2xl font-bold text-ink">
            {completedStepsCount} / {activeRoadmap.steps.length}
          </div>
          <span className="text-[11px] text-ink-muted block">
            Pace: {activeRoadmap.pace === "fast_track" ? "Fast Track" : "Standard"}
          </span>
        </div>
      </div>

      {/* Hero: Continue Learning Card */}
      {activeStep && (
        <div className="gl-card p-6 md:p-8 space-y-5 bg-gradient-to-r from-cream via-white to-sand/20 border-ink/15">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  Current Active Objective
                </span>
                <span className="text-xs font-mono text-ink-muted">
                  Domain: {activeBlueprint.title}
                </span>
                <StepStatusBadge status={activeStep.status} />
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-ink">
                {activeStep.title}
              </h2>

              <p className="text-xs md:text-sm text-ink/80 max-w-2xl leading-relaxed">
                <strong>Objective:</strong> {activeStep.learning_objective}
              </p>

              <div className="p-3 rounded-xl bg-sand/20 border border-ink/10 text-xs text-ink/80 max-w-2xl">
                <span className="font-bold text-ink block mb-0.5">Why this step?</span>
                {activeStep.recommendation_reason}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-ink/10 text-center shrink-0 min-w-[180px] space-y-2 shadow-sm">
              <span className="text-[10px] font-mono text-ink-muted uppercase block">
                Topic Mastery
              </span>
              <div className="text-3xl font-black text-ink">
                {activeStep.current_mastery}%
              </div>
              <span className="text-[10px] text-ink-muted block">
                Target: {activeStep.target_mastery}% &bull; ~{activeStep.estimated_minutes} min
              </span>

              <Link
                href={`/app/learning/steps/${activeStep.step_id}`}
                className="w-full pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 mt-2"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Resume Step
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10">
            <MasteryProgressBar
              current={activeStep.current_mastery}
              target={activeStep.target_mastery}
            />
          </div>
        </div>
      )}

      {/* 2-Column Section: Weak Domains vs Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Weak Domains Supplied by Role Intelligence */}
        <div className="gl-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">
                  Diagnosed Growth Priorities
                </h3>
                <span className="text-[11px] text-ink-muted">
                  Gaps linked from Role Intelligence (Domain 4)
                </span>
              </div>
            </div>
            <Link
              href="/app/career/gaps"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
            >
              Role Gaps &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Data Preprocessing & Outliers</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-100 text-red-900 font-bold">
                  Depth Gap
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Target role <em>Junior AI Application Engineer</em> expects Practitioner-level preprocessing pipelines with leak-free transformers.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Roadmap in Progress (62% Mastery)</span>
                <Link
                  href={`/app/learning/roadmaps/${activeRoadmap.path_id}`}
                  className="font-bold text-ink hover:underline"
                >
                  View Learning Steps &rarr;
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Cloud & Container Deployment</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                  Evidence Gap
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Basic Dockerfiles present, but multi-stage container optimization and Kubernetes deployment manifests lack verified proof.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Cloud Blueprint Available</span>
                <Link
                  href="/app/learning/domains/domain-cloud-computing"
                  className="font-bold text-ink hover:underline"
                >
                  Inspect Blueprint &rarr;
                </Link>
              </div>
            </div>
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
                  Practical projects & knowledge evaluations
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
            {/* Mini Project Milestone */}
            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  Mini-Project: Outlier Treatment Pipeline
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime/40 text-ink font-bold">
                  Generates Evidence
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Encapsulate Winsorization and IQR rules inside a custom Scikit-Learn transformer with automated pytest coverage.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Rubric: 5 Evaluation Criteria (100%)</span>
                <Link
                  href="/app/learning/projects/proj-outlier-pipeline"
                  className="font-bold text-ink hover:underline"
                >
                  Project Details & Submit &rarr;
                </Link>
              </div>
            </div>

            {/* Assessment Milestone */}
            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  Knowledge Assessment: Data Preprocessing
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand/30 text-ink font-bold">
                  25 Min &bull; 4 Problems
                </span>
              </div>
              <p className="text-ink-muted text-[11px]">
                Evaluates concept and application mastery across imputation, outlier handling, and pipeline leakage.
              </p>
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-ink-muted">Passing Threshold: 75%</span>
                <Link
                  href="/app/learning/assessments/assessment-domain-data-preprocessing"
                  className="font-bold text-ink hover:underline"
                >
                  Start Assessment &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Learning Activity Log Preview */}
      <div className="gl-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink" />
            <h3 className="text-base font-bold text-ink">Recent Learning Activity</h3>
          </div>
          <Link
            href="/app/learning/history"
            className="text-xs font-bold text-ink hover:underline"
          >
            Full Auditable History &rarr;
          </Link>
        </div>

        <div className="divide-y divide-ink/10">
          {learningHistory.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-sand/40 text-ink uppercase">
                    {item.type.replace("_", " ")}
                  </span>
                  <span className="font-bold text-ink">{item.title}</span>
                </div>
                <p className="text-ink-muted text-[11px]">{item.detail}</p>
                <span className="text-[10px] font-mono text-ink-muted block">
                  {item.timestamp}
                </span>
              </div>

              {item.link_route && (
                <Link
                  href={item.link_route}
                  className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-[11px] py-1 px-3 text-ink shrink-0"
                >
                  Inspect
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Formula Explanation Modal */}
      <MasteryFormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
}
