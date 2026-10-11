"use client";

import React from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  TopicDifficultyBadge,
  MasteryProgressBar,
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
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function MiniProjectsCatalogPage() {
  const { activeBlueprint, miniProjects } = useEvidence();

  // Curated list of mini projects across domains
  const allProjects = [
    ...miniProjects,
    {
      id: "proj-imputation-benchmark",
      title: "Missing Value Imputation Benchmarking Suite",
      domain_id: "domain-data-preprocessing",
      problem_statement:
        "Evaluate mean, median, KNN, and IterativeImputer across MCAR and MAR missingness mechanisms, measuring downstream Ridge Regression degradation.",
      relevance_to_gap:
        "Targets systematic handling of incomplete real-world tabular data.",
      objectives: [
        "Simulate missing at random (MAR) patterns on standard housing dataset",
        "Benchmark RMSE of 4 distinct imputer strategies",
        "Measure execution latency and memory overhead",
      ],
      required_steps: [
        "Step 1: Synthetic masking",
        "Step 2: Model fit",
        "Step 3: Score comparison table",
      ],
      dataset_description: "Standard Boston/California Housing synthetic tabular dataset (20,640 records).",
      submission_requirements: ["Jupyter Notebook / Python script", "Benchmark summary markdown"],
      rubric: [
        { criterion: "Experimental Design", weight_pct: 30, description: "Controlled synthetic missingness" },
        { criterion: "Imputer Implementation", weight_pct: 40, description: "Accurate scikit-learn transformers" },
        { criterion: "Empirical Analysis", weight_pct: 30, description: "Metric interpretation" },
      ],
      status: "not_started" as const,
    },
    {
      id: "proj-xgboost-tuning",
      title: "Early-Stopping Gradient Boosted Regression",
      domain_id: "domain-machine-learning",
      problem_statement:
        "Construct cross-validated XGBoost model with Bayesian hyperparameter tuning and learning-curve telemetry to prevent overfit.",
      relevance_to_gap:
        "Validates core supervised machine learning capability under real distribution shifts.",
      objectives: [
        "Train baseline XGBoost regressor",
        "Configure optuna Bayesian objective function",
        "Plot training vs validation learning curves",
      ],
      required_steps: ["Step 1: Feature matrix", "Step 2: Tuning", "Step 3: Test evaluation"],
      dataset_description: "Anonymized e-commerce transaction dataset with 100,000 observations.",
      submission_requirements: ["GitHub repo URL", "Telemetry dashboard screenshot"],
      rubric: [
        { criterion: "Model Tuning Rigor", weight_pct: 50, description: "Cross-validation design" },
        { criterion: "Loss Diagnostics", weight_pct: 30, description: "Learning curve analysis" },
        { criterion: "Code Modularity", weight_pct: 20, description: "Reproducible script" },
      ],
      status: "not_started" as const,
    },
  ];

  const domainProjects = allProjects.filter((p) => p.domain_id === activeBlueprint.domain_id);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence-Generating Mini-Projects"
        description="Solve realistic data engineering and ML engineering challenges. Completing a project updates your Project Signal (Prj = 25%) and submits a verifiable artifact directly to the Verification Center."
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
            Submitting a completed mini-project generates a <span className="font-semibold">Candidate Learning Evidence item</span> in Domain 1. It enters the <span className="font-semibold">Human Review Queue (Domain 3)</span> with full provenance. Only after peer or managerial verification does it promote candidate skills into your verified SkillPassport.
          </div>
        </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-peach" />
            Available Projects for {activeBlueprint.title}
          </h2>
          <span className="text-xs text-ink/60 font-medium">
            {domainProjects.length} Applied Modules
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {domainProjects.map((project) => {
            const isEvaluated = project.status === "evaluated";

            return (
              <div
                key={project.id}
                className={`gl-card p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                  isEvaluated ? "border-l-4 border-l-emerald-500" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ink/5 text-ink">
                      Applied Pipeline
                    </span>
                    {isEvaluated ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Evaluated · {project.submitted_attempt?.total_score || 88}%
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-ink/50 bg-paper px-2.5 py-0.5 rounded-full border border-ink/10">
                        Ready to Start
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-ink">
                    {project.title}
                  </h3>
                  <p className="text-xs text-ink/70 mt-2 line-clamp-3 leading-relaxed">
                    {project.problem_statement}
                  </p>

                  {/* Rubric Preview */}
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
                </div>

                <div className="mt-6 pt-4 border-t border-ink/10 flex items-center justify-between">
                  <div className="text-xs text-ink/60">
                    Target Skill: <span className="font-semibold text-ink">Python / Data Prep</span>
                  </div>

                  <Link
                    href={`/app/learning/projects/${project.id}`}
                    className={`pill-btn text-xs flex items-center gap-1.5 ${
                      isEvaluated ? "pill-btn-ghost" : "pill-btn-primary"
                    }`}
                  >
                    {isEvaluated ? "Inspect Submission & Rubric →" : "Launch Project Workspace →"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
