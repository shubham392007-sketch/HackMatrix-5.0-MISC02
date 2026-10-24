"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { ActiveDomainSelectorBar } from "@/components/app/LearningBadges";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  Sparkles,
  AlertCircle,
  BookOpen,
  Map,
  Loader2,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { RoadmapStep, AssessmentAttempt } from "@/types/learning";

interface AssessmentCardItem {
  id: string;
  title: string;
  domainId: string;
  domainTitle: string;
  estimatedMinutes: number;
  status: "passed" | "needs_remediation" | "available";
  score?: number;
  stepType: "roadmap_step" | "blueprint_diagnostic";
}

export default function DynamicAssessmentsPage() {
  const {
    activeBlueprint,
    activeRoadmap,
    assessmentAttempts,
    isLoadingEvidence,
    isDatabaseUnavailable,
  } = useEvidence();

  // Determine available assessment destinations from real active roadmap steps and active blueprint
  const assessmentsList = useMemo<AssessmentCardItem[]>(() => {
    const list: AssessmentCardItem[] = [];
    const seenIds = new Set<string>();

    // 1. From active roadmap steps
    if (activeRoadmap?.steps && Array.isArray(activeRoadmap.steps) && activeRoadmap.steps.length > 0) {
      for (const step of activeRoadmap.steps) {
        const targetId = step.assessment_id || `assessment-${step.step_id}`;
        if (seenIds.has(targetId)) continue;
        seenIds.add(targetId);

        const attempt = assessmentAttempts.find(
          (a: AssessmentAttempt) => a.assessment_id === targetId || a.assessment_id === step.step_id
        );
        list.push({
          id: targetId,
          title: step.title,
          domainId: activeRoadmap.domain_id || activeBlueprint?.domain_id || "general",
          domainTitle: activeRoadmap.domain_title || activeBlueprint?.title || "Personalized Roadmap",
          estimatedMinutes: step.estimated_minutes || 15,
          status: attempt ? (attempt.passed ? "passed" : "needs_remediation") : "available",
          score: attempt?.total_score,
          stepType: "roadmap_step",
        });
      }
    }

    // 2. From active blueprint topics (if active roadmap has few or no steps)
    if (activeBlueprint?.modules && Array.isArray(activeBlueprint.modules)) {
      for (const mod of activeBlueprint.modules) {
        for (const topic of mod.topics || []) {
          const targetId = `assessment-${topic.id || "topic"}`;
          if (seenIds.has(targetId)) continue;
          seenIds.add(targetId);

          const attempt = assessmentAttempts.find(
            (a: AssessmentAttempt) => a.assessment_id === targetId || a.assessment_id === topic.id
          );
          list.push({
            id: targetId,
            title: topic.title,
            domainId: activeBlueprint.domain_id,
            domainTitle: activeBlueprint.title,
            estimatedMinutes: topic.estimated_minutes || 15,
            status: attempt ? (attempt.passed ? "passed" : "needs_remediation") : "available",
            score: attempt?.total_score,
            stepType: "blueprint_diagnostic",
          });
        }
      }
    }

    return list;
  }, [activeRoadmap, activeBlueprint, assessmentAttempts]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evaluated Skill Assessments"
        description="Standardized, server-authoritative knowledge evaluations connected to your personalized roadmap."
        badge="Domain 5 · Mastery Verification"
        badgeColor="border-indigo/40 text-ink bg-indigo/20"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

        {/* Database Resiliency Alert */}
        {isDatabaseUnavailable && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block mb-0.5">Database Resiliency Notice:</span>
              Backend database is temporarily unavailable. Cached assessments are displayed. Retrying connection...
            </div>
          </div>
        )}

        {/* Dynamic Assessments Hub */}
        {isLoadingEvidence ? (
          <div className="gl-card p-12 text-center max-w-xl mx-auto space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-peach mx-auto" />
            <p className="text-sm font-semibold text-ink">Hydrating Roadmap Assessments from Backend...</p>
          </div>
        ) : assessmentsList.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-peach" />
                  Available Assessments for Your Roadmap
                </h2>
                <p className="text-xs text-ink/70 mt-1">
                  Assessments test technical reasoning with concealed answer keys. Scores dynamically update topic mastery signals.
                </p>
              </div>
              <span className="text-xs font-bold text-ink/60 bg-paper px-3 py-1 rounded-full border border-ink/10">
                {assessmentsList.length} Active Modules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessmentsList.map((item) => {
                const isPassed = item.status === "passed";
                const isFailed = item.status === "needs_remediation";

                return (
                  <div
                    key={item.id}
                    className={`gl-card p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                      isPassed
                        ? "border-l-4 border-l-emerald-500"
                        : isFailed
                        ? "border-l-4 border-l-amber-500"
                        : "border-l-4 border-l-peach"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-ink/5 text-ink">
                          {item.domainTitle}
                        </span>
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Passed · {item.score}%
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Needs Remediation · {item.score}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink/60 bg-paper px-2.5 py-0.5 rounded-full border border-ink/10">
                            <Clock className="w-3 h-3 text-ink/40" />
                            {item.estimatedMinutes} min
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-ink leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-ink/70 leading-relaxed">
                        Server-authoritative evaluation targeting core competencies. All responses are graded securely with anti-tamper controls.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-ink/10 mt-6 flex items-center justify-between">
                      <div className="text-[11px] text-ink/50 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-peach" />
                        Dynamic Rubric Evaluation
                      </div>

                      <Link
                        href={`/app/learning/assessments/${item.id}`}
                        className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
                      >
                        {item.status !== "available" ? "Review / Retake" : "Launch Assessment"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Empty State when no active roadmap or blueprint exists */
          <div className="gl-card p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-peach/20 border border-peach/40 flex items-center justify-center mx-auto text-peach">
              <GraduationCap className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-ink">
              No Active Roadmap Assessments
            </h3>

            <p className="text-xs text-ink/70 leading-relaxed max-w-md mx-auto">
              Skill assessments are generated dynamically from your prioritized career gaps and active learning roadmap. Generate a roadmap to unlock tailored evaluations.
            </p>

            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/app/learning"
                className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
              >
                <Map className="w-3.5 h-3.5" />
                Open Learning Overview
              </Link>
              {activeBlueprint && (
                <Link
                  href={`/app/learning/domains/${activeBlueprint.domain_id}/diagnostic`}
                  className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Run Diagnostic Check
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
