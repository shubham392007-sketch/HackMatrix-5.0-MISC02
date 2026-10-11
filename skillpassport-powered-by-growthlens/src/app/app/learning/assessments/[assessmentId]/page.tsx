"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  BookOpen,
  Award,
  ShieldAlert,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { evaluateAssessmentAttempt } from "@/lib/learningCalculations";
import { AssessmentAttempt } from "@/types/learning";

export default function KnowledgeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { assessment, activeBlueprint, recordAssessmentAttempt } = useEvidence();

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(assessment.time_limit_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<AssessmentAttempt | null>(null);

  // Timer countdown
  useEffect(() => {
    if (submittedAttempt) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submittedAttempt]);

  const questions = assessment.questions;
  const currentQ = questions[currentIdx];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (qId: string, optIdx: number) => {
    if (submittedAttempt) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const answeredCount = Object.keys(answers).length;

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const attempt = evaluateAssessmentAttempt(assessment, answers);
      setSubmittedAttempt(attempt);
      recordAssessmentAttempt(attempt);
      setIsSubmitting(false);
    }, 600);
  };

  const handleRetake = () => {
    setAnswers({});
    setFlagged({});
    setTimeLeft(assessment.time_limit_minutes * 60);
    setCurrentIdx(0);
    setSubmittedAttempt(null);
  };

  return (
    <div className="space-y-6">
      <ActiveDomainSelectorBar />

      {/* Header bar */}
      <div className="gl-card p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-peach/30 text-ink text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5" />
              DOMAIN 5 · FORMAL KNOWLEDGE ASSESSMENT
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              {assessment.title}
            </h1>
            <p className="text-xs md:text-sm text-ink/70 mt-1 max-w-2xl">
              Target Blueprint: <span className="font-semibold text-ink">{activeBlueprint.title}</span>. Passing threshold is <span className="font-bold text-ink">{assessment.passing_threshold}%</span>. Performance directly calibrates your <span className="font-semibold text-ink">Assessment Signal (A = 20%)</span>.
            </p>
          </div>

          {!submittedAttempt && (
            <div className="flex items-center gap-4 bg-paper p-3 rounded-2xl border border-ink/10 shadow-sm shrink-0">
              <div className="flex items-center gap-2 text-ink font-mono font-bold text-lg">
                <Clock className="w-5 h-5 text-peach fill-current animate-pulse" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
              <div className="h-8 w-px bg-ink/10" />
              <div className="text-xs text-ink/60">
                <span className="font-bold text-ink">{answeredCount}</span> of {questions.length} answered
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main View: In-Progress vs Results */}
      {!submittedAttempt ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="gl-card p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink/60 mb-3">
                Question Navigator
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentIdx;
                  const isFlagged = flagged[q.id];

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`relative p-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                        isCurrent
                          ? "bg-ink text-paper border-ink shadow-sm ring-2 ring-ink/20"
                          : isAnswered
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                          : "bg-paper text-ink/70 border-ink/10 hover:bg-card"
                      }`}
                    >
                      <span>Q{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                      <span className="text-[9px] font-normal opacity-70">
                        {isAnswered ? "Saved" : "Empty"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-ink/10 space-y-2 text-[11px] text-ink/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-ink" />
                  <span>Current Question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Flagged for Review</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-ink/10">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full pill-btn pill-btn-primary text-xs justify-center flex items-center gap-2"
                >
                  {isSubmitting ? "Scoring Attempt..." : "Submit Assessment →"}
                </button>
              </div>
            </div>
          </div>

          {/* Active Question Panel */}
          <div className="lg:col-span-3 space-y-4">
            <div className="gl-card p-6 md:p-8 space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ink/5 text-ink">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-peach/20 text-ink">
                    {currentQ.category}
                  </span>
                </div>

                <button
                  onClick={() => toggleFlag(currentQ.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    flagged[currentQ.id]
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-paper border-ink/10 text-ink/60 hover:text-ink"
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {flagged[currentQ.id] ? "Flagged" : "Flag for Review"}
                </button>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <h2 className="text-base md:text-lg font-bold text-ink leading-relaxed">
                  {currentQ.text}
                </h2>

                {currentQ.code_block && (
                  <pre className="p-4 bg-ink text-paper rounded-xl text-xs font-mono overflow-x-auto">
                    <code>{currentQ.code_block}</code>
                  </pre>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQ.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ.id, optIdx)}
                      className={`w-full p-4 rounded-xl text-left text-xs md:text-sm font-medium border transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? "bg-peach/30 border-ink text-ink font-semibold shadow-sm"
                          : "bg-paper hover:bg-card border-ink/10 text-ink/80"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                          isSelected
                            ? "bg-ink text-paper border-ink"
                            : "border-ink/20 text-ink/60"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-ink/10">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Previous Question
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
                  >
                    Next Question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Finish & Submit Assessment
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          {/* Main Score Banner */}
          <div
            className={`gl-card p-6 md:p-8 border-2 ${
              submittedAttempt.passed
                ? "bg-emerald-50/50 border-emerald-400"
                : "bg-rose-50/50 border-rose-400"
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {submittedAttempt.passed ? (
                    <span className="bg-emerald-200 text-emerald-900 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      Assessment Passed
                    </span>
                  ) : (
                    <span className="bg-rose-200 text-rose-900 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Threshold Not Met (Needs Remediation)
                    </span>
                  )}
                </div>

                <h2 className="text-3xl font-extrabold text-ink">
                  Overall Score: {submittedAttempt.total_score}%
                </h2>
                <p className="text-xs md:text-sm text-ink/70">
                  Passing threshold is {assessment.passing_threshold}%. Your performance updated the <span className="font-semibold text-ink">Assessment Signal (A)</span> across related roadmap topics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleRetake}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retake Assessment
                </button>

                {submittedAttempt.needs_remediation ? (
                  <Link
                    href={`/app/learning/remediation/${submittedAttempt.attempt_id}`}
                    className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Start Targeted Remediation →
                  </Link>
                ) : (
                  <Link
                    href="/app/learning/projects"
                    className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
                  >
                    Continue to Mini-Projects →
                  </Link>
                )}
              </div>
            </div>

            {/* Score Breakdown Row */}
            <div className="mt-6 pt-6 border-t border-ink/10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-paper rounded-xl border border-ink/10">
                <div className="text-xs text-ink/60">Concept Understanding</div>
                <div className="text-lg font-bold text-ink mt-0.5">
                  {submittedAttempt.concept_score}%
                </div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-ink/10">
                <div className="text-xs text-ink/60">Applied Engineering</div>
                <div className="text-lg font-bold text-ink mt-0.5">
                  {submittedAttempt.application_score}%
                </div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-ink/10">
                <div className="text-xs text-ink/60">Demonstrated Objectives</div>
                <div className="text-lg font-bold text-ink mt-0.5">
                  {submittedAttempt.objective_results.filter((o) => o.passed).length} of{" "}
                  {submittedAttempt.objective_results.length}
                </div>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-ink/10">
                <div className="text-xs text-ink/60">Status</div>
                <div className="text-xs font-bold text-ink mt-1 flex items-center gap-1">
                  {submittedAttempt.passed ? (
                    <span className="text-emerald-700">Satisfies Domain Criterion</span>
                  ) : (
                    <span className="text-rose-700">Remediation Triggered</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Objective Analysis Table */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <h3 className="text-base font-bold text-ink">
              Objective-by-Objective Diagnostic Audit
            </h3>
            <p className="text-xs text-ink/70">
              The assessment maps every question directly to atomic learning objectives in your domain blueprint.
            </p>

            <div className="space-y-3 mt-4">
              {submittedAttempt.objective_results.map((obj, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border bg-paper/60 border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-ink">
                        {obj.topic_id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          obj.passed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {obj.passed ? "PASSED" : "NEEDS PRACTICE"}
                      </span>
                    </div>
                    <p className="text-xs text-ink/70">{obj.feedback}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-ink">
                      {obj.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="gl-card p-6 md:p-8 space-y-6">
            <h3 className="text-base font-bold text-ink">
              Item-Level Audit & Explanations
            </h3>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const userChoice = answers[q.id];
                const isCorrect = userChoice === q.correct_index;

                return (
                  <div
                    key={q.id}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isCorrect
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-rose-50/40 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink flex items-center gap-2">
                        {isCorrect ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600" />
                        )}
                        Question {idx + 1} · {q.category.toUpperCase()}
                      </span>
                      <span className="text-xs text-ink/60 font-mono">
                        {q.topic_id}
                      </span>
                    </div>

                    <p className="text-xs md:text-sm font-semibold text-ink">
                      {q.text}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2">
                      <div className="p-2.5 rounded-lg bg-paper border border-ink/10">
                        <span className="text-[10px] font-bold uppercase text-ink/50 block">
                          Your Answer:
                        </span>
                        <span className={isCorrect ? "text-emerald-800 font-semibold" : "text-rose-800 font-semibold"}>
                          {userChoice !== undefined ? q.options[userChoice] : "Unanswered"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-paper border border-ink/10">
                        <span className="text-[10px] font-bold uppercase text-ink/50 block">
                          Correct Answer:
                        </span>
                        <span className="text-emerald-800 font-semibold">
                          {q.options[q.correct_index]}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-paper/80 rounded-xl border border-ink/5 text-xs text-ink/80">
                      <span className="font-bold text-ink block mb-0.5">Rationale:</span>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
