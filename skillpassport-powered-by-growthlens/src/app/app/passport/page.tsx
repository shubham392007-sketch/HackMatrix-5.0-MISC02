"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import CompetencyRadarChart from "@/components/passport/CompetencyRadarChart";
import CompetencyQuadrantScatterPlot from "@/components/passport/CompetencyQuadrantScatterPlot";
import CompetencyTrajectoryCurve from "@/components/passport/CompetencyTrajectoryCurve";
import EvidenceSourceBarPlot from "@/components/passport/EvidenceSourceBarPlot";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
  CoverageBadge,
} from "@/components/app/SkillBadges";
import {
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  History,
  FileCheck2,
} from "lucide-react";

export default function PassportOverviewPage() {
  const { skills, historyEvents, evidenceItems, userProfile, passportMetrics, refreshEvidenceData } = useEvidence();

  React.useEffect(() => {
    if (skills.length === 0) {
      refreshEvidenceData();
    }
  }, [skills.length, refreshEvidenceData]);

  const [analyticsView, setAnalyticsView] = useState<"scatter" | "trajectory" | "radar" | "sources">("scatter");

  const verifiedSkills = skills.filter((s) => s.verificationState === "verified");
  const candidateSkills = skills.filter((s) => s.verificationState === "candidate");
  const insufficientSkills = skills.filter((s) => s.verificationState === "insufficient_evidence");
  const conflictingSkills = skills.filter((s) => s.verificationState === "conflicting");

  const verifiedCount = passportMetrics?.verified_count ?? verifiedSkills.length;
  const candidateCount = passportMetrics?.candidate_count ?? candidateSkills.length;

  // Group skills by category
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Your Skill Passport"
        description="A clearer view of the skills your work can demonstrate. Trace every competency directly to verifiable artifacts."
      >
        <Link
          href="/app/passport/explorer"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          <span>EXPLORE SKILLS</span>
        </Link>
        <Link
          href="/app/evidence"
          className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>EVIDENCE CENTER</span>
        </Link>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-10 max-w-[1400px]">
        {/* 8.1 Compact Profile Summary Banner */}
        <div className="p-5 md:p-6 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2.5px_2.5px_0_#171717] flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#171717] text-[#FAF8F5] flex items-center justify-center font-black text-base border border-[#171717] shrink-0 shadow-[1px_1px_0_#171717]">
              {userProfile.displayName ? userProfile.displayName.slice(0, 2).toUpperCase() : "SP"}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight">
                  {userProfile.displayName || "SkillPassport Member"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DDEBE1] text-[#171717] border border-[#171717] uppercase tracking-wider flex items-center gap-1 shadow-[1px_1px_0_#171717]">
                  <ShieldCheck className="w-3 h-3 text-[#2D5A43]" />
                  PASSPORT ACTIVE
                </span>
              </div>
              <p className="text-xs font-medium text-[#171717]/75 line-clamp-1 max-w-2xl">
                {userProfile.headline || userProfile.currentRole || "Specialized in Software Architecture, Full-Stack Development, and Applied AI."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/app/passport/coverage"
              className="pill-btn pill-btn-secondary text-xs py-2 px-3.5"
            >
              VIEW COVERAGE
            </Link>
            <Link
              href="/app/passport/candidates"
              className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <span>REVIEW CANDIDATES</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#E6AC70] text-[#171717] text-[10px] font-black">
                {candidateSkills.length}
              </span>
            </Link>
          </div>
        </div>

        {/* 8.2 Standardized KPI Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/app/passport/skills"
            className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717]/60">
                  VERIFIED SKILLS
                </span>
                <span className="p-1 rounded-md bg-[#DDEBE1] border border-[#171717]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#171717] tracking-tight">{verifiedCount}</p>
            </div>
            <span className="text-[10.5px] font-bold text-[#2D5A43] mt-3 flex items-center justify-between">
              <span>Sufficient evidence proof</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>

          <Link
            href="/app/passport/candidates"
            className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717]/60">
                  AWAITING REVIEW
                </span>
                <span className="p-1 rounded-md bg-[#E6AC70]/30 border border-[#E6AC70]">
                  <Sparkles className="w-3.5 h-3.5 text-[#B07219]" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#171717] tracking-tight">{candidateCount}</p>
            </div>
            <span className="text-[10.5px] font-bold text-[#B07219] mt-3 flex items-center justify-between">
              <span>Proposed by pipeline</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>

          <Link
            href="/app/passport/coverage?filter=insufficient"
            className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717]/60">
                  INSUFFICIENT PROOF
                </span>
                <span className="p-1 rounded-md bg-[#C85A54]/15 border border-[#C85A54]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#C85A54]" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#C85A54] tracking-tight">{insufficientSkills.length}</p>
            </div>
            <span className="text-[10.5px] font-bold text-[#C85A54] mt-3 flex items-center justify-between">
              <span>Needs workplace corroboration</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>

          <Link
            href="/app/evidence/library"
            className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#171717]/60">
                  LINKED ARTIFACTS
                </span>
                <span className="p-1 rounded-md bg-[#DCE5F2] border border-[#171717]">
                  <Layers className="w-3.5 h-3.5 text-[#171717]" />
                </span>
              </div>
              <p className="text-3xl font-black text-[#171717] tracking-tight">{evidenceItems.length}</p>
            </div>
            <span className="text-[10.5px] font-bold text-[#171717]/70 mt-3 flex items-center justify-between">
              <span>Git, Jira, Docs, Certs</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
          </Link>
        </section>

        {/* 8.25 Visual Analytics Hub */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#171717]/15 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E6AC70] border border-[#171717]" />
                <h3 className="text-xl font-black text-[#171717] tracking-tight">Competency Intelligence &amp; Visual Analytics</h3>
              </div>
              <p className="text-xs text-[#171717]/70 mt-0.5">
                Evidence density matrix, multi-axis topology, longitudinal progression, and artifact provenance.
              </p>
            </div>

            {/* Responsive Segmented Control */}
            <div className="inline-flex items-center p-1 bg-[#FAF8F5] border border-[#171717]/20 rounded-xl overflow-x-auto gap-1 self-start sm:self-auto shadow-[1px_1px_0_#171717]">
              <button
                type="button"
                onClick={() => setAnalyticsView("scatter")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  analyticsView === "scatter"
                    ? "bg-[#171717] text-[#FAF8F5] shadow-[1px_1px_0_#171717]"
                    : "text-[#171717] hover:bg-[#171717]/5"
                }`}
              >
                ⚬ Scatter Matrix
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView("trajectory")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  analyticsView === "trajectory"
                    ? "bg-[#171717] text-[#FAF8F5] shadow-[1px_1px_0_#171717]"
                    : "text-[#171717] hover:bg-[#171717]/5"
                }`}
              >
                📈 Trajectory Curve
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView("radar")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  analyticsView === "radar"
                    ? "bg-[#171717] text-[#FAF8F5] shadow-[1px_1px_0_#171717]"
                    : "text-[#171717] hover:bg-[#171717]/5"
                }`}
              >
                🌟 Topology Radar
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView("sources")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  analyticsView === "sources"
                    ? "bg-[#171717] text-[#FAF8F5] shadow-[1px_1px_0_#171717]"
                    : "text-[#171717] hover:bg-[#171717]/5"
                }`}
              >
                📊 Source Breakdown
              </button>
            </div>
          </div>

          {/* Active Graph Component */}
          {analyticsView === "scatter" && (
            <CompetencyQuadrantScatterPlot skills={skills} evidenceItems={evidenceItems} />
          )}
          {analyticsView === "trajectory" && (
            <CompetencyTrajectoryCurve skills={skills} historyEvents={historyEvents} evidenceItems={evidenceItems} />
          )}
          {analyticsView === "radar" && (
            <CompetencyRadarChart skills={skills} />
          )}
          {analyticsView === "sources" && (
            <EvidenceSourceBarPlot skills={skills} evidenceItems={evidenceItems} />
          )}
        </section>

        {/* 8.28 Actionable Insights Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#171717]/15 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#171717] border border-[#171717]" />
                <h3 className="text-xl font-black text-[#171717] tracking-tight">Actionable Competency Insights</h3>
              </div>
              <p className="text-xs text-[#171717]/70 mt-0.5">
                Data-driven findings identified across your evidence corpus, verification gaps, and capability trajectory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Evidence Gaps & Needs */}
            <div className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C85A54] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C85A54]" />
                    Evidence Gap ({insufficientSkills.length})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#C85A54]/10 text-[#C85A54] border border-[#C85A54]/20">
                    Needs Corroboration
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#171717]">
                  {insufficientSkills.length > 0
                    ? `${insufficientSkills[0].canonicalName} needs practical proof`
                    : "All competencies currently backed"}
                </h4>
                <p className="text-xs text-[#171717]/75 line-clamp-3">
                  {insufficientSkills.length > 0
                    ? (insufficientSkills[0].limitations || insufficientSkills[0].assessmentRationale || "Requires direct production commits or pull requests to satisfy corroboration policy.")
                    : "Zero evidence-deficient competencies detected across your monitored taxonomy groups."}
                </p>
              </div>
              <Link
                href="/app/evidence/upload"
                className="pill-btn pill-btn-secondary text-[11px] py-2 px-3 text-center block"
              >
                UPLOAD PROOF ARTIFACT →
              </Link>
            </div>

            {/* 2. Corroborated Pillars */}
            <div className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2D5A43] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A43]" />
                    Verified Pillar ({verifiedSkills.length})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#DDEBE1] text-[#2D5A43] border border-[#2D5A43]/20">
                    Audit-Proof
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#171717]">
                  {verifiedSkills.length > 0
                    ? `${verifiedSkills[0].canonicalName} verified at ${verifiedSkills[0].verifiedProficiency}`
                    : "No verified skills recorded yet"}
                </h4>
                <p className="text-xs text-[#171717]/75 line-clamp-3">
                  {verifiedSkills.length > 0
                    ? (verifiedSkills[0].assessmentRationale || "Corroborated across continuous git commits and sprint reviews with high model confidence.")
                    : "Connect repositories in Connected Sources to extract and corroborate your core engineering pillars."}
                </p>
              </div>
              <Link
                href="/app/passport/skills"
                className="pill-btn pill-btn-secondary text-[11px] py-2 px-3 text-center block"
              >
                VIEW VERIFIED SKILLS →
              </Link>
            </div>

            {/* 3. Recommended Next Step */}
            <div className="p-5 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] shadow-[2px_2px_0_#171717] flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B07219] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E6AC70]" />
                    Recommended Next Action
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E6AC70]/20 text-[#B07219] border border-[#E6AC70]/40">
                    Next Milestone
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#171717]">
                  {candidateSkills.length > 0
                    ? `Review ${candidateSkills.length} pipeline candidate claims`
                    : "Publish Recruiter Credential View"}
                </h4>
                <p className="text-xs text-[#171717]/75 line-clamp-3">
                  {candidateSkills.length > 0
                    ? `The automated extraction pipeline extracted ${candidateSkills.length} potential skills from your latest work. Calibrate and approve them to promote to verified status.`
                    : "All extracted claims are adjudicated. Generate a shareable, tamper-evident SkillPassport link for hiring managers."}
                </p>
              </div>
              <Link
                href={candidateSkills.length > 0 ? "/app/passport/candidates" : "/app/passport/preview?view=recruiter"}
                className="pill-btn pill-btn-primary text-[11px] py-2 px-3 text-center block"
              >
                {candidateSkills.length > 0 ? "REVIEW CANDIDATES →" : "PREVIEW SHAREABLE PASSPORT →"}
              </Link>
            </div>
          </div>
        </section>

        {/* 8.3 Competency Groups Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#171717]/15 pb-2">
            <div>
              <h3 className="text-xl font-black text-[#171717]">Demonstrated Competency Groups</h3>
              <p className="text-xs text-[#171717]/70">Grouped by canonical taxonomy categories.</p>
            </div>
            <Link
              href="/app/passport/taxonomy"
              className="text-xs font-bold underline hover:text-[#2D5A43]"
            >
              Browse Canonical Taxonomy →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => {
              const catSkills = skills.filter((s) => s.category === cat);
              return (
                <div
                  key={cat}
                  className="p-6 rounded-2xl border-[1.5px] border-[#171717] bg-[#FAF8F5] space-y-4 shadow-[2px_2px_0_#171717]"
                >
                  <div className="flex items-center justify-between border-b border-[#171717]/10 pb-2.5">
                    <h4 className="text-sm font-black uppercase tracking-wider text-[#171717]">
                      {cat}
                    </h4>
                    <span className="text-[10px] font-bold text-[#171717]/50">
                      {catSkills.length} competencies
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {catSkills.map((sk) => (
                      <Link
                        key={sk.id}
                        href={`/app/passport/skills/${sk.id}`}
                        className="p-3.5 rounded-xl border border-[#171717] bg-white flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                      >
                        <div>
                          <p className="text-xs font-black text-[#171717]">{sk.canonicalName}</p>
                          <span className="text-[10px] text-[#171717]/60 block mt-0.5">
                            {sk.evidenceIds.length} cited evidence items • {sk.confidence}% confidence
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <ProficiencyBadge level={sk.verifiedProficiency} />
                          <SkillVerificationBadge state={sk.verificationState} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8.5 Recent Timeline Events */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#171717]">Recent Passport Updates</h3>
            <Link
              href="/app/passport/history"
              className="text-xs font-bold underline hover:text-[#2D5A43]"
            >
              View Full Audit History ({historyEvents.length}) →
            </Link>
          </div>

          <div className="bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#171717] divide-y divide-[#171717]/15 overflow-hidden shadow-[2px_2px_0_#171717]">
            {historyEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-[#171717]">{evt.skillName}</span>
                    <span className="text-[10px] text-[#171717]/50 font-mono">({evt.timestamp})</span>
                  </div>
                  <p className="text-[#171717]/80 font-medium">{evt.reason}</p>
                </div>
                <Link
                  href={`/app/passport/skills/${evt.skillId}`}
                  className="pill-btn pill-btn-secondary text-[10.5px] py-1 px-3 shrink-0"
                >
                  VIEW SKILL
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
