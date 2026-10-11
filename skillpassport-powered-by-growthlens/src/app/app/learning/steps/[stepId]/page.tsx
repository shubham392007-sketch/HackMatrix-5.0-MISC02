"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
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
  HelpCircle,
  BookOpen,
  Code2,
  AlertTriangle,
  Lightbulb,
  FileText,
  PlayCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Info,
  Target,
} from "lucide-react";

export default function LearningStepDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stepId = params?.stepId as string;

  const { activeRoadmap, completeStep, resources, practiceExercises } =
    useEvidence();

  // Find step in roadmap
  const roadmapStep = useMemo(() => {
    return (
      activeRoadmap.steps.find((s) => s.step_id === stepId) ||
      activeRoadmap.steps[1] ||
      activeRoadmap.steps[0]
    );
  }, [activeRoadmap, stepId]);

  // Find or generate packet data
  const packet = useMemo(() => {
    if (INITIAL_STEP_PACKETS[stepId]) return INITIAL_STEP_PACKETS[stepId];
    if (INITIAL_STEP_PACKETS["step-topic-outlier-winsorization"]) {
      return INITIAL_STEP_PACKETS["step-topic-outlier-winsorization"];
    }
    return INITIAL_STEP_PACKETS[Object.keys(INITIAL_STEP_PACKETS)[0]];
  }, [stepId]);

  // Knowledge check state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showCheckFeedback, setShowCheckFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(roadmapStep.status === "completed");

  const handleSelectCheckOption = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleVerifyKnowledge = () => {
    setShowCheckFeedback(true);
  };

  const handleCompleteStepAction = () => {
    completeStep(roadmapStep.step_id);
    setIsCompleted(true);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={packet.title}
        description={`Outcome: ${packet.learning_objective}`}
        badge={isCompleted ? "COMPLETED" : roadmapStep.status.toUpperCase()}
      >
        <Link
          href={`/app/learning/roadmaps/${activeRoadmap.path_id}`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Roadmap
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Main 2-Column Learning Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Structured Learning Packet */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Title Card */}
          <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/40 text-ink font-bold">
                Focused Learning Packet
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-ink">
                {packet.title}
              </h1>
              <p className="text-xs md:text-sm text-ink-muted leading-relaxed">
                <strong>Measurable Outcome:</strong> {packet.learning_objective}
              </p>
            </div>

            {/* Why This Matters */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-1 text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-800" />
                Connection to Diagnosed Skill Gap
              </span>
              <p className="text-amber-900/90 leading-relaxed text-[11px]">
                {packet.why_this_matters}
              </p>
            </div>
          </div>

          {/* Section: What is it & When to use */}
          <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
            <div className="space-y-3">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-ink" />
                What is it? Concept Foundations
              </h2>
              <p className="text-xs md:text-sm text-ink/80 leading-relaxed">
                {packet.what_is_it}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-ink/10">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-ink" />
                Why and When to Apply
              </h3>
              <p className="text-xs text-ink/80 leading-relaxed">
                {packet.why_and_when}
              </p>
            </div>
          </div>

          {/* Worked Example with Code */}
          <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15 bg-white">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Code2 className="w-4 h-4 text-ink" />
              Worked Example: {packet.worked_example.title}
            </h2>
            <p className="text-xs text-ink/80 leading-relaxed">
              {packet.worked_example.explanation}
            </p>

            {packet.worked_example.code && (
              <pre className="p-4 rounded-2xl bg-ink text-sand font-mono text-xs overflow-x-auto leading-relaxed border border-ink/20">
                <code>{packet.worked_example.code}</code>
              </pre>
            )}

            {packet.worked_example.visual_note && (
              <div className="p-3 rounded-xl bg-sand/20 border border-ink/10 text-xs text-ink-muted">
                <strong>Key Takeaway:</strong> {packet.worked_example.visual_note}
              </div>
            )}
          </div>

          {/* Common Mistakes & Implementation Procedure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="gl-card p-5 space-y-3 border-red-200 bg-red-50/20 text-xs">
              <h3 className="font-bold text-red-950 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-red-700" />
                Common Engineering Mistakes
              </h3>
              <ul className="space-y-2 text-red-900/90 text-[11px]">
                {packet.common_mistakes.map((mistake, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="font-bold text-red-700">&bull;</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="gl-card p-5 space-y-3 border-emerald-200 bg-emerald-50/20 text-xs">
              <h3 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Implementation Procedure Checklist
              </h3>
              <ul className="space-y-2 text-emerald-900/90 text-[11px]">
                {packet.implementation_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="font-bold text-emerald-700">&bull;</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Embedded Knowledge Check Questions */}
          <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ink" />
                Quick Knowledge Check ({packet.knowledge_check.length} Questions)
              </h2>
              <span className="text-xs text-ink-muted">
                Immediate formative check
              </span>
            </div>

            <div className="space-y-5">
              {packet.knowledge_check.map((kc, qIdx) => (
                <div key={qIdx} className="space-y-3 p-4 rounded-2xl bg-sand/15 border border-ink/10 text-xs">
                  <p className="font-bold text-ink">
                    {qIdx + 1}. {kc.question}
                  </p>

                  <div className="space-y-2">
                    {kc.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      const isCorrect = optIdx === kc.correct_index;

                      let btnStyle = "bg-white hover:bg-sand/30 border-ink/10 text-ink";
                      if (showCheckFeedback) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold";
                        } else if (isSelected && !isCorrect) {
                          btnStyle = "bg-red-100 border-red-300 text-red-950 line-through";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-lime/30 border-ink font-bold text-ink";
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectCheckOption(qIdx, optIdx)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${btnStyle}`}
                        >
                          <span className="font-mono text-[10px] opacity-70">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {showCheckFeedback && (
                    <div className="p-3 rounded-xl bg-white border border-ink/10 text-[11px] text-ink/80">
                      <strong>Explanation:</strong> {kc.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleVerifyKnowledge}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-4 text-ink"
              >
                Verify Responses
              </button>

              <button
                onClick={handleCompleteStepAction}
                disabled={isCompleted}
                className={`pill-btn text-xs py-2 px-6 flex items-center gap-1.5 ${
                  isCompleted
                    ? "bg-emerald-600 text-white cursor-default"
                    : "pill-btn-primary"
                }`}
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Step Marked Completed
                  </>
                ) : (
                  <>
                    Mark Step Completed &rarr;
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Source Attribution */}
          <div className="p-3.5 rounded-xl bg-sand/15 border border-ink/10 text-xs text-ink-muted">
            <strong>Source Attribution:</strong> {packet.source_attribution}
          </div>
        </div>

        {/* Right Column (1 span): Progress Panel & Next Actions */}
        <div className="space-y-6">
          {/* Step Status Card */}
          <div className="gl-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink">Step Progress</h3>
            <div className="space-y-2">
              <MasteryProgressBar
                current={isCompleted ? roadmapStep.target_mastery : roadmapStep.current_mastery}
                target={roadmapStep.target_mastery}
              />
              <span className="text-[11px] text-ink-muted block text-right font-mono">
                Target: {roadmapStep.target_mastery}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1 text-xs">
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Completion Criteria
              </span>
              <ul className="space-y-1 text-ink/80 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Review concept packet
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verify knowledge check
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Complete practice exercise
                </li>
              </ul>
            </div>
          </div>

          {/* Linked Practice & Resources */}
          <div className="gl-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink">Next Connected Actions</h3>

            <div className="space-y-2.5 text-xs">
              <Link
                href="/app/learning/practice"
                className="w-full pill-btn pill-btn-primary py-2 px-3 text-center flex items-center justify-center gap-1.5"
              >
                <Code2 className="w-3.5 h-3.5" />
                Open Practice Exercises
              </Link>

              <Link
                href="/app/learning/resources"
                className="w-full pill-btn bg-white hover:bg-sand/30 border border-ink/20 py-2 px-3 text-center flex items-center justify-center gap-1.5 text-ink"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Browse Curated Resources
              </Link>

              <Link
                href={`/app/learning/roadmaps/${activeRoadmap.path_id}`}
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
