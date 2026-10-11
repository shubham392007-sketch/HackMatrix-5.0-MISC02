"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ActiveDomainSelectorBar,
  MasteryProgressBar,
} from "@/components/app/LearningBadges";
import {
  FileCheck2,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Award,
  FolderGit2,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  Clock,
  Layers,
  ChevronRight,
  UserCheck,
  Building2,
  FileCode2,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function UpdatedCapabilityBridgePage() {
  const {
    activeBlueprint,
    candidateEvidences,
    activeRoadmap,
    skills,
    activeRole,
    activeMatch,
    reviewTasks,
  } = useEvidence();

  const [simulatedVerification, setSimulatedVerification] = useState<boolean>(false);

  // Completed topics count
  const allTopics = activeBlueprint.modules.flatMap((m) => m.topics);
  const completedTopics = allTopics.filter((t) => t.current_mastery >= t.target_mastery);

  // Projected match score if candidate evidence is verified
  const baselineMatchScore = activeMatch?.overall_match_score || 68;
  const projectedMatchScore = simulatedVerification
    ? Math.min(100, baselineMatchScore + 8)
    : baselineMatchScore;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Updated Capability & Evidence Bridge"
        description={`Inspect how your learning mastery achievements in ${activeBlueprint.title} translate into verifiable candidate evidence, human verification tasks, and projected career readiness.`}
        badge="Domain 5 · System Bridge"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/passport"
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            Verified SkillPassport &rarr;
          </Link>
          <Link
            href="/app/ai/review-queue"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Review Queue &rarr;
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

        {/* NON-NEGOTIABLE ARCHITECTURAL PRINCIPLE CALLOUT */}
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-ink shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            Core Architectural Rule: Learning Completion ≠ Automatically Verified Skill
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            In SkillPassport Powered by GrowthLens, finishing a roadmap module, reading a guide, or achieving 100% on a quiz establishes <span className="font-bold">Learning Mastery</span>, but does <span className="font-bold underline">not</span> directly alter your verified professional skills. Verified skills require authentic workplace proof or human-validated project deliverables. Your mini-project submissions generate <span className="font-bold">Candidate Learning Evidence</span> that must pass peer or supervisor review in <span className="font-bold">Domain 3</span> before promoting competencies in your <span className="font-bold">SkillPassport (Domain 2)</span>.
          </p>
        </div>

      {/* Two Column Section Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Learning Mastery Achievements (Internal to Domain 5) */}
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-peach">
                Internal Domain 5 State
              </span>
              <h2 className="text-lg font-extrabold text-ink mt-0.5">
                Section A: Learning Mastery Achievements
              </h2>
            </div>
            <span className="text-xs font-bold text-ink/60 bg-paper px-2.5 py-1 rounded-full border border-ink/10">
              Educational Effort
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-paper rounded-2xl border border-ink/10">
              <span className="text-xs text-ink/60">Objectives Mastered</span>
              <div className="text-2xl font-extrabold text-ink mt-1">
                {completedTopics.length} / {allTopics.length}
              </div>
              <p className="text-[11px] text-ink/50 mt-1">Met target mastery threshold</p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10">
              <span className="text-xs text-ink/60">Study Hours Invested</span>
              <div className="text-2xl font-extrabold text-ink mt-1">
                8.5 hrs
              </div>
              <p className="text-[11px] text-ink/50 mt-1">Pacing: {activeRoadmap.pace}</p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10">
              <span className="text-xs text-ink/60">Diagnostic Baseline Delta</span>
              <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                +16%
              </div>
              <p className="text-[11px] text-ink/50 mt-1">Lift from baseline diagnostic</p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10">
              <span className="text-xs text-ink/60">Practice Exercises</span>
              <div className="text-2xl font-extrabold text-ink mt-1">
                3 Completed
              </div>
              <p className="text-[11px] text-ink/50 mt-1">Sandboxed AST tests passed</p>
            </div>
          </div>

          {/* Mastery Signal Snapshot */}
          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-3">
            <div className="text-xs font-bold text-ink">
              Domain 5 4-Signal Telemetry Snapshot:
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-ink/70 mb-1">
                  <span>Knowledge Signal (Weight: 30%)</span>
                  <span className="font-bold">78%</span>
                </div>
                <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-peach rounded-full" style={{ width: "78%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-ink/70 mb-1">
                  <span>Practice Signal (Weight: 25%)</span>
                  <span className="font-bold">85%</span>
                </div>
                <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "85%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-ink/70 mb-1">
                  <span>Assessment Signal (Weight: 20%)</span>
                  <span className="font-bold">75%</span>
                </div>
                <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "75%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-ink/70 mb-1">
                  <span>Project Signal (Weight: 25%)</span>
                  <span className="font-bold">88%</span>
                </div>
                <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: "88%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Candidate Capability Evidence Generated (Bridge to Domain 1 & 3) */}
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-ink/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Cross-Domain Bridge (Domains 1, 2, 3)
              </span>
              <h2 className="text-lg font-extrabold text-ink mt-0.5">
                Section B: Candidate Learning Evidence
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
              Pending Review
            </span>
          </div>

          {/* List of Candidate Evidence Records */}
          <div className="space-y-4">
            {candidateEvidences.map((ev) => (
              <div
                key={ev.artifact_id}
                className="p-5 rounded-2xl bg-paper border border-ink/15 space-y-3 shadow-sm hover:border-ink/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-peach/30 text-ink">
                        {ev.source_type}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {ev.evidence_state}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-ink">
                      {ev.title}
                    </h3>
                  </div>

                  <span className="text-[11px] text-ink/50 font-mono">
                    {ev.submitted_at}
                  </span>
                </div>

                <div className="text-xs text-ink/80 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink/60">Target Skill Claim:</span>
                    <span className="font-semibold text-ink">
                      Python / Anomaly Preprocessing (skill-python)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink/60">Linked Evidence ID:</span>
                    <span className="font-mono text-ink/70">{ev.evidence_id}</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-ink/80 leading-relaxed">
                  <span className="font-bold text-ink block mb-0.5">Provenance & Verification Note:</span>
                  {ev.verification_notes}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/evidence/library`}
                    className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Inspect in Domain 1 Library
                  </Link>

                  <Link
                    href="/app/ai/review-queue"
                    className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
                  >
                    <UserCheck className="w-3 h-3" />
                    Review in Domain 3 Queue
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Active Review Task in Queue */}
          <div className="p-4 rounded-2xl bg-paper/60 border border-ink/10 space-y-2 text-xs">
            <div className="font-bold text-ink flex items-center justify-between">
              <span>Domain 3 Verification Queue Status</span>
              <span className="text-emerald-700 font-extrabold">Active Task #1</span>
            </div>
            <p className="text-ink/70">
              Task <span className="font-mono text-[11px]">task-rev-learning-project</span> is currently assigned in the Human Review Queue for managerial sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Projected Career Readiness Impact (Domain 4 Bridge) */}
      <div className="gl-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-peach">
              <TrendingUp className="w-3.5 h-3.5" />
              Domain 4 Career Intelligence Impact
            </div>
            <h2 className="text-xl font-extrabold text-ink mt-1">
              Projected Role Readiness Impact: {activeRole?.title || "Senior Data Scientist"}
            </h2>
            <p className="text-xs text-ink/70">
              See how your candidate learning evidence will influence your target role matching score once verified by human review.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSimulatedVerification(!simulatedVerification)}
              className={`pill-btn text-xs font-bold flex items-center gap-1.5 transition-all ${
                simulatedVerification
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "pill-btn-primary"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {simulatedVerification ? "Reset to Current Baseline" : "Simulate Verification Approval"}
            </button>

            <Link
              href="/app/career/readiness"
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
            >
              Open Domain 4 Readiness →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-ink/10">
          <div className="p-5 bg-paper rounded-2xl border border-ink/10 space-y-2">
            <div className="text-xs text-ink/60 font-semibold">Current Verified Match</div>
            <div className="text-3xl font-extrabold text-ink">
              {baselineMatchScore}%
            </div>
            <p className="text-[11px] text-ink/50">
              Based solely on verified skills in your SkillPassport
            </p>
          </div>

          <div className="p-5 bg-paper rounded-2xl border-2 border-peach space-y-2">
            <div className="text-xs text-ink/60 font-semibold">Projected Match After Verification</div>
            <div className="text-3xl font-extrabold text-emerald-700 flex items-center gap-2">
              <span>{projectedMatchScore}%</span>
              {simulatedVerification && (
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  +8% Lift
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink/50">
              If candidate mini-project evidence is signed off by supervisor
            </p>
          </div>

          <div className="p-5 bg-paper rounded-2xl border border-ink/10 space-y-2">
            <div className="text-xs text-ink/60 font-semibold">Critical Skill Gap Resolved</div>
            <div className="text-sm font-bold text-ink mt-1 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Data Preprocessing & Outlier Treatment
            </div>
            <p className="text-[11px] text-ink/50">
              Promotes proficiency from Developing to Practitioner
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
