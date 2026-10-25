"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Briefcase,
  Scale,
  AlertTriangle,
  Sparkles,
  Target,
  GitCompare,
  FileSearch,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  Info,
  Layers,
  ShieldCheck,
  TrendingUp,
  Globe,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  CalculationExplanationModal,
  RequirementTypeBadge,
  MatchStatusBadge,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";

export default function RoleIntelligenceOverviewPage() {
  const { activeRole, activeMatch, activeGaps, activeReadiness } = useEvidence();
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Role Intelligence & Career Readiness"
        description="Compare your verified evidence-backed capability state against explicit, versioned models of real role demand. Trace every match, inspect partial proficiencies, and prioritize the exact competency gaps that matter most."
        badge="Domain 4"
        badgeColor="border-ink/20 text-ink bg-lime"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector Bar */}
      <TargetRoleSelectorBar />

      {/* Core Architectural Philosophy Callout */}
      <div className="gl-card p-5 bg-[#FAF8F5] border border-ink/15">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-ink shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">
              Evidence-Grounded Demand Matching (No Unexplained Percentages)
            </h4>
            <p className="text-xs text-ink/80 leading-relaxed">
              We never compare you against a fictional &ldquo;ideal candidate&rdquo; or output an arbitrary
              keyword similarity score. Every match is evaluated across a 5-point maturity scale and discounted
              if supporting evidence is unverified or conflicting. A high extraction confidence score does not
              award credit without attributable work.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overall Match */}
        <div className="gl-card p-5 bg-white space-y-2 border border-ink/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-ink-muted uppercase">Overall Role Match</span>
            <button
              onClick={() => setShowExplanation(true)}
              className="text-ink hover:underline text-[10px] font-mono flex items-center gap-0.5"
            >
              <Info className="w-3 h-3" /> Formula
            </button>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">{activeMatch.overall_match_score}%</span>
            <span className="text-xs text-ink-muted font-mono">Weighted</span>
          </div>
          <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime rounded-full border-r border-ink"
              style={{ width: `${activeMatch.overall_match_score}%` }}
            />
          </div>
          <span className="text-[11px] text-ink-muted block pt-1">
            Core: {activeMatch.required_coverage_score}% &bull; Supporting: {activeMatch.supporting_coverage_score}%
          </span>
        </div>

        {/* Career Readiness */}
        <div className="gl-card p-5 bg-white space-y-2 border border-ink/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-ink-muted uppercase">Readiness Index</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sand text-ink font-bold">
              {activeReadiness.readiness_tier}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink">{activeReadiness.readiness_index}%</span>
            <span className="text-xs text-ink-muted font-mono">Index</span>
          </div>
          <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${activeReadiness.readiness_index}%` }}
            />
          </div>
          <span className="text-[11px] text-ink-muted block pt-1">
            {activeReadiness.critical_blockers.length === 0
              ? "0 critical blockers"
              : `${activeReadiness.critical_blockers.length} critical blockers`}
          </span>
        </div>

        {/* Strong Matches */}
        <div className="gl-card p-5 bg-emerald-50/50 border border-emerald-200 space-y-1">
          <span className="text-xs font-mono text-emerald-950 uppercase">Verified Matches</span>
          <p className="text-3xl font-extrabold text-emerald-950">{activeMatch.strong_matches_count}</p>
          <span className="text-[11px] text-emerald-800">
            Fully supported by verified artifacts
          </span>
        </div>

        {/* Identified Gaps */}
        <div className="gl-card p-5 bg-amber-50/50 border border-amber-200 space-y-1">
          <span className="text-xs font-mono text-amber-950 uppercase">Actionable Gaps</span>
          <p className="text-3xl font-extrabold text-amber-950">{activeGaps.length}</p>
          <span className="text-[11px] text-amber-800">
            {activeGaps.filter((g) => g.requirement_type === "core_required").length} core required gaps
          </span>
        </div>
      </div>

      {/* Main Grid: Target Role Profile + Quick Feature Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Active Role Demand Summary */}
        <div className="lg:col-span-7 space-y-4">
          <div className="gl-card p-6 bg-white space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-ink/5 text-ink font-semibold">
                    {activeRole.seniority}
                  </span>
                  <span className="text-xs font-mono text-ink-muted">{activeRole.context}</span>
                  <span className="text-xs font-mono text-ink-muted">&bull; {activeRole.version}</span>
                </div>
                <h2 className="text-2xl font-bold text-ink">{activeRole.title}</h2>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  {activeRole.description}
                </p>
              </div>
              <Link
                href={`/app/career/roles/${activeRole.role_id}`}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink text-ink text-xs py-2 px-3 shrink-0"
              >
                Inspect Demands &rarr;
              </Link>
            </div>

            {/* Competency Demands Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
                  Role Competencies ({activeRole.competencies.length})
                </span>
                <Link
                  href="/app/career/mapping"
                  className="text-ink-muted hover:text-ink underline text-[11px]"
                >
                  View Taxonomy Mapping
                </Link>
              </div>

              <div className="divide-y divide-ink/10 border border-ink/10 rounded-2xl overflow-hidden bg-sand/5">
                {activeMatch.competency_matches.map((item, idx) => (
                  <div
                    key={`${item.skill_id}-${item.requirement_type || ''}-${idx}`}
                    className="p-3.5 bg-white/70 flex items-center justify-between gap-3 text-xs hover:bg-white transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/passport/skills/${item.skill_id}`}
                          className="font-bold text-ink hover:underline truncate"
                        >
                          {item.canonical_name}
                        </Link>
                        <RequirementTypeBadge type={item.requirement_type} />
                      </div>
                      <div className="text-[11px] text-ink-muted font-mono">
                        Target: <strong>{item.expected_level}</strong> &bull; Current:{" "}
                        <span className={item.current_proficiency === "Not Established" ? "text-red-700" : "text-ink"}>
                          {item.current_proficiency}
                        </span>{" "}
                        ({item.verification_status})
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <MatchStatusBadge status={item.match_status} />
                      <Link
                        href={
                          item.gap_type
                            ? `/app/career/gaps/gap-${item.skill_id}`
                            : `/app/career/explanations`
                        }
                        className="text-ink font-semibold flex items-center gap-0.5 hover:underline text-[11px]"
                      >
                        Explain <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-ink/10">
              <span className="text-[11px] text-ink-muted font-mono">
                Model Provenance: {activeRole.provenance}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/app/career/match"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  Full Role Match Breakdown <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Suite */}
        <div className="lg:col-span-5 space-y-4">
          <div className="gl-card p-6 bg-white space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Compass className="w-4 h-4 text-ink" />
              Career Intelligence Navigation
            </h3>
            <p className="text-xs text-ink-muted">
              Choose an investigation path to inspect how your current evidence powers career advancement:
            </p>

            <div className="space-y-2.5">
              <Link
                href="/app/career/discover"
                className="p-3 rounded-xl border border-ink/20 bg-lime/15 hover:border-ink hover:bg-lime/25 transition-all flex items-center justify-between group text-xs shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-lime text-ink flex items-center justify-center shrink-0 font-bold border border-ink/20">
                    <Globe className="w-4 h-4 text-ink" />
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink flex items-center gap-1.5">
                      Discover Real Jobs
                      <span className="text-[9px] font-mono font-bold uppercase bg-ink text-white px-1.5 py-0.5 rounded">Live API</span>
                    </h5>
                    <p className="text-[11px] text-ink-muted">Search real openings tailored to your verified skills or target role</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/roles"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Target Roles Catalogue</h5>
                    <p className="text-[11px] text-ink-muted">Browse curated versions for AI, ML, Backend, & Data Science</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/match"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Role Match Breakdown</h5>
                    <p className="text-[11px] text-ink-muted">Inspect requirement-by-requirement evidence coverage</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/gaps"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Skill Gap Diagnosis</h5>
                    <p className="text-[11px] text-ink-muted">Classify Depth, Evidence, Application, and Dependency gaps</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/priorities"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Gap Prioritizer</h5>
                    <p className="text-[11px] text-ink-muted">Rank by criticality, effort, leverage, and project extension</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/readiness"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 font-bold">
                    5
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Career Readiness & Blockers</h5>
                    <p className="text-[11px] text-ink-muted">Audit core blockers without speculative hiring predictions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/compare"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-lime/60 text-ink flex items-center justify-center shrink-0 font-bold">
                    6
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Compare Multiple Roles</h5>
                    <p className="text-[11px] text-ink-muted">Cross-compare 2-3 target roles against your single profile</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>

              <Link
                href="/app/career/job-parser"
                className="p-3 rounded-xl border border-ink/10 hover:border-ink hover:bg-sand/15 transition-all flex items-center justify-between group text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-900 flex items-center justify-center shrink-0 font-bold">
                    7
                  </div>
                  <div>
                    <h5 className="font-bold text-ink group-hover:text-ink">Job Description Parser</h5>
                    <p className="text-[11px] text-ink-muted">Paste real job text and generate editable custom demand models</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
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
