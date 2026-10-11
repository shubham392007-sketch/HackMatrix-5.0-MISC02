"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  evaluateRoleMatch,
  extractGapRecords,
  evaluateCareerReadiness,
} from "@/lib/careerCalculations";
import {
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  Briefcase,
  FileText,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Info,
  Sparkles,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { SAMPLE_JOB_DESCRIPTIONS } from "@/data/careerMock";

export default function CustomJobModePage() {
  const {
    customRoles,
    selectedRoleId,
    setSelectedRoleId,
    saveCustomRole,
    skills,
  } = useEvidence();

  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Helper to load sample JD directly
  const handleLoadSample = (sampleIndex: number) => {
    const sample = SAMPLE_JOB_DESCRIPTIONS[sampleIndex];
    if (!sample) return;

    // Create custom role from sample
    const newCustomRole = {
      role_id: `custom-job-${Date.now()}`,
      version: "vCustom.1",
      title: sample.title,
      seniority: "Entry Level" as const,
      context: `${sample.company} &bull; Custom Target`,
      description: sample.text.slice(0, 200) + "...",
      provenance: `Parsed from sample posting (${sample.company})`,
      source_type: "custom_parsed_job" as const,
      competencies: [
        {
          skill_id: "skill-python",
          canonical_name: "Python",
          category: "Languages",
          requirement_type: "core_required" as const,
          importance: "critical" as const,
          expected_level: "Practitioner" as const,
          expected_level_numeric: 3,
          evidence_expectation: "Production code, test coverage, async workflows",
          prerequisites: [],
          reason_codes: ["EXPLICIT_REQUIREMENT_SPAN"],
          source_references: ["Requirements: Strong Python programming"],
          mapping_status: "mapped" as const,
        },
        {
          skill_id: "skill-rag-architecture",
          canonical_name: "RAG Architecture",
          category: "AI & ML",
          requirement_type: "core_required" as const,
          importance: "critical" as const,
          expected_level: "Practitioner" as const,
          expected_level_numeric: 3,
          evidence_expectation: "Vector databases, chunking, retriever evaluation",
          prerequisites: ["skill-python"],
          reason_codes: ["EXPLICIT_REQUIREMENT_SPAN"],
          source_references: ["Build retrieval systems with vector DBs"],
          mapping_status: "mapped" as const,
        },
        {
          skill_id: "skill-prompt-engineering",
          canonical_name: "Prompt Engineering",
          category: "AI & ML",
          requirement_type: "supporting" as const,
          importance: "high" as const,
          expected_level: "Working" as const,
          expected_level_numeric: 2,
          evidence_expectation: "Structured prompts, evaluation test cases",
          prerequisites: [],
          reason_codes: ["EXPLICIT_REQUIREMENT_SPAN"],
          source_references: ["Prompt engineering and tool use"],
          mapping_status: "mapped" as const,
        },
        {
          skill_id: "skill-docker",
          canonical_name: "Docker & Containerization",
          category: "Infrastructure",
          requirement_type: "supporting" as const,
          importance: "medium" as const,
          expected_level: "Working" as const,
          expected_level_numeric: 2,
          evidence_expectation: "Dockerfiles, compose, multi-stage builds",
          prerequisites: [],
          reason_codes: ["EXPLICIT_REQUIREMENT_SPAN"],
          source_references: ["Container deployment with Docker"],
          mapping_status: "mapped" as const,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveCustomRole(newCustomRole);
    setSelectedRoleId(newCustomRole.role_id);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Custom Job Mode & Saved Postings"
        description="Evaluate your verified SkillPassport evidence against arbitrary real-world job descriptions. Turn external job postings into temporary versioned role models without corrupting core taxonomy benchmarks."
        badge="Custom Job Mode"
        badgeColor="border-purple-300 text-purple-900 bg-purple-100"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Parser Guidelines
        </button>
        <Link
          href="/app/career/job-parser"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Parse New Job Description →
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Explainer Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-50 via-white to-sand/20 border border-purple-200/80 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-purple-100 border border-purple-300 flex items-center justify-center shrink-0 mt-0.5 text-purple-900">
          <Briefcase className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 text-xs text-ink/80">
          <h3 className="font-bold text-ink text-sm">
            How Custom Job Mode Protects Measurement Integrity
          </h3>
          <p className="leading-relaxed">
            When recruiters upload unstandardized job postings, generic systems perform superficial word-matching.
            SkillPassport parses job requirements into <strong>canonical taxonomy competencies</strong> with explicit source spans.
            This gives you instant gap diagnosis while preserving verifiable evidence standards.
          </p>
        </div>
      </div>

      {/* Custom Roles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-ink-muted px-1">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <FileText className="w-4 h-4 text-ink" />
            Your Saved Custom Job Models ({customRoles.length})
          </h2>
          <span className="text-[11px]">
            Saved locally in browser workspace
          </span>
        </div>

        {customRoles.length === 0 ? (
          <div className="gl-card p-10 text-center space-y-4 border-dashed border-ink/20">
            <div className="w-12 h-12 rounded-full bg-sand/30 border border-ink/10 flex items-center justify-center mx-auto text-ink-muted">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-ink">
                No custom job descriptions parsed yet
              </h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Paste any real job posting from LinkedIn, Greenhouse, or Lever to generate an instant evidence-aware match.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/app/career/job-parser"
                className="pill-btn pill-btn-primary text-xs py-2 px-5"
              >
                Go to Job Description Parser
              </Link>
              <button
                onClick={() => handleLoadSample(0)}
                className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-4 text-ink"
              >
                Load Sample: "Junior AI Application Engineer"
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customRoles.map((role) => {
              const match = evaluateRoleMatch(role, skills);
              const gaps = extractGapRecords(match, role);
              const readiness = evaluateCareerReadiness(match, gaps);
              const isActive = selectedRoleId === role.role_id;

              return (
                <div
                  key={role.role_id}
                  className={`gl-card p-5 space-y-4 border-ink/15 transition-all ${
                    isActive
                      ? "ring-2 ring-ink bg-white shadow-md"
                      : "bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold border border-purple-200">
                          Custom Parsed Job
                        </span>
                        <span className="text-[10px] font-mono text-ink-muted">
                          {role.version}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-ink">
                        {role.title}
                      </h3>
                      <p className="text-xs text-ink-muted line-clamp-1">
                        {role.context}
                      </p>
                    </div>

                    {isActive ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-lime text-ink border border-ink/20 shrink-0">
                        Active Target
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedRoleId(role.role_id)}
                        className="pill-btn bg-sand/20 hover:bg-sand/40 text-[11px] py-1 px-3 text-ink shrink-0"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-sand/20 border border-ink/10 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-ink-muted block">Match</span>
                      <strong className="text-base font-bold text-ink">
                        {match.overall_match_score}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block">Readiness</span>
                      <strong className="text-base font-bold text-ink">
                        {readiness.readiness_index}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-muted block">Gaps</span>
                      <strong className="text-base font-bold text-amber-800">
                        {gaps.length}
                      </strong>
                    </div>
                  </div>

                  {/* Competency Tags */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[11px] text-ink-muted block">
                      Parsed Competencies ({role.competencies.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {role.competencies.map((c) => (
                        <span
                          key={c.skill_id}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-ink/10 text-ink"
                        >
                          {c.canonical_name} ({c.expected_level})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-ink/10 flex items-center justify-between text-xs">
                    <Link
                      href={`/app/career/roles/${role.role_id}`}
                      className="font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      <span>Demand Breakdown</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      href="/app/career/match"
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-[11px] py-1 px-2.5 text-ink"
                    >
                      Inspect Match Matrix
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
    </div>
  </div>
);
}
