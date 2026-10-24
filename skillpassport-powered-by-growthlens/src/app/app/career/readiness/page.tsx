"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import RadialReadinessDial from "@/components/career/RadialReadinessDial";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Info,
  Scale,
  ArrowRight,
  FileText,
  Target,
  Award,
} from "lucide-react";

export default function CareerReadinessPage() {
  const { activeRole, activeReadiness, activeMatch, activeGaps } = useEvidence();

  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Determine Tier styling
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "High Readiness":
        return "bg-emerald-100 text-emerald-950 border-emerald-300";
      case "Moderate Alignment":
        return "bg-amber-100 text-amber-950 border-amber-300";
      case "Developing Foundations":
        return "bg-blue-100 text-blue-950 border-blue-300";
      default:
        return "bg-slate-100 text-slate-950 border-slate-300";
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Career Readiness & Blocker Diagnosis"
        description={`A comprehensive audit of your readiness for ${activeRole.title}, synthesizing required coverage, proficiency alignment, and verification certainty.`}
        badge="Career Readiness Index"
        badgeColor="border-emerald-300 text-emerald-900 bg-emerald-100"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Audit Rules
        </button>
        <Link
          href="/app/career/compare"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          Compare Roles →
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector */}
      <TargetRoleSelectorBar />

      {/* Hero Readiness Assessment Card */}
      <div className="gl-card p-6 md:p-8 space-y-6 bg-[#FAF8F5] border-ink/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold uppercase px-3 py-1 rounded-full border ${getTierColor(
                  activeReadiness.readiness_tier
                )}`}
              >
                {activeReadiness.readiness_tier}
              </span>
              <span className="text-xs font-mono text-ink-muted">
                Role Model: {activeRole.seniority} &bull; {activeRole.version}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-ink">
              Readiness Score: {activeReadiness.readiness_index}%
            </h2>

            <p className="text-xs md:text-sm text-ink-muted max-w-xl leading-relaxed">
              Your profile satisfies the core baseline competencies, with strong evidence in core engineering.
              Advancing to <em>High Readiness</em> requires formalizing verification for candidate skills and establishing production depth in {activeReadiness.critical_blockers.length} critical requirement areas.
            </p>
          </div>

          {/* Precision SVG Multi-Tier Radial Readiness Dial */}
          <RadialReadinessDial
            readinessIndex={activeReadiness.readiness_index}
            readinessTier={activeReadiness.readiness_tier}
            requiredCoveragePct={activeReadiness.required_supported_pct}
            proficiencyAlignmentPct={activeReadiness.proficiency_alignment_pct}
            evidenceQualityPct={activeReadiness.evidence_quality_pct}
          />
        </div>

        {/* 3 Component Breakdown Columns */}
        <div className="pt-6 border-t border-ink/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Core Required Coverage</span>
              <span className="font-mono font-bold text-ink">
                {activeReadiness.required_supported_pct}%
              </span>
            </div>
            <div className="w-full bg-sand/30 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${activeReadiness.required_supported_pct}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-muted block">
              Percentage of essential competencies with demonstrable baseline capability.
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Proficiency Alignment</span>
              <span className="font-mono font-bold text-ink">
                {activeReadiness.proficiency_alignment_pct}%
              </span>
            </div>
            <div className="w-full bg-sand/30 rounded-full h-2">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all"
                style={{ width: `${activeReadiness.proficiency_alignment_pct}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-muted block">
              Depth conformity against the role's expected maturity scale (Foundation to Expert).
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink">Evidence Traceability</span>
              <span className="font-mono font-bold text-ink">
                {activeReadiness.evidence_quality_pct}%
              </span>
            </div>
            <div className="w-full bg-sand/30 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all"
                style={{ width: `${activeReadiness.evidence_quality_pct}%` }}
              />
            </div>
            <span className="text-[11px] text-ink-muted block">
              Verification health: ratio of verified artifacts versus unbacked candidate claims.
            </span>
          </div>
        </div>

        {/* Mandatory Regulatory & Explainability Disclaimer */}
        <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink-muted leading-relaxed">
            <strong>Explainability Guarantee:</strong> GrowthLens does not perform opaque hiring decisions, resume ranking, or automated gatekeeping.
            The Readiness Score is an educational metric designed to help you plan targeted skill acquisition against explicit, versioned market expectations.
          </p>
        </div>
      </div>

      {/* Critical Blockers vs Major Uncertainties */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Blockers */}
        <div className="gl-card p-6 space-y-4 border-red-200 bg-red-50/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950">
                  Critical Blockers
                </h3>
                <span className="text-[11px] text-red-800/80">
                  Must be resolved before role consideration
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-200 text-red-950">
              {activeReadiness.critical_blockers.length} Blockers
            </span>
          </div>

          <div className="space-y-3">
            {activeReadiness.critical_blockers.map((blocker) => (
              <div
                key={blocker.skill_id}
                className="p-4 rounded-2xl bg-white border border-red-200/80 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-ink text-sm">
                    {blocker.skill_name}
                  </span>
                  <span className="text-[10px] font-mono text-red-800 uppercase px-2 py-0.5 rounded bg-red-100 font-semibold">
                    Expected: {blocker.expected_level}
                  </span>
                </div>

                <p className="text-ink-muted text-[11px]">
                  <strong>Current Status:</strong> {blocker.current_state}
                </p>

                <p className="text-ink/80 text-[11px] bg-sand/20 p-2 rounded-lg border border-ink/5">
                  <strong>Impact:</strong> {blocker.reason}
                </p>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/app/career/gaps/${blocker.gap_id}`}
                    className="font-bold text-ink hover:underline flex items-center gap-1 text-[11px]"
                  >
                    View Gap Diagnosis &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Major Uncertainties */}
        <div className="gl-card p-6 space-y-4 border-amber-200 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-950">
                  Major Uncertainties
                </h3>
                <span className="text-[11px] text-amber-800/80">
                  Unverified claims introducing variance
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
              {activeReadiness.major_uncertainties.length} Uncertainties
            </span>
          </div>

          <div className="space-y-3">
            {activeReadiness.major_uncertainties.map((text, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white border border-amber-200/80 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-ink text-sm">
                    Uncertainty #{idx + 1}
                  </span>
                  <span className="text-[10px] font-mono text-amber-800 uppercase px-2 py-0.5 rounded bg-amber-100 font-semibold">
                    Discounted Credit
                  </span>
                </div>

                <p className="text-ink/80 text-[11px] leading-relaxed">
                  {text}
                </p>

                <div className="pt-2 flex justify-end">
                  <Link
                    href="/app/evidence"
                    className="font-bold text-ink hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Provide Verification Evidence &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
    </div>
  </div>
);
}
