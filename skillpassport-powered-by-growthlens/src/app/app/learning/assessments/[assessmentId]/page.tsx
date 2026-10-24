"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
} from "@/components/app/LearningBadges";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Flag,
  RotateCcw,
  ShieldAlert,
  Check,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getBackendAssessment,
  generateBackendAssessment,
  submitBackendAssessment,
} from "@/lib/evidenceApi";
import AppTopBar from "@/components/app/AppTopBar";
import { AssessmentAttempt } from "@/types/learning";

interface BackendQuestion {
  id: string;
  question_text: string;
  text?: string;
  category: string;
  options: string[];
  difficulty: string;
  points: number;
  hint?: string;
}

interface BackendAssessmentData {
  assessment_id: string;
  title: string;
  skill_id: string;
  skill_name: string;
  learning_objective: string;
  difficulty: string;
  passing_threshold: number;
  time_limit_minutes: number;
  total_questions: number;
  questions: BackendQuestion[];
  generation_method?: string;
  generation_latency_seconds?: number;
}

interface SubmittedResultItem {
  question_id: string;
  question_text: string;
  selected_option_index: number | null;
  selected_option_text: string | null;
  correct_option_index: number;
  correct_option_text: string;
  is_correct: boolean;
  points_earned: number;
  explanation: string;
}

interface SubmittedAssessmentAttempt extends AssessmentAttempt {
  passing_threshold: number;
  results: SubmittedResultItem[];
}

export default function KnowledgeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = (params?.assessmentId as string) || "";
  const { activeBlueprint, recordAssessmentAttempt } = useEvidence();

  const [assessmentData, setAssessmentData] = useState<BackendAssessmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(20 * 60);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedAttempt, setSubmittedAttempt] = useState<SubmittedAssessmentAttempt | null>(null);

  // Fetch or generate the assessment from the backend
  const loadOrGenerate = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);

    try {
      let data: BackendAssessmentData | null = null;
      try {
        data = await getBackendAssessment(assessmentId);
      } catch (getErr: any) {
        if (getErr?.status === 404 || getErr?.message?.includes("404")) {
          data = null;
        } else {
          throw getErr;
        }
      }

      // If not found by direct assessment_id, trigger generation/retrieval by skill
      if (!data) {
        setGenerating(true);
        const normalizedSkill = assessmentId
          .replace(/^assessment-domain-/, "")
          .replace(/^assessment-/, "")
          .replace(/^domain-/, "");

        const skillTitle =
          activeBlueprint?.title ||
          normalizedSkill
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

        data = await generateBackendAssessment({
          skill_id: normalizedSkill,
          skill_name: skillTitle,
          learning_objective: `Demonstrate practical capability and theoretical knowledge in ${skillTitle}.`,
          difficulty: "Intermediate",
        });

        // If returned assessment has a canonical assessment_id, update URL seamlessly
        if (data?.assessment_id && data.assessment_id !== assessmentId) {
          router.replace(`/app/learning/assessments/${data.assessment_id}`);
        }
      }

      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setAssessmentData(data);
        setTimeLeft((data.time_limit_minutes || 20) * 60);
      } else {
        throw new Error("No assessment questions returned from server.");
      }
    } catch (err: any) {
      console.error("Failed to load backend assessment:", err);
      setError(err?.message || "Failed to load assessment questionnaire from the server.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }, [assessmentId, activeBlueprint, router]);

  useEffect(() => {
    loadOrGenerate();
  }, [loadOrGenerate]);

  // Timer countdown
  useEffect(() => {
    if (submittedAttempt || loading || !assessmentData) return;
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
  }, [submittedAttempt, loading, assessmentData]);

  const questions = useMemo(() => assessmentData?.questions || [], [assessmentData]);
  const currentQ = questions[currentIdx] || null;

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

  const handleSubmit = async () => {
    if (isSubmitting || !assessmentData) return;
    setIsSubmitting(true);

    try {
      const gradeReport = await submitBackendAssessment(
        assessmentData.assessment_id,
        answers
      );

      const earnedPts = gradeReport.earned_points ?? 0;
      const totalPts = gradeReport.total_points ?? 1;
      const scorePct =
        gradeReport.score_percentage !== undefined
          ? gradeReport.score_percentage
          : Math.round((earnedPts / Math.max(1, totalPts)) * 100);

      const isPassed =
        gradeReport.passed !== undefined
          ? gradeReport.passed
          : scorePct >= assessmentData.passing_threshold;

      const resultsList: SubmittedResultItem[] = gradeReport.results || [];

      // Calculate concept vs application breakdown from results if present
      const conceptItems = resultsList.filter(
        (r) =>
          r.question_text?.toLowerCase().includes("what") ||
          r.question_text?.toLowerCase().includes("why") ||
          r.question_text?.toLowerCase().includes("which")
      );
      const conceptScore =
        conceptItems.length > 0
          ? Math.round(
              (conceptItems.filter((c) => c.is_correct).length / conceptItems.length) * 100
            )
          : scorePct;

      const attemptObj: SubmittedAssessmentAttempt = {
        attempt_id: gradeReport.attempt_id || `att-${Date.now()}`,
        assessment_id: assessmentData.assessment_id,
        timestamp: "Just now",
        total_score: scorePct,
        passed: isPassed,
        passing_threshold: assessmentData.passing_threshold,
        concept_score: conceptScore,
        application_score: scorePct,
        objective_results: resultsList.map((r, idx) => ({
          topic_id: r.question_id || `topic-${idx + 1}`,
          score: r.is_correct ? 100 : 0,
          passed: r.is_correct,
          feedback:
            r.explanation ||
            (r.is_correct ? "Correct competency application." : "Review topic concept in remediation."),
        })),
        feedback:
          gradeReport.recommendation ||
          (isPassed
            ? "Assessment passed! Excellent demonstration of domain knowledge."
            : "Score below passing threshold. Targeted remediation triggered."),
        needs_remediation: !isPassed,
        failed_topic_ids: resultsList.filter((r) => !r.is_correct).map((r) => r.question_id),
        results: resultsList,
      };

      setSubmittedAttempt(attemptObj);
      // skipBackendSync=true prevents duplicate attempt persistence in database
      recordAssessmentAttempt(attemptObj, true);
    } catch (err: any) {
      console.error("Assessment submission error:", err);
      alert(`Assessment submission failed: ${err.message || "Server error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setFlagged({});
    setTimeLeft((assessmentData?.time_limit_minutes || 20) * 60);
    setCurrentIdx(0);
    setSubmittedAttempt(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar
          title="Knowledge Assessment"
          description="Connecting to backend assessment engine..."
          badge="Domain 5 · Formal Assessment"
          badgeColor="border-peach/40 text-ink bg-peach/20"
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="gl-card p-10 max-w-md w-full text-center space-y-4">
            <Loader2 className="w-8 h-8 text-ink animate-spin mx-auto" />
            <h2 className="text-base font-bold text-ink">
              {generating ? "Generating AI Assessment via Qwen 8B..." : "Retrieving Assessment..."}
            </h2>
            <p className="text-xs text-ink/70">
              {generating
                ? "Formulating real-world scenarios and calibrating difficulty against your competency blueprint."
                : "Fetching answer-key protected assessment definition from the database."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar
          title="Assessment Unavailable"
          description="Could not load or generate the requested assessment."
          badge="Domain 5 · Formal Assessment"
          badgeColor="border-peach/40 text-ink bg-peach/20"
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="gl-card p-8 max-w-lg w-full text-center space-y-5 border-rose-300 bg-rose-50/30">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-ink">Assessment Connection Error</h2>
              <p className="text-xs text-ink/70">
                {error || "Assessment definition could not be retrieved from the server."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => loadOrGenerate()}
                className="pill-btn pill-btn-primary text-xs flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
              <Link href="/app/learning" className="pill-btn pill-btn-ghost text-xs">
                Back to Learning
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={assessmentData.title}
        description={`Target Blueprint: ${activeBlueprint?.title || assessmentData.skill_name}. Passing threshold is ${assessmentData.passing_threshold}%. Performance directly calibrates your Assessment Signal (A = 20%).`}
        badge="Domain 5 · Formal Assessment"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        {!submittedAttempt && (
          <div className="flex items-center gap-3 bg-paper/80 px-3 py-1.5 rounded-xl border border-ink/10 shadow-sm shrink-0">
            <div className="flex items-center gap-1.5 text-ink font-mono font-bold text-sm">
              <Clock className="w-4 h-4 text-peach fill-current animate-pulse" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <div className="h-4 w-px bg-ink/10" />
            <div className="text-xs text-ink/70">
              <span className="font-bold text-ink">{answeredCount}</span>/{questions.length} answered
            </div>
          </div>
        )}
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

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
              {currentQ && (
                <div className="gl-card p-6 md:p-8 space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-ink/5 text-ink">
                        Question {currentIdx + 1} of {questions.length}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-peach/20 text-ink">
                        {currentQ.category || "Competency"}
                      </span>
                      {currentQ.points && (
                        <span className="text-xs text-ink/60 font-mono">
                          {currentQ.points} points
                        </span>
                      )}
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
                      {currentQ.question_text || currentQ.text}
                    </h2>

                    {currentQ.hint && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                        <span className="font-bold">Hint: </span>
                        {currentQ.hint}
                      </div>
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
                        onClick={() =>
                          setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))
                        }
                        className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
                      >
                        Next Question
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isSubmitting ? "Scoring..." : "Finish & Submit Assessment"}
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Authoritative Results View (Server Evaluated) */
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
                    Passing threshold is {assessmentData.passing_threshold}%. Your performance
                    updated the{" "}
                    <span className="font-semibold text-ink">Assessment Signal (A)</span> across
                    related roadmap topics.
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
                  <div className="text-xs text-ink/60">Correct Problems</div>
                  <div className="text-lg font-bold text-ink mt-0.5">
                    {submittedAttempt.results.filter((o) => o.is_correct).length} of{" "}
                    {submittedAttempt.results.length}
                  </div>
                </div>
                <div className="p-3 bg-paper rounded-xl border border-ink/10">
                  <div className="text-xs text-ink/60">Server Evaluation</div>
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

            {/* Detailed Question Review with Server Answers & Rationale */}
            <div className="gl-card p-6 md:p-8 space-y-6">
              <h3 className="text-base font-bold text-ink">
                Item-Level Audit & Explanations (Server Verified)
              </h3>
              <p className="text-xs text-ink/70">
                Official grading verified against server-persisted answer keys and rationale rubrics.
              </p>

              <div className="space-y-6 mt-4">
                {submittedAttempt.results.map((item, idx) => {
                  return (
                    <div
                      key={item.question_id || idx}
                      className={`p-5 rounded-2xl border space-y-3 ${
                        item.is_correct
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink flex items-center gap-2">
                          {item.is_correct ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <X className="w-4 h-4 text-rose-600" />
                          )}
                          Question {idx + 1}
                        </span>
                        <span className="text-xs text-ink/60 font-mono">
                          {item.points_earned} pts earned
                        </span>
                      </div>

                      <p className="text-xs md:text-sm font-semibold text-ink">
                        {item.question_text}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2">
                        <div className="p-2.5 rounded-lg bg-paper border border-ink/10">
                          <span className="text-[10px] font-bold uppercase text-ink/50 block">
                            Your Answer:
                          </span>
                          <span
                            className={
                              item.is_correct
                                ? "text-emerald-800 font-semibold"
                                : "text-rose-800 font-semibold"
                            }
                          >
                            {item.selected_option_text || "Unanswered"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-paper border border-ink/10">
                          <span className="text-[10px] font-bold uppercase text-ink/50 block">
                            Correct Answer:
                          </span>
                          <span className="text-emerald-800 font-semibold">
                            {item.correct_option_text}
                          </span>
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="p-3 bg-paper/80 rounded-xl border border-ink/5 text-xs text-ink/80">
                          <span className="font-bold text-ink block mb-0.5">Rationale:</span>
                          {item.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
