"use client";

import React, { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
  CoverageBadge,
} from "@/components/app/SkillBadges";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  FileText,
  AlertTriangle,
  Info,
  Calendar,
  ExternalLink,
  GitBranch,
  Network,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

interface PageProps {
  params: Promise<{ skillId: string }>;
}

export default function SkillDetailPage({ params }: PageProps) {
  const { skillId } = use(params);
  const { skills, evidenceItems } = useEvidence();

  const skill = skills.find((s) => s.id === skillId);

  if (!skill) {
    return (
      <div className="gl-card p-12 text-center space-y-4 my-8">
        <AlertCircle className="w-10 h-10 text-[#BA1A1A] mx-auto" />
        <h2 className="text-xl font-bold text-[#1F1E1D]">Competency Not Found</h2>
        <p className="text-xs text-[#8C827A] max-w-sm mx-auto">
          The requested skill profile does not exist or has been removed from the taxonomy.
        </p>
        <Link href="/app/passport/explorer" className="pill-btn pill-btn-primary inline-flex text-xs">
          Return to Skill Explorer
        </Link>
      </div>
    );
  }

  const linkedEvidence = evidenceItems.filter((e) => skill.evidenceIds.includes(e.id));
  const relatedSkills = skills.filter((s) => skill.relatedSkillIds.includes(s.id));
  const prerequisiteSkills = skills.filter((s) =>
    skill.prerequisiteSkillIds.includes(s.id)
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={skill.canonicalName}
        description={`Category: ${skill.category}. ${skill.definition}`}
        badge="Domain 2 · Competency Profile"
        badgeColor="border-amber-300 text-amber-900 bg-amber-50"
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/app/passport/skills/${skill.id}/evidence`}
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Evidence Map ({skill.evidenceIds.length})
          </Link>
          <Link
            href={`/app/passport/skills/${skill.id}/proficiency`}
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            Proficiency Rubric
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Trust Separation Callout */}
      <div className="p-4 rounded-2xl bg-[#FBF9F6] border border-[#EBE5DC] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#8C827A] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#5A5550] leading-relaxed">
          <strong className="text-[#1F1E1D]">Calibrated Trust Model:</strong> We strictly separate{" "}
          <em>Extraction Confidence</em> ({skill.confidence}%) from{" "}
          <em>Attributable Evidence Strength</em> ({skill.evidenceStrength.toUpperCase()}) and{" "}
          <em>Formal Verification State</em> ({skill.verificationState.toUpperCase()}). High model confidence merely indicates accurate text recognition, not demonstrated competence.
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
            Verification Status
          </span>
          <div className="mt-2">
            <SkillVerificationBadge state={skill.verificationState} />
          </div>
          <p className="text-[11px] text-[#8C827A] mt-2">
            {skill.verificationState === "verified"
              ? "Formally approved claim"
              : "Unverified / Pending"}
          </p>
        </div>

        <div className="gl-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
            Verified Proficiency
          </span>
          <div className="mt-2">
            <ProficiencyBadge level={skill.verifiedProficiency} />
          </div>
          <p className="text-[11px] text-[#8C827A] mt-2">
            Estimated: {skill.estimatedProficiency}
          </p>
        </div>

        <div className="gl-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
            Coverage Completeness
          </span>
          <div className="mt-2">
            <CoverageBadge state={skill.coverageState} />
          </div>
          <p className="text-[11px] text-[#8C827A] mt-2">
            {skill.evidenceIds.length} corroborating artifacts
          </p>
        </div>

        <div className="gl-card p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
            Extraction Calibration
          </span>
          <div className="text-2xl font-extrabold text-[#1F1E1D] mt-1">
            {skill.confidence}%
          </div>
          <p className="text-[11px] text-[#8C827A] mt-1">
            Strength: {skill.evidenceStrength.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Definition & Aliases */}
      <div className="gl-card p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#8C827A]">
          Formal Competency Specification
        </h2>
        <p className="text-base text-[#1F1E1D] leading-relaxed font-medium">
          {skill.definition}
        </p>

        {skill.aliases.length > 0 && (
          <div className="pt-3 border-t border-[#F0EBE1] flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#8C827A]">Recognized Synonyms & Aliases:</span>
            {skill.aliases.map((alias) => (
              <span
                key={alias}
                className="text-xs bg-[#FAF8F5] text-[#1F1E1D] px-2.5 py-0.5 rounded-full border border-[#EBE5DC]"
              >
                {alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rationale and Scope Boundaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="gl-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F1E1D]">
            <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
            <h3>Assessment Rationale</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            {skill.assessmentRationale}
          </p>
          <div className="pt-3 border-t border-[#F0EBE1] text-[11px] text-[#8C827A] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Latest supporting work artifact: {skill.lastEvidenceDate}</span>
          </div>
        </div>

        <div className="gl-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F1E1D]">
            <AlertTriangle className="w-4 h-4 text-[#B07219]" />
            <h3>Scope Boundaries & Known Limitations</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            {skill.limitations || "No known scope restrictions logged for this competency."}
          </p>
          <div className="pt-3 border-t border-[#F0EBE1] text-[11px] text-[#8C827A]">
            Skill Passport does not overclaim unproven specializations without direct codebase backing.
          </div>
        </div>
      </div>

      {/* Corroborating Evidence Items */}
      <div className="gl-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1F1E1D]">
              Corroborating Evidence Artifacts ({linkedEvidence.length})
            </h2>
            <p className="text-xs text-[#8C827A] mt-0.5">
              Verified artifacts from Domain 1 ingested from connected systems.
            </p>
          </div>

          <Link
            href={`/app/passport/skills/${skill.id}/evidence`}
            className="text-xs font-bold text-[#2E6941] hover:underline flex items-center gap-1"
          >
            Open Mapping Inspector
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {linkedEvidence.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-dashed border-[#E0D9CD]">
            <FileText className="w-6 h-6 text-[#8C827A] mx-auto mb-2" />
            <p className="text-xs font-semibold text-[#1F1E1D]">No directly linked evidence artifacts</p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Connect a repository, issue tracker, or document to establish supporting evidence.
            </p>
            <Link
              href="/app/evidence/connect"
              className="pill-btn pill-btn-primary text-xs mt-3 inline-flex"
            >
              Connect Ingestion Source
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EBE1]">
            {linkedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#1F1E1D]">
                      {ev.sourceType}
                    </span>
                    <span className="text-xs font-bold text-[#1F1E1D] hover:text-[#2E6941]">
                      {ev.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A5550] line-clamp-2 max-w-xl">
                    {ev.description || ev.extractedSummary}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-[#8C827A]">
                    <span>Artifact ID: {ev.id}</span>
                    <span>•</span>
                    <span>Date: {ev.date}</span>
                    <span>•</span>
                    <span>Review: {ev.reviewStatus}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/app/evidence/${ev.id}`}
                    className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1"
                  >
                    View Artifact
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ontology & Skill Relationships */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prerequisites */}
        <div className="gl-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F1E1D]">
            <GitBranch className="w-4 h-4 text-[#8A38F5]" />
            <h3>Prerequisite Competencies</h3>
          </div>
          {prerequisiteSkills.length === 0 ? (
            <p className="text-xs text-[#8C827A] italic">
              No formal prerequisites required by the taxonomy.
            </p>
          ) : (
            <div className="space-y-2">
              {prerequisiteSkills.map((ps) => (
                <Link
                  key={ps.id}
                  href={`/app/passport/skills/${ps.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] transition-colors"
                >
                  <span className="text-xs font-bold text-[#1F1E1D]">
                    {ps.canonicalName}
                  </span>
                  <SkillVerificationBadge state={ps.verificationState} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Related Skills */}
        <div className="gl-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F1E1D]">
            <Network className="w-4 h-4 text-[#4361EE]" />
            <h3>Related Competencies</h3>
          </div>
          {relatedSkills.length === 0 ? (
            <p className="text-xs text-[#8C827A] italic">
              No adjacent competencies mapped in the taxonomy.
            </p>
          ) : (
            <div className="space-y-2">
              {relatedSkills.map((rs) => (
                <Link
                  key={rs.id}
                  href={`/app/passport/skills/${rs.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] transition-colors"
                >
                  <span className="text-xs font-bold text-[#1F1E1D]">
                    {rs.canonicalName}
                  </span>
                  <SkillVerificationBadge state={rs.verificationState} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
