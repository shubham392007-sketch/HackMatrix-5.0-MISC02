"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  getLearningStep,
  getBackendAssessment,
  submitBackendAssessment,
} from "@/lib/evidenceApi";
import { INITIAL_STEP_PACKETS } from "@/data/learningMock";
import {
  StepStatusBadge,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BookOpen,
  Code2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ExternalLink,
  Target,
  RefreshCw,
  Video,
  FileCode,
  Award,
} from "lucide-react";

interface RealStepData {
  step_id: string;
  title: string;
  learning_objective: string;
  difficulty: string;
  estimated_minutes: number;
  sequence_order?: number;
  current_mastery: number;
  target_mastery: number;
  status: string;
  prerequisites_met: boolean;
  recommendation_reason: string;
  recommended_resource_ids: string[];
  practice_exercise_ids?: string[];
  assessment_id?: string | null;
  project_id?: string | null;
}

export default function LearningStepDetailPage() {
  const params = useParams();
  const stepId = params?.stepId as string;

  const { activeRoadmap, completeStep, resources, addToast } = useEvidence();

  const [step, setStep] = useState<RealStepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Associated Assessment State
  const [assessment, setAssessment] = useState<any | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load step from backend
  useEffect(() => {
    let isMounted = true;
    async function fetchStep() {
      if (!stepId) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await getLearningStep(stepId);
        if (isMounted) {
          setStep(data);
          setIsCompleted(data.status === "completed");

          // If step has an assessment, fetch it
          if (data.assessment_id) {
            setAssessmentLoading(true);
            try {
              const asmt = await getBackendAssessment(data.assessment_id);
              if (isMounted) setAssessment(asmt);
            } catch (asmtErr) {
              console.warn("Could not fetch associated step assessment:", asmtErr);
            } finally {
              if (isMounted) setAssessmentLoading(false);
            }
          }
        }
      } catch (err: any) {
        // Fallback to active roadmap step if backend 404s
        const fallbackStep = activeRoadmap?.steps?.find((s) => s.step_id === stepId);
        if (fallbackStep && isMounted) {
          setStep(fallbackStep as unknown as RealStepData);
          setIsCompleted(fallbackStep.status === "completed");
        } else if (isMounted) {
          setErrorMessage(err.message || `Learning step "${stepId}" was not found.`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchStep();
    return () => {
      isMounted = false;
    };
  }, [stepId, activeRoadmap]);

  // Curated educational enrichment if available in catalogue
  const packetEnrichment = useMemo(() => {
    if (!stepId) return null;
    return INITIAL_STEP_PACKETS[stepId] || null;
  }, [stepId]);

  // Match recommended resources against verified catalogue
  const stepResources = useMemo(() => {
    if (!step) return [];
    const resourceIds = step.recommended_resource_ids || [];
    return resources.filter((r) => resourceIds.includes(r.id));
  }, [step, resources]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (submissionResult) return; // Locked after submission
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitAssessment = async () => {
    if (!assessment || isSubmittingAssessment) return;
    setIsSubmittingAssessment(true);
    try {
      // Map string keys to numbers for backend if needed
      const answersMap: Record<string, number> = {};
      for (const [k, v] of Object.entries(selectedAnswers)) {
        answersMap[k] = v;
      }
      const res = await submitBackendAssessment(assessment.assessment_id, answersMap);
      setSubmissionResult(res);
      if (res.passed) {
        setIsCompleted(true);
        completeStep(step?.step_id || stepId);
        addToast(
          "Assessment Passed!",
          `Scored ${res.score}%. Step marked completed.`,
          "success"
        );
      } else {
        addToast(
          "Assessment Submitted",
          `Scored ${res.score}%. Minimum passing threshold is ${assessment.passing_threshold || 70}%.`,
          "info"
        );
      }
    } catch (err: any) {
      addToast("Assessment Error", err.message || "Failed to submit assessment.", "error");
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleMarkCompletedDirect = () => {
    if (step) {
      completeStep(step.step_id);
      setIsCompleted(true);
      addToast("Step Completed", `"${step.title}" has been marked complete.`, "success");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
        <p className="text-xs font-mono text-ink-muted">Loading learning step {stepId}...</p>
      </div>
    );
  }

  if (errorMessage || !step) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar title="Learning Step Not Found" />
        <div className="flex-1 p-8 max-w-xl mx-auto text-center space-y-6 my-auto">
          <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2">
            <h3 className="font-bold text-sm">Step Record Unavailable</h3>
            <p className="text-xs leading-relaxed text-amber-900/90">
              {errorMessage || `Learning step "${stepId}" does not exist or does not belong to your account.`}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/app/learning"
              className="pill-btn pill-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Learning Overview
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const safeObjective = step.learning_objective || "Advance verifiable competency in target domain.";
  const safeTitle = step.title || "Focused Learning Step";
  const parentRoadmapPath = activeRoadmap?.path_id || "active";

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={safeTitle}
        description={`Outcome: ${safeObjective}`}
        badge={isCompleted ? "COMPLETED" : (step.status || "AVAILABLE").toUpperCase()}
      >
        <Link
          href={`/app/learning/roadmaps/${parentRoadmapPath}`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Roadmap
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Main 2-Column Learning Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 spans): Structured Step Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Title Card */}
            <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/40 text-ink font-bold">
                  Step {step.sequence_order || 1} &bull; {step.difficulty || "Intermediate"}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-ink">
                  {safeTitle}
                </h1>
                <p className="text-xs md:text-sm text-ink-muted leading-relaxed">
                  <strong>Measurable Outcome:</strong> {safeObjective}
                </p>
              </div>

              {/* Why This Step Matters */}
              {step.recommendation_reason && (
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-1 text-xs">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-800" />
                    Connection to Diagnosed Skill Gap
                  </span>
                  <p className="text-amber-900/90 leading-relaxed text-[11px]">
                    {step.recommendation_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Curated or Fallback Pedagogical Packet */}
            {packetEnrichment ? (
              <>
                <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
                  <div className="space-y-3">
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-ink" />
                      Concept Foundations
                    </h2>
                    <p className="text-xs md:text-sm text-ink/80 leading-relaxed">
                      {packetEnrichment.what_is_it}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-ink/10">
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-ink" />
                      When to Apply
                    </h3>
                    <p className="text-xs text-ink/80 leading-relaxed">
                      {packetEnrichment.why_and_when}
                    </p>
                  </div>
                </div>

                {packetEnrichment.worked_example && (
                  <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-ink" />
                      Worked Example: {packetEnrichment.worked_example.title}
                    </h2>
                    <p className="text-xs text-ink/80 leading-relaxed">
                      {packetEnrichment.worked_example.explanation}
                    </p>

                    {packetEnrichment.worked_example.code && (
                      <pre className="p-4 rounded-2xl bg-ink text-sand font-mono text-xs overflow-x-auto leading-relaxed border border-ink/20">
                        <code>{packetEnrichment.worked_example.code}</code>
                      </pre>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ink" />
                  Engineering Principles & Implementation
                </h2>
                <p className="text-xs md:text-sm text-ink/80 leading-relaxed">
                  This step guides you through mastering <strong>{safeTitle}</strong> to satisfy role proficiency benchmarks.
                  Review the linked technical resources, study the real code patterns, and verify your understanding through the embedded knowledge assessment.
                </p>
                <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-2 text-xs">
                  <span className="font-bold text-ink block">Guidance for this milestone:</span>
                  <ul className="space-y-1.5 text-ink/80 text-[11px] list-disc list-inside">
                    <li>Analyze the prerequisite concepts before building concrete implementations.</li>
                    <li>Avoid premature optimization; ensure error-handling, validation, and boundary cases are covered.</li>
                    <li>Verify each requirement against the measurable outcome defined above.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Linked Real Resources from Catalogue */}
            {stepResources.length > 0 && (
              <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink flex items-center gap-2">
                    <Video className="w-4 h-4 text-ink" />
                    Recommended Verified Learning Resources ({stepResources.length})
                  </h2>
                  <span className="text-[10px] font-mono uppercase text-ink-muted">
                    External Tutorials & Guides
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {stepResources.map((res) => (
                    <a
                      key={res.id}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-xl border border-ink/10 hover:border-ink/30 bg-sand/10 hover:bg-sand/20 transition-all flex flex-col justify-between space-y-2 group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-ink-muted uppercase">
                          <span>{res.provider}</span>
                          <span className="flex items-center gap-0.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-ink group-hover:text-amber-800 transition-colors mt-1">
                          {res.title}
                        </h4>
                        <p className="text-[11px] text-ink-muted line-clamp-2 mt-1">
                          {res.description || res.learning_objective || res.selection_explanation}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-ink-muted pt-2 border-t border-ink/5">
                        <span>{res.author_or_channel || "Verified Creator"}</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Associated Assessment / Knowledge Check */}
            {assessment && assessment.questions && assessment.questions.length > 0 && (
              <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-ink" />
                      Knowledge Assessment: {assessment.title}
                    </h2>
                    <span className="text-xs text-ink-muted">
                      {assessment.total_questions || assessment.questions.length} Questions &bull; Pass Threshold: {assessment.passing_threshold || 70}%
                    </span>
                  </div>
                  {submissionResult && (
                    <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                      submissionResult.passed ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-red-100 text-red-900 border border-red-300"
                    }`}>
                      Score: {submissionResult.score}% &bull; {submissionResult.passed ? "PASSED" : "NEEDS RETRY"}
                    </div>
                  )}
                </div>

                <div className="space-y-6 pt-2">
                  {assessment.questions.map((q: any, qIdx: number) => {
                    const qId = q.id || `q-${qIdx+1}`;
                    const selectedOpt = selectedAnswers[qId];
                    const evalData = submissionResult?.evaluations?.find((e: any) => e.question_id === qId);

                    return (
                      <div key={qId} className="space-y-3 p-4 rounded-2xl bg-sand/15 border border-ink/10 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-ink text-sm">
                            {qIdx + 1}. {q.text || q.question_text}
                          </p>
                          <span className="text-[10px] font-mono text-ink-muted shrink-0 uppercase">
                            {q.difficulty || "Intermediate"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(q.options || []).map((opt: string, optIdx: number) => {
                            const isSelected = selectedOpt === optIdx;
                            let style = "bg-white hover:bg-sand/30 border-ink/10 text-ink";

                            if (evalData) {
                              if (evalData.correct_index === optIdx) {
                                style = "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold";
                              } else if (isSelected && !evalData.is_correct) {
                                style = "bg-red-100 border-red-300 text-red-950 line-through";
                              }
                            } else if (isSelected) {
                              style = "bg-lime/30 border-ink font-bold text-ink";
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={Boolean(submissionResult)}
                                onClick={() => handleSelectOption(qId, optIdx)}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${style}`}
                              >
                                <span className="font-mono text-[10px] opacity-70">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {evalData && (
                          <div className="p-3 rounded-xl bg-white border border-ink/10 text-[11px] text-ink/80 space-y-1">
                            <span className="font-bold block text-ink">Explanation:</span>
                            <p>{evalData.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-ink/10">
                  <span className="text-xs text-ink-muted">
                    {Object.keys(selectedAnswers).length} of {assessment.questions.length} answered
                  </span>

                  {!submissionResult ? (
                    <button
                      onClick={handleSubmitAssessment}
                      disabled={isSubmittingAssessment || Object.keys(selectedAnswers).length === 0}
                      className="pill-btn pill-btn-primary text-xs py-2 px-6 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmittingAssessment ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Grading...
                        </>
                      ) : (
                        "Submit for Server Evaluation"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSubmissionResult(null);
                        setSelectedAnswers({});
                      }}
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-4 text-ink"
                    >
                      Retake Assessment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Direct Completion Option if no assessment required */}
            {(!assessment || !assessment.questions || assessment.questions.length === 0) && (
              <div className="p-4 rounded-2xl bg-white border border-ink/15 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-ink">Milestone Progress</h4>
                  <p className="text-[11px] text-ink-muted">
                    Mark this step completed once you have studied the material and implemented the guidance.
                  </p>
                </div>
                <button
                  onClick={handleMarkCompletedDirect}
                  disabled={isCompleted}
                  className={`pill-btn text-xs py-2 px-6 shrink-0 flex items-center gap-1.5 ${
                    isCompleted ? "bg-emerald-600 text-white cursor-default" : "pill-btn-primary"
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Step Completed
                    </>
                  ) : (
                    "Mark Step Completed &rarr;"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column (1 span): Progress Panel & Next Actions */}
          <div className="space-y-6">
            {/* Step Progress Card */}
            <div className="gl-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-ink">Step Progress</h3>
              <div className="space-y-2">
                <MasteryProgressBar
                  current={isCompleted ? (step.target_mastery || 80) : (step.current_mastery || 0)}
                  target={step.target_mastery || 80}
                />
                <span className="text-[11px] text-ink-muted block text-right font-mono">
                  Target: {step.target_mastery || 80}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase text-ink-muted block font-bold">
                  Step Criteria
                </span>
                <ul className="space-y-1.5 text-ink/80 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? "text-emerald-600" : "text-ink/30"}`} />
                    <span>Review learning material</span>
                  </li>
                  {step.assessment_id && (
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${submissionResult?.passed ? "text-emerald-600" : "text-ink/30"}`} />
                      <span>Pass knowledge assessment</span>
                    </li>
                  )}
                  {step.project_id && (
                    <li className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-ink/60" />
                      <span>Submit applied mini-project</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Next Connected Actions */}
            <div className="gl-card p-6 space-y-3">
              <h3 className="text-sm font-bold text-ink">Connected Activities</h3>

              <div className="space-y-2.5 text-xs">
                {step.project_id && (
                  <Link
                    href={`/app/learning/projects/${step.project_id}`}
                    className="w-full pill-btn pill-btn-primary py-2 px-3 text-center flex items-center justify-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    Open Mini-Project ({step.project_id})
                  </Link>
                )}

                <Link
                  href="/app/learning/practice"
                  className="w-full pill-btn bg-white hover:bg-sand/30 border border-ink/20 py-2 px-3 text-center flex items-center justify-center gap-1.5 text-ink"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Practice Exercises
                </Link>

                <Link
                  href="/app/learning/resources"
                  className="w-full pill-btn bg-white hover:bg-sand/30 border border-ink/20 py-2 px-3 text-center flex items-center justify-center gap-1.5 text-ink"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Catalogue Resources
                </Link>

                <Link
                  href={`/app/learning/roadmaps/${parentRoadmapPath}`}
                  className="w-full pill-btn bg-sand/20 hover:bg-sand/40 py-2 px-3 text-center block text-ink-muted"
                >
                  Return to Roadmap Sequence
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
