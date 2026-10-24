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
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import EvidenceHealthDonut from "@/components/passport/EvidenceHealthDonut";

export default function EvidenceCoveragePage() {
  const { skills, evidenceItems } = useEvidence();
  const [filterState, setFilterState] = useState<string>("all");

  const sufficientSkills = skills.filter((s) => s.coverageState === "sufficient");
  const incompleteSkills = skills.filter((s) => s.coverageState === "incomplete");
  const insufficientSkills = skills.filter((s) => s.coverageState === "insufficient");
  const conflictingSkills = skills.filter((s) => s.coverageState === "conflicting");

  const totalSkills = skills.length;
  const coveragePercentage = totalSkills > 0
    ? Math.round((sufficientSkills.length / totalSkills) * 100)
    : 0;

  const filteredSkills = skills.filter((s) => {
    if (filterState === "all") return true;
    return s.coverageState === filterState;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Coverage Analysis"
        description="Evaluate whether your technical competencies are supported by robust, varied, and fresh evidence artifacts, or if coverage deficits exist."
        badge="Domain 2 · Evidence Health"
        badgeColor="border-emerald-300 text-emerald-800 bg-emerald-50"
      >
        <Link
          href="/app/evidence/connect"
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Work Source
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Interactive Evidence Health Donut & Scorecard */}
      <EvidenceHealthDonut
        sufficientCount={sufficientSkills.length}
        incompleteCount={incompleteSkills.length}
        insufficientCount={insufficientSkills.length}
        conflictingCount={conflictingSkills.length}
        activeFilter={filterState}
        onSelectFilter={setFilterState}
      />


      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterState("all")}
          className={`pill-btn text-xs ${
            filterState === "all" ? "pill-btn-primary" : "pill-btn-secondary"
          }`}
        >
          All Competencies ({skills.length})
        </button>
        <button
          onClick={() => setFilterState("sufficient")}
          className={`pill-btn text-xs ${
            filterState === "sufficient" ? "pill-btn-primary" : "pill-btn-secondary"
          }`}
        >
          Sufficient ({sufficientSkills.length})
        </button>
        <button
          onClick={() => setFilterState("incomplete")}
          className={`pill-btn text-xs ${
            filterState === "incomplete" ? "pill-btn-primary" : "pill-btn-secondary"
          }`}
        >
          Incomplete ({incompleteSkills.length})
        </button>
        <button
          onClick={() => setFilterState("insufficient")}
          className={`pill-btn text-xs ${
            filterState === "insufficient" ? "pill-btn-primary" : "pill-btn-secondary"
          }`}
        >
          Insufficient ({insufficientSkills.length})
        </button>
      </div>

      {/* Coverage Inventory List */}
      <div className="gl-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-[#FAF8F5] border-b border-[#EBE5DC] text-[11px] uppercase tracking-wider text-[#8C827A]">
              <tr>
                <th className="py-3 px-4 font-bold">Skill Name</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Coverage State</th>
                <th className="py-3 px-4 font-bold">Artifacts Linked</th>
                <th className="py-3 px-4 font-bold">Last Corroboration</th>
                <th className="py-3 px-4 font-bold">Recommended Action</th>
                <th className="py-3 px-4 font-bold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EBE1]">
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#8C827A]">
                    {skills.length === 0
                      ? "No competencies catalogued yet. Ingest workplace artifacts or review candidates to track evidence coverage."
                      : "No competencies match this coverage filter."}
                  </td>
                </tr>
              ) : (
                filteredSkills.map((skill) => {

                const linkedCount = skill.evidenceIds.length;

                return (
                  <tr key={skill.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#1F1E1D]">
                      <div>{skill.canonicalName}</div>
                      <div className="text-[10px] text-[#8C827A] font-normal">
                        Status: {skill.verificationState}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550]">{skill.category}</td>
                    <td className="py-3.5 px-4">
                      <CoverageBadge state={skill.coverageState} />
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550]">
                      <span className="font-bold text-[#1F1E1D]">{linkedCount}</span> artifacts
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550]">
                      {skill.lastEvidenceDate}
                    </td>
                    <td className="py-3.5 px-4 text-[#5A5550] max-w-xs">
                      {skill.coverageState === "sufficient" ? (
                        <span className="text-[#2E6941] font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Meets verification criteria
                        </span>
                      ) : skill.coverageState === "incomplete" ? (
                        <span className="text-[#B07219] font-medium">
                          Add production codebase or peer verification
                        </span>
                      ) : (
                        <span className="text-[#BA1A1A] font-medium">
                          Connect repository or upload proof
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/app/passport/skills/${skill.id}/evidence`}
                        className="font-bold text-[#1F1E1D] hover:text-[#2E6941] inline-flex items-center gap-1"
                      >
                        Evidence
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              }))}
            </tbody>

          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
