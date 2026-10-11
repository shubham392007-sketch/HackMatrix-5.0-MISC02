"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import {
  ArrowLeft,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  Sparkles,
  Layers,
  Clock,
  Target,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  FolderGit2,
  Info,
  Scale,
} from "lucide-react";

export default function WhyThisGapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gapId = params?.gapId as string;

  const { activeRole, activeGaps, evidenceItems, skills } = useEvidence();

  // Find the gap record
  const gap = useMemo(() => {
    return activeGaps.find((g) => g.gap_id === gapId) || activeGaps[0];
  }, [activeGaps, gapId]);

  // Find corresponding skill from passport
  const skillData = useMemo(() => {
    if (!gap) return null;
    return skills.find((s) => s.id === gap.skill_id);
  }, [skills, gap]);

  // Find linked evidence documents from Domain 1
  const linkedEvidence = useMemo(() => {
    if (!gap) return [];
    return evidenceItems.filter((item) =>
      gap.relevant_evidence_ids.includes(item.id) ||
      item.candidateSkills?.some(
        (s) => s.id === gap.skill_id || s.name.toLowerCase() === gap.canonical_name.toLowerCase()
      )
    );
  }, [gap, evidenceItems]);

  if (!gap) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-ink-muted">Gap record not found.</p>
        <Link href="/app/career/gaps" className="pill-btn pill-btn-primary text-xs py-2 px-4">
          Return to Gap Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Link
            href="/app/career/gaps"
            className="hover:text-ink flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Gaps List
          </Link>
          <span>/</span>
          <span className="text-ink font-semibold">{gap.canonical_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
            Feature 7: Why This Gap?
          </span>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
            DEMO DATA
          </span>
        </div>
      </div>

      {/* Main Gap Title Header */}
      <div className="gl-card p-6 md:p-8 space-y-4 border-ink/15">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <GapTypeBadge type={gap.gap_type} />
              <RequirementTypeBadge type={gap.requirement_type} />
              <ImportanceBadge importance={gap.importance} />
              <span className="text-xs font-mono text-ink-muted">
                Role: <strong>{gap.role_title}</strong>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-ink">
              Why This Gap: {gap.canonical_name}
            </h1>
            <p className="text-xs md:text-sm text-ink-muted max-w-2xl">
              Detailed diagnosis explaining the variance between the role's demand benchmark and your current evidence-backed capability.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sand/30 border border-ink/10 text-center shrink-0 min-w-[160px]">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Prioritization Rank
            </span>
            <div className="text-3xl font-black text-ink mt-0.5">
              #{gap.priority_rank}
            </div>
            <span className="text-[11px] font-mono text-ink-muted block mt-1">
              Score: {gap.priority_score.toFixed(1)} / 50.0
            </span>
          </div>
        </div>

        {/* Level Comparison Meter */}
        <div className="pt-4 border-t border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-ink/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted font-medium">Your Demonstrated Capability</span>
              <span className="font-bold text-ink">{gap.current_supported_level}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Verification Status:</span>
              <strong className="text-ink">{gap.verification_status}</strong>
              <span>&bull;</span>
              <span>Evidence:</span>
              <strong className="text-ink">{gap.evidence_status}</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-ink/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted font-medium">Target Role Requirement</span>
              <span className="font-bold text-ink">{gap.expected_level}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Classification:</span>
              <strong className="text-ink capitalize">{gap.requirement_type.replace("_", " ")}</strong>
              <span>&bull;</span>
              <span>Distance:</span>
              <strong className="text-amber-800">
                {gap.proficiency_distance > 0
                  ? `-${gap.proficiency_distance} Level Steps`
                  : "Level Met (Verification Shortfall)"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Forensic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Diagnosis, Traceability, Leverage */}
        <div className="lg:col-span-2 space-y-6">
          {/* Forensic Diagnosis Card */}
          <div className="gl-card p-6 space-y-4">
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              <Target className="w-4 h-4 text-ink" />
              Forensic Diagnosis
            </h2>
            <p className="text-xs md:text-sm text-ink/80 leading-relaxed bg-sand/15 p-4 rounded-2xl border border-ink/10">
              {gap.diagnosis}
            </p>

            <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ink" />
                Strategic Why: Why Was This Prioritized?
              </span>
              <p className="text-xs text-ink-muted leading-relaxed">
                {gap.why_prioritized}
              </p>
            </div>
          </div>

          {/* Project Leverage Section */}
          {gap.project_leverage_example && (
            <div className="gl-card p-6 space-y-4 border-lime-300 bg-lime/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lime border border-ink/20 flex items-center justify-center">
                  <FolderGit2 className="w-4 h-4 text-ink" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-muted block">
                    Fastest Closing Path
                  </span>
                  <h3 className="text-sm font-bold text-ink">
                    Existing Project Leverage Recommendation
                  </h3>
                </div>
              </div>

              <p className="text-xs text-ink/80 leading-relaxed">
                You do not need to start an arbitrary tutorial project from scratch. You can build verifiable proof by expanding your existing work in:
              </p>

              <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
                <div className="font-mono font-bold text-ink">
                  Project: {gap.project_leverage_example.project_name}
                </div>
                <div className="text-ink-muted">
                  <strong>Current Contribution:</strong> {gap.project_leverage_example.current_contribution}
                </div>
                <div className="text-ink font-medium bg-sand/30 p-2.5 rounded-xl border border-ink/5">
                  <strong>Recommended Expansion:</strong> {gap.project_leverage_example.extension_idea}
                </div>
              </div>
            </div>
          )}

          {/* Linked Evidence from Domain 1 */}
          <div className="gl-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink" />
                Traceable Evidence Records (Domain 1 Artifacts)
              </h2>
              <span className="text-xs font-mono text-ink-muted">
                {linkedEvidence.length} Found
              </span>
            </div>

            {linkedEvidence.length === 0 ? (
              <div className="p-6 rounded-2xl bg-sand/20 border border-dashed border-ink/20 text-center space-y-2">
                <HelpCircle className="w-6 h-6 text-ink-muted mx-auto" />
                <p className="text-xs text-ink font-semibold">
                  Zero Ingested Artifacts for This Competency
                </p>
                <p className="text-[11px] text-ink-muted max-w-sm mx-auto">
                  No GitHub PRs, commits, Jira tickets, or documents have been ingested and verified for "{gap.canonical_name}".
                </p>
                <Link
                  href="/app/sources"
                  className="pill-btn pill-btn-primary text-xs py-1.5 px-3 inline-block mt-1"
                >
                  Connect Data Source & Ingest
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedEvidence.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-white border border-ink/10 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-sand/40 text-ink">
                          {doc.sourceType}
                        </span>
                        <span className="font-bold text-ink">{doc.title}</span>
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-1">
                        {doc.description || "Ingested work artifact supporting skill extraction."}
                      </p>
                      <span className="text-[10px] font-mono text-ink-muted">
                        Artifact ID: {doc.id} &bull; Processed: {doc.date}
                      </span>
                    </div>

                    <Link
                      href="/app/evidence"
                      className="pill-btn bg-sand/20 hover:bg-sand/40 text-ink text-[11px] py-1 px-2.5 shrink-0"
                    >
                      Inspect in Evidence Center
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Priority Variable Breakdown & Next Actions */}
        <div className="space-y-6">
          {/* Priority Formula Explainer Card */}
          <div className="gl-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-ink" />
              Prioritization Formula Factors
            </h3>

            <p className="text-[11px] text-ink-muted">
              Score derived from the deterministic GrowthLens weighting function:
            </p>

            <div className="p-3 rounded-xl bg-sand/20 border border-ink/10 text-[10px] font-mono space-y-1">
              <div>Priority = (C &times; &Delta;L &times; D &times; E &times; F &times; G) / Effort</div>
              <div className="text-ink-muted text-[9px]">
                Score = ({gap.priority_inputs.criticality} &times; {gap.priority_inputs.level_gap} &times; {gap.priority_inputs.dependency_impact} &times; {gap.priority_inputs.evidence_leverage} &times; {gap.priority_inputs.user_fit} &times; {gap.priority_inputs.marginal_gain}) / {gap.priority_inputs.estimated_effort} = <strong>{gap.priority_score.toFixed(1)}</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Criticality (C):</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.criticality} / 5</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Level Gap (&Delta;L):</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.level_gap} Steps</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Dependency Impact (D):</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.dependency_impact} / 3</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Evidence Leverage (E):</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.evidence_leverage} / 3</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">User Growth Fit (F):</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.user_fit} / 3</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Estimated Effort:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.estimated_effort} / 5</span>
              </div>
            </div>
          </div>

          {/* Action Recommendations Card */}
          <div className="gl-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-ink">Recommended Actions</h3>

            <div className="space-y-2 text-xs">
              <Link
                href="/app/career/priorities"
                className="w-full pill-btn pill-btn-primary py-2 px-3 text-center block"
              >
                View in Ranked Priority List
              </Link>
              <Link
                href="/app/career/match"
                className="w-full pill-btn bg-white hover:bg-sand/30 border border-ink/20 py-2 px-3 text-center block text-ink"
              >
                Inspect Full Role Match Matrix
              </Link>
              <Link
                href="/app/passport"
                className="w-full pill-btn bg-sand/20 hover:bg-sand/40 py-2 px-3 text-center block text-ink-muted"
              >
                Check Skill Passport State
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
