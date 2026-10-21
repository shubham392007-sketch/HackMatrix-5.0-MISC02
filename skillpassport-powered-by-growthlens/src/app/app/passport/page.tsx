"use client";

import React from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
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
        {/* Profile Summary Card */}
        <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[3.5px_3.5px_0_0_#1C1C1C]">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
              INDIVIDUAL CAPABILITY RECORD
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1C]">
                {userProfile.displayName || "SkillPassport Member"}
              </h2>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#DFE968] border border-[#1C1C1C] uppercase shadow-[1px_1px_0_0_#1C1C1C]">
                PASSPORT ACTIVE
              </span>
            </div>
            <p className="text-xs font-medium text-[#1C1C1C]/75 max-w-xl">
              {userProfile.headline || userProfile.currentRole || "Specialized in Software Architecture, Full-Stack Development, and Applied AI."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/passport/coverage"
              className="pill-btn pill-btn-secondary text-xs py-2.5 px-4"
            >
              VIEW EVIDENCE COVERAGE
            </Link>
            <Link
              href="/app/passport/candidates"
              className="pill-btn pill-btn-primary text-xs py-2.5 px-4"
            >
              REVIEW CANDIDATES ({candidateSkills.length})
            </Link>
          </div>
        </div>

        {/* 8.2 Restrained Summary Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/app/passport/skills"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/50 shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:-translate-y-0.5 transition-all"
          >
            <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block mb-1">
              VERIFIED SKILLS
            </span>
            <p className="text-3xl font-black text-[#1C1C1C]">{verifiedCount}</p>
            <span className="text-[10px] font-bold text-[#4A7A4E] mt-1 block">
              Backed by sufficient evidence →
            </span>
          </Link>

          <Link
            href="/app/passport/candidates"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:-translate-y-0.5 transition-all"
          >
            <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block mb-1">
              CANDIDATES AWAITING REVIEW
            </span>
            <p className="text-3xl font-black text-[#1C1C1C]">{candidateCount}</p>
            <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block">
              Proposed by pipeline →
            </span>
          </Link>

          <Link
            href="/app/passport/coverage?filter=insufficient"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:-translate-y-0.5 transition-all"
          >
            <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block mb-1">
              INSUFFICIENT EVIDENCE
            </span>
            <p className="text-3xl font-black text-[#C85A54]">{insufficientSkills.length}</p>
            <span className="text-[10px] font-bold text-[#C85A54] mt-1 block">
              Needs workplace proof →
            </span>
          </Link>

          <Link
            href="/app/evidence/library"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:-translate-y-0.5 transition-all"
          >
            <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block mb-1">
              LINKED EVIDENCE ARTIFACTS
            </span>
            <p className="text-3xl font-black text-[#1C1C1C]">{evidenceItems.length}</p>
            <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block">
              Git, Jira, Docs, Certs →
            </span>
          </Link>
        </section>

        {/* 8.3 Competency Groups Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
            <div>
              <h3 className="text-xl font-black text-[#1C1C1C]">Demonstrated Competency Groups</h3>
              <p className="text-xs text-[#1C1C1C]/70">Grouped by canonical taxonomy categories.</p>
            </div>
            <Link
              href="/app/passport/taxonomy"
              className="text-xs font-bold underline hover:text-[#4A7A4E]"
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
                  className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]"
                >
                  <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-2.5">
                    <h4 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                      {cat}
                    </h4>
                    <span className="text-[10px] font-bold text-[#1C1C1C]/50">
                      {catSkills.length} competencies
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {catSkills.map((sk) => (
                      <Link
                        key={sk.id}
                        href={`/app/passport/skills/${sk.id}`}
                        className="p-3.5 rounded-xl border border-[#1C1C1C] bg-white flex items-center justify-between gap-3 hover:bg-[#FBF1CF] transition-colors"
                      >
                        <div>
                          <p className="text-xs font-black text-[#1C1C1C]">{sk.canonicalName}</p>
                          <span className="text-[10px] text-[#1C1C1C]/60 block mt-0.5">
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
            <h3 className="text-lg font-black text-[#1C1C1C]">Recent Passport Updates</h3>
            <Link
              href="/app/passport/history"
              className="text-xs font-bold underline hover:text-[#4A7A4E]"
            >
              View Full Audit History ({historyEvents.length}) →
            </Link>
          </div>

          <div className="bg-[#FBF6DF] rounded-[24px] border-[1.5px] border-[#1C1C1C] divide-y divide-[#1C1C1C]/15 overflow-hidden shadow-[2.5px_2.5px_0_0_#1C1C1C]">
            {historyEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-[#1C1C1C]">{evt.skillName}</span>
                    <span className="text-[10px] text-[#1C1C1C]/50 font-mono">({evt.timestamp})</span>
                  </div>
                  <p className="text-[#1C1C1C]/80 font-medium">{evt.reason}</p>
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
