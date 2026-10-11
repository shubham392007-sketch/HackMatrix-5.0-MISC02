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
  LifeBuoy,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Code,
  Sparkles,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Check,
  X,
  FileCode2,
  ChevronRight,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function RemediationSessionPage() {
  const params = useParams();
  const router = useRouter();
  const {
    remediationSession,
    activeBlueprint,
    completeRemediation,
    assessment,
  } = useEvidence();

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState<boolean>(remediationSession.status === "completed");
  const [microPassed, setMicroPassed] = useState<boolean>(remediationSession.status === "completed");

  const handleSelect = (qIdx: number, optIdx: number) => {
    if (checked) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleCheckAnswers = () => {
    let allCorrect = true;
    remediationSession.micro_test.forEach((q, idx) => {
      if (answers[idx] !== q.correct_index) {
        allCorrect = false;
      }
    });

    setChecked(true);
    setMicroPassed(allCorrect);

    if (allCorrect) {
      completeRemediation(remediationSession.session_id);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Concept Gap Remediation"
        description={`Blueprint: ${activeBlueprint.title}. Your previous assessment score (${remediationSession.failed_score}%) triggered this automated review to reinforce prerequisite concepts before your re-assessment.`}
        badge="Domain 5 · Targeted Remediation"
        badgeColor="border-rose-300 text-rose-900 bg-rose-100"
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/app/learning/assessments/${assessment.id}`}
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
          >
            &larr; Back to Assessment
          </Link>
          {remediationSession.status === "completed" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Remediation Completed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Session in Progress
            </span>
          )}
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

      {/* Objective Diagnosis Panel */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <h2 className="text-base font-extrabold text-ink">
          1. Objective Gap Diagnostics
        </h2>
        <p className="text-xs text-ink/70">
          Our deterministic evaluation engine isolated exactly which competencies require immediate reinforcement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Failed Objectives */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Needs Reinforcement ({remediationSession.failed_objectives.length})
            </div>
            <div className="space-y-2">
              {remediationSession.failed_objectives.map((obj, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-paper rounded-xl border border-rose-200/60 text-xs font-medium text-ink flex items-start gap-2"
                >
                  <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mastered Objectives */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Demonstrated & Mastered ({remediationSession.strong_objectives.length})
            </div>
            <div className="space-y-2">
              {remediationSession.strong_objectives.map((obj, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-paper rounded-xl border border-emerald-200/60 text-xs font-medium text-ink flex items-start gap-2"
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Focused Concept Refresher */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-peach" />
          2. Focused Concept Refresher
        </h2>

        <div className="p-4 bg-paper rounded-2xl border border-ink/10 text-xs md:text-sm text-ink leading-relaxed space-y-3">
          <p>{remediationSession.concept_refresher}</p>
          <div className="p-3 bg-peach/20 rounded-xl border border-peach/30 text-xs text-ink/90 font-medium">
            💡 Takeaway: Always fit quantiles strictly on training data folds (<code className="font-mono bg-paper px-1 rounded">X_train</code>) and use those stored scalar boundaries to clip both validation (<code className="font-mono bg-paper px-1 rounded">X_val</code>) and inference streams.
          </div>
        </div>
      </div>

      {/* Guided Worked Example */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
          <Code className="w-4 h-4 text-peach" />
          3. Guided Worked Example
        </h2>

        {remediationSession.worked_examples.map((ex, idx) => (
          <div key={idx} className="space-y-3">
            <div className="text-xs font-bold text-ink">{ex.title}</div>
            <p className="text-xs text-ink/70">{ex.explanation}</p>
            {ex.code && (
              <div className="rounded-xl border border-ink/20 overflow-hidden bg-ink text-paper p-4 font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{ex.code}</code>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Micro-Test: Check for Understanding */}
      <div className="gl-card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-peach" />
            4. Micro-Test: Check Your Understanding (2 Questions)
          </h2>
          <p className="text-xs text-ink/70 mt-1">
            Answering both questions correctly will unlock the re-assessment attempt and mark this remediation session as completed.
          </p>
        </div>

        <div className="space-y-6">
          {remediationSession.micro_test.map((q, qIdx) => {
            const userChoice = answers[qIdx];
            const isCorrect = checked && userChoice === q.correct_index;
            const isWrong = checked && userChoice !== q.correct_index;

            return (
              <div
                key={qIdx}
                className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                  isCorrect
                    ? "bg-emerald-50/50 border-emerald-300"
                    : isWrong
                    ? "bg-rose-50/50 border-rose-300"
                    : "bg-paper border-ink/10"
                }`}
              >
                <div className="text-xs md:text-sm font-bold text-ink">
                  Question {qIdx + 1}: {q.question}
                </div>

                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      disabled={checked}
                      onClick={() => handleSelect(qIdx, optIdx)}
                      className={`w-full p-3 rounded-xl text-left text-xs font-medium border transition-all flex items-start gap-3 ${
                        userChoice === optIdx
                          ? "bg-peach/30 border-ink text-ink font-semibold"
                          : "bg-paper hover:bg-card border-ink/10 text-ink/80"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold ${
                          userChoice === optIdx
                            ? "bg-ink text-paper border-ink"
                            : "border-ink/20 text-ink/60"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Micro-Test Action & Verification Outcome */}
        <div className="pt-4 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {checked && microPassed && (
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Both Concepts Verified! Re-assessment Unlocked.
              </span>
            )}
            {checked && !microPassed && (
              <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                One or more answers were incorrect. Please review the refresher above and retry.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {checked && !microPassed && (
              <button
                onClick={() => {
                  setChecked(false);
                  setAnswers({});
                }}
                className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Micro-Test
              </button>
            )}

            {!checked && (
              <button
                onClick={handleCheckAnswers}
                disabled={Object.keys(answers).length < remediationSession.micro_test.length}
                className="pill-btn pill-btn-primary text-xs disabled:opacity-40"
              >
                Verify Understanding →
              </button>
            )}

            {checked && microPassed && (
              <Link
                href={`/app/learning/assessments/${assessment.id}`}
                className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Return to Assessment & Retake →
              </Link>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
