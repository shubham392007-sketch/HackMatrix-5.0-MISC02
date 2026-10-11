"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { INITIAL_DIAGNOSTIC_QUESTIONS } from "@/data/learningMock";
import { evaluateDiagnostic } from "@/lib/learningCalculations";
import { DiagnosticResult } from "@/types/learning";
import AppTopBar from "@/components/app/AppTopBar";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Brain,
  Code2,
  Layers,
  RotateCcw,
  GraduationCap,
  Info,
} from "lucide-react";

export default function DiagnosticAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const domainId = (params?.domainId as string) || "domain-data-preprocessing";

  const { activeBlueprint, recordDiagnosticResult, activeDiagnosticResult } =
    useEvidence();

  const questions = INITIAL_DIAGNOSTIC_QUESTIONS;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(
    activeDiagnosticResult || null
  );

  const currentQ = questions[currentIdx];
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);
  const totalAnswered = Object.keys(answers).length;

  const handleSelectOption = (qId: string, optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmit = () => {
    const res = evaluateDiagnostic(answers, questions, domainId);
    setResult(res);
    setIsSubmitted(true);
    recordDiagnosticResult(res);
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
    setCurrentIdx(0);
    setResult(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={`${activeBlueprint.title} Diagnostic`}
        description="Evaluate your baseline capability across conceptual, reasoning, implementation, and application dimensions before roadmap generation."
        badge="10 Technical Questions"
        badgeColor="border-amber-300 text-amber-900 bg-amber-100"
      >
        <Link
          href={`/app/learning/domains/${domainId}`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Blueprint
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {!isSubmitted && !result ? (
        /* Question Flow */
        <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-ink font-bold">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-ink-muted">
                {totalAnswered} of {questions.length} Answered ({progressPct}%)
              </span>
            </div>
            <div className="w-full bg-sand/30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-ink h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Question Meta Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/40 text-ink font-semibold">
              Category: {currentQ.category}
            </span>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/20 text-ink-muted">
              Topic: {currentQ.topic_id.replace("topic-", "")}
            </span>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <h2 className="text-base md:text-lg font-bold text-ink leading-relaxed">
              {currentQ.question_text}
            </h2>

            {/* Code Snippet if present */}
            {currentQ.code_snippet && (
              <pre className="p-4 rounded-2xl bg-ink text-sand font-mono text-xs overflow-x-auto leading-relaxed border border-ink/20">
                <code>{currentQ.code_snippet}</code>
              </pre>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = answers[currentQ.id] === optIdx;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(currentQ.id, optIdx)}
                  className={`w-full text-left p-4 rounded-2xl border text-xs transition-all flex items-start gap-3 ${
                    isSelected
                      ? "bg-lime/20 border-ink shadow-sm font-semibold text-ink"
                      : "bg-white hover:bg-sand/20 border-ink/10 text-ink/90"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] ${
                      isSelected
                        ? "border-ink bg-ink text-white font-bold"
                        : "border-ink/20 bg-sand/20 text-ink-muted"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <span className="leading-relaxed">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="pill-btn bg-sand/20 hover:bg-sand/40 border border-ink/10 text-xs py-2 px-4 disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() =>
                    setCurrentIdx((prev) =>
                      Math.min(questions.length - 1, prev + 1)
                    )
                  }
                  className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
                >
                  Next Question
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={totalAnswered < questions.length}
                  className="pill-btn bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-6 flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                >
                  Submit & Score Diagnostic
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Hero Result Card */}
          <div className="gl-card p-6 md:p-8 space-y-6 bg-gradient-to-r from-cream via-white to-sand/20 border-ink/15">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                  Diagnostic Evaluation Completed
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-ink">
                  Overall Baseline: {result?.overall_score}%
                </h2>
                <p className="text-xs md:text-sm text-ink-muted max-w-xl leading-relaxed">
                  Your responses demonstrate solid theoretical missing-value basics, but highlight gaps in percentile threshold selection, robust scaling, and pipeline leakage protection.
                </p>
              </div>

              <div className="w-32 h-32 rounded-full bg-white border-4 border-lime flex flex-col items-center justify-center shrink-0 shadow-md">
                <span className="text-[10px] font-mono text-ink-muted uppercase">
                  Score
                </span>
                <span className="text-3xl font-black text-ink">
                  {result?.overall_score}%
                </span>
                <span className="text-[9px] font-mono text-ink-muted">
                  10 Questions
                </span>
              </div>
            </div>

            {/* 4 Category Breakdown Bars */}
            <div className="pt-4 border-t border-ink/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] font-mono text-ink-muted block uppercase">
                  Conceptual
                </span>
                <span className="text-xl font-bold text-ink">
                  {result?.concept_score}%
                </span>
                <div className="w-full bg-sand/30 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${result?.concept_score}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] font-mono text-ink-muted block uppercase">
                  Reasoning
                </span>
                <span className="text-xl font-bold text-ink">
                  {result?.reasoning_score}%
                </span>
                <div className="w-full bg-sand/30 rounded-full h-1.5">
                  <div
                    className="bg-sky-500 h-1.5 rounded-full"
                    style={{ width: `${result?.reasoning_score}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] font-mono text-ink-muted block uppercase">
                  Implementation
                </span>
                <span className="text-xl font-bold text-amber-800">
                  {result?.implementation_score}%
                </span>
                <div className="w-full bg-sand/30 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{ width: `${result?.implementation_score}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] font-mono text-ink-muted block uppercase">
                  Application
                </span>
                <span className="text-xl font-bold text-amber-800">
                  {result?.application_score}%
                </span>
                <div className="w-full bg-sand/30 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{ width: `${result?.application_score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Strong vs Weak Diagnosis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="gl-card p-5 space-y-3 border-emerald-200 bg-emerald-50/20">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Demonstrated Strong Areas (Can Skip Intro)
              </span>
              <ul className="space-y-1.5 text-emerald-900">
                <li className="p-2 rounded bg-white border border-emerald-200">
                  <strong>Missing Values & Imputation:</strong> Understood MCAR/MNAR mechanisms.
                </li>
                <li className="p-2 rounded bg-white border border-emerald-200">
                  <strong>Tukey IQR Boxplots:</strong> Accurate calculation of 1.5x IQR boundaries.
                </li>
              </ul>
            </div>

            <div className="gl-card p-5 space-y-3 border-amber-200 bg-amber-50/20">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                <XCircle className="w-4 h-4 text-amber-700" />
                Diagnosed Weaknesses & Priorities
              </span>
              <ul className="space-y-1.5 text-amber-900">
                <li className="p-2 rounded bg-white border border-amber-200">
                  <strong>Winsorization & Capping:</strong> Inefficient or non-vectorized thresholding.
                </li>
                <li className="p-2 rounded bg-white border border-amber-200">
                  <strong>Pipeline Leakage:</strong> Fitting scalers before dataset partitioning.
                </li>
              </ul>
            </div>
          </div>

          {/* Next Steps CTA */}
          <div className="gl-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-ink/20 bg-white">
            <div className="space-y-1 text-xs">
              <span className="font-bold text-ink text-sm block">
                Ready to Generate Your Personalized Roadmap?
              </span>
              <p className="text-ink-muted">
                Your roadmap will automatically sequence prerequisite steps and prioritize Outlier Treatment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="pill-btn bg-sand/20 hover:bg-sand/40 text-xs py-2 px-3 text-ink flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake
              </button>
              <Link
                href={`/app/learning/roadmaps/roadmap-${domainId}`}
                className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Open Personalized Roadmap &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
}
