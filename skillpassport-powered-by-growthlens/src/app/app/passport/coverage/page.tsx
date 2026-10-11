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
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/passport" className="hover:text-[#1F1E1D]">
              Passport
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Evidence Coverage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Evidence Coverage Analysis
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Evaluate whether your technical competencies are supported by robust, varied, and fresh evidence artifacts, or if coverage deficits exist.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/evidence/connect"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Work Source
          </Link>
        </div>
      </div>

      {/* Coverage Health Scorecard */}
      <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">
              Passport Evidence Health
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-[#1F1E1D]">
                {coveragePercentage}%
              </span>
              <span className="text-sm font-bold text-[#2E6941]">
                Sufficiently Corroborated
              </span>
            </div>
            <p className="text-xs text-[#5A5550] max-w-md">
              {sufficientSkills.length} of {totalSkills} recognized competencies meet organizational thresholds for comprehensive evidence backing.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E0D9CD] text-center">
              <div className="text-2xl font-bold text-[#2E6941]">{sufficientSkills.length}</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Sufficient</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#E0D9CD] text-center">
              <div className="text-2xl font-bold text-[#B07219]">{incompleteSkills.length}</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Incomplete</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#E0D9CD] text-center">
              <div className="text-2xl font-bold text-[#BA1A1A]">{insufficientSkills.length}</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Insufficient</div>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-[#E0D9CD] text-center">
              <div className="text-2xl font-bold text-[#8A38F5]">{conflictingSkills.length}</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Conflicting</div>
            </div>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="mt-6 pt-4 border-t border-[#E8E1D5]">
          <div className="h-3 w-full bg-[#E5DFD5] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${(sufficientSkills.length / totalSkills) * 100}%` }}
              className="bg-[#2E6941] h-full"
              title="Sufficient"
            />
            <div
              style={{ width: `${(incompleteSkills.length / totalSkills) * 100}%` }}
              className="bg-[#B07219] h-full"
              title="Incomplete"
            />
            <div
              style={{ width: `${(insufficientSkills.length / totalSkills) * 100}%` }}
              className="bg-[#BA1A1A] h-full"
              title="Insufficient"
            />
            <div
              style={{ width: `${(conflictingSkills.length / totalSkills) * 100}%` }}
              className="bg-[#8A38F5] h-full"
              title="Conflicting"
            />
          </div>
        </div>
      </div>

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
          <table className="w-full text-left text-xs">
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
              {filteredSkills.map((skill) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
