"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
} from "@/components/app/SkillBadges";
import {
  Compass,
  Search,
  GitBranch,
  Network,
  FolderTree,
  ArrowRight,
  ShieldCheck,
  Tag,
  BookOpen,
  Layers,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function SkillTaxonomyPage() {
  const { taxonomyCategories, skills } = useEvidence();
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [search, setSearch] = useState("");


  const activeCategory =
    taxonomyCategories.find((c) => c.id === selectedCatId) || taxonomyCategories[0];

  // Filter skills matching search or matching active category
  const filteredSkills = search.trim()
    ? skills.filter((s) => {
        const query = search.toLowerCase();
        return (
          s.canonicalName.toLowerCase().includes(query) ||
          s.aliases.some((a) => a.toLowerCase().includes(query)) ||
          s.category.toLowerCase().includes(query)
        );
      })
    : skills.filter((s) => s.category.toLowerCase() === activeCategory?.name.toLowerCase());

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Skill Taxonomy & Ontology"
        description="The canonical schema and graph ontology ensuring uniform skill definitions, alias normalization, and structured dependency mapping."
        badge="Domain 2 · Graph Ontology"
        badgeColor="border-amber-300 text-amber-900 bg-amber-50"
      >
        <Link
          href="/app/passport/explorer"
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
        >
          Universal Explorer
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Ontology Principles Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="gl-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F1E1D]">
            <Tag className="w-4 h-4 text-[#2E6941]" />
            <h3>Alias Normalization</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            Raw keyword variations (e.g., &ldquo;Python3&rdquo;, &ldquo;AsyncIO&rdquo;, &ldquo;CPython&rdquo;) automatically resolve to their singular canonical standard: <strong>Python Engineering</strong>.
          </p>
        </div>

        <div className="gl-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F1E1D]">
            <GitBranch className="w-4 h-4 text-[#8A38F5]" />
            <h3>Prerequisite Graphs</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            Skills are organized in strict dependency sequences. For example, Machine Learning requires demonstrable foundations in Python and Data Analysis.
          </p>
        </div>

        <div className="gl-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F1E1D]">
            <ShieldCheck className="w-4 h-4 text-[#4361EE]" />
            <h3>Deterministic Calibration</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            Every canonical competency has an associated 5-tier evaluation rubric to prevent subjective human bias or arbitrary self-assessments.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="gl-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
          <input
            type="text"
            placeholder="Search taxonomy by canonical term, synonym, alias, or discipline..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pill-input pl-10 text-xs w-full"
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Category Navigation */}
        <div className="gl-card p-4 space-y-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] px-2 block mb-2">
            Taxonomy Domains ({taxonomyCategories.length})
          </span>

          {taxonomyCategories.map((cat) => {
            const count = skills.filter(
              (s) => s.category.toLowerCase() === cat.name.toLowerCase()
            ).length;
            const isSelected = selectedCatId === cat.id && !search.trim();

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCatId(cat.id);
                  setSearch("");
                }}
                className={`w-full text-left p-3 rounded-2xl transition-all text-xs flex items-center justify-between ${
                  isSelected
                    ? "bg-[#1F1E1D] text-white shadow-sm font-bold"
                    : "hover:bg-[#FAF8F5] text-[#5A5550]"
                }`}
              >
                <div>
                  <div>{cat.name}</div>
                  <div
                    className={`text-[10px] truncate max-w-[140px] ${
                      isSelected ? "text-gray-300" : "text-[#8C827A]"
                    }`}
                  >
                    {cat.description}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#EFEAE1] text-[#1F1E1D]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Column: Category Details & Skills */}
        <div className="lg:col-span-3 space-y-6">
          {!search.trim() && activeCategory && (
            <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5]">
              <div className="flex items-center gap-2 mb-1">
                <FolderTree className="w-4 h-4 text-[#2E6941]" />
                <span className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">
                  Domain Specification
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#1F1E1D]">{activeCategory.name}</h2>
              <p className="text-xs text-[#5A5550] mt-1.5 leading-relaxed">
                {activeCategory.description}
              </p>
            </div>
          )}

          {/* List of Skills */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1F1E1D] uppercase tracking-wider">
                {search.trim()
                  ? `Search Results (${filteredSkills.length})`
                  : `Member Competencies (${filteredSkills.length})`}
              </h3>
            </div>

            {filteredSkills.length === 0 ? (
              <div className="gl-card p-12 text-center text-xs text-[#8C827A]">
                No skills cataloged under this criteria yet.
              </div>
            ) : (
              filteredSkills.map((skill) => {
                const prerequisites = skills.filter((s) =>
                  skill.prerequisiteSkillIds.includes(s.id)
                );
                const related = skills.filter((s) =>
                  skill.relatedSkillIds.includes(s.id)
                );

                return (
                  <div
                    key={skill.id}
                    className="gl-card p-6 space-y-4 hover:shadow-sm transition-shadow border-[#E4DDD3]"
                  >
                    {/* Top Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                            {skill.category}
                          </span>
                          <SkillVerificationBadge state={skill.verificationState} />
                        </div>
                        <h4 className="text-lg font-bold text-[#1F1E1D]">
                          {skill.canonicalName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <ProficiencyBadge
                          level={
                            skill.verificationState === "verified"
                              ? skill.verifiedProficiency
                              : skill.estimatedProficiency
                          }
                        />
                        <Link
                          href={`/app/passport/skills/${skill.id}`}
                          className="pill-btn pill-btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
                        >
                          View Profile
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Definition */}
                    <p className="text-xs text-[#5A5550] leading-relaxed">
                      {skill.definition}
                    </p>

                    {/* Aliases */}
                    {skill.aliases.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#F0EBE1] text-xs">
                        <span className="text-[11px] font-bold text-[#8C827A]">
                          Normalized Aliases:
                        </span>
                        {skill.aliases.map((alias) => (
                          <span
                            key={alias}
                            className="text-[10px] bg-[#FAF8F5] text-[#5A5550] px-2 py-0.5 rounded-full border border-[#EBE5DC]"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Dependency / Ontology Graphs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#F0EBE1] text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] flex items-center gap-1 mb-1">
                          <GitBranch className="w-3 h-3 text-[#8A38F5]" />
                          Prerequisites
                        </span>
                        {prerequisites.length === 0 ? (
                          <span className="text-[11px] text-[#8C827A] italic">None required</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {prerequisites.map((p) => (
                              <Link
                                key={p.id}
                                href={`/app/passport/skills/${p.id}`}
                                className="text-[11px] font-medium text-[#1F1E1D] hover:underline bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#EBE5DC]"
                              >
                                {p.canonicalName}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] flex items-center gap-1 mb-1">
                          <Network className="w-3 h-3 text-[#4361EE]" />
                          Adjacent Competencies
                        </span>
                        {related.length === 0 ? (
                          <span className="text-[11px] text-[#8C827A] italic">None mapped</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {related.map((r) => (
                              <Link
                                key={r.id}
                                href={`/app/passport/skills/${r.id}`}
                                className="text-[11px] font-medium text-[#1F1E1D] hover:underline bg-[#FAF8F5] px-2 py-0.5 rounded-lg border border-[#EBE5DC]"
                              >
                                {r.canonicalName}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
