"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  evaluateRoleMatch,
  extractGapRecords,
  evaluateCareerReadiness,
} from "@/lib/careerCalculations";
import {
  MatchStatusBadge,
  GapTypeBadge,
  RequirementTypeBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Compass,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";

export default function CompareRolesPage() {
  const { targetRoles, skills, selectedRoleId, setSelectedRoleId } =
    useEvidence();

  // Role selections for side-by-side comparison
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([
    "role-ai-engineer-entry",
    "role-ml-engineer-entry",
  ]);

  const [filterMode, setFilterMode] = useState<
    "all" | "gaps_only" | "differences"
  >("all");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Compute evaluations for each selected role
  const evaluatedRoles = useMemo(() => {
    return selectedRoleIds.map((id) => {
      const role =
        targetRoles.find((r) => r.role_id === id) || targetRoles[0];
      const match = evaluateRoleMatch(role, skills);
      const gaps = extractGapRecords(match, role);
      const readiness = evaluateCareerReadiness(match, gaps);
      return { role, match, gaps, readiness };
    });
  }, [selectedRoleIds, targetRoles, skills]);

  // Aggregate union of all competency skill_ids across selected roles
  const allSkillIds = useMemo(() => {
    const set = new Set<string>();
    evaluatedRoles.forEach((item) => {
      item.role.competencies.forEach((c) => set.add(c.skill_id));
    });
    return Array.from(set);
  }, [evaluatedRoles]);

  // Filter skills based on toggle
  const filteredSkillIds = useMemo(() => {
    return allSkillIds.filter((skillId) => {
      if (filterMode === "all") return true;

      if (filterMode === "gaps_only") {
        // At least one evaluated role has a gap for this skill
        return evaluatedRoles.some((er) =>
          er.gaps.some((g) => g.skill_id === skillId)
        );
      }

      if (filterMode === "differences") {
        // Difference in expected level or requirement type across selected roles
        const reqTypes = new Set(
          evaluatedRoles.map((er) => {
            const comp = er.role.competencies.find(
              (c) => c.skill_id === skillId
            );
            return comp ? comp.requirement_type : "absent";
          })
        );
        return reqTypes.size > 1;
      }

      return true;
    });
  }, [allSkillIds, evaluatedRoles, filterMode]);

  const handleRoleToggle = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      if (selectedRoleIds.length > 2) {
        setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
      }
    } else {
      if (selectedRoleIds.length < 3) {
        setSelectedRoleIds([...selectedRoleIds, roleId]);
      } else {
        // Replace second role
        setSelectedRoleIds([selectedRoleIds[0], roleId]);
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-bold">
              Domain 4 &bull; Feature 10
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              Role Comparison Matrix
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              DEMO DATA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">
            Compare Target Roles
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Inspect how your single SkillPassport capability state maps across multiple career directions.
            Identify shared foundational strengths versus divergent role specializations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExplainModalOpen(true)}
            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5" />
            Comparison Rules
          </button>
          <Link
            href="/app/career/roles"
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            Roles Catalogue →
          </Link>
        </div>
      </div>

      {/* Role Selector Chips */}
      <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">
            Select 2 or 3 Roles to Compare:
          </span>
          <span className="text-ink-muted text-[11px]">
            Selected: {selectedRoleIds.length} / 3 max
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {targetRoles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.role_id);
            return (
              <button
                key={role.role_id}
                onClick={() => handleRoleToggle(role.role_id)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-ink text-white shadow-sm"
                    : "bg-sand/20 text-ink hover:bg-sand/40 border border-ink/10"
                }`}
              >
                <span>{role.title}</span>
                <span className="text-[10px] opacity-70">({role.seniority})</span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-lime" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Summary Cards */}
      <div
        className={`grid grid-cols-1 md:grid-cols-${evaluatedRoles.length} gap-4`}
      >
        {evaluatedRoles.map(({ role, match, gaps, readiness }) => {
          const isActive = selectedRoleId === role.role_id;

          return (
            <div
              key={role.role_id}
              className={`gl-card p-5 space-y-4 border-ink/15 transition-all ${
                isActive ? "ring-2 ring-ink bg-white shadow-md" : "bg-white/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-ink-muted block">
                    {role.seniority} &bull; {role.version}
                  </span>
                  <h3 className="text-base font-bold text-ink">{role.title}</h3>
                  <span className="text-xs text-ink-muted">{role.context}</span>
                </div>

                {isActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime text-ink border border-ink/20">
                    Active Target
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedRoleId(role.role_id)}
                    className="pill-btn bg-sand/20 hover:bg-sand/40 text-[10px] py-1 px-2 text-ink"
                  >
                    Set Active
                  </button>
                )}
              </div>

              {/* Match Dial & Stats */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-sand/20 border border-ink/10 text-center text-xs">
                <div>
                  <span className="text-[10px] text-ink-muted block">Match</span>
                  <strong className="text-lg font-black text-ink">
                    {match.overall_match_score}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted block">Readiness</span>
                  <strong className="text-lg font-black text-ink">
                    {readiness.readiness_index}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted block">Blockers</span>
                  <strong className="text-lg font-black text-red-700">
                    {readiness.critical_blockers.length}
                  </strong>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-ink-muted">
                  <span>Core Required Coverage:</span>
                  <strong className="text-ink">
                    {match.required_coverage_score}%
                  </strong>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Supporting Coverage:</span>
                  <strong className="text-ink">
                    {match.supporting_coverage_score}%
                  </strong>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Identified Gaps:</span>
                  <strong className="text-amber-800">{gaps.length} Gaps</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-ink/10">
                <Link
                  href={`/app/career/roles/${role.role_id}`}
                  className="font-bold text-ink hover:underline flex items-center justify-between text-xs"
                >
                  <span>View Demand Model</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Filter Controls */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Layers className="w-4 h-4 text-ink" />
          Competency Requirement Comparison Matrix
        </h2>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterMode === "all"
                ? "bg-ink text-white"
                : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
            }`}
          >
            All Competencies ({allSkillIds.length})
          </button>
          <button
            onClick={() => setFilterMode("gaps_only")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterMode === "gaps_only"
                ? "bg-ink text-white"
                : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
            }`}
          >
            Gaps Only
          </button>
          <button
            onClick={() => setFilterMode("differences")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              filterMode === "differences"
                ? "bg-ink text-white"
                : "bg-white text-ink border border-ink/10 hover:bg-sand/20"
            }`}
          >
            Requirement Differences
          </button>
        </div>
      </div>

      {/* Detailed Side-by-Side Matrix Table */}
      <div className="gl-card p-0 overflow-hidden border-ink/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sand/40 border-b border-ink/10 font-mono text-[11px] text-ink uppercase">
              <tr>
                <th className="py-3 px-4 min-w-[200px]">Competency Requirement</th>
                <th className="py-3 px-3 min-w-[140px]">Your Capability</th>
                {evaluatedRoles.map(({ role }) => (
                  <th
                    key={role.role_id}
                    className="py-3 px-3 min-w-[180px] border-l border-ink/10"
                  >
                    {role.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 bg-white">
              {filteredSkillIds.map((skillId) => {
                const userSkill = skills.find((s) => s.id === skillId);
                const skillName =
                  userSkill?.canonicalName ||
                  evaluatedRoles
                    .flatMap((er) => er.role.competencies)
                    .find((c) => c.skill_id === skillId)?.canonical_name ||
                  skillId;

                return (
                  <tr key={skillId} className="hover:bg-sand/10 transition-colors">
                    {/* Competency Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-ink">{skillName}</div>
                      <span className="text-[10px] font-mono text-ink-muted">
                        {skillId}
                      </span>
                    </td>

                    {/* User Current Capability */}
                    <td className="py-3 px-3">
                      {userSkill ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-ink block">
                            {userSkill.verifiedProficiency || userSkill.estimatedProficiency}
                          </span>
                          <span className="text-[10px] text-ink-muted capitalize block">
                            {userSkill.verificationState} &bull; {userSkill.evidenceIds?.length || 0} ev
                          </span>
                        </div>
                      ) : (
                        <span className="text-ink-muted text-[11px] italic">
                          Not Established
                        </span>
                      )}
                    </td>

                    {/* Role Columns */}
                    {evaluatedRoles.map(({ role, match, gaps }) => {
                      const comp = role.competencies.find(
                        (c) => c.skill_id === skillId
                      );
                      const matchRes = match.competency_matches.find(
                        (m) => m.skill_id === skillId
                      );
                      const gapRecord = gaps.find(
                        (g) => g.skill_id === skillId
                      );

                      return (
                        <td
                          key={role.role_id}
                          className="py-3 px-3 border-l border-ink/10 align-top"
                        >
                          {comp ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-ink">
                                  {comp.expected_level}
                                </span>
                                <RequirementTypeBadge
                                  type={comp.requirement_type}
                                />
                              </div>
                              {matchRes && (
                                <div>
                                  <MatchStatusBadge
                                    status={matchRes.match_status}
                                  />
                                </div>
                              )}
                              {gapRecord && (
                                <span className="text-[10px] text-amber-800 font-medium block">
                                  Gap: {gapRecord.gap_type.replace("_", " ")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-muted text-[11px]">
                              Not required
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
    </div>
  );
}
