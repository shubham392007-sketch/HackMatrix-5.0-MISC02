"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Info,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Compass,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  CalculationExplanationModal,
  RequirementTypeBadge,
  ImportanceBadge,
  MatchStatusBadge,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import { ConfidenceScoreExplainer } from "@/components/app/ConfidenceRationaleCard";

export default function RoleMatchOverviewPage() {
  const { activeRole, activeMatch, activeGaps, activeReadiness } = useEvidence();
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredMatches = activeMatch.competency_matches.filter((m) => {
    if (activeTab === "all") return true;
    if (activeTab === "strong") return m.match_status === "strong_match";
    if (activeTab === "partial") return m.match_status === "partial_match";
    if (activeTab === "evidence_gap") return m.match_status === "evidence_gap";
    if (activeTab === "missing") return m.match_status === "missing_weak";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Your Role Match"
        description="See which requirements your demonstrated capabilities support, where proficiency falls short, and where more evidence is needed."
        badge="Match Calculation"
        badgeColor="border-ink/20 text-ink bg-lime"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector Bar */}
      <TargetRoleSelectorBar />

      {/* Match Overview Summary Card */}
      <div className="gl-card p-6 md:p-8 bg-white space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-ink/10 pb-6">
          {/* Main Score Ring / Big Numbers */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-lime bg-sand/20 flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-ink">{activeMatch.overall_match_score}%</span>
              <span className="text-[9px] font-mono uppercase text-ink-muted -mt-0.5">Match</span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-ink">{activeRole.title}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sand font-bold text-ink">
                  {activeRole.seniority}
                </span>
              </div>
              <p className="text-xs text-ink-muted max-w-lg">
                Calculated against <strong>{activeRole.version}</strong> demand model on{" "}
                {activeMatch.calculated_at}.
              </p>
              <button
                onClick={() => setShowExplanation(true)}
                className="text-xs font-semibold text-ink underline flex items-center gap-1 hover:text-sky-800 pt-1"
              >
                <Info className="w-3.5 h-3.5" /> How is this calculated?
              </button>
            </div>
          </div>

          {/* Sub Coverage Split */}
          <div className="flex items-center gap-4 bg-sand/15 p-4 rounded-2xl border border-ink/10">
            <div className="text-center px-3 border-r border-ink/10">
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Core Requirements
              </span>
              <span className="text-2xl font-black text-red-950">
                {activeMatch.required_coverage_score}%
              </span>
              <span className="text-[10px] text-ink-muted block">Baseline Coverage</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] font-mono uppercase text-ink-muted block">
                Supporting Skills
              </span>
              <span className="text-2xl font-black text-sky-950">
                {activeMatch.supporting_coverage_score}%
              </span>
              <span className="text-[10px] text-ink-muted block">Secondary Strength</span>
            </div>
          </div>
        </div>

        {/* 4 Categorical Metric Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <span className="text-emerald-900 font-mono text-[10px] uppercase block font-bold">
              Strong Verified Matches
            </span>
            <span className="text-xl font-extrabold text-emerald-950">
              {activeMatch.strong_matches_count}
            </span>
            <span className="text-[11px] text-emerald-800 block">Exceeds target depth</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
            <span className="text-amber-900 font-mono text-[10px] uppercase block font-bold">
              Partial Matches (Depth Gap)
            </span>
            <span className="text-xl font-extrabold text-amber-950">
              {activeMatch.partial_matches_count}
            </span>
            <span className="text-[11px] text-amber-800 block">Below expected tier</span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
            <span className="text-purple-900 font-mono text-[10px] uppercase block font-bold">
              Evidence Gaps
            </span>
            <span className="text-xl font-extrabold text-purple-950">
              {activeMatch.evidence_gaps_count}
            </span>
            <span className="text-[11px] text-purple-800 block">Unverified self-claims</span>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 text-xs">
            <span className="text-red-900 font-mono text-[10px] uppercase block font-bold">
              Missing / Weak Skills
            </span>
            <span className="text-xl font-extrabold text-red-950">
              {activeMatch.missing_capability_count}
            </span>
            <span className="text-[11px] text-red-800 block">No evidence found</span>
          </div>
        </div>
      </div>

      {/* Feature 5: Skill Match Breakdown Matrix */}
      <div className="gl-card p-6 md:p-8 bg-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-ink">
              Detailed Competency Match Breakdown
            </h3>
            <p className="text-xs text-ink-muted">
              Inspect the exact proof, proficiency gap, and verification status for every single requirement.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-ink/5 p-1 rounded-full text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                activeTab === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              All ({activeMatch.total_competencies})
            </button>
            <button
              onClick={() => setActiveTab("strong")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                activeTab === "strong" ? "bg-emerald-700 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Strong ({activeMatch.strong_matches_count})
            </button>
            <button
              onClick={() => setActiveTab("partial")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                activeTab === "partial" ? "bg-amber-700 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Partial ({activeMatch.partial_matches_count})
            </button>
            <button
              onClick={() => setActiveTab("evidence_gap")}
              className={`px-2.5 py-0.5 rounded-full font-medium ${
                activeTab === "evidence_gap" ? "bg-purple-700 text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              Evidence Gap ({activeMatch.evidence_gaps_count})
            </button>
          </div>
        </div>

        {/* Detailed Breakdown List */}
        <div className="space-y-3 pt-2">
          {filteredMatches.map((m, idx) => (
            <div
              key={`${m.skill_id}-${m.requirement_type || ''}-${idx}`}
              className="p-4 rounded-2xl border border-ink/15 bg-white hover:bg-sand/10 transition-all space-y-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/passport/skills/${m.skill_id}`}
                    className="font-bold text-sm text-ink hover:underline flex items-center gap-1.5"
                  >
                    {m.canonical_name} <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                  </Link>
                  <RequirementTypeBadge type={m.requirement_type} />
                  <ImportanceBadge importance={m.importance} />
                </div>
                <MatchStatusBadge status={m.match_status} />
              </div>

              {/* Grid Metrics for this row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-sand/15 p-3 rounded-xl text-[11px] font-mono">
                <div>
                  <span className="text-ink-muted block text-[10px] uppercase">Expected Target</span>
                  <strong className="text-ink text-xs">{m.expected_level}</strong>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px] uppercase">Current Supported</span>
                  <strong className={m.current_proficiency === "Not Established" ? "text-red-700" : "text-ink"}>
                    {m.current_proficiency}
                  </strong>{" "}
                  <span className="text-[10px] text-ink-muted">({m.verification_status})</span>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px] uppercase">Effective Coverage</span>
                  <strong className="text-ink text-xs">
                    {Math.round(m.effective_coverage * 100)}%
                  </strong>
                </div>
                <div>
                  <span className="text-ink-muted block text-[10px] uppercase">Supporting Evidence</span>
                  <span className="text-ink">
                    {m.evidence_ids.length > 0 ? (
                      <span className="font-bold text-emerald-800">
                        {m.evidence_ids.length} Artifacts
                      </span>
                    ) : (
                      <span className="text-red-700">0 Artifacts</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Confidence Score & Grounded Rationale */}
              <ConfidenceScoreExplainer
                score={m.confidence}
                explanation={m.confidence_explanation}
                rationale={m.confidence_rationale}
                skillName={m.canonical_name}
              />

              {/* Diagnosis and Actionable Links */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                <p className="text-ink/80 text-[11px] leading-relaxed">
                  <strong>Diagnosis:</strong> {m.gap_explanation}
                </p>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  {m.evidence_ids.length > 0 && (
                    <Link
                      href={`/app/evidence/library/${m.evidence_ids[0]}`}
                      className="text-ink font-semibold underline flex items-center gap-1 hover:text-sky-800"
                    >
                      Inspect Evidence ({m.evidence_ids[0]}) &rarr;
                    </Link>
                  )}
                  {m.gap_type && (
                    <Link
                      href={`/app/career/gaps/gap-${m.skill_id}`}
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink text-ink text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      Why This Gap? &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA to Gap Analysis */}
        <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            All capability values trace to your immutable SkillPassport profile.
          </span>
          <Link
            href="/app/career/gaps"
            className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
          >
            Investigate All Gaps in Gap Analysis &rarr;
          </Link>
        </div>
      </div>

      <CalculationExplanationModal
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
      />
    </div>
  </div>
);
}
