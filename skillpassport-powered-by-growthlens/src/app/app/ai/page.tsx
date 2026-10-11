"use client";

import React from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  DemoDataNotice,
  GuardOutcomeBadge,
} from "@/components/app/AIBadges";
import {
  Sparkles,
  Fingerprint,
  Layers,
  Scale,
  Percent,
  GitCompare,
  ShieldAlert,
  FileCode,
  Shield,
  ClipboardList,
  BarChart3,
  ScrollText,
  ArrowRight,
  ShieldCheck,
  Cpu,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function AIOverviewPage() {
  const {
    workAnalyses,
    extractionCandidates,
    guardResults,
    conflicts,
    validationRecords,
    reviewTasks,
    aiAuditEvents,
  } = useEvidence();

  const totalAnalyses = workAnalyses.length;
  const totalCandidates = extractionCandidates.length;
  const blockedCount = guardResults.filter((g) => g.guard_outcome === "BLOCK").length;
  const openConflicts = conflicts.filter((c) => c.status === "open").length;
  const validOutputsCount = validationRecords.filter((v) => v.status === "valid").length;
  const pendingReviews = reviewTasks.filter((r) => r.status === "pending").length;

  const DOMAIN3_FEATURES = [
    {
      title: "1. AI Work Analysis",
      href: "/app/ai/work-analysis",
      icon: Sparkles,
      desc: "Inspect parsed facts, inferred attributes, and observed activities before skill mapping.",
      badge: `${totalAnalyses} Sources Analyzed`,
    },
    {
      title: "2. Skill Extraction",
      href: "/app/ai/skill-extraction",
      icon: Fingerprint,
      desc: "Extract candidate skills, map synonyms, and resolve taxonomy aliases without double counting.",
      badge: `${totalCandidates} Candidates Extracted`,
    },
    {
      title: "3. Evidence Mapping",
      href: "/app/ai/evidence-mapping",
      icon: Layers,
      desc: "Inspect the exact source loci, code snippets, and tickets that substantiate each claim.",
      badge: "Many-to-Many Linking",
    },
    {
      title: "4. Verification Review",
      href: "/app/ai/verification",
      icon: Scale,
      desc: "Evaluate claims against formal verification policies. High confidence alone never verifies a skill.",
      badge: "Policy v2026.1",
    },
    {
      title: "5. Confidence & Uncertainty",
      href: "/app/ai/confidence",
      icon: Percent,
      desc: "Separates extraction confidence from artifact strength, recency, and verification status.",
      badge: "Calibrated Trust",
    },
    {
      title: "6. Conflict Resolution",
      href: "/app/ai/conflicts",
      icon: GitCompare,
      desc: "Side-by-side reconciliation of contradictory claims, timeline gaps, and attribution disputes.",
      badge: `${openConflicts} Open Conflicts`,
    },
    {
      title: "7. Hallucination Guard",
      href: "/app/ai/guard",
      icon: ShieldAlert,
      desc: "Blocks fabricated citation IDs, cross-user claims, and unproven resume overclaims.",
      badge: `${blockedCount} Claims Blocked`,
    },
    {
      title: "8. Output Validation",
      href: "/app/ai/validation",
      icon: FileCode,
      desc: "Validates JSON schema adherence, required fields, and boundary constraints before indexing.",
      badge: `${validOutputsCount}/${validationRecords.length} Schema Valid`,
    },
    {
      title: "9. Prompt-Injection Guard",
      href: "/app/ai/prompt-injection",
      icon: Shield,
      desc: "Inspects quarantined instructions in source files attempting to override pipeline rules.",
      badge: "Restricted (Reviewer/Admin)",
    },
    {
      title: "10. Human Review Queue",
      href: "/app/ai/review-queue",
      icon: ClipboardList,
      desc: "Centralized triage workspace for authorized reviewers to resolve uncertainty and conflicts.",
      badge: `${pendingReviews} Tasks Pending`,
    },
    {
      title: "11. AI Evaluation Suite",
      href: "/app/ai/evaluation",
      icon: BarChart3,
      desc: "Benchmark test cases verifying resistance to hallucinations, schema breaks, and overrides.",
      badge: "Restricted (Admin)",
    },
    {
      title: "12. AI Audit Trail",
      href: "/app/ai/audit",
      icon: ScrollText,
      desc: "Immutable timeline logging all extractions, reviewer approvals, guard blocks, and retries.",
      badge: `${aiAuditEvents.length} Events Logged`,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/passport" className="hover:text-[#1F1E1D]">
              SkillPassport
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">AI Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            AI Work Analysis & Hallucination Protection
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            The LLM may propose claims. The evidence and verification system determines whether those claims can be trusted.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/ai/guard"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Inspect Guard
          </Link>
        </div>
      </div>

      <DemoDataNotice />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Work Analyses</span>
            <Sparkles className="w-4 h-4 text-[#4361EE]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">{totalAnalyses}</div>
          <p className="text-xs text-[#8C827A] mt-1">Ingested source repositories</p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Candidate Skills</span>
            <Fingerprint className="w-4 h-4 text-[#8A38F5]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">{totalCandidates}</div>
          <p className="text-xs text-[#8C827A] mt-1">Pending formal verification</p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Claims Blocked</span>
            <ShieldAlert className="w-4 h-4 text-[#BA1A1A]" />
          </div>
          <div className="text-3xl font-extrabold text-[#BA1A1A]">{blockedCount}</div>
          <p className="text-xs text-[#8C827A] mt-1">Zero evidence / fake IDs</p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Conflicts</span>
            <GitCompare className="w-4 h-4 text-[#B07219]" />
          </div>
          <div className="text-3xl font-extrabold text-[#B07219]">{openConflicts}</div>
          <p className="text-xs text-[#8C827A] mt-1">Attribution / source clashes</p>
        </div>
      </div>

      {/* Fundamental Product Invariant Callout */}
      <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5] space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#2E6941]" />
          <h2 className="text-base font-bold text-[#1F1E1D]">
            The Three Independent Measurement Planes
          </h2>
        </div>
        <p className="text-xs text-[#5A5550] leading-relaxed max-w-3xl">
          SkillPassport strictly enforces separation between model perception and authoritative proof. A high extraction score never by itself produces a Verified status.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4361EE]">
              1. Extraction Confidence
            </span>
            <p className="text-xs text-[#1F1E1D] mt-1 font-semibold">
              NLP token & pattern recognition
            </p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Measures how accurately the LLM extracted keywords from the source text.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B07219]">
              2. Evidence Strength
            </span>
            <p className="text-xs text-[#1F1E1D] mt-1 font-semibold">
              Artifact relevance & attribution
            </p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Evaluates whether the artifact is a commit, ticket, certificate, or self-claim.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E6941]">
              3. Verification State
            </span>
            <p className="text-xs text-[#1F1E1D] mt-1 font-semibold">
              Policy & rubric gate
            </p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Determined exclusively by authenticated review policies and human-in-the-loop oversight.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Navigation Grid (All 12 Features) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1F1E1D]">Domain 3 Capabilities</h2>
          <span className="text-xs text-[#8C827A]">12 Connected Features</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOMAIN3_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                href={feat.href}
                className="gl-card p-5 flex flex-col justify-between hover:shadow-md transition-all group border-[#E4DDD3]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] flex items-center justify-center group-hover:bg-[#DFE968] group-hover:border-[#1C1C1C] transition-colors">
                      <Icon className="w-4 h-4 text-[#1F1E1D]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#1F1E1D]">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1F1E1D] group-hover:text-[#2E6941] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-[#5A5550] mt-1.5 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0EBE1] flex items-center justify-end text-xs font-bold text-[#1F1E1D] group-hover:text-[#2E6941]">
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Pipeline Activity Stream */}
      <div className="gl-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#8C827A]">
            Recent AI Governance Events
          </h3>
          <Link
            href="/app/ai/audit"
            className="text-xs font-bold text-[#2E6941] hover:underline flex items-center gap-1"
          >
            View Full Audit Trail
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-[#F0EBE1]">
          {aiAuditEvents.slice(0, 4).map((evt) => (
            <div key={evt.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1F1E1D]">{evt.actor}</span>
                  <span className="text-[10px] text-[#8C827A]">• {evt.timestamp}</span>
                </div>
                <p className="text-xs text-[#5A5550] mt-0.5">{evt.reason}</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#1F1E1D] border border-[#EBE5DC] flex-shrink-0">
                {evt.new_state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
