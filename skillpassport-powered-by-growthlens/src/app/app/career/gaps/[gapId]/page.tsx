"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { generatePersonalizedRoadmap } from "@/lib/evidenceApi";
import {
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import { ConfidenceScoreExplainer } from "@/components/app/ConfidenceRationaleCard";
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
  Briefcase,
  BrainCircuit,
} from "lucide-react";
import SkillProvenanceModal from "@/components/app/SkillProvenanceModal";

export default function WhyThisGapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gapId = params?.gapId as string;

  const { activeRole, activeGaps, evidenceItems, skills, addToast, setActiveDomainId } = useEvidence();
  const [isRemediating, setIsRemediating] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  const handleRemediate = async () => {
    if (!gap) return;
    setIsRemediating(true);
    try {
      const res = await generatePersonalizedRoadmap({
        target_role_id: activeRole?.role_id || gap.role_id,
        skill_gap_id: gap.gap_id,
        skill_id: gap.skill_id,
      });
      if (res?.domain_id) {
        setActiveDomainId(res.domain_id);
      } else if (gap.skill_id) {
        setActiveDomainId(gap.skill_id.startsWith("gap-") ? gap.skill_id : `gap-${gap.skill_id}`);
      }
      addToast(
        "Roadmap Ready",
        `Created personalized learning roadmap for ${gap.canonical_name}.`,
        "success"
      );
      router.push(`/app/learning/roadmaps/${res.path_id}`);
    } catch (err: any) {
      addToast(
        "Remediation Notice",
        err.message || "Failed to generate roadmap. Please try again.",
        "error"
      );
    } finally {
      setIsRemediating(false);
    }
  };

  // Find the gap record
  const gap = useMemo(() => {
    return activeGaps.find((g) => g.gap_id === gapId) || activeGaps[0];
  }, [activeGaps, gapId]);

  // Find corresponding skill from passport
  const skillData = useMemo(() => {
    if (!gap) return null;
    return (
      skills.find((s) => s.id === gap.skill_id) ||
      skills.find((s) => (s.canonicalName || (s as any).name || "").toLowerCase() === gap.canonical_name.toLowerCase()) ||
      skills.find((s) => s.id.toLowerCase().replace(/-/g, "") === gap.skill_id.toLowerCase().replace(/^(skill-)?/, "").replace(/-/g, "")) ||
      null
    );
  }, [skills, gap]);

  // Find linked evidence documents from Domain 1
  const linkedEvidence = useMemo(() => {
    if (!gap) return [];
    return evidenceItems.filter((item) =>
      (gap.relevant_evidence_ids || []).includes(item.id) ||
      item.candidateSkills?.some(
        (s) => s.id === gap.skill_id || s.name.toLowerCase() === gap.canonical_name.toLowerCase()
      )
    );
  }, [gap, evidenceItems]);

  if (!gap) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar title="Skill Gap Not Found" />
        <div className="flex-1 p-12 text-center space-y-4">
          <p className="text-sm text-ink-muted">Gap record not found.</p>
          <Link href="/app/career/gaps" className="pill-btn pill-btn-primary text-xs py-2 px-4">
            Return to Gap Analysis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={`Why This Gap: ${gap.canonical_name}`}
        description={`Role: ${gap.role_title} • Target: ${gap.expected_level} • Current: ${gap.current_supported_level || "None"}`}
        badge={gap.gap_type.replace(/_/g, " ").toUpperCase()}
      >
        <Link
          href="/app/career/gaps"
          className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Gaps
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

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
              Score: {gap.priority_score.toFixed(1)} / 100.0
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
          {/* Authoritative Source & Assurance of Authentication Card */}
          <div className="gl-card p-6 space-y-4 border-indigo-200/80 bg-gradient-to-r from-indigo-50/40 via-white to-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      Source Provenance &amp; Assurance of Authentication
                    </h2>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Authenticity Verified &bull; Anti-Hallucination Guard Active
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsProvenanceOpen(true)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                Audit Full AI &amp; Evidence Provenance
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-ink-muted font-bold block flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-indigo-600" />
                  Requirement Source Standard
                </span>
                <p className="font-semibold text-ink text-xs">
                  {gap.requirement_source || `${gap.role_title} Competency Model`}
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  {gap.provenance || activeRole?.provenance || "GrowthLens Curated Industry Benchmark v2026.1"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-ink/10 space-y-1">
                <span className="text-[10px] uppercase font-mono text-ink-muted font-bold block flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-600" />
                  Demonstrated Evidence Source
                </span>
                <p className="font-semibold text-ink text-xs">
                  {gap.relevant_evidence_ids?.length > 0
                    ? `${gap.relevant_evidence_ids.length} Ingested Repository Artifact(s)`
                    : "Zero Verified Artifacts in Workspace"}
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  {gap.relevant_evidence_ids?.length > 0
                    ? "Evaluated against authentic Git commits, PRs, and work deliverables."
                    : "Identified as genuine Evidence Gap: user has not yet submitted attributable artifacts confirming Level 3+."}
                </p>
              </div>
            </div>
          </div>

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
          {/* Assessment Confidence & Evidence Rationale Card */}
          <div className="gl-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-ink" />
              Confidence & Evidence Rationale
            </h3>
            <ConfidenceScoreExplainer
              score={gap.confidence}
              explanation={gap.confidence_explanation}
              rationale={gap.confidence_rationale}
              skillName={gap.canonical_name}
              defaultExpanded={true}
            />
          </div>

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
              <div>Priority (0–100) = (100 &times; Gap &times; Criticality &times; Urgency) &times; EffortDiscount &times; LeverageBoost</div>
              <div className="text-ink-muted text-[9px]">
                Score = {gap.priority_score.toFixed(1)} / 100.0 &bull; Bounded normalized career impact
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Criticality:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.criticality.toFixed(1)} / 5</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Level Gap:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.level_gap} Step{gap.priority_inputs.level_gap !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Dependency Impact:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.dependency_impact.toFixed(1)} &times;</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Evidence Leverage:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.evidence_leverage.toFixed(1)} &times;</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">User Growth Fit:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.user_fit.toFixed(1)} &times;</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white border border-ink/5">
                <span className="text-ink-muted">Estimated Effort:</span>
                <span className="font-mono font-bold text-ink">{gap.priority_inputs.estimated_effort.toFixed(1)} / 5</span>
              </div>
            </div>
          </div>

          {/* Action Recommendations Card */}
          <div className="gl-card p-6 space-y-3">
            <h3 className="text-sm font-bold text-ink">Recommended Actions</h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={handleRemediate}
                disabled={isRemediating}
                className="w-full pill-btn pill-btn-primary py-2.5 px-3 text-center flex items-center justify-center gap-2 font-bold disabled:opacity-60"
              >
                {isRemediating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                    Generating Roadmap...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Remediate in Learn &amp; Grow &rarr;
                  </>
                )}
              </button>
              <Link
                href="/app/career/priorities"
                className="w-full pill-btn bg-white hover:bg-sand/30 border border-ink/20 py-2 px-3 text-center block text-ink"
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

    {/* Evidence & Provenance Assurance Modal */}
    {gap && (
      <SkillProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        skillId={gap.skill_id}
        skillTitle={gap.canonical_name}
        roleId={gap.role_id}
        gapId={gap.gap_id}
      />
    )}
  </div>
);
}
