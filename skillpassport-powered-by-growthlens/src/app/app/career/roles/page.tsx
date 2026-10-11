"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Layers,
  Compass,
  FileCode,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { DemoDataNotice, DemoRoleSelector } from "@/components/app/AIBadges";
import { RequirementTypeBadge } from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";

export default function TargetRolesCataloguePage() {
  const { targetRoles, selectedRoleId, setSelectedRoleId } = useEvidence();
  const [searchQuery, setSearchQuery] = useState("");
  const [seniorityFilter, setSeniorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filteredRoles = targetRoles.filter((role) => {
    if (seniorityFilter !== "all" && role.seniority !== seniorityFilter) return false;
    if (sourceFilter !== "all" && role.source_type !== sourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = `${role.title} ${role.context} ${role.description}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Explore Your Next Role"
        description="Compare the capabilities you can demonstrate with the requirements of a role you want to pursue. Select a curated industry benchmark or create your own custom model from any job description."
        badge="Demo Role Models"
      >
        <Link
          href="/app/career/job-parser"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" /> Parse Custom Job Description
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Filter and Search Bar */}
      <div className="gl-card p-4 bg-white space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search roles by title, domain context, or technology..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input w-full pl-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={seniorityFilter}
              onChange={(e) => setSeniorityFilter(e.target.value)}
              className="pill-input text-xs"
            >
              <option value="all">All Seniority Levels</option>
              <option value="Entry Level">Entry Level</option>
              <option value="Mid Level">Mid Level</option>
              <option value="Senior Level">Senior Level</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="pill-input text-xs"
            >
              <option value="all">All Role Sources</option>
              <option value="curated_model">Curated Benchmark</option>
              <option value="custom_parsed_job">Custom Parsed Jobs</option>
            </select>

            {(searchQuery || seniorityFilter !== "all" || sourceFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSeniorityFilter("all");
                  setSourceFilter("all");
                }}
                className="text-xs text-ink-muted hover:text-ink underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRoles.map((role) => {
          const isSelected = role.role_id === selectedRoleId;
          const coreCount = role.competencies.filter((c) => c.requirement_type === "core_required").length;
          const suppCount = role.competencies.filter((c) => c.requirement_type !== "core_required").length;

          return (
            <div
              key={role.role_id}
              className={`gl-card p-6 bg-white transition-all border flex flex-col justify-between space-y-4 ${
                isSelected
                  ? "ring-2 ring-ink border-ink shadow-md"
                  : "border-ink/10 hover:border-ink/30"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand font-bold text-ink uppercase">
                      {role.seniority}
                    </span>
                    <span className="text-[10px] font-mono text-ink-muted">{role.version}</span>
                    {role.source_type === "custom_parsed_job" && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-bold">
                        Custom Role
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-lime text-ink border border-ink/20 font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Active Target
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-ink">{role.title}</h3>
                  <span className="text-xs font-mono text-ink-muted block mt-0.5">
                    Context: <strong>{role.context}</strong>
                  </span>
                  <p className="text-xs text-ink/80 mt-2 line-clamp-3 leading-relaxed">
                    {role.description}
                  </p>
                </div>

                {/* Competencies count preview */}
                <div className="pt-2 flex items-center gap-4 text-xs font-mono text-ink-muted">
                  <span>
                    <strong className="text-red-900">{coreCount}</strong> Core Required
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong className="text-sky-900">{suppCount}</strong> Supporting / Preferred
                  </span>
                </div>

                {/* Key competency badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {role.competencies.slice(0, 5).map((comp) => (
                    <span
                      key={comp.skill_id}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-sand/30 border border-ink/10 text-ink font-mono"
                    >
                      {comp.canonical_name} ({comp.expected_level})
                    </span>
                  ))}
                  {role.competencies.length > 5 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md text-ink-muted font-mono">
                      +{role.competencies.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Action Footer */}
              <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3 text-xs">
                <Link
                  href={`/app/career/roles/${role.role_id}`}
                  className="text-ink hover:underline font-semibold flex items-center gap-1"
                >
                  View Requirements <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRoleId(role.role_id)}
                    className={`pill-btn text-xs py-2 px-3.5 flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-sand/30 border border-ink text-ink font-bold"
                        : "bg-white hover:bg-sand/20 border border-ink/20 text-ink"
                    }`}
                  >
                    {isSelected ? "Active Target" : "Set as Target"}
                  </button>

                  <Link
                    href="/app/career/match"
                    onClick={() => setSelectedRoleId(role.role_id)}
                    className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
                  >
                    Compare My Skills &rarr;
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}
