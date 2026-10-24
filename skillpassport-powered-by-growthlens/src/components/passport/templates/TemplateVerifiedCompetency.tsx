"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  ExternalLink,
  Mail,
  Layers,
  AlertCircle,
  Briefcase,
  Sparkles,
  FileText,
  Bookmark,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ShareProjection,
  AuthorizedVerifiedSkill,
  AuthorizedCustomSkill,
} from "@/types/sharing";
import PassportOptionalSections from "./PassportOptionalSections";

export interface TemplateProps {
  projection: ShareProjection;
  onSelectSkill: (skill: AuthorizedVerifiedSkill | AuthorizedCustomSkill) => void;
  onInspectEvidence?: (evidenceId: string) => void;
  onOpenContact?: () => void;
  isPreview?: boolean;
}

export default function TemplateVerifiedCompetency({
  projection,
  onSelectSkill,
  onInspectEvidence,
  onOpenContact,
  isPreview,
}: TemplateProps) {
  const profile = projection.candidateProfile;
  const verifiedSkills = projection.verifiedSkills || [];
  const customSkills = projection.customSkills || [];
  const evidence = projection.authorizedEvidence || [];
  const alignment = projection.roleAlignment;
  const certifications = projection.certifications || [];

  // Group verified skills by category for secondary column overview
  const categories = Array.from(new Set(verifiedSkills.map((s) => s.category || "General")));

  // Determine if secondary column has sufficient content
  const hasSecondaryContent = certifications.length > 0 || !!alignment || categories.length > 1;

  // Search & Filtering State for Large Competency Sets
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllCustom, setShowAllCustom] = useState(false);

  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(verifiedSkills.map((s) => s.category || "General").filter(Boolean)));
    return ["All", ...cats];
  }, [verifiedSkills]);

  const filteredVerifiedSkills = useMemo(() => {
    return verifiedSkills.filter((s) => {
      const matchCat = selectedCategory === "All" || (s.category || "General") === selectedCategory;
      if (!matchCat) return false;
      if (!skillSearch.trim()) return true;
      const q = skillSearch.toLowerCase();
      return (
        s.canonicalName.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.verifiedProficiency && s.verifiedProficiency.toLowerCase().includes(q))
      );
    });
  }, [verifiedSkills, selectedCategory, skillSearch]);

  const INITIAL_SKILLS_LIMIT = 8;
  const isFiltered = skillSearch.trim().length > 0 || selectedCategory !== "All";
  const visibleVerifiedSkills = showAllSkills || isFiltered
    ? filteredVerifiedSkills
    : filteredVerifiedSkills.slice(0, INITIAL_SKILLS_LIMIT);

  const INITIAL_CUSTOM_LIMIT = 6;
  const visibleCustomSkills = showAllCustom
    ? customSkills
    : customSkills.slice(0, INITIAL_CUSTOM_LIMIT);

  return (
    <div className="space-y-8 font-sans">
      {/* Top Identity Band - Premium Editorial Credential Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#1C1C1C]/15">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Verified Competency Passport
              </span>
              <span className="text-xs text-[#1C1C1C]/60 font-mono">
                PostgreSQL Cryptographic Provenance
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#1C1C1C] tracking-tight">
              {profile.displayName || "Verified Candidate"}
            </h1>

            {profile.headline && (
              <p className="text-lg font-bold text-[#1C1C1C]/80 leading-snug">
                {profile.headline}
              </p>
            )}

            {profile.summary && (
              <p className="text-sm text-[#1C1C1C]/75 leading-relaxed pt-1">
                {profile.summary}
              </p>
            )}

            {(profile.contactEmail || profile.contactLinkedIn) && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {profile.contactEmail && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-xs font-bold text-[#1C1C1C]">
                    <Mail className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
                    {profile.contactEmail}
                  </span>
                )}
                {profile.contactLinkedIn && (
                  <a
                    href={
                      profile.contactLinkedIn.startsWith("http")
                        ? profile.contactLinkedIn
                        : `https://${profile.contactLinkedIn}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-xs font-bold text-[#1C1C1C] hover:bg-[#000000] hover:text-[#FAF8F5] transition-colors"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5 text-[#0077b5]" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-6 py-3 rounded-full bg-[#000000] hover:bg-[#1A1918] border-[2px] border-[#1A1918] text-xs font-black tracking-wider uppercase text-[#FAF8F5] shadow-[3px_3px_0_0_#1C1C1C] flex items-center gap-2 shrink-0 cursor-pointer transition-all self-start"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Candidate</span>
            </button>
          )}
        </div>

        {/* Verification Guarantee */}
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#1C1C1C]/15 text-xs text-[#1C1C1C]/80 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{projection.verificationGuaranteeNote}</p>
        </div>
      </div>

      {/* Main Two-Column Structure (collapses to full width if no secondary content) */}
      <div
        className={`grid grid-cols-1 ${
          hasSecondaryContent ? "lg:grid-cols-12 gap-8" : "gap-8"
        }`}
      >
        {/* Primary Column: Verified Competencies, Evidence, and Experience */}
        <div className={hasSecondaryContent ? "lg:col-span-8 space-y-8" : "space-y-8"}>
          {/* Section 1: Verified Capabilities */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h2 className="text-lg font-black text-[#1C1C1C]">
                  Verified Competencies ({verifiedSkills.length})
                </h2>
              </div>
              <span className="text-xs text-[#1C1C1C]/60 font-semibold">
                Click any skill to inspect supporting workplace proof
              </span>
            </div>

            {/* Filter and Search Bar for large skill sets */}
            {verifiedSkills.length > 0 && (
              <div className="space-y-3 bg-[#FFFFFF] p-3.5 rounded-xl border border-[#1C1C1C]/15 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#1C1C1C]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder={`Search ${verifiedSkills.length} verified competencies by keyword, category, or proficiency...`}
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[#1C1C1C]/20 focus:border-[#1C1C1C] focus:outline-none bg-[#FDFBF7]"
                  />
                  {skillSearch && (
                    <button
                      onClick={() => setSkillSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/40 hover:text-[#1C1C1C]"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {allCategories.length > 2 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {allCategories.map((cat) => {
                      const count =
                        cat === "All"
                          ? verifiedSkills.length
                          : verifiedSkills.filter((s) => (s.category || "General") === cat).length;
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                            active
                              ? "bg-[#1C1C1C] text-[#DFE968] border-[#1C1C1C]"
                              : "bg-[#FDFBF7] text-[#1C1C1C]/70 border-[#1C1C1C]/15 hover:border-[#1C1C1C]/40"
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Skill Cards Grid */}
            {verifiedSkills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] text-center text-sm text-[#1C1C1C]/60">
                No verified competencies authorized for this share configuration.
              </div>
            ) : filteredVerifiedSkills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FFFFFF] border border-[#1C1C1C]/15 text-center text-xs text-[#1C1C1C]/60 space-y-2">
                <p>No verified competencies matched "{skillSearch}".</p>
                <button
                  onClick={() => {
                    setSkillSearch("");
                    setSelectedCategory("All");
                  }}
                  className="text-xs font-bold underline text-ink"
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleVerifiedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      onClick={() => onSelectSkill(skill)}
                      className="p-5 rounded-xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#1C1C1C] transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                            {skill.category}
                          </span>
                          <h3 className="text-base font-black text-[#1C1C1C] leading-tight">
                            {skill.canonicalName}
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black">
                          {skill.verifiedProficiency}
                        </span>
                      </div>

                      <p className="text-xs text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                        {skill.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-2 border-t border-[#1C1C1C]/10 font-bold">
                        <span className="flex items-center gap-1 text-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Verified Workplace Proof
                        </span>
                        <span>{skill.evidenceCount} Artifacts &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredVerifiedSkills.length > INITIAL_SKILLS_LIMIT && !isFiltered && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setShowAllSkills(!showAllSkills)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] text-xs font-black text-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] hover:bg-[#000000] hover:text-[#FAF8F5] transition-all cursor-pointer"
                    >
                      {showAllSkills ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>Show Top {INITIAL_SKILLS_LIMIT} Competencies Only</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Show All {filteredVerifiedSkills.length} Verified Competencies</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-[#1C1C1C]/50 mt-1 font-mono">
                      Showing {visibleVerifiedSkills.length} of {filteredVerifiedSkills.length} skills
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Section 2: Self-Declared Skills (Strictly Separated) */}
          {customSkills.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Self-Declared Skills ({customSkills.length})
                  </h2>
                  <p className="text-xs text-[#1C1C1C]/60 font-medium">
                    Self-Declared · Not independently verified
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase">
                  Candidate Claims
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleCustomSkills.map((skill) => (
                  <div
                    key={skill.id}
                    onClick={() => onSelectSkill(skill)}
                    className="p-5 rounded-xl bg-amber-50/40 border-[1.5px] border-amber-300 hover:border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-black text-[#1C1C1C]">{skill.title}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold">
                        Self-Assessed: {skill.selfAssessedLevel}
                      </span>
                    </div>
                    <p className="text-xs text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                      {skill.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-[#1C1C1C]/60 pt-1 border-t border-amber-200">
                      <span className="text-amber-800 font-bold">{skill.verificationLabel}</span>
                      <span>Inspect claim &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>

              {customSkills.length > INITIAL_CUSTOM_LIMIT && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowAllCustom(!showAllCustom)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFFFF] border border-amber-300 text-xs font-bold text-[#1C1C1C] shadow-sm hover:bg-amber-50 transition-all cursor-pointer"
                  >
                    {showAllCustom ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Show Top {INITIAL_CUSTOM_LIMIT} Claims Only</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Show All {customSkills.length} Self-Declared Claims</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Optional Sections (Experience, Projects, Education) */}
          <PassportOptionalSections
            projection={projection}
            theme="classic"
            onInspectEvidence={onInspectEvidence}
          />

          {/* Section 3: Authorized Evidence Summaries */}
          <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1C1C1C] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1C1C1C]" />
                Authorized Workplace Evidence ({evidence.length})
              </h2>
              <span className="text-xs text-[#1C1C1C]/60 font-semibold">
                Grounded in genuine repositories, documents & work items
              </span>
            </div>

            {evidence.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] text-center text-xs text-[#1C1C1C]/60">
                No evidence summaries authorized for public display.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50">
                          {ev.sourceType || "Artifact"}
                        </span>
                        <span className="text-[10px] font-mono text-[#1C1C1C]/60">
                          {ev.project}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-[#1C1C1C] line-clamp-1">
                        {ev.title}
                      </h4>
                      <p className="text-[11px] text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                        {ev.shortSummary}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#1C1C1C]/10 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#1C1C1C]/60">
                        {ev.claimedContribution}
                      </span>
                      {ev.allowDetailInspection && onInspectEvidence ? (
                        <button
                          onClick={() => onInspectEvidence(ev.id)}
                          className="text-[10px] font-black uppercase text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#1C1C1C]/40 font-medium">
                          Summary Only
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Column: Overview, Certifications, Role Alignment */}
        {hasSecondaryContent && (
          <div className="lg:col-span-4 space-y-6">
            {/* Category Overview Card */}
            {categories.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5 border-b border-[#1C1C1C]/10 pb-2">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-700" />
                  Competency Domains
                </h3>
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const count = verifiedSkills.filter((s) => (s.category || "General") === cat).length;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-0"
                      >
                        <span className="font-bold text-[#1C1C1C]">{cat}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold">
                          {count} verified
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Role Alignment Card (if enabled) */}
            {alignment && (
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#1C1C1C]" />
                    <h3 className="text-xs font-black text-[#1C1C1C] uppercase tracking-wider">
                      Role Match
                    </h3>
                  </div>
                  {alignment.alignmentScore && (
                    <span className="px-2 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black">
                      {alignment.alignmentScore}%
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#1C1C1C]">{alignment.targetRoleTitle}</div>
                <p className="text-[11px] text-[#1C1C1C]/75 leading-relaxed">
                  {alignment.alignmentSummary}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alignment.strengths.slice(0, 3).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-bold"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications (if populated) */}
            {certifications.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5 border-b border-[#1C1C1C]/10 pb-2">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Credentials ({certifications.length})
                </h3>
                <div className="space-y-3">
                  {certifications.map((c) => (
                    <div key={c.id} className="space-y-1 text-xs">
                      <div className="font-bold text-[#1C1C1C]">{c.name}</div>
                      <div className="text-[11px] text-[#1C1C1C]/60 flex items-center justify-between">
                        <span>{c.issuer}</span>
                        {c.issueDate && <span className="font-mono">{c.issueDate}</span>}
                      </div>
                      {c.credentialUrl && (
                        <a
                          href={c.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5 pt-0.5"
                        >
                          Verify Credential <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Candidate-Authored Optional & Custom Sections */}
      <div className="pt-4 border-t border-[#1C1C1C]/15">
        <PassportOptionalSections
          projection={projection}
          theme="classic"
          onInspectEvidence={onInspectEvidence}
          excludeSections={hasSecondaryContent && certifications.length > 0 ? ["certifications"] : []}
        />
      </div>
    </div>
  );
}

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);
