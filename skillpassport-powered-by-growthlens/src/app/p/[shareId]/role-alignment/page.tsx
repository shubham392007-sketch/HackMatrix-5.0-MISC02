"use client";

import React, { use } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Layers,
  Award,
  Sparkles,
  Info,
  Check,
  X,
  FileText,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    shareId: string;
  }>;
}

export default function RecruiterRoleAlignmentPage({ params }: PageProps) {
  const { shareId } = use(params);
  const { getShareProjection } = useEvidence();

  const projection = getShareProjection(shareId);

  // If projection missing, revoked, or expired
  if (!projection || projection.isRevoked || projection.isExpired) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">
            Role Alignment Unavailable
          </h1>
          <p className="text-xs text-ink/70">
            This passport link is not currently active or has expired.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Home
        </Link>
      </div>
    );
  }

  const alignment = projection.roleAlignment;

  // If role alignment was not included in this link
  if (!alignment) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center mx-auto">
          <Briefcase className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-ink">
            Role Alignment Not Included
          </h1>
          <p className="text-xs text-ink/70 max-w-md mx-auto leading-relaxed">
            The candidate configured this passport link as a general capability overview rather than targeting a specific role demand profile.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Return Link */}
      <Link
        href={`/p/${shareId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
      </Link>

      {/* Main Alignment Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border border-ink/15 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-ink/10">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Evaluated Role Profile
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              {alignment.targetRoleTitle}
            </h1>
            <p className="text-xs text-ink/60">
              Candidate Fit Evaluated Against Verified Capability Model
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-black text-ink">
                {alignment.alignmentScore}%
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                Demonstrated Match
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-black text-xl shadow-sm">
              ✓
            </div>
          </div>
        </div>

        {/* Alignment Summary Explanation */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink/60">
            Recruiter Match Summary
          </h2>
          <div className="p-4 rounded-xl bg-white border border-ink/10 text-xs sm:text-sm text-ink/80 leading-relaxed">
            {alignment.alignmentSummary}
          </div>
        </div>

        <div className="text-xs text-ink/60 italic">
          {alignment.coverageNote}
        </div>
      </div>

      {/* Two Column Breakdown: Strengths vs Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Demonstrated Strengths */}
        <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-ink">
                Demonstrated Strengths
              </h3>
              <p className="text-[11px] text-ink/60">
                Verified against production artifacts
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {alignment.strengths.map((str, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    {str}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                    MATCHED
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                  Corroborated by active production code and deliverables in the candidate's verified passport.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Missing Requirements / Gaps */}
        <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-ink">
                Evidence Gaps / Unsupported Areas
              </h3>
              <p className="text-[11px] text-ink/60">
                No corroborating artifacts disclosed
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {alignment.unsupportedAreas.map((gap, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-amber-700" />
                    {gap}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                    EVIDENCE GAP
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  The candidate does not have verified work items in this link proving hands-on proficiency in this domain.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recruiter Evaluation Guide */}
      <div className="p-5 rounded-2xl bg-[#DFE968]/20 border border-[#DFE968] flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-bold text-ink">
            How Hiring Teams Should Interpret SkillPassport Gaps
          </h4>
          <p className="text-ink/80 leading-relaxed">
            In SkillPassport, a listed gap means an absence of verified evidence, not necessarily an absence of candidate capability. Because SkillPassport forbids uncorroborated assertions, candidates cannot claim skills they cannot prove with real deliverables. Hiring managers can focus interview technical loops specifically on these gap areas while trusting the verified strengths.
          </p>
        </div>
      </div>
    </div>
  );
}
