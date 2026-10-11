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
  Search,
  Filter,
  Grid,
  List,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Tag,
  Clock,
} from "lucide-react";

export default function SkillExplorerPage() {
  const { skills, evidenceItems } = useEvidence();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedVerification, setSelectedVerification] = useState("all");
  const [selectedCoverage, setSelectedCoverage] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const categories = ["all", ...Array.from(new Set(skills.map((s) => s.category)))];

  const filteredSkills = skills.filter((s) => {
    const query = search.toLowerCase();
    const matchesSearch =
      s.canonicalName.toLowerCase().includes(query) ||
      s.definition.toLowerCase().includes(query) ||
      s.aliases.some((a) => a.toLowerCase().includes(query));

    const matchesCat = selectedCategory === "all" || s.category === selectedCategory;
    const matchesVer =
      selectedVerification === "all" || s.verificationState === selectedVerification;
    const matchesCov =
      selectedCoverage === "all" || s.coverageState === selectedCoverage;

    return matchesSearch && matchesCat && matchesVer && matchesCov;
  });

  const verifiedCount = skills.filter((s) => s.verificationState === "verified").length;
  const candidateCount = skills.filter((s) => s.verificationState === "candidate").length;
  const deficitCount = skills.filter(
    (s) => s.coverageState === "insufficient" || s.coverageState === "incomplete"
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/passport" className="hover:text-[#1F1E1D]">
              Passport
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Explorer</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Skill Explorer
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Browse all competencies recognized in the canonical taxonomy. Inspect verification status, evidence backing, and coverage health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#EFEAE1] p-1 rounded-xl flex items-center gap-1 border border-[#E0D9CD]">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-[#1F1E1D] shadow-sm"
                  : "text-[#8C827A] hover:text-[#1F1E1D]"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white text-[#1F1E1D] shadow-sm"
                  : "text-[#8C827A] hover:text-[#1F1E1D]"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/app/passport/taxonomy"
            className="pill-btn pill-btn-secondary text-xs flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            View Taxonomy
          </Link>
        </div>
      </div>

      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gl-card p-4">
          <span className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
            Total Cataloged
          </span>
          <div className="text-2xl font-extrabold text-[#1F1E1D] mt-1">{skills.length}</div>
          <p className="text-[11px] text-[#8C827A]">In individual portfolio</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
            Verified In Passport
          </span>
          <div className="text-2xl font-extrabold text-[#2E6941] mt-1">{verifiedCount}</div>
          <p className="text-[11px] text-[#8C827A]">Definitively proven</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
            Candidates In Review
          </span>
          <div className="text-2xl font-extrabold text-[#B07219] mt-1">{candidateCount}</div>
          <p className="text-[11px] text-[#8C827A]">Requires human check</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider">
            Coverage Deficits
          </span>
          <div className="text-2xl font-extrabold text-[#BA1A1A] mt-1">{deficitCount}</div>
          <p className="text-[11px] text-[#8C827A]">Needs further artifacts</p>
        </div>
      </div>

      {/* Filter and Query Tool */}
      <div className="gl-card p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search by skill name, alias, keyword, or concept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-10 text-xs w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : c}
                </option>
              ))}
            </select>

            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              <option value="all">All Verification States</option>
              <option value="verified">Verified Only</option>
              <option value="candidate">Candidate Only</option>
              <option value="insufficient_evidence">Insufficient Evidence</option>
              <option value="conflicting">Conflicting Evidence</option>
            </select>

            <select
              value={selectedCoverage}
              onChange={(e) => setSelectedCoverage(e.target.value)}
              className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer"
            >
              <option value="all">All Coverage States</option>
              <option value="sufficient">Sufficient Evidence</option>
              <option value="incomplete">Incomplete Evidence</option>
              <option value="insufficient">Insufficient Evidence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results View */}
      {filteredSkills.length === 0 ? (
        <div className="gl-card p-12 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#8C827A] mx-auto" />
          <h3 className="text-base font-bold text-[#1F1E1D]">No matching skills found</h3>
          <p className="text-xs text-[#8C827A]">
            Adjust your keyword query or reset filter parameters.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="gl-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow group border-[#E4DDD3]"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-wider text-[#8C827A] uppercase">
                    {skill.category}
                  </span>
                  <SkillVerificationBadge state={skill.verificationState} />
                </div>

                <h3 className="text-base font-bold text-[#1F1E1D] group-hover:text-[#2E6941] transition-colors">
                  {skill.canonicalName}
                </h3>

                <p className="text-xs text-[#5A5550] line-clamp-3 mt-2 leading-relaxed">
                  {skill.definition}
                </p>

                {/* Aliases */}
                {skill.aliases.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {skill.aliases.slice(0, 3).map((alias) => (
                      <span
                        key={alias}
                        className="text-[10px] bg-[#FAF8F5] text-[#8C827A] px-2 py-0.5 rounded-md border border-[#EBE5DC]"
                      >
                        {alias}
                      </span>
                    ))}
                    {skill.aliases.length > 3 && (
                      <span className="text-[10px] text-[#8C827A] self-center">
                        +{skill.aliases.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Status Chips */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F0EBE1]">
                  <ProficiencyBadge
                    level={
                      skill.verificationState === "verified"
                        ? skill.verifiedProficiency
                        : skill.estimatedProficiency
                    }
                  />
                  <CoverageBadge state={skill.coverageState} />
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#8C827A] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {skill.evidenceIds.length} artifacts
                </span>

                <Link
                  href={`/app/passport/skills/${skill.id}`}
                  className="font-bold text-[#1F1E1D] hover:text-[#2E6941] flex items-center gap-1"
                >
                  Inspect
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="gl-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#EBE5DC] text-[11px] uppercase tracking-wider text-[#8C827A]">
                <tr>
                  <th className="py-3 px-4 font-bold">Competency</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Verification</th>
                  <th className="py-3 px-4 font-bold">Proficiency</th>
                  <th className="py-3 px-4 font-bold">Coverage</th>
                  <th className="py-3 px-4 font-bold">Artifacts</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {filteredSkills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1F1E1D]">
                      <div>{skill.canonicalName}</div>
                      <div className="text-[10px] text-[#8C827A] font-normal truncate max-w-xs">
                        {skill.aliases.join(", ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550]">{skill.category}</td>
                    <td className="py-3.5 px-4">
                      <SkillVerificationBadge state={skill.verificationState} />
                    </td>
                    <td className="py-3.5 px-4">
                      <ProficiencyBadge
                        level={
                          skill.verificationState === "verified"
                            ? skill.verifiedProficiency
                            : skill.estimatedProficiency
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <CoverageBadge state={skill.coverageState} />
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550]">
                      {skill.evidenceIds.length} linked
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app/passport/skills/${skill.id}`}
                        className="font-bold text-[#1F1E1D] hover:text-[#2E6941] inline-flex items-center gap-1"
                      >
                        Inspect
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
