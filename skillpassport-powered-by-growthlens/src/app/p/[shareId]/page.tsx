"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ExternalLink,
  FileText,
  GitPullRequest,
  Briefcase,
  Share2,
  Printer,
  Copy,
  Check,
  Award,
  Layers,
  ArrowRight,
  UserCheck,
  Sparkles,
  Info,
  Calendar,
  Mail,
  Globe,
} from "lucide-react";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default function RecruiterPassportPage({ params }: PageProps) {
  const { shareId } = use(params);
  const { getShareProjection, recordShareAccess } = useEvidence();

  const [copied, setCopied] = useState(false);

  // Record access when recruiter loads the link
  useEffect(() => {
    if (shareId) {
      recordShareAccess(shareId);
    }
  }, [shareId, recordShareAccess]);

  const projection = getShareProjection(shareId);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // State 1: Unknown / Link Not Found
  if (!projection) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Shared Passport Not Found
          </h1>
          <p className="text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
            The link you requested does not exist or may have been removed. Shared links are unique and case-sensitive.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-2">
          <p className="font-semibold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> For Candidates & Hiring Managers:
          </p>
          <p>
            Make sure you are using the full link provided by the candidate. If you are the candidate, verify this link in your Shared Access Management portal.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold"
          >
            Return to SkillPassport Home
          </Link>
        </div>
      </div>
    );
  }

  // State 2: Revoked Link
  if (projection.isRevoked || projection.status === "revoked") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider">
            Link Revoked by Candidate
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Access to This Passport Has Been Revoked
          </h1>
          <p className="text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
            The candidate has explicitly revoked public access to this shared view. In compliance with candidate data minimization standards, all capability data has been purged from this view.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 text-xs text-ink/70 text-left space-y-1">
          <div className="flex justify-between">
            <span className="font-semibold">Security Token:</span>
            <span className="font-mono text-ink/50">{shareId}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Protection Standard:</span>
            <span>Zero-Knowledge Revocation Protocol</span>
          </div>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold"
          >
            Learn About SkillPassport Verification
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Expired Link
  if (projection.isExpired || projection.status === "expired") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
            Link Expired
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            This Passport Link Has Expired
          </h1>
          <p className="text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
            The candidate set a time limit on this recruiter view to ensure you always receive an up-to-date representation of their capabilities.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-2">
          <p className="font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Expiration Details:
          </p>
          <p>
            Expired on: <span className="font-semibold">{projection.expiresAt || "Recently"}</span>. Please reach out to the candidate directly to request an updated or extended link.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // State 4: Active Verified Recruiter View
  const profile = projection.candidateProfile;
  const skills = projection.verifiedSkills;
  const evidence = projection.authorizedEvidence;
  const alignment = projection.roleAlignment;

  return (
    <div className="space-y-8 print:space-y-6">
      {/* Recruiter Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border border-ink/15 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-ink/10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Candidate Profile
              </span>
              <span className="text-xs text-ink/60 font-mono">
                {projection.expiresAt ? `Valid until ${projection.expiresAt}` : "Permanent Link"}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              {profile.displayName || "Verified Candidate"}
            </h1>

            {profile.headline && (
              <p className="text-base sm:text-lg font-medium text-ink/80">
                {profile.headline}
              </p>
            )}

            {profile.summary && (
              <p className="text-sm text-ink/70 leading-relaxed pt-1">
                {profile.summary}
              </p>
            )}

            {/* Disclosed Contact Info */}
            {(profile.contactEmail || profile.contactLinkedIn) && (
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                {profile.contactEmail && (
                  <a
                    href={`mailto:${profile.contactEmail}`}
                    className="flex items-center gap-1.5 text-ink/80 hover:text-ink font-medium underline underline-offset-2"
                  >
                    <Mail className="w-3.5 h-3.5 text-ink/60" />
                    <span>{profile.contactEmail}</span>
                  </a>
                )}
                {profile.contactLinkedIn && (
                  <a
                    href={`https://${profile.contactLinkedIn.replace(/^https?:\/\//, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-ink/80 hover:text-ink font-medium underline underline-offset-2"
                  >
                    <Globe className="w-3.5 h-3.5 text-ink/60" />
                    <span>{profile.contactLinkedIn}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions (Print / Copy) */}
          <div className="flex flex-wrap md:flex-col items-center gap-2.5 shrink-0 print:hidden">
            <button
              onClick={handleCopyLink}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-ink/15 hover:bg-ink/5 text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-ink/60" />
                  <span>Copy Recruiter Link</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-ink/15 hover:bg-ink/5 text-ink text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-ink/60" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* 1-Minute Executive Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-white/80 border border-ink/10">
            <div className="text-2xl font-extrabold text-ink">{skills.length}</div>
            <div className="text-xs text-ink/60 font-medium">Verified Skills</div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/80 border border-ink/10">
            <div className="text-2xl font-extrabold text-ink">{evidence.length}</div>
            <div className="text-xs text-ink/60 font-medium">Authorized Artifacts</div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/80 border border-ink/10">
            <div className="text-2xl font-extrabold text-ink">
              {alignment ? `${alignment.alignmentScore}%` : "General"}
            </div>
            <div className="text-xs text-ink/60 font-medium">
              {alignment ? "Role Alignment" : "Profile Scope"}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-white/80 border border-ink/10">
            <div className="text-2xl font-extrabold text-emerald-700">100%</div>
            <div className="text-xs text-ink/60 font-medium">Evidence Corroborated</div>
          </div>
        </div>
      </div>

      {/* Role Alignment Preview Card (if included) */}
      {alignment && (
        <div className="p-6 rounded-2xl bg-[#DFE968]/20 border-2 border-[#DFE968] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Target Role Fit Evaluation
              </div>
              <h2 className="text-xl font-bold text-ink mt-0.5">
                {alignment.targetRoleTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-extrabold">
                {alignment.alignmentScore}% Match
              </span>
              <Link
                href={`/p/${shareId}/role-alignment`}
                className="px-3 py-1.5 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <span>Full Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-sm text-ink/80 leading-relaxed">
            {alignment.alignmentSummary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-white/90 border border-ink/10 space-y-1.5">
              <span className="font-bold text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Demonstrated Strengths:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {alignment.strengths.map((str, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium text-[11px]"
                  >
                    {str}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/90 border border-ink/10 space-y-1.5">
              <span className="font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Evidence Gaps / Unverified Areas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {alignment.unsupportedAreas.map((gap, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-medium text-[11px]"
                  >
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Verified Skills */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-ink/70" />
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Verified Competencies
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink/60 mt-1">
            Strictly corroborated capabilities. Every skill listed below is backed by real commit code, pull requests, or technical deliverable deliverables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="p-5 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-3 hover:border-ink/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 block">
                    {skill.category}
                  </span>
                  <h3 className="text-lg font-bold text-ink">
                    {skill.canonicalName}
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    skill.verifiedProficiency === "Advanced"
                      ? "bg-purple-50 text-purple-900 border-purple-200"
                      : skill.verifiedProficiency === "Practitioner"
                      ? "bg-blue-50 text-blue-900 border-blue-200"
                      : "bg-emerald-50 text-emerald-900 border-emerald-200"
                  }`}
                >
                  {skill.verifiedProficiency}
                </span>
              </div>

              <p className="text-xs text-ink/70 leading-relaxed">
                {skill.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-xs">
                <span className="text-ink/60 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-ink/50" />
                  {skill.evidenceCount} corroborating {skill.evidenceCount === 1 ? "artifact" : "artifacts"}
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  PROVENANCE VERIFIED
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Authorized Production Evidence */}
      <div className="space-y-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-ink/70" />
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Authorized Evidence & Work Artifacts
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink/60 mt-1">
            Real engineering deliverables disclosed by the candidate to support their verified skills.
          </p>
        </div>

        <div className="space-y-3">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-5 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-ink/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase border ${
                      ev.sourceType === "github"
                        ? "bg-slate-900 text-white border-slate-900"
                        : ev.sourceType === "jira"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {ev.sourceType}
                  </span>
                  <span className="text-xs font-semibold text-ink/60">
                    {ev.project}
                  </span>
                  <span className="text-xs text-ink/40">•</span>
                  <span className="text-xs text-ink/60">{ev.date}</span>
                </div>

                <div className="text-xs font-medium text-ink/60 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contribution: {ev.claimedContribution}</span>
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-ink">{ev.title}</h4>
                <p className="text-xs sm:text-sm text-ink/70 mt-1 leading-relaxed">
                  {ev.shortSummary}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-ink/60 font-medium">Corroborates Skill:</span>
                  <span className="px-2 py-0.5 rounded bg-ink/5 border border-ink/10 text-ink font-semibold">
                    {ev.relatedSkillName}
                  </span>
                </div>

                <div>
                  {ev.allowDetailInspection ? (
                    <Link
                      href={`/p/${shareId}/evidence/${ev.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ink/5 hover:bg-ink hover:text-[#FBF1CF] border border-ink/15 text-ink font-semibold transition-all"
                    >
                      <span>Inspect Technical Artifact</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-ink/5 text-ink/50 text-[11px] font-medium border border-ink/10">
                      <Lock className="w-3 h-3" />
                      Summary Only (Detail Restricted by Candidate)
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Verification Guarantee Note */}
      <div className="p-5 rounded-2xl bg-[#FBF1CF] border border-ink/15 shadow-sm flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-ink">
            SkillPassport Anti-Hallucination & Provenance Guarantee
          </h4>
          <p className="text-xs text-ink/80 leading-relaxed">
            {projection.verificationGuaranteeNote}
          </p>
        </div>
      </div>
    </div>
  );
}
