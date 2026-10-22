"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Scale,
  Sparkles,
  Info,
  Layers,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  RequirementTypeBadge,
  ImportanceBadge,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";

export default function RoleDemandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.roleId as string;
  const { targetRoles, selectedRoleId, setSelectedRoleId } = useEvidence();

  const role = targetRoles.find((r) => r.role_id === roleId) || targetRoles[0];
  const competencies = role?.competencies || [];
  const coreRequirements = competencies.filter((c) => c.requirement_type === "core_required");
  const supportingRequirements = competencies.filter((c) => c.requirement_type === "supporting");
  const preferredRequirements = competencies.filter(
    (c) => c.requirement_type === "preferred" || c.requirement_type === "differentiating"
  );

  const handleSelectAndMatch = () => {
    setSelectedRoleId(role.role_id);
    router.push("/app/career/match");
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={role.title}
        description={`Context: ${role.context} • Seniority: ${role.seniority}`}
        badge={role.seniority.toUpperCase()}
      >
        <Link
          href="/app/career/roles"
          className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Roles
        </Link>
        <button
          onClick={handleSelectAndMatch}
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
        >
          <Scale className="w-3.5 h-3.5" /> Compare Skills &rarr;
        </button>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Role Title Banner */}
      <div className="gl-card p-8 bg-white border border-ink/15 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sand font-bold text-ink uppercase">
                {role.seniority}
              </span>
              <span className="text-xs font-mono text-ink-muted">{role.version}</span>
              {role.source_type === "custom_parsed_job" && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold">
                  Custom Job Model
                </span>
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-ink">{role.title}</h1>
            <p className="text-xs font-mono text-ink-muted">
              Context: <strong>{role.context}</strong>
            </p>
            <p className="text-sm text-ink/80 leading-relaxed pt-1">
              {role.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleSelectAndMatch}
              className="pill-btn pill-btn-primary text-xs py-3 px-6 flex items-center justify-center gap-2 shadow-md"
            >
              <Scale className="w-4 h-4" /> Compare My Skills &rarr;
            </button>
            <span className="text-[11px] text-ink-muted text-center font-mono">
              Sets active target & computes match
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-ink/10 flex flex-wrap items-center justify-between text-xs font-mono text-ink-muted gap-2">
          <span>Provenance: {role.provenance}</span>
          <span>Last Updated: {role.updated_at}</span>
        </div>
      </div>

      {/* Core Requirements Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            Core Required Competencies ({coreRequirements.length})
          </h2>
          <span className="text-xs text-ink-muted">
            Must be demonstrably supported to clear baseline career readiness
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreRequirements.map((comp) => (
            <div
              key={comp.skill_id}
              className="gl-card p-5 bg-white border border-red-200 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/app/passport/skills/${comp.skill_id}`}
                    className="font-bold text-ink text-sm hover:underline flex items-center gap-1.5"
                  >
                    {comp.canonical_name} <ExternalLink className="w-3 h-3 text-ink-muted" />
                  </Link>
                  <span className="text-[11px] font-mono text-ink-muted">{comp.category}</span>
                </div>
                <ImportanceBadge importance={comp.importance} />
              </div>

              <div className="p-3 rounded-xl bg-sand/20 border border-ink/5 space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Expected Proficiency:</span>
                  <strong className="text-ink text-sm">{comp.expected_level}</strong>
                </div>
                {comp.presence_rate && (
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>Industry Benchmark Presence:</span>
                    <span>{comp.presence_rate}% of postings</span>
                  </div>
                )}
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-ink block text-[11px] uppercase tracking-wider">
                  Evidence Expectation:
                </span>
                <p className="text-ink/80 text-[11px] leading-relaxed">
                  {comp.evidence_expectation}
                </p>
              </div>

              <div className="pt-2 border-t border-ink/5 flex items-center justify-between text-[10px] font-mono text-ink-muted">
                <span>Reason: {comp.reason_codes.join(", ")}</span>
                <Link
                  href={`/app/passport/skills/${comp.skill_id}`}
                  className="text-ink font-semibold hover:underline"
                >
                  Skill Detail &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supporting Requirements Section */}
      {supportingRequirements.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-600 inline-block" />
              Supporting Competencies ({supportingRequirements.length})
            </h2>
            <span className="text-xs text-ink-muted">
              Enhance engineering autonomy and velocity in role
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportingRequirements.map((comp) => (
              <div
                key={comp.skill_id}
                className="gl-card p-5 bg-white border border-sky-200 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/app/passport/skills/${comp.skill_id}`}
                      className="font-bold text-ink text-sm hover:underline flex items-center gap-1.5"
                    >
                      {comp.canonical_name} <ExternalLink className="w-3 h-3 text-ink-muted" />
                    </Link>
                    <span className="text-[11px] font-mono text-ink-muted">{comp.category}</span>
                  </div>
                  <RequirementTypeBadge type={comp.requirement_type} />
                </div>

                <div className="p-3 rounded-xl bg-sand/20 border border-ink/5 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Expected Proficiency:</span>
                    <strong className="text-ink">{comp.expected_level}</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-bold text-ink block text-[11px] uppercase tracking-wider">
                    Evidence Expectation:
                  </span>
                  <p className="text-ink/80 text-[11px] leading-relaxed">
                    {comp.evidence_expectation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferred & Differentiating Section */}
      {preferredRequirements.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
              Preferred & Differentiating Capabilities ({preferredRequirements.length})
            </h2>
            <span className="text-xs text-ink-muted">
              Strategic advantages that distinguish senior candidates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preferredRequirements.map((comp) => (
              <div
                key={comp.skill_id}
                className="gl-card p-5 bg-white border border-purple-200 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/app/passport/skills/${comp.skill_id}`}
                      className="font-bold text-ink text-sm hover:underline flex items-center gap-1.5"
                    >
                      {comp.canonical_name} <ExternalLink className="w-3 h-3 text-ink-muted" />
                    </Link>
                    <span className="text-[11px] font-mono text-ink-muted">{comp.category}</span>
                  </div>
                  <RequirementTypeBadge type={comp.requirement_type} />
                </div>

                <div className="p-3 rounded-xl bg-sand/20 border border-ink/5 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-muted">Expected Proficiency:</span>
                    <strong className="text-ink">{comp.expected_level}</strong>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="font-bold text-ink block text-[11px] uppercase tracking-wider">
                    Evidence Expectation:
                  </span>
                  <p className="text-ink/80 text-[11px] leading-relaxed">
                    {comp.evidence_expectation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA Card */}
      <div className="gl-card p-6 bg-sand/30 border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-ink text-sm">Ready to compare your evidence?</h4>
          <p className="text-xs text-ink-muted">
            Inspect matches, depth gaps, and evidence opportunities against this role model.
          </p>
        </div>
        <button
          onClick={handleSelectAndMatch}
          className="pill-btn pill-btn-primary text-xs py-2.5 px-6 shrink-0"
        >
          Compare My Skills &rarr;
        </button>
      </div>
    </div>
  </div>
);
}
