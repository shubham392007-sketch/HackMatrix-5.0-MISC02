"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { CoverageState } from "@/types/passport";
import {
  CoverageBadge,
  SkillVerificationBadge,
  ProficiencyBadge,
} from "@/components/app/SkillBadges";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
  FolderGit2,
  Calendar,
  CheckCircle2,
  Filter,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import EvidenceHealthDonut from "@/components/passport/EvidenceHealthDonut";

export default function EvidenceCoveragePage() {
  const { skills, evidenceItems } = useEvidence();
  const [filterState, setFilterState] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const sufficientSkills = skills.filter((s) => s.coverageState === "sufficient");
  const incompleteSkills = skills.filter((s) => s.coverageState === "incomplete");
  const insufficientSkills = skills.filter((s) => s.coverageState === "insufficient");
  const conflictingSkills = skills.filter((s) => s.coverageState === "conflicting");

  const totalSkills = skills.length;
  const coveragePercentage = totalSkills > 0
    ? Math.round((sufficientSkills.length / totalSkills) * 100)
    : 0;

  const filteredSkills = skills.filter((s) => {
    const matchesFilter = filterState === "all" || s.coverageState === filterState;
    const matchesSearch =
      searchQuery.trim() === "" ||
      s.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (state: CoverageState) => {
    switch (state) {
      case "sufficient":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#4A7A4E]/10 text-[#4A7A4E] border border-[#4A7A4E]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A7A4E]" />
            Sufficient
          </span>
        );
      case "incomplete":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#C4A446]/10 text-[#9E822B] border border-[#C4A446]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4A446]" />
            Incomplete
          </span>
        );
      case "insufficient":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#C25450]/10 text-[#C25450] border border-[#C25450]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C25450]" />
            Insufficient
          </span>
        );
      case "conflicting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#5C6B73]/10 text-[#5C6B73] border border-[#5C6B73]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B73]" />
            Conflicting
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#1A1918]/10 text-[#1A1918] border border-[#1A1918]/20">
            {state}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F2EB]">
      <AppTopBar
        title="Evidence Coverage Analysis"
        description="Evaluate whether your technical competencies are supported by robust, varied, and fresh evidence artifacts, or if coverage deficits exist."
        badge="Domain 2 · Evidence Health"
        badgeColor="border-[#1A1918]/20 text-[#1A1918] bg-white font-bold"
      >
        <Link
          href="/app/evidence/connect"
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 font-bold bg-[#1A1918] text-[#FAF8F5]"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Work Source
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Interactive Evidence Health Donut & Scorecard */}
        <EvidenceHealthDonut
          sufficientCount={sufficientSkills.length}
          incompleteCount={incompleteSkills.length}
          insufficientCount={insufficientSkills.length}
          conflictingCount={conflictingSkills.length}
          activeFilter={filterState}
          onSelectFilter={setFilterState}
        />

        {/* Professional Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterState("all")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                filterState === "all"
                  ? "bg-[#1A1918] text-[#FAF8F5] border-2 border-[#1A1918] shadow-[2px_2px_0_0_#1A1918]"
                  : "bg-white text-[#1A1918] border border-[#1A1918]/20 hover:border-[#1A1918]"
              }`}
            >
              All Competencies ({skills.length})
            </button>
            <button
              onClick={() => setFilterState("sufficient")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                filterState === "sufficient"
                  ? "bg-[#4A7A4E] text-white border-2 border-[#4A7A4E] shadow-[2px_2px_0_0_#4A7A4E]"
                  : "bg-white text-[#4A7A4E] border border-[#4A7A4E]/30 hover:border-[#4A7A4E]"
              }`}
            >
              Sufficient ({sufficientSkills.length})
            </button>
            <button
              onClick={() => setFilterState("incomplete")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                filterState === "incomplete"
                  ? "bg-[#C4A446] text-[#FAF8F5] border-2 border-[#C4A446] shadow-[2px_2px_0_0_#C4A446]"
                  : "bg-white text-[#9E822B] border border-[#C4A446]/30 hover:border-[#C4A446]"
              }`}
            >
              Incomplete ({incompleteSkills.length})
            </button>
            <button
              onClick={() => setFilterState("insufficient")}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                filterState === "insufficient"
                  ? "bg-[#C25450] text-white border-2 border-[#C25450] shadow-[2px_2px_0_0_#C25450]"
                  : "bg-white text-[#C25450] border border-[#C25450]/30 hover:border-[#C25450]"
              }`}
            >
              Insufficient ({insufficientSkills.length})
            </button>
          </div>

          <div className="shrink-0 w-full sm:w-64">
            <input
              type="text"
              placeholder="Search competencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3.5 py-1.5 rounded-xl border border-[#1A1918]/25 bg-white text-[#1A1918] font-medium focus:outline-none focus:border-[#1A1918]"
            />
          </div>
        </div>

        {/* Coverage Inventory List Table */}
        <div className="rounded-2xl border-2 border-[#1A1918] bg-white shadow-[3px_3px_0_0_#1A1918] overflow-hidden">
          {/* Table Header Summary Strip */}
          <div className="p-4 bg-[#FAF8F5] border-b-2 border-[#1A1918] flex items-center justify-between text-xs">
            <span className="font-extrabold text-[#1A1918] uppercase tracking-wider text-[11px] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1A1918]" />
              Competency Evidence Ledger
            </span>
            <span className="font-mono font-semibold text-[#1A1918]/70 text-[11px]">
              Showing {filteredSkills.length} of {totalSkills} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px] border-collapse">
              <thead className="bg-white border-b border-[#1A1918]/15 font-mono text-[11px] uppercase tracking-wider text-[#1A1918]">
                <tr>
                  <th className="py-3 px-4 font-bold">Competency Name</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Coverage State</th>
                  <th className="py-3 px-4 font-bold">Linked Proofs</th>
                  <th className="py-3 px-4 font-bold">Last Verified</th>
                  <th className="py-3 px-4 font-bold">Recommended Action</th>
                  <th className="py-3 px-4 font-bold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1918]/10 bg-white">
                {filteredSkills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#1A1918]/60 font-medium">
                      {skills.length === 0
                        ? "No competencies catalogued yet. Ingest workplace artifacts or review candidates to track evidence coverage."
                        : "No competencies match the current filter or search criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredSkills.map((skill) => {
                    const linkedCount = skill.evidenceIds.length;

                    return (
                      <tr key={skill.id} className="hover:bg-[#FAF8F5] transition-colors">
                        {/* Competency Name */}
                        <td className="py-3.5 px-4 font-bold text-[#1A1918]">
                          <div className="text-[13px]">{skill.canonicalName}</div>
                          <div className="text-[10px] font-mono text-[#1A1918]/60 font-semibold mt-0.5 capitalize">
                            Status: {skill.verificationState}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 text-[#1A1918]/80 font-medium">
                          <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#1A1918]/15 text-[11px] font-mono">
                            {skill.category}
                          </span>
                        </td>

                        {/* Coverage State */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(skill.coverageState)}
                        </td>

                        {/* Linked Artifacts */}
                        <td className="py-3.5 px-4 text-[#1A1918]">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                            <FolderGit2 className="w-3.5 h-3.5 text-[#1A1918]/60" />
                            <span>{linkedCount} {linkedCount === 1 ? "Artifact" : "Artifacts"}</span>
                          </div>
                        </td>

                        {/* Last Verified */}
                        <td className="py-3.5 px-4 text-[#1A1918]/70 font-mono text-[11px]">
                          {skill.lastEvidenceDate || "Pending sync"}
                        </td>

                        {/* Recommended Action */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {skill.coverageState === "sufficient" ? (
                            <span className="text-[#4A7A4E] font-semibold text-[11.5px] flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Meets corroboration criteria
                            </span>
                          ) : skill.coverageState === "incomplete" ? (
                            <span className="text-[#9E822B] font-semibold text-[11.5px] flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#C4A446]" />
                              Add PR citation or peer review
                            </span>
                          ) : skill.coverageState === "conflicting" ? (
                            <span className="text-[#5C6B73] font-semibold text-[11.5px] flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Resolve contradictory date logs
                            </span>
                          ) : (
                            <span className="text-[#C25450] font-semibold text-[11.5px] flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Connect repository or upload proof
                            </span>
                          )}
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/app/passport/skills/${skill.id}/evidence`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white hover:bg-[#1A1918] text-[#1A1918] hover:text-[#FAF8F5] border border-[#1A1918]/25 shadow-sm transition-all"
                          >
                            <span>Evidence</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
