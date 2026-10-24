"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  GapExplanationTypeBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
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
  Cpu,
  Upload,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { GapExplanation, GapExplanationsResponse, RoleDemandModel } from "@/types/career";
import { getGapExplanations } from "@/lib/careerApi";
import { evaluateRoleMatch, extractGapRecords } from "@/lib/careerCalculations";

// Multi-key explanation matcher supporting UUIDs, canonical slugs, and names
function findExplanationForGap(
  exps: Record<string, GapExplanation> | null | undefined,
  targetGap: any
): GapExplanation | null {
  if (!exps || !targetGap) return null;

  const targetSkillId = (targetGap.skill_id || "").toLowerCase().trim();
  const targetGapId = (targetGap.gap_id || "").toLowerCase().trim();
  const targetName = (targetGap.canonical_name || "").toLowerCase().trim();
  const targetSlug = targetName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const targetSkillSlug = `skill-${targetSlug}`;
  const cleanSkillId = targetSkillId.replace(/^skill-/, "");
  const canonicalSkillId = ((targetGap.canonical_skill_id || "") as string).toLowerCase().trim();

  return (
    exps[targetGap.gap_id] ||
    exps[targetGap.skill_id] ||
    exps[targetSkillId] ||
    exps[cleanSkillId] ||
    exps[targetName] ||
    exps[targetSlug] ||
    exps[targetSkillSlug] ||
    (canonicalSkillId ? (exps[canonicalSkillId] || exps[`gap-${canonicalSkillId}`]) : null) ||
    Object.values(exps).find(
      (e) =>
        e.skill_id?.toLowerCase() === targetSkillId ||
        e.skill_id?.toLowerCase() === cleanSkillId ||
        e.requirement_id?.toLowerCase() === targetGapId ||
        (canonicalSkillId && e.skill_id?.toLowerCase() === canonicalSkillId) ||
        (e.required_capability && e.required_capability.toLowerCase().includes(targetName)) ||
        (e.summary && e.summary.toLowerCase().includes(targetName))
    ) ||
    null
  );
}

export default function WhyThisGapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gapId = params?.gapId as string;

  const {
    activeRole,
    activeGaps,
    evidenceItems,
    skills,
    savedTargetRoles,
    customRoles,
    catalogueRoles,
    targetRoles,
    setSelectedRoleId,
  } = useEvidence();

  // Find the gap record with flexible multi-id and cross-role resolution
  const gap = useMemo(() => {
    if (!gapId) return activeGaps[0] || null;
    const cleanId = gapId.replace(/^gap-/, "").toLowerCase().trim();

    // 1. Check in active role's activeGaps
    const inActive =
      activeGaps.find((g) => g.gap_id === gapId) ||
      activeGaps.find((g) => g.gap_id.toLowerCase().endsWith(cleanId)) ||
      activeGaps.find((g) => g.skill_id.toLowerCase() === cleanId || g.skill_id === gapId) ||
      activeGaps.find((g) => g.skill_id.toLowerCase().replace(/^skill-/, "") === cleanId) ||
      activeGaps.find((g) => (g.canonical_skill_id || "").toLowerCase() === cleanId) ||
      activeGaps.find((g) => g.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanId);

    if (inActive) return inActive;

    // 2. Cross-role lookup: search across all known roles
    const allKnownRoles = [
      activeRole,
      ...(savedTargetRoles || []),
      ...(customRoles || []),
      ...(catalogueRoles || []),
      ...(targetRoles || []),
    ].filter(Boolean) as RoleDemandModel[];

    for (const r of allKnownRoles) {
      const hasMatch = r.competencies?.some((c: any) => {
        const cSkillId = (c.skill_id || "").toLowerCase();
        const cCanonId = (c.canonical_skill_id || "").toLowerCase();
        const cName = (c.canonical_name || "").toLowerCase();
        const cSlug = cName.replace(/[^a-z0-9]+/g, "-");
        return (
          cSkillId === cleanId ||
          cSkillId.replace(/^skill-/, "") === cleanId ||
          cCanonId === cleanId ||
          cSlug === cleanId ||
          cName.includes(cleanId)
        );
      });

      if (hasMatch) {
        try {
          const matchResult = evaluateRoleMatch(r, skills);
          const computedGaps = extractGapRecords(matchResult, r);
          const foundGap =
            computedGaps.find((g) => g.gap_id === gapId) ||
            computedGaps.find((g) => g.gap_id.toLowerCase().endsWith(cleanId)) ||
            computedGaps.find((g) => g.skill_id.toLowerCase() === cleanId || g.skill_id === gapId) ||
            computedGaps.find((g) => g.skill_id.toLowerCase().replace(/^skill-/, "") === cleanId) ||
            computedGaps.find((g) => (g.canonical_skill_id || "").toLowerCase() === cleanId) ||
            computedGaps.find((g) => g.canonical_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === cleanId);

          if (foundGap) return foundGap;
        } catch (e) {
          console.warn("Failed to compute gaps for role:", r.role_id, e);
        }
      }
    }

    return activeGaps[0] || null;
  }, [activeGaps, gapId, activeRole, savedTargetRoles, customRoles, catalogueRoles, targetRoles, skills]);

  // Synchronize selected role if gap belongs to another role
  useEffect(() => {
    if (gap?.role_id && activeRole?.role_id !== gap.role_id && setSelectedRoleId) {
      setSelectedRoleId(gap.role_id);
    }
  }, [gap?.role_id, activeRole?.role_id, setSelectedRoleId]);

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

  // Ollama Evidence-Based Explanation State
  const [allExplanations, setAllExplanations] = useState<Record<string, GapExplanation>>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState<boolean>(false);
  const [explanationMeta, setExplanationMeta] = useState<{
    fromCache: boolean;
    modelUsed: string;
    analysisVersion: string;
  } | null>(null);

  const fetchExplanations = (forceRefresh: boolean = false) => {
    if (!gap?.role_id) return;
    setIsLoadingExplanation(true);

    getGapExplanations(gap.role_id, forceRefresh)
      .then((res: GapExplanationsResponse) => {
        if (res && res.explanations) {
          setAllExplanations(res.explanations);
          setExplanationMeta({
            fromCache: res.from_cache,
            modelUsed: res.model_used,
            analysisVersion: res.analysis_version,
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch detailed gap explanation:", err);
      })
      .finally(() => {
        setIsLoadingExplanation(false);
      });
  };

  useEffect(() => {
    fetchExplanations(false);
  }, [gap?.role_id]);

  // Resolve matching backend explanation or synthesize high-integrity evidence explanation
  const resolvedExplanation = useMemo<GapExplanation>(() => {
    const backendExp = findExplanationForGap(allExplanations, gap);
    if (backendExp) return backendExp;

    if (!gap) {
      return {
        skill_id: "",
        requirement_id: "",
        gap_type: "insufficient_data",
        summary: "Gap details unavailable.",
        required_capability: "Target competency requirement.",
        demonstrated_capabilities: [],
        specific_shortfall: "No data available.",
        evidence_limitations: "No evidence recorded.",
        supporting_evidence_ids: [],
        contradicting_evidence_ids: [],
        reasoning_confidence: 0.5,
        recommended_next_actions: [],
        insufficient_information: true,
        analysis_version: "v2026.1",
        evaluated_at: new Date().toISOString(),
        is_cached: false,
      };
    }

    // High-integrity deterministic evidence synthesis
    const dist = Math.max(0, gap.proficiency_distance ?? 1);
    const evidenceIds = (gap.relevant_evidence_ids || []).concat(linkedEvidence.map((e) => e.id));
    const uniqueEvIds = Array.from(new Set(evidenceIds));

    let gapType: GapExplanation["gap_type"] = "genuine_proficiency_gap";
    if (gap.verification_status === "conflicting") {
      gapType = "conflicting_evidence";
    } else if (gap.current_supported_level === "Not Established" || (!uniqueEvIds.length && !linkedEvidence.length)) {
      gapType = "insufficient_data";
    } else if (dist === 0 && gap.verification_status !== "verified") {
      gapType = "verification_gap";
    } else if (gap.verification_status !== "verified" && uniqueEvIds.length < 2) {
      gapType = "evidence_gap";
    }

    const demonstrated = linkedEvidence.length > 0
      ? linkedEvidence.map((e) => `${e.sourceType}: ${e.title} (${(e as any).demonstratedLevel || gap.current_supported_level || "Working"})`)
      : gap.current_supported_level && gap.current_supported_level !== "Not Established"
      ? [`Demonstrated at ${gap.current_supported_level} proficiency in current Skill Passport profile.`]
      : [];

    let shortfall = `Demonstrated at ${gap.current_supported_level || "Foundation"}; target role requires ${gap.expected_level} (-${dist} level step shortfall).`;
    if (gapType === "insufficient_data") {
      shortfall = `Zero attributable work artifacts currently recorded in Skill Passport for ${gap.canonical_name}.`;
    } else if (gapType === "verification_gap") {
      shortfall = `Demonstrated capability at ${gap.current_supported_level} satisfies target level, but remains in unverified ${gap.verification_status} status.`;
    }

    return {
      skill_id: gap.skill_id,
      requirement_id: gap.gap_id,
      gap_type: gapType,
      summary: gap.diagnosis || `${gap.canonical_name} assessed at ${gap.current_supported_level || "Not Established"}; target requires ${gap.expected_level}.`,
      required_capability: `${gap.expected_level}-level ${gap.canonical_name}: production architecture, automated testing, and hardened implementation.`,
      demonstrated_capabilities: demonstrated,
      specific_shortfall: shortfall,
      evidence_limitations: uniqueEvIds.length > 0
        ? `Evidence basis: ${uniqueEvIds.length} artifact(s) linked; verification status: ${gap.verification_status}.`
        : "No GitHub repositories, pull requests, commits, or documents found for this competency in the evidence repository.",
      supporting_evidence_ids: uniqueEvIds,
      contradicting_evidence_ids: [],
      reasoning_confidence: 0.90,
      recommended_next_actions: [
        gap.next_step_direction || `Produce attributable evidence demonstrating ${gap.canonical_name} at ${gap.expected_level} level.`,
        "Upload and link code repositories or project documentation in the Evidence Workspace.",
      ],
      insufficient_information: gapType === "insufficient_data",
      analysis_version: "v2026.1",
      evaluated_at: new Date().toISOString(),
      is_cached: false,
    };
  }, [allExplanations, gap, linkedEvidence]);

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
        badge={resolvedExplanation.gap_type.replace(/_/g, " ").toUpperCase()}
      >
        <button
          onClick={() => fetchExplanations(true)}
          disabled={isLoadingExplanation}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5 disabled:opacity-50"
          title="Re-run Ollama evidence analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingExplanation ? "animate-spin text-amber-600" : ""}`} />
          {isLoadingExplanation ? "Analyzing..." : "Re-Analyze Gap"}
        </button>
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
              <GapExplanationTypeBadge type={resolvedExplanation.gap_type} />
              <span className="text-xs font-mono text-ink-muted">
                Role: <strong>{gap.role_title}</strong>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-ink">
              Why This Gap: {gap.canonical_name}
            </h1>
            <p className="text-xs md:text-sm text-ink-muted max-w-2xl">
              Forensic evidence diagnosis explaining exactly why this requirement did not achieve 100% proficiency coverage.
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
          {/* Evidence-Based "Why" Forensic Diagnosis Card */}
          <div className="gl-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Target className="w-4 h-4 text-ink" />
                Evidence-Based "Why" Analysis
              </h2>
              <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-amber-700" />
                {explanationMeta?.modelUsed || "Ollama qwen3:8b"} • {Math.round(resolvedExplanation.reasoning_confidence * 100)}% Confidence
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Summary Box */}
              <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-300/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-900 block">
                    Authoritative Evaluation Summary
                  </span>
                  <GapExplanationTypeBadge type={resolvedExplanation.gap_type} />
                </div>
                <p className="text-sm font-semibold text-ink leading-relaxed">
                  {resolvedExplanation.summary}
                </p>
                <p className="text-[11px] text-ink-muted pt-1">
                  <strong>Expected Capability:</strong> {resolvedExplanation.required_capability}
                </p>
              </div>

              {/* 2. What Your Evidence Actually Demonstrates */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  What Your Evidence Actually Demonstrates
                </span>
                {resolvedExplanation.demonstrated_capabilities.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900">
                    {resolvedExplanation.demonstrated_capabilities.map((cap, idx) => (
                      <li key={idx} className="leading-relaxed">{cap}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-800/80 italic">
                    Zero attributable work samples recorded in Skill Passport for this competency.
                  </p>
                )}
              </div>

              {/* 3. What Specifically Prevents 100% Satisfaction */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  What Specifically Prevents 100% Requirement Satisfaction
                </span>
                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                  {resolvedExplanation.specific_shortfall}
                </p>
                {resolvedExplanation.evidence_limitations && (
                  <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-900/90 leading-relaxed">
                    <strong>Evidence Limitations:</strong> {resolvedExplanation.evidence_limitations}
                  </div>
                )}
              </div>

              {/* 4. Actionable Steps to Resolve This Specific Gap */}
              <div className="p-4 rounded-2xl bg-sand/30 border border-ink/10 space-y-2.5">
                <span className="font-bold text-ink text-xs flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-ink" />
                  Actionable Next Steps to Resolve This Gap
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-ink/80">
                  {resolvedExplanation.recommended_next_actions.map((act, idx) => (
                    <li key={idx} className="leading-relaxed">{act}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Link
                    href="/app/sources"
                    className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Verifiable Proof
                  </Link>
                  <Link
                    href="/app/learn-and-grow"
                    className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 flex items-center gap-1.5 text-ink"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Open Learning Roadmap
                  </Link>
                </div>
              </div>
            </div>

            {/* Strategic Prioritization Why */}
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
  </div>
);
}
