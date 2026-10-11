"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  evaluateRoleMatch,
  extractGapRecords,
  evaluateCareerReadiness,
} from "@/lib/careerCalculations";
import {
  TargetRoleSelectorBar,
  MatchStatusBadge,
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function RoleExplanationExplorerPage() {
  const { targetRoles, activeRole, selectedRoleId, setSelectedRoleId, skills, evidenceItems } =
    useEvidence();

  const [selectedSkillId, setSelectedSkillId] = useState<string>(
    activeRole.competencies[0]?.skill_id || "skill-python"
  );
  const [activeTab, setActiveTab] = useState<
    "match" | "verification" | "gap" | "priority"
  >("match");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Compute evaluations for current active role
  const matchResult = useMemo(() => {
    return evaluateRoleMatch(activeRole, skills);
  }, [activeRole, skills]);

  const gapRecords = useMemo(() => {
    return extractGapRecords(matchResult, activeRole);
  }, [activeRole, matchResult]);

  // Selected competency definition
  const roleComp = useMemo(() => {
    return (
      activeRole.competencies.find((c) => c.skill_id === selectedSkillId) ||
      activeRole.competencies[0]
    );
  }, [activeRole, selectedSkillId]);

  // Selected competency match
  const compMatch = useMemo(() => {
    return (
      matchResult.competency_matches.find(
        (m) => m.skill_id === selectedSkillId
      ) || matchResult.competency_matches[0]
    );
  }, [matchResult, selectedSkillId]);

  // Selected competency gap record
  const compGap = useMemo(() => {
    return gapRecords.find((g) => g.skill_id === selectedSkillId);
  }, [gapRecords, selectedSkillId]);

  // Linked evidence artifacts
  const linkedEvidence = useMemo(() => {
    return evidenceItems.filter(
      (item) =>
        item.candidateSkills?.some(
          (s) => s.id === selectedSkillId || s.name.toLowerCase() === roleComp?.canonical_name.toLowerCase()
        ) ||
        compMatch?.evidence_ids.includes(item.id)
    );
  }, [evidenceItems, selectedSkillId, compMatch, roleComp]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Role Explanation Explorer"
        description="Audit the exact mathematical and evidence provenance behind any evaluation. Understand why you match, why you only partially match, or why a gap was flagged."
        badge="Explainability Explorer"
        badgeColor="border-ink/20 text-ink bg-sand/60"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Formula Reference
        </button>
        <Link
          href="/app/career/match"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          Role Match Matrix →
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector */}
      <TargetRoleSelectorBar />

      {/* Competency Picker Bar */}
      <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">
            Select Competency to Inspect:
          </span>
          <span className="text-ink-muted text-[11px]">
            {activeRole.competencies.length} Competencies in {activeRole.title}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {activeRole.competencies.map((comp) => {
            const isSelected = comp.skill_id === selectedSkillId;
            return (
              <button
                key={comp.skill_id}
                onClick={() => setSelectedSkillId(comp.skill_id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-ink text-white shadow-sm"
                    : "bg-sand/20 text-ink hover:bg-sand/40 border border-ink/10"
                }`}
              >
                <span>{comp.canonical_name}</span>
                <span className="text-[10px] opacity-70">
                  ({comp.expected_level})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Competency State Card */}
      {roleComp && compMatch && (
        <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <RequirementTypeBadge type={roleComp.requirement_type} />
                <ImportanceBadge importance={roleComp.importance} />
                <MatchStatusBadge status={compMatch.match_status} />
                {compMatch.gap_type && (
                  <GapTypeBadge type={compMatch.gap_type} />
                )}
              </div>

              <h2 className="text-2xl font-bold text-ink">
                {roleComp.canonical_name}
              </h2>
              <p className="text-xs text-ink-muted">
                Benchmark Expectation: {roleComp.evidence_expectation}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 text-center shrink-0 min-w-[150px]">
              <span className="text-[10px] font-mono text-ink-muted uppercase block">
                Effective Coverage
              </span>
              <span className="text-2xl font-black text-ink">
                {Math.round(compMatch.effective_coverage * 100)}%
              </span>
              <span className="text-[10px] font-mono text-ink-muted block mt-0.5">
                Raw: {Math.round(compMatch.raw_coverage * 100)}%
              </span>
            </div>
          </div>

          {/* Explanation 4 Tab Bar */}
          <div className="flex items-center gap-2 border-b border-ink/10 pb-2 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveTab("match")}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === "match"
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              1. Why This Match Status?
            </button>
            <button
              onClick={() => setActiveTab("verification")}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === "verification"
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              2. Verification Discounting
            </button>
            <button
              onClick={() => setActiveTab("gap")}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === "gap"
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              3. Gap Classification Diagnosis
            </button>
            <button
              onClick={() => setActiveTab("priority")}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === "priority"
                  ? "bg-ink text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              4. Prioritization Rationale
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="space-y-4">
            {activeTab === "match" && (
              <div className="space-y-4 text-xs animate-fade-in">
                <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-2">
                  <span className="font-bold text-ink block text-sm">
                    Match Status: {compMatch.match_status.replace("_", " ").toUpperCase()}
                  </span>
                  <p className="text-ink/80 leading-relaxed">
                    {compMatch.gap_explanation}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-ink/10 space-y-2">
                    <span className="font-semibold text-ink block">
                      Target Role Expectation
                    </span>
                    <div className="space-y-1 text-ink-muted">
                      <div>Expected Maturity: <strong>{compMatch.expected_level}</strong> (Numeric: {compMatch.expected_level_numeric}/5)</div>
                      <div>Requirement Type: <strong>{compMatch.requirement_type}</strong></div>
                      <div>Importance Weight: <strong>{compMatch.importance}</strong></div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-ink/10 space-y-2">
                    <span className="font-semibold text-ink block">
                      Your Demonstrated Capability
                    </span>
                    <div className="space-y-1 text-ink-muted">
                      <div>Current Maturity: <strong>{compMatch.current_proficiency}</strong> (Numeric: {compMatch.current_proficiency_numeric}/5)</div>
                      <div>Verification State: <strong>{compMatch.verification_status}</strong></div>
                      <div>Confidence Score: <strong>{(compMatch.confidence * 100).toFixed(0)}%</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "verification" && (
              <div className="space-y-4 text-xs animate-fade-in">
                <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-2">
                  <span className="font-bold text-ink block text-sm">
                    Verification Discount Factor Applied
                  </span>
                  <p className="text-ink/80 leading-relaxed">
                    Current verification status is <strong>{compMatch.verification_status}</strong>.
                    GrowthLens enforces a strict verification hierarchy to prevent unsupported claims or LLM hallucinations from being credited as verified capability:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-xl border text-center ${compMatch.verification_status === "verified" ? "bg-emerald-100 border-emerald-300 font-bold" : "bg-white border-ink/10 opacity-70"}`}>
                    <span className="text-[10px] uppercase block">Verified</span>
                    <span className="text-sm font-mono block">1.00 (100%)</span>
                    <span className="text-[9px] text-ink-muted block mt-1">Peer & Code Proof</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${compMatch.verification_status === "candidate" ? "bg-amber-100 border-amber-300 font-bold" : "bg-white border-ink/10 opacity-70"}`}>
                    <span className="text-[10px] uppercase block">Candidate</span>
                    <span className="text-sm font-mono block">0.55 (55%)</span>
                    <span className="text-[9px] text-ink-muted block mt-1">Pending Human Review</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${compMatch.verification_status === "insufficient_evidence" ? "bg-purple-100 border-purple-300 font-bold" : "bg-white border-ink/10 opacity-70"}`}>
                    <span className="text-[10px] uppercase block">Insufficient</span>
                    <span className="text-sm font-mono block">0.20 (20%)</span>
                    <span className="text-[9px] text-ink-muted block mt-1">Claim Lacks Artifacts</span>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${compMatch.verification_status === "conflicting" ? "bg-orange-100 border-orange-300 font-bold" : "bg-white border-ink/10 opacity-70"}`}>
                    <span className="text-[10px] uppercase block">Conflicting</span>
                    <span className="text-sm font-mono block">0.35 (35%)</span>
                    <span className="text-[9px] text-ink-muted block mt-1">Disputed Signals</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "gap" && (
              <div className="space-y-4 text-xs animate-fade-in">
                {compGap ? (
                  <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <GapTypeBadge type={compGap.gap_type} />
                      <span className="font-bold text-ink text-sm">
                        Why Classified As {compGap.gap_type.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-ink/80 leading-relaxed">
                      {compGap.diagnosis}
                    </p>
                    <div className="p-3 rounded-xl bg-white border border-ink/5 space-y-1">
                      <span className="font-semibold text-ink">Actionable Direction:</span>
                      <p className="text-ink-muted">{compGap.next_step_direction}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
                    <span className="font-bold text-emerald-950 block">
                      No Gap Flagged for This Requirement
                    </span>
                    <p className="text-ink-muted text-[11px] max-w-md mx-auto">
                      Your demonstrated capability satisfies or exceeds the expected proficiency level for {roleComp.canonical_name}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "priority" && (
              <div className="space-y-4 text-xs animate-fade-in">
                {compGap ? (
                  <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink text-sm">
                        Prioritization Factor Matrix
                      </span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-lime text-ink">
                        Rank #{compGap.priority_rank} (Score: {compGap.priority_score.toFixed(1)})
                      </span>
                    </div>
                    <p className="text-ink/80 leading-relaxed">
                      {compGap.why_prioritized}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                      <div className="p-2.5 rounded bg-white border border-ink/5">
                        <span className="text-[10px] text-ink-muted block">Criticality:</span>
                        <strong className="font-mono text-ink">{compGap.priority_inputs.criticality} / 5</strong>
                      </div>
                      <div className="p-2.5 rounded bg-white border border-ink/5">
                        <span className="text-[10px] text-ink-muted block">Level Gap:</span>
                        <strong className="font-mono text-ink">{compGap.priority_inputs.level_gap} Steps</strong>
                      </div>
                      <div className="p-2.5 rounded bg-white border border-ink/5">
                        <span className="text-[10px] text-ink-muted block">Evidence Leverage:</span>
                        <strong className="font-mono text-ink">{compGap.priority_inputs.evidence_leverage} / 3</strong>
                      </div>
                      <div className="p-2.5 rounded bg-white border border-ink/5">
                        <span className="text-[10px] text-ink-muted block">Effort:</span>
                        <strong className="font-mono text-ink">{compGap.priority_inputs.estimated_effort} / 5</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-sand/20 border border-ink/10 text-center">
                    <span className="text-ink-muted">
                      This competency is fully satisfied and does not require prioritization.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Traceable Domain 1 Evidence Artifacts Section */}
          <div className="pt-6 border-t border-ink/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-ink" />
                Supporting Ingested Evidence Artifacts
              </h3>
              <span className="text-xs font-mono text-ink-muted">
                {linkedEvidence.length} Traceable Records
              </span>
            </div>

            {linkedEvidence.length === 0 ? (
              <div className="p-4 rounded-xl bg-sand/15 border border-dashed border-ink/20 text-center text-xs text-ink-muted">
                No direct evidence artifacts mapped to this skill yet.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedEvidence.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-sand/20 border border-ink/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-white text-ink border border-ink/10 uppercase">
                          {doc.sourceType}
                        </span>
                        <span className="font-bold text-ink">{doc.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted">
                        Artifact ID: {doc.id} &bull; Processed: {doc.date}
                      </span>
                    </div>

                    <Link
                      href="/app/evidence"
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-[11px] py-1 px-3"
                    >
                      Inspect Artifact
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explanation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
    </div>
  </div>
);
}
