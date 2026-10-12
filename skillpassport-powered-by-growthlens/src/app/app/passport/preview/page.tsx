"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { buildShareProjection } from "@/lib/sharingCalculations";
import {
  Eye,
  ShieldCheck,
  Award,
  Link2,
  ExternalLink,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Briefcase,
  AlertCircle,
  FileText,
  GitBranch,
  Layers,
  Lock,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function PassportPreviewPage() {
  const {
    skills,
    evidenceItems,
    targetRoles,
    draftPermissions,
  } = useEvidence();

  // Create temporary share record based on current draft permissions
  const tempShareRecord = useMemo(() => {
    return {
      shareId: "preview-temp",
      label: draftPermissions.customLinkLabel || "Preview Configuration",
      status: "active" as const,
      createdAt: "Today",
      expiresAt: draftPermissions.expiryDays
        ? new Date(Date.now() + draftPermissions.expiryDays * 86400000).toISOString().split("T")[0]
        : null,
      permissions: draftPermissions,
      accessCount: 0,
    };
  }, [draftPermissions]);

  // Generate allowlist projection
  const projection = useMemo(() => {
    return buildShareProjection(tempShareRecord, skills, evidenceItems, targetRoles);
  }, [tempShareRecord, skills, evidenceItems, targetRoles]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Passport Preview"
        description="Inspect the exact projection recruiters and hiring managers will see before sharing."
        badge="Domain 6 · Recruiter Preview"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/permissions"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Settings</span>
          </Link>
          <Link
            href="/app/passport/share"
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <span>Share &rarr;</span>
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Recruiter View Mock Frame */}
        <div className="gl-card p-6 md:p-10 space-y-8 bg-paper border-2 border-ink shadow-lg">
        {/* Recruiter Header */}
        <div className="border-b border-ink/10 pb-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-ink/60">
            <span className="font-extrabold tracking-wider uppercase text-[10px] text-peach">
              SkillPassport Verified Credential
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified by GrowthLens
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-ink">
                {projection.candidateProfile.displayName || "Anonymous Candidate"}
              </h1>
              <p className="text-xs md:text-sm font-semibold text-ink/80">
                {projection.candidateProfile.headline || "Verified Technical Professional"}
              </p>
            </div>

            {projection.candidateProfile.contactEmail && (
              <div className="p-3 bg-card rounded-xl border border-ink/10 text-xs space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-ink/50 block">Contact Info</span>
                <span className="font-semibold text-ink block">{projection.candidateProfile.contactEmail}</span>
                {projection.candidateProfile.contactLinkedIn && (
                  <span className="text-ink/60 text-[11px] block">{projection.candidateProfile.contactLinkedIn}</span>
                )}
              </div>
            )}
          </div>

          {projection.candidateProfile.summary && (
            <p className="text-xs md:text-sm text-ink/80 leading-relaxed pt-2">
              {projection.candidateProfile.summary}
            </p>
          )}
        </div>

        {/* Section 1: Verified Skills */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Verified Demonstrated Competencies
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                Every skill below has been verified through repository commits, engineering RFCs, or resolved Jira deliverables.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {projection.verifiedSkills.length} Verified Skills
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projection.verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-5 rounded-2xl bg-card border border-ink/15 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-ink">
                    {skill.canonicalName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-peach/30 text-ink">
                    {skill.verifiedProficiency}
                  </span>
                </div>

                <p className="text-xs text-ink/70 leading-relaxed">
                  {skill.description}
                </p>

                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
                  <span className="text-ink/60 text-[11px]">
                    Supported by <strong>{skill.evidenceCount}</strong> authorized artifacts
                  </span>
                  <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </div>

          {projection.verifiedSkills.length === 0 && (
            <div className="p-8 text-center text-xs text-ink/60 bg-paper rounded-2xl border border-ink/10">
              No verified skills selected in this share configuration. Return to permissions to pick skills.
            </div>
          )}
        </div>

        {/* Section 2: Authorized Evidence Highlights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-ink flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-peach" />
                Authorized Evidence Artifacts
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                Workplace artifacts and research deliverables verifying demonstrated capabilities.
              </p>
            </div>
            <span className="text-xs font-bold text-ink/60">
              {projection.authorizedEvidence.length} Authorized Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projection.authorizedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="p-5 rounded-2xl bg-card border border-ink/15 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink/5 text-ink">
                    {ev.sourceType}
                  </span>
                  <span className="text-[11px] text-ink/50">{ev.date}</span>
                </div>

                <h3 className="text-sm font-extrabold text-ink">
                  {ev.title}
                </h3>

                <p className="text-xs text-ink/70 leading-relaxed">
                  {ev.shortSummary}
                </p>

                <div className="p-2.5 rounded-xl bg-paper border border-ink/5 text-[11px] text-ink/80 space-y-0.5">
                  <span className="font-bold text-ink block">Demonstrated Contribution:</span>
                  <span>{ev.claimedContribution}</span>
                </div>

                <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
                  <span className="text-ink/60 text-[11px]">
                    Supports: <strong>{ev.relatedSkillName}</strong>
                  </span>
                  {ev.allowDetailInspection ? (
                    <span className="text-emerald-700 font-bold text-[11px]">
                      Detail Permitted
                    </span>
                  ) : (
                    <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Summary Only
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Role Alignment (if enabled) */}
        {projection.roleAlignment ? (
          <div className="p-6 rounded-2xl bg-peach/10 border border-peach/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-peach block">
                  Optional Recruiter Insights
                </span>
                <h3 className="text-base font-extrabold text-ink mt-0.5">
                  Role Alignment: {projection.roleAlignment.targetRoleTitle}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-ink text-paper">
                {projection.roleAlignment.alignmentScore}% Alignment
              </span>
            </div>

            <p className="text-xs md:text-sm text-ink/80 leading-relaxed">
              {projection.roleAlignment.alignmentSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified Strengths
                </span>
                <ul className="text-[11px] text-ink/70 list-disc list-inside space-y-0.5">
                  {projection.roleAlignment.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-paper rounded-xl border border-ink/10 space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Areas Not Demonstrated in Shared Evidence
                </span>
                <ul className="text-[11px] text-ink/70 list-disc list-inside space-y-0.5">
                  {projection.roleAlignment.unsupportedAreas.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[10px] text-ink/50 italic">
              {projection.roleAlignment.coverageNote}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-card border border-ink/10 text-xs text-ink/60 flex items-center gap-2">
            <Lock className="w-4 h-4 text-ink/40" />
            <span>Role alignment is disabled for this share configuration. Recruiter will only see verified skills and evidence.</span>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="pt-6 border-t border-ink/10 text-center text-xs text-ink/60 space-y-1">
          <p className="font-semibold text-ink">
            {projection.verificationGuaranteeNote}
          </p>
          <p className="text-[11px] text-ink/40">
            Powered by GrowthLens · Evidence-Backed Continuous Talent Intelligence
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="gl-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Link
          href="/app/passport"
          className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Skill Passport
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/app/passport/permissions"
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Edit Settings
          </Link>
          <Link
            href="/app/passport/share"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1"
          >
            Create Share Link
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
