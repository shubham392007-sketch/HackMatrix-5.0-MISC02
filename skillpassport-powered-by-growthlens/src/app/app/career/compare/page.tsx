"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  evaluateRoleMatch,
  extractGapRecords,
  evaluateCareerReadiness,
  findMatchingUserSkill,
} from "@/lib/careerCalculations";
import {
  MatchStatusBadge,
  GapTypeBadge,
  RequirementTypeBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import { RoleDemandModel } from "@/types/career";
import AppTopBar from "@/components/app/AppTopBar";
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
  ShieldCheck,
  Check,
} from "lucide-react";

export default function CompareRolesPage() {
  const {
    targetRoles,
    catalogueRoles,
    savedTargetRoles,
    customRoles,
    skills,
    initialLoading,
    selectedRoleId,
    setSelectedRoleId,
  } = useEvidence();

  // Combine all database roles so user can compare ANY industry role or custom target
  const availableRoles = useMemo(() => {
    const map = new Map<string, RoleDemandModel>();
    (savedTargetRoles || []).forEach((r) => r?.role_id && map.set(r.role_id, r));
    (catalogueRoles || []).forEach((r) => r?.role_id && !map.has(r.role_id) && map.set(r.role_id, r));
    (targetRoles || []).forEach((r) => r?.role_id && !map.has(r.role_id) && map.set(r.role_id, r));
    (customRoles || []).forEach((r) => r?.role_id && !map.has(r.role_id) && map.set(r.role_id, r));
    return Array.from(map.values());
  }, [savedTargetRoles, catalogueRoles, targetRoles, customRoles]);

  // Role selections for side-by-side comparison
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Initialize selection with first 2 available database roles once loaded
  React.useEffect(() => {
    if (availableRoles.length >= 2) {
      setSelectedRoleIds((prev) => {
        const valid = prev.filter((id) => availableRoles.some((r) => r.role_id === id));
        if (valid.length >= 2) return valid;
        return [availableRoles[0].role_id, availableRoles[1].role_id];
      });
    } else if (availableRoles.length === 1) {
      setSelectedRoleIds([availableRoles[0].role_id]);
    }
  }, [availableRoles]);

  const [filterMode, setFilterMode] = useState<
    "all" | "gaps_only" | "differences"
  >("all");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Compute evaluations for each selected role
  const evaluatedRoles = useMemo(() => {
    return selectedRoleIds
      .map((id) => {
        const role = availableRoles.find((r) => r.role_id === id);
        if (!role || !role.competencies) return null;
        const match = evaluateRoleMatch(role, skills);
        const gaps = extractGapRecords(match, role);
        const readiness = evaluateCareerReadiness(match, gaps);
        return { role, match, gaps, readiness };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [selectedRoleIds, availableRoles, skills]);

  // Aggregate union of all competency skill_ids across selected roles
  const allSkillIds = useMemo(() => {
    const set = new Set<string>();
    evaluatedRoles.forEach((item) => {
      (item.role.competencies || []).forEach((c) => set.add(c.skill_id));
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
    <div className="flex-1 flex flex-col bg-[#F5F2EB]">
      <AppTopBar
        title="Compare Target Roles"
        description="Inspect how your single SkillPassport capability state maps across multiple career directions. Identify shared foundational strengths versus divergent role specializations."
        badge="Role Comparison Matrix"
        badgeColor="border-[#1A1918]/20 text-[#1A1918] bg-white font-bold"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-[#FAF8F5] border border-[#1A1918]/20 text-xs py-2 px-3 text-[#1A1918] flex items-center gap-1.5 font-bold"
        >
          <Info className="w-3.5 h-3.5" />
          Comparison Rules
        </button>
        <Link
          href="/app/career/roles"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold bg-[#1A1918] text-[#FAF8F5]"
        >
          <Compass className="w-3.5 h-3.5" />
          Roles Catalogue &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Role Selector Header Card */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-[#1A1918] uppercase tracking-wider text-[11px]">
              Select 2 or 3 Roles for Multi-Dimensional Gap Comparison:
            </span>
            <span className="font-mono font-bold text-[#1A1918]/70 text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#1A1918]/15">
              Selected: {selectedRoleIds.length} of 3 max
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pt-1">
            {availableRoles.length === 0 ? (
              <div className="text-xs text-[#1A1918]/60 py-2 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-[#1A1918] border-t-transparent rounded-full animate-spin" />
                Loading database roles...
              </div>
            ) : (
              availableRoles.map((role) => {
                const isSelected = selectedRoleIds.includes(role.role_id);
                return (
                  <button
                    key={role.role_id}
                    onClick={() => handleRoleToggle(role.role_id)}
                    className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#1A1918] text-[#FAF8F5] border-2 border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] -translate-y-0.5"
                        : "bg-[#FAF8F5] text-[#1A1918] hover:bg-white border border-[#1A1918]/20 hover:border-[#1A1918]"
                    }`}
                  >
                    <span>{role.title}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-[#FAF8F5]/80" : "text-[#1A1918]/60"}`}>
                      ({role.seniority})
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#DFE968]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Side-by-Side Summary Comparison Cards */}
        {initialLoading || (availableRoles.length > 0 && evaluatedRoles.length === 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] animate-pulse space-y-4">
              <div className="h-4 bg-[#1A1918]/10 rounded w-1/4"></div>
              <div className="h-6 bg-[#1A1918]/15 rounded w-1/2"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] animate-pulse space-y-4">
              <div className="h-4 bg-[#1A1918]/10 rounded w-1/4"></div>
              <div className="h-6 bg-[#1A1918]/15 rounded w-1/2"></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
                <div className="h-16 bg-[#1A1918]/5 rounded-xl"></div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              evaluatedRoles.length === 2
                ? "md:grid-cols-2"
                : evaluatedRoles.length === 3
                ? "md:grid-cols-3"
                : "md:grid-cols-1"
            } gap-5`}
          >
            {evaluatedRoles.map(({ role, match, gaps, readiness }) => {
              const isActive = selectedRoleId === role.role_id;

              return (
                <div
                  key={role.role_id}
                  className={`p-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] flex flex-col justify-between transition-all ${
                    isActive ? "ring-2 ring-[#1A1918]" : ""
                  }`}
                >
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-2 border-b border-[#1A1918]/15 pb-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1A1918]/60">
                            {role.seniority} &bull; {role.version}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-[#4A7A4E] bg-[#4A7A4E]/10 border border-[#4A7A4E]/25 px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Live
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-[#1A1918] leading-snug">
                          {role.title}
                        </h3>
                        <span className="text-xs text-[#1A1918]/70 font-medium block mt-0.5">
                          {role.context}
                        </span>
                      </div>

                      {isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DFE968] text-[#1A1918] border border-[#1A1918] shadow-sm shrink-0">
                          Active Target
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedRoleId(role.role_id)}
                          className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#FAF8F5] hover:bg-[#1A1918] text-[#1A1918] hover:text-[#FAF8F5] border border-[#1A1918]/30 transition-all shrink-0"
                        >
                          Set Active
                        </button>
                      )}
                    </div>

                    {/* Match Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 text-center text-xs">
                      <div className="p-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/60 block mb-1">
                          Match
                        </span>
                        <strong className="text-xl font-black text-[#1A1918]">
                          {match.overall_match_score}%
                        </strong>
                      </div>
                      <div className="p-1 border-x border-[#1A1918]/15">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/60 block mb-1">
                          Readiness
                        </span>
                        <strong className="text-xl font-black text-[#1A1918]">
                          {readiness.readiness_index}%
                        </strong>
                      </div>
                      <div className="p-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/60 block mb-1">
                          Blockers
                        </span>
                        <strong className={`text-xl font-black ${readiness.critical_blockers.length > 0 ? "text-[#C25450]" : "text-[#4A7A4E]"}`}>
                          {readiness.critical_blockers.length}
                        </strong>
                      </div>
                    </div>

                    {/* Progress Breakdown Bars */}
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium text-[#1A1918]">
                          <span className="text-[#1A1918]/80 text-[11.5px]">Core Required Coverage:</span>
                          <strong className="font-mono font-bold text-[#1A1918]">{match.required_coverage_score}%</strong>
                        </div>
                        <div className="h-2 w-full bg-[#1A1918]/10 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${match.required_coverage_score}%` }}
                            className="bg-[#1A1918] h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-medium text-[#1A1918]">
                          <span className="text-[#1A1918]/80 text-[11.5px]">Supporting Coverage:</span>
                          <strong className="font-mono font-bold text-[#1A1918]">{match.supporting_coverage_score}%</strong>
                        </div>
                        <div className="h-2 w-full bg-[#1A1918]/10 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${match.supporting_coverage_score}%` }}
                            className="bg-[#1A1918]/70 h-full rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-[#1A1918]/80 font-medium">Identified Gaps:</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                          gaps.length > 0
                            ? "bg-[#C4A446]/15 border-[#C4A446]/30 text-[#9E822B]"
                            : "bg-[#4A7A4E]/15 border-[#4A7A4E]/30 text-[#4A7A4E]"
                        }`}>
                          {gaps.length} {gaps.length === 1 ? "Gap" : "Gaps"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#1A1918]/15 mt-5">
                    <Link
                      href={`/app/career/roles/${role.role_id}`}
                      className="font-bold text-[#1A1918] hover:underline flex items-center justify-between text-xs group"
                    >
                      <span>View Role Demand Model</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <h2 className="text-lg font-extrabold text-[#1A1918] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#1A1918]" />
            Competency Requirement Comparison Matrix
          </h2>

          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#1A1918]/20 shadow-sm text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === "all"
                  ? "bg-[#1A1918] text-[#FAF8F5] shadow-sm"
                  : "text-[#1A1918]/70 hover:text-[#1A1918]"
              }`}
            >
              All ({allSkillIds.length})
            </button>
            <button
              onClick={() => setFilterMode("gaps_only")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === "gaps_only"
                  ? "bg-[#1A1918] text-[#FAF8F5] shadow-sm"
                  : "text-[#1A1918]/70 hover:text-[#1A1918]"
              }`}
            >
              Gaps Only
            </button>
            <button
              onClick={() => setFilterMode("differences")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === "differences"
                  ? "bg-[#1A1918] text-[#FAF8F5] shadow-sm"
                  : "text-[#1A1918]/70 hover:text-[#1A1918]"
              }`}
            >
              Differences
            </button>
          </div>
        </div>

        {/* Detailed Side-by-Side Matrix Table with Uniform Alignment */}
        <div className="rounded-2xl border-2 border-[#1A1918] bg-white shadow-[3px_3px_0_0_#1A1918] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <colgroup>
                <col style={{ width: "32%" }} />
                <col style={{ width: "24%" }} />
                {evaluatedRoles.map(({ role }) => (
                  <col
                    key={role.role_id}
                    style={{ width: `${44 / Math.max(1, evaluatedRoles.length)}%` }}
                  />
                ))}
              </colgroup>
              <thead className="bg-[#FAF8F5] border-b-2 border-[#1A1918] font-mono text-[11px] text-[#1A1918] uppercase">
                <tr>
                  <th className="py-4 px-4 font-bold">Competency Requirement</th>
                  <th className="py-4 px-4 font-bold border-l border-[#1A1918]/15">
                    Your Verified State
                  </th>
                  {evaluatedRoles.map(({ role }) => (
                    <th
                      key={role.role_id}
                      className="py-4 px-4 font-bold border-l border-[#1A1918]/15"
                    >
                      {role.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1918]/10 bg-white">
                {filteredSkillIds.length === 0 ? (
                  <tr>
                    <td colSpan={2 + evaluatedRoles.length} className="py-12 text-center text-xs text-[#1A1918]/60 font-medium">
                      No competencies match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSkillIds.map((skillId) => {
                    const comp = evaluatedRoles
                      .flatMap((er) => er.role.competencies)
                      .find((c) => c.skill_id === skillId);
                    const userSkill = comp
                      ? findMatchingUserSkill(comp, skills)
                      : skills.find((s) => s.id === skillId);
                    const skillName =
                      comp?.canonical_name ||
                      userSkill?.canonicalName ||
                      skillId;

                    return (
                      <tr key={skillId} className="hover:bg-[#FAF8F5] transition-colors">
                        {/* Competency Name */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1">
                            <div className="font-bold text-[#1A1918] text-[13px] leading-5">{skillName}</div>
                            <span className="text-[10px] font-mono text-[#1A1918]/60 font-semibold block">
                              {skillId}
                            </span>
                          </div>
                        </td>

                        {/* User Current Capability */}
                        <td className="py-4 px-4 border-l border-[#1A1918]/15 align-top">
                          {userSkill ? (
                            <div className="space-y-1">
                              <div className="font-bold text-[#1A1918] text-[13px] leading-5">
                                {userSkill.verifiedProficiency || userSkill.estimatedProficiency}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                                  userSkill.verificationState === "verified"
                                    ? "bg-[#4A7A4E]/10 border-[#4A7A4E]/30 text-[#4A7A4E]"
                                    : "bg-[#1A1918]/5 border-[#1A1918]/20 text-[#1A1918]"
                                }`}>
                                  {userSkill.verificationState}
                                </span>
                                <span className="text-[10.5px] font-mono text-[#1A1918]/70 font-semibold">
                                  {userSkill.evidenceIds?.length || 0} proofs
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-[13px] leading-5 text-[#1A1918]/30 font-bold">&mdash;</div>
                              <span className="inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#1A1918]/5 border border-[#1A1918]/15 text-[#1A1918]/50">
                                Not Established
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Role Columns with Perfect Baseline Alignment */}
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
                              className="py-4 px-4 border-l border-[#1A1918]/15 align-top"
                            >
                              {comp ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap leading-5 min-h-[20px]">
                                    <span className="font-bold text-[#1A1918] text-[13px]">
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
                                    <span className="text-[10px] font-mono font-bold text-[#9E822B] bg-[#C4A446]/10 border border-[#C4A446]/30 px-2 py-0.5 rounded block w-fit">
                                      Gap: {gapRecord.gap_type.replace("_", " ")}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-[13px] leading-5 text-[#1A1918]/30 font-bold">&mdash;</div>
                                  <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#1A1918]/5 border border-[#1A1918]/10 text-[#1A1918]/45">
                                    Not required
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Explanation Modal */}
        <CalculationExplanationModal
          isOpen={isExplainModalOpen}
          onClose={() => setIsExplainModalOpen(false)}
        />
      </div>
    </div>
  );
}
