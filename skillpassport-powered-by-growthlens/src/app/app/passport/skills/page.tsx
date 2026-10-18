"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
  CoverageBadge,
} from "@/components/app/SkillBadges";
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function VerifiedSkillsPage() {
  const { skills, evidenceItems, passportMetrics } = useEvidence();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProficiency, setSelectedProficiency] = useState("all");

  const verifiedSkills = skills.filter((s) => s.verificationState === "verified");

  const categories = ["all", ...Array.from(new Set(skills.map((s) => s.category)))];
  const proficiencies = ["all", "Working", "Practitioner", "Advanced", "Expert"];

  const filteredSkills = verifiedSkills.filter((s) => {
    const matchesSearch =
      s.canonicalName.toLowerCase().includes(search.toLowerCase()) ||
      s.definition.toLowerCase().includes(search.toLowerCase()) ||
      s.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchesProf =
      selectedProficiency === "all" || s.verifiedProficiency === selectedProficiency;

    return matchesSearch && matchesCat && matchesProf;
  });

  const totalEvidenceLinked = verifiedSkills.reduce(
    (acc, s) => acc + s.evidenceIds.length,
    0
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Verified Competencies"
        description="Only competencies grounded in auditable, attributable workplace artifacts receive verified status. Unverified AI extracts remain strictly separated in the Candidate queue."
        badge="Domain 2 · Verified Skills"
        badgeColor="border-emerald-300 text-emerald-800 bg-emerald-50"
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/passport/candidates"
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            Review Candidates
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/app/passport/explorer"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            Skill Explorer
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Trust & Verification Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-[#EBF3ED] border border-[#B8D7C2] flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-[#2E6941] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#234D31] leading-relaxed">
          <strong className="font-bold">Formal Verification Standard:</strong> Every verified badge shown here has met the evidence threshold: verified author attribution, high-confidence artifact parsing, and domain rubric qualification. Extracted keywords from resumes or training certificates alone are never granted verified status.
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Skills</span>
            <Award className="w-4 h-4 text-[#2E6941]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">
            {verifiedSkills.length}
          </div>
          <p className="text-xs text-[#8C827A] mt-1">Out of {skills.length} tracked items</p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Linked Artifacts</span>
            <CheckCircle2 className="w-4 h-4 text-[#4361EE]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">
            {totalEvidenceLinked}
          </div>
          <p className="text-xs text-[#8C827A] mt-1">Directly supporting evidence</p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Proficiency</span>
            <Layers className="w-4 h-4 text-[#8A38F5]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">
            {typeof passportMetrics?.top_proficiency === "object"
              ? (passportMetrics.top_proficiency as any)?.level || "None Established"
              : passportMetrics?.top_proficiency || (verifiedSkills.length > 0 ? "Established" : "None Established")}
          </div>
          <p className="text-xs text-[#8C827A] mt-1">
            {verifiedSkills.length > 0 ? "Highest verified tier" : "No verified competencies"}
          </p>
        </div>

        <div className="gl-card p-5">
          <div className="flex items-center justify-between text-[#8C827A] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Extraction Conf.</span>
            <ShieldCheck className="w-4 h-4 text-[#2E6941]" />
          </div>
          <div className="text-3xl font-extrabold text-[#1F1E1D]">
            {verifiedSkills.length > 0
              ? `${Math.round(
                  verifiedSkills.reduce((acc, s) => acc + s.confidence, 0) /
                    verifiedSkills.length
                )}%`
              : "0%"}
          </div>
          <p className="text-xs text-[#8C827A] mt-1">Model calibration score</p>
        </div>
      </div>


      {/* Filter and Search Bar */}
      <div className="gl-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Filter by skill name, alias, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-10 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#8C827A]">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>

            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              {proficiencies.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All Levels" : p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="gl-card p-12 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#8C827A] mx-auto" />
          <h3 className="text-base font-bold text-[#1F1E1D]">
            {verifiedSkills.length === 0 ? "No verified competencies yet" : "No matching competencies found"}
          </h3>
          <p className="text-xs text-[#8C827A] max-w-md mx-auto">
            {verifiedSkills.length === 0
              ? "All competencies extracted by AI from your work sources start in Candidate Review. Once verified via authoritative human review, they receive formal accreditation and appear here."
              : "Try adjusting your search criteria or category and proficiency filters."}
          </p>
          {verifiedSkills.length === 0 && (
            <div className="pt-2">
              <Link
                href="/app/passport/candidates"
                className="pill-btn pill-btn-primary inline-flex text-xs items-center gap-1.5"
              >
                Go to Candidate Review
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSkills.map((skill) => {
            const linkedEvItems = evidenceItems.filter((e) =>
              skill.evidenceIds.includes(e.id)
            );

            return (
              <div
                key={skill.id}
                className="gl-card p-6 flex flex-col justify-between hover:shadow-md transition-shadow group border-[#E4DDD3]"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-[#8C827A] uppercase">
                        {skill.category}
                      </span>
                      <h3 className="text-lg font-bold text-[#1F1E1D] group-hover:text-[#2E6941] transition-colors mt-0.5">
                        {skill.canonicalName}
                      </h3>
                    </div>
                    <SkillVerificationBadge state={skill.verificationState} />
                  </div>

                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <ProficiencyBadge level={skill.verifiedProficiency} />
                    <CoverageBadge state={skill.coverageState} />
                    <span className="text-[11px] font-medium text-[#5A5550] bg-[#F7F4EE] px-2.5 py-0.5 rounded-full border border-[#E4DDD3]">
                      Conf: {skill.confidence}%
                    </span>
                  </div>

                  {/* Definition */}
                  <p className="text-xs text-[#5A5550] leading-relaxed mb-4">
                    {skill.definition}
                  </p>

                  {/* Linked Evidence Highlights */}
                  <div className="mb-4 pt-3 border-t border-[#F0EBE1]">
                    <div className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Linked Evidence ({linkedEvItems.length})</span>
                      <span className="text-[10px] lowercase text-[#8C827A]">
                        Last: {skill.lastEvidenceDate}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {linkedEvItems.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/app/evidence/${ev.id}`}
                          className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] transition-colors text-xs text-[#1F1E1D]"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="w-3.5 h-3.5 text-[#8C827A] flex-shrink-0" />
                            <span className="truncate font-medium">{ev.title}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[#8C827A] flex-shrink-0">
                            {ev.sourceType}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Rationale & Known Limitations */}
                  <div className="p-3 rounded-xl bg-[#FBF9F6] border border-[#EBE5DC] text-[11px] text-[#5A5550] space-y-1 mb-4">
                    <div>
                      <strong className="text-[#1F1E1D]">Rationale:</strong> {skill.assessmentRationale}
                    </div>
                    {skill.limitations && (
                      <div>
                        <strong className="text-[#8C827A]">Scope Boundaries:</strong> {skill.limitations}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Navigation Buttons */}
                <div className="pt-4 border-t border-[#F0EBE1] flex items-center justify-between gap-2">
                  <Link
                    href={`/app/passport/skills/${skill.id}/evidence`}
                    className="text-xs font-semibold text-[#8C827A] hover:text-[#1F1E1D] flex items-center gap-1"
                  >
                    Evidence Map
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/passport/skills/${skill.id}/proficiency`}
                      className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3"
                    >
                      Rubric
                    </Link>
                    <Link
                      href={`/app/passport/skills/${skill.id}`}
                      className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
                    >
                      Inspect Profile
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
