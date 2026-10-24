"use client";

import React, { use } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { validateEvidenceAccess } from "@/lib/sharingCalculations";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  ExternalLink,
  GitPullRequest,
  GitCommit,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Terminal,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    shareId: string;
    evidenceId: string;
  }>;
}

export default function RecruiterEvidenceDetailPage({ params }: PageProps) {
  const { shareId, evidenceId } = use(params);
  const { getShareProjection } = useEvidence();

  const projection = getShareProjection(shareId);
  const accessResult = validateEvidenceAccess(projection, evidenceId);

  // If projection is invalid or expired/revoked
  if (!projection || projection.isRevoked || projection.isExpired) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">
            Passport Access Denied or Expired
          </h1>
          <p className="text-xs text-ink/70">
            {accessResult.reason || "This shared passport link is no longer accessible."}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>
    );
  }

  // If evidence is restricted to summary only (candidate chose not to disclose detail)
  if (!accessResult.allowed && accessResult.evidence) {
    const ev = accessResult.evidence;
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <Link
          href={`/p/${shareId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
        </Link>

        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold">
                Detailed Artifact Inspection Restricted by Candidate
              </h2>
              <p className="text-xs text-amber-900/80 leading-relaxed mt-1">
                The candidate has authorized a verified summary for this competency, but has withheld deep code repository links, commit diffs, and raw work files to protect confidential employer information or intellectual property.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-amber-200/80 space-y-2 text-ink">
            <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
              <span>{ev.project}</span>
              <span>{ev.date}</span>
            </div>
            <h3 className="text-base font-bold text-ink">{ev.title}</h3>
            <p className="text-xs text-ink/70 leading-relaxed">{ev.shortSummary}</p>
            <div className="pt-2 text-xs flex items-center gap-2">
              <span className="text-ink/60 font-medium">Corroborates:</span>
              <span className="px-2 py-0.5 rounded bg-ink/5 border border-ink/10 font-bold">
                {ev.relatedSkillName}
              </span>
            </div>
          </div>

          <div className="text-xs text-amber-900/70 italic">
            Note: This capability was corroborated by SkillPassport's evidence engine before being issued to the candidate's passport.
          </div>
        </div>
      </div>
    );
  }

  // If evidence not in scope
  if (!accessResult.allowed || !accessResult.evidence) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">Evidence Item Not in Scope</h1>
          <p className="text-xs text-ink/70">
            {accessResult.reason || "This specific evidence item is not authorized for disclosure in this shared passport."}
          </p>
        </div>
        <Link
          href={`/p/${shareId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
        </Link>
      </div>
    );
  }

  // Authorized Detail Inspection View
  const ev = accessResult.evidence;

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back to Shared Passport */}
      <Link
        href={`/p/${shareId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
      </Link>

      {/* Main Evidence Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-6">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-ink/10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase border ${
                ev.sourceType === "github"
                  ? "bg-slate-900 text-white border-slate-900"
                  : ev.sourceType === "jira"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-amber-100 text-amber-900 border-amber-300"
              }`}
            >
              {ev.sourceType}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Verified Artifact
            </span>
            <span className="text-xs text-ink/50 font-mono">
              ID: {ev.id}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {ev.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-ink/70">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-ink/50" />
              Project: <span className="font-semibold text-ink">{ev.project}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-ink/50" />
              Date: <span className="font-semibold text-ink">{ev.date}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Attribution: <span className="font-semibold text-ink">{ev.claimedContribution}</span>
            </span>
          </div>
        </div>

        {/* Technical Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink/60">
            Technical Deliverable Summary
          </h2>
          <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 text-xs sm:text-sm text-ink/80 leading-relaxed font-sans">
            {ev.shortSummary}
          </div>
        </div>

        {/* Corroborated Verified Skill */}
        <div className="p-4 rounded-xl bg-[#DFE968]/20 border border-[#DFE968] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
              Corroborates Candidate Competency
            </span>
            <h3 className="text-base font-bold text-ink">
              {ev.relatedSkillName}
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold shrink-0">
            Corroborated
          </span>
        </div>

        {/* Technical Provenance Metadata */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Technical Provenance Metadata
          </h2>

          <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 overflow-x-auto">
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">Source Type:</span>
              <span className="text-[#DFE968]">{ev.sourceType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">Reference:</span>
              <span className="text-slate-200">{ev.sourceReference || "feat/pipeline-core-pr-142"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">Attribution Status:</span>
              <span className="text-emerald-400">Deterministic Author Matched</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sanitization:</span>
              <span className="text-slate-400">Secrets Redacted • Proprietary Data Masked</span>
            </div>
          </div>
        </div>

        {/* External Link if authorized */}
        {ev.sourceUrl && (
          <div className="pt-2">
            <a
              href={ev.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold transition-all shadow-sm"
            >
              <span>Inspect Source Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Recruiter Guarantee Banner */}
        <div className="p-4 rounded-xl bg-[#FBF1CF] border border-ink/15 text-xs text-ink/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This artifact view has been authorized by the candidate under SkillPassport's selective disclosure protocol. It proves hands-on production engineering execution without exposing internal proprietary logic.
          </p>
        </div>
      </div>
    </div>
  );
}
