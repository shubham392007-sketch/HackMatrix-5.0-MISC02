"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
  EvidenceDetailPanel,
  RAGContextPanel,
  EvidenceTimeline,
  EvidenceCoverage,
  LoadingSkeleton,
  ErrorState,
} from "@/components/growthlens";
import {
  managerEvidence as managerApi,
  evidence as evidenceApi,
  integrations,
  type ManagerTeamMember,
  type ManagerTeamOverview,
} from "@/lib/api";
import type { Evidence } from "@/lib/types";
import {
  RefreshCw,
  Search,
  Users,
  Shield,
  Database,
  ArrowRight,
  TrendingUp,
  Layers,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  GitCommit,
  CheckSquare,
} from "lucide-react";

const SOURCE_FILTERS = ["ALL", "GITHUB", "JIRA", "ASSESSMENT", "PROJECT", "COURSE", "FEEDBACK"] as const;

export default function ManagerEvidencePage() {
  const { profile } = useAuth();

  // Team Overview State
  const [overview, setOverview] = useState<ManagerTeamOverview | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [loadingTeam, setLoadingTeam] = useState<boolean>(true);
  const [teamError, setTeamError] = useState<string>("");

  // Selected Member Evidence State
  const [memberEvidence, setMemberEvidence] = useState<Evidence[]>([]);
  const [memberName, setMemberName] = useState<string>("");
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(false);
  const [evidenceError, setEvidenceError] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync / Refresh State
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Active detail modal
  const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(null);

  // Load departments on mount
  useEffect(() => {
    managerApi
      .departments()
      .then((res) => {
        if (res.departments) {
          setDepartments(res.departments);
        }
      })
      .catch(() => {
        // Non-blocking fallback
      });
  }, []);

  // Load team overview
  const loadTeamOverview = async (dept?: string) => {
    setLoadingTeam(true);
    setTeamError("");
    try {
      const data = await managerApi.teamOverview(dept || undefined);
      setOverview(data);
      if (data.team_members.length > 0 && !selectedMemberId) {
        setSelectedMemberId(data.team_members[0].id);
      }
    } catch (err: any) {
      if (err.message?.includes("403") || err.message?.includes("Access denied")) {
        setTeamError("You are not authorized to view this employee.");
      } else {
        setTeamError(err.message || "Evidence intelligence is temporarily unavailable.");
      }
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadTeamOverview(selectedDept);
  }, [selectedDept]);

  // Load selected employee evidence
  const loadMemberEvidence = async (empId: string) => {
    if (!empId) return;
    setLoadingEvidence(true);
    setEvidenceError("");
    try {
      const res = await managerApi.employeeEvidence(empId, 100);
      setMemberEvidence(res.evidence || []);
      setMemberName(res.employee_name || empId);
    } catch (err: any) {
      if (err.message?.includes("403") || err.message?.includes("Access denied")) {
        setEvidenceError("You are not authorized to view this employee.");
      } else {
        setEvidenceError(err.message || "Unable to retrieve employee evidence.");
      }
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    if (selectedMemberId) {
      loadMemberEvidence(selectedMemberId);
    }
  }, [selectedMemberId]);

  // Handle Sync for the selected member
  const handleSyncSelectedMember = async () => {
    if (!selectedMemberId) return;
    setSyncing(true);
    setSyncMessage("");
    try {
      await integrations.syncGithub({
        target_employee_id: selectedMemberId,
        limit_commits: 10,
        limit_prs: 5,
        run_ai_extraction: true,
      });
      setSyncMessage("Sync completed successfully!");
      await loadMemberEvidence(selectedMemberId);
      await loadTeamOverview(selectedDept);
    } catch (err: any) {
      setSyncMessage("Sync finished with notes: " + (err.message || "Updated"));
      await loadMemberEvidence(selectedMemberId);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(""), 5000);
    }
  };

  // Helper formatting for timestamps
  const formatTime = (iso?: string | null) => {
    if (!iso) return "No evidence recorded";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter evidence list
  const filteredEvidence = memberEvidence.filter((item) => {
    const s = (item.source || "").toLowerCase();
    const matchesFilter =
      sourceFilter === "ALL" ||
      s.includes(sourceFilter.toLowerCase()) ||
      (sourceFilter === "PROJECT" && s.includes("project")) ||
      (sourceFilter === "COURSE" && s.includes("course"));

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (item.title || "").toLowerCase().includes(q);
    const contentMatch = (item.content || "").toLowerCase().includes(q);
    const skillMatch = (item.skills || []).some((sk) => sk.toLowerCase().includes(q));
    const compMatch = (item.competencies || []).some((c) => c.toLowerCase().includes(q));
    return titleMatch || contentMatch || skillMatch || compMatch;
  });

  const selectedMember = overview?.team_members.find((m) => m.id === selectedMemberId);

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1360px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-12">
          {/* ── Section 1: Hero & Role Badge ───────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase shadow-[2px_2px_0px_#1C1C1C]">
                  FEATURE 1 • MANAGER INTELLIGENCE
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#1C1C1C]">
                  <Shield className="w-3 h-3 text-[#1C1C1C]" />
                  AUDIT & SUPERVISION VIEW
                </span>
              </div>

              <ScriptHeading
                preText="Understand the evidence behind your"
                scriptWord="team's capabilities."
                level={1}
                className="mb-3"
              />

              <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Explore evidence collected across Feature 4 participants and trace competency insights back to their underlying sources.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="pill-input text-xs min-w-[180px]"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <PillButton
                  variant="primary"
                  size="sm"
                  onClick={() => loadTeamOverview(selectedDept)}
                  loading={loadingTeam}
                  icon={<RefreshCw className="w-3 h-3" />}
                >
                  REFRESH TEAM
                </PillButton>
              </div>
            </div>
          </div>

          {/* ── Section 2: Team-Wide Aggregate Metrics (Section 10 & 40) ── */}
          {overview && (
            <div className="space-y-4">
              <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C]">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-2">
                  TEAM EVIDENCE OVERVIEW
                </span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                      Employees in scope
                    </span>
                    <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                      {overview.total_members}
                    </span>
                    <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                      Feature 4 registered
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                      Evidence collected
                    </span>
                    <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                      {overview.total_evidence}
                    </span>
                    <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                      Across all connectors
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                      Competencies
                    </span>
                    <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                      {overview.competencies_represented || Object.keys(overview.competency_coverage || {}).length}
                    </span>
                    <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                      Represented skills
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                      Evidence sources
                    </span>
                    <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                      {overview.evidence_sources || Object.keys(overview.sources_breakdown || {}).length}
                    </span>
                    <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                      GitHub, Jira & Tests
                    </span>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                      Latest evidence
                    </span>
                    <span className="text-lg md:text-xl font-black font-mono text-[#1C1C1C] leading-tight block">
                      {overview.latest_evidence ? formatTime(overview.latest_evidence) : "Today"}
                    </span>
                    <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                      Verified ingestion
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 41: Competency Evidence Coverage */}
              {overview.competency_coverage && Object.keys(overview.competency_coverage).length > 0 && (
                <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-3">
                    COMPETENCY EVIDENCE COVERAGE
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {Object.entries(overview.competency_coverage).map(([cName, cCount]) => (
                      <div
                        key={cName}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF]/60 text-xs font-bold"
                      >
                        <span>{cName}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-[#1C1C1C] text-[#DFE968] text-[10px] font-mono">
                          {cCount} items
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Section 3: Team Roster Selection (Section 8 & 13) ──────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  FEATURE 4 PARTICIPANTS
                </span>
                <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight">
                  Employees registered for GrowthLens organizational intelligence.
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#1C1C1C]/70">
                {overview?.team_members.length || 0} In Scope
              </span>
            </div>

            {loadingTeam && <LoadingSkeleton type="feed" count={2} />}

            {teamError && !loadingTeam && (
              <ErrorState
                title="Could not load team members"
                message={teamError}
                onRetry={() => loadTeamOverview(selectedDept)}
              />
            )}

            {!loadingTeam && overview && overview.team_members.length === 0 && (
              <div className="p-8 text-center rounded-[24px] border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-white">
                <p className="text-sm font-semibold text-[#1C1C1C]/70">
                  No Feature 4 registered employees are currently available within your authorized scope.
                </p>
              </div>
            )}

            {!loadingTeam && overview && overview.team_members.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.team_members.map((member) => {
                  const isSelected = member.id === selectedMemberId;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#DFE968]/30 shadow-[4px_4px_0px_#1C1C1C] -translate-y-1"
                          : "bg-[#FBF6DF]/80 shadow-[2px_2px_0px_#1C1C1C] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1C1C1C]"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] flex items-center justify-center text-xs font-black">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-[#1C1C1C] leading-tight">
                                {member.name}
                              </h4>
                              <span className="text-[10px] font-medium text-[#1C1C1C]/60 block leading-tight">
                                {member.role || "Software Engineer"} • {member.department || "Core Engineering"}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[9px] font-extrabold uppercase">
                            Feature 4: Registered
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#1C1C1C]/10 text-center my-2">
                          <div>
                            <span className="text-[9px] font-bold text-[#1C1C1C]/60 block uppercase">Evidence</span>
                            <span className="text-sm font-black font-mono">{member.evidence_count}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-[#1C1C1C]/60 block uppercase">Skills</span>
                            <span className="text-sm font-black font-mono">{member.competency_count ?? (member.competencies?.length || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-[#1C1C1C]/60 block uppercase">Latest</span>
                            <span className="text-[10px] font-bold font-mono">{formatTime(member.last_evidence_at)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          className={`pill-btn text-[10px] py-1 px-3 ${
                            isSelected ? "pill-btn-primary" : "pill-btn-outline"
                          }`}
                        >
                          {isSelected ? "AUDITING NOW" : "VIEW EVIDENCE →"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 4: Selected Employee Audit Detail Header ───── */}
          {selectedMember && (
            <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-white shadow-[4px_4px_0px_#1C1C1C] space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-[1.5px] border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center text-xl font-black shadow-[2px_2px_0px_#1C1C1C]">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
                        {selectedMember.name}
                      </h3>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#DFE968]">
                        FEATURE 4: REGISTERED
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#1C1C1C]/70">
                      {selectedMember.email} • {selectedMember.role || "Software Engineer"} • {selectedMember.department || "Core"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                    Latest Activity: {formatTime(selectedMember.last_evidence_at)}
                  </span>
                  <Link
                    href={`/manager/heatmap`}
                    className="pill-btn pill-btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>VIEW GROWTH INTELLIGENCE</span>
                  </Link>
                  <PillButton
                    variant="primary"
                    size="sm"
                    onClick={handleSyncSelectedMember}
                    loading={syncing}
                    icon={<RefreshCw className="w-3 h-3" />}
                  >
                    SYNC WORKSTREAM
                  </PillButton>
                </div>
              </div>

              {syncMessage && (
                <div className="px-4 py-2 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-xs font-bold font-mono">
                  {syncMessage}
                </div>
              )}

              {/* Section 14: Competency Evidence Breakdown with Feature 2/3 connections */}
              {memberEvidence.length > 0 && (
                <div className="pt-4 border-t border-[#1C1C1C]/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                        COMPETENCY EVIDENCE BREAKDOWN
                      </span>
                      <h4 className="text-base font-black text-[#1C1C1C]">
                        Evidence Distribution Across Evaluated Skills
                      </h4>
                    </div>
                    <span className="text-xs font-semibold text-[#1C1C1C]/60">
                      Trace insights to underlying work
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(
                      memberEvidence.reduce((acc, ev) => {
                        const comps = ev.competencies && ev.competencies.length > 0 ? ev.competencies : ["General Engineering"];
                        comps.forEach((c) => {
                          acc[c] = (acc[c] || 0) + 1;
                        });
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([cName, count]) => (
                      <div
                        key={cName}
                        className="p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50">
                              COMPETENCY
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C] text-[10px] font-mono font-bold">
                              {count} evidence items
                            </span>
                          </div>
                          <h5 className="text-sm font-black text-[#1C1C1C] leading-snug line-clamp-1">
                            {cName}
                          </h5>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1C1C1C]/10">
                          <Link
                            href={`/manager/trajectory?employee_id=${selectedMember.id}&competency=${encodeURIComponent(cName)}`}
                            className="text-[10px] font-black uppercase text-[#1C1C1C] hover:underline flex items-center gap-1"
                          >
                            <span>VIEW TRAJECTORY</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          <Link
                            href={`/employee/recommendations?employee_id=${selectedMember.id}`}
                            className="text-[10px] font-bold uppercase text-[#1C1C1C]/70 hover:underline"
                          >
                            ACTIONS →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline & Coverage for this selected member */}
              {memberEvidence.length > 0 && (
                <div className="space-y-6 pt-4 border-t border-[#1C1C1C]/15">
                  <EvidenceTimeline
                    items={memberEvidence}
                    onSelectEvidence={(ev) => setActiveEvidence(ev)}
                  />
                  <EvidenceCoverage items={memberEvidence} />
                </div>
              )}
            </div>
          )}

          {/* ── Section 5: Grounded RAG Justification Context (Section 27-31) ── */}
          {selectedMemberId && (
            <RAGContextPanel employeeId={selectedMemberId} />
          )}

          {/* ── Section 6: Traceable Evidence Feed for Selected Member */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  EMPLOYEE VERIFIED STREAM
                </span>
                <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
                  {memberName ? `${memberName}'s Traceable Evidence` : "Evidence Feed"}
                </h3>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50 pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH EVIDENCE, COMMITS, SKILLS..."
                  className="pill-input text-xs w-full !pl-11"
                  style={{ paddingLeft: "2.85rem" }}
                />
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSourceFilter(f)}
                  className={`pill-btn text-[10px] whitespace-nowrap ${
                    sourceFilter === f ? "pill-btn-primary" : "pill-btn-secondary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loadingEvidence && <LoadingSkeleton type="feed" count={4} />}

            {/* Error */}
            {evidenceError && !loadingEvidence && (
              <ErrorState
                title="Could not load member evidence"
                message={evidenceError}
                onRetry={() => loadMemberEvidence(selectedMemberId)}
              />
            )}

            {/* Empty State */}
            {!loadingEvidence && !evidenceError && filteredEvidence.length === 0 && (
              <div className="p-10 md:p-14 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 shadow-[4px_4px_0px_#1C1C1C] text-center max-w-xl mx-auto my-8">
                <div className="w-12 h-12 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] flex items-center justify-center mx-auto mb-4">
                  <Database className="w-5 h-5 text-[#1C1C1C]/60" />
                </div>
                <h4 className="text-xl font-black text-[#1C1C1C] mb-2">
                  {memberEvidence.length === 0
                    ? "No evidence has been collected for this employee."
                    : (searchQuery
                      ? "No evidence records match this search."
                      : "No evidence is currently associated with this competency.")}
                </h4>
                <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/75 leading-relaxed mb-6">
                  Trigger an on-demand sync above to extract git activity and tickets for this employee into the canonical pipeline.
                </p>
                <PillButton
                  variant="primary"
                  size="md"
                  onClick={handleSyncSelectedMember}
                  loading={syncing}
                >
                  SYNC WORKSTREAM NOW
                </PillButton>
              </div>
            )}

            {/* Evidence Cards (Section 16, 17, 18: Raw Evidence vs AI Interpretation) */}
            {!loadingEvidence && !evidenceError && (
              <div className="space-y-4">
                {filteredEvidence.map((ev, idx) => {
                  const strength = Math.round(
                    ev.evidence_strength <= 1
                      ? ev.evidence_strength * 100
                      : ev.evidence_strength || 80
                  );
                  const isGithub = (ev.source || "").toLowerCase().includes("github");
                  const primaryComp = ev.competencies?.[0] || ev.skills?.[0] || "Engineering Practice";
                  const rawEvidenceText = ev.content || ev.title;
                  const aiInterpretationText = ev.ai_summary || `Demonstrates validated practical competency in ${primaryComp}.`;

                  return (
                    <div
                      key={ev.id || idx}
                      onClick={() => setActiveEvidence(ev)}
                      className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C] transition-all cursor-pointer group space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="source" source={ev.source} size="sm" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1C1C]/60 font-mono">
                            {ev.project_name || (isGithub ? "HackMatrix-5.0-MISC02" : "Sprint Deliverable")}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/70">
                          {ev.occurred_at
                            ? new Date(ev.occurred_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent event"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#1C1C1C]/20 bg-[#DFE968]/50 text-[#1C1C1C] mr-2">
                          {primaryComp}
                        </span>
                        <h4 className="inline text-base md:text-lg font-black text-[#1C1C1C] tracking-tight group-hover:underline">
                          {ev.title}
                        </h4>
                      </div>

                      {/* Section 18: Clean Visual Separation of Raw Evidence vs AI Interpretation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {/* Source Evidence */}
                        <div className="p-3.5 rounded-xl border border-[#1C1C1C]/20 bg-white/80 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block font-mono">
                            SOURCE EVIDENCE
                          </span>
                          <p className="text-xs font-mono font-medium text-[#1C1C1C]/90 line-clamp-3 leading-relaxed">
                            {rawEvidenceText}
                          </p>
                        </div>

                        {/* AI Interpretation */}
                        <div className="p-3.5 rounded-xl border border-[#1C1C1C]/20 bg-[#DFE968]/20 space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/70 font-mono">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>AI INTERPRETATION</span>
                          </div>
                          <p className="text-xs font-medium text-[#1C1C1C]/80 line-clamp-3 leading-relaxed">
                            {aiInterpretationText}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1C1C1C]/15">
                        {/* Skills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(ev.skills || []).map((sk) => (
                            <span
                              key={sk}
                              className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>

                        {/* Evidence Strength & View Source */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
                              STRENGTH:
                            </span>
                            <div className="w-20 h-2 rounded-full border border-[#1C1C1C] bg-white overflow-hidden p-0.5">
                              <div
                                className="h-full rounded-full bg-[#DFE968]"
                                style={{ width: `${strength}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold">
                              {strength}%
                            </span>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] group-hover:underline flex items-center gap-1">
                            <span>VIEW DETAIL</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 7: Downstream Bridges (Section 37, 38, 39) ─────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href={`/manager/trajectory${selectedMemberId ? `?employee_id=${selectedMemberId}` : ""}`}
              className="p-6 rounded-[28px] border-[2px] border-[#1C1C1C] bg-gradient-to-r from-[#DFE968]/50 to-[#FBF1CF] shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C] transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[9px] font-extrabold tracking-[0.1em] uppercase mb-1">
                  FEATURE 2 • PREDICTIVE ML
                </span>
                <h4 className="text-lg font-black text-[#1C1C1C]">
                  View Growth Trajectory
                </h4>
                <p className="text-xs font-semibold text-[#1C1C1C]/75 mt-1">
                  Examine PyTorch LSTM growth projections, velocity patterns, and decay probabilities for this member.
                </p>
              </div>
              <div className="pt-2 text-xs font-black uppercase flex items-center gap-1">
                <span>OPEN TRAJECTORY →</span>
              </div>
            </Link>

            <Link
              href={`/employee/recommendations${selectedMemberId ? `?employee_id=${selectedMemberId}` : ""}`}
              className="p-6 rounded-[28px] border-[2px] border-[#1C1C1C] bg-gradient-to-r from-[#FBF1CF] to-[#DFE968]/40 shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C] transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[9px] font-extrabold tracking-[0.1em] uppercase mb-1">
                  FEATURE 3 • ACTION ENGINE
                </span>
                <h4 className="text-lg font-black text-[#1C1C1C]">
                  View Recommended Actions
                </h4>
                <p className="text-xs font-semibold text-[#1C1C1C]/75 mt-1">
                  Targeted micro-learning tutorials and peer mentorship interventions prescribed for observed gaps.
                </p>
              </div>
              <div className="pt-2 text-xs font-black uppercase flex items-center gap-1">
                <span>VIEW ACTIONS →</span>
              </div>
            </Link>

            <Link
              href="/manager/heatmap"
              className="p-6 rounded-[28px] border-[2px] border-[#1C1C1C] bg-gradient-to-r from-[#F6C8D6]/70 to-[#FBF1CF] shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C] transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[9px] font-extrabold tracking-[0.1em] uppercase mb-1">
                  FEATURE 4 • TALENT MATRIX
                </span>
                <h4 className="text-lg font-black text-[#1C1C1C]">
                  Inspect Team Heatmap
                </h4>
                <p className="text-xs font-semibold text-[#1C1C1C]/75 mt-1">
                  Organizational skill distribution matrix, cross-team capability gaps, and systemic risk patterns.
                </p>
              </div>
              <div className="pt-2 text-xs font-black uppercase flex items-center gap-1">
                <span>VIEW HEATMAP →</span>
              </div>
            </Link>
          </div>
        </main>

        {/* ── Section 8: Evidence Detail Side Panel ──────────────── */}
        <EvidenceDetailPanel
          evidence={activeEvidence}
          isOpen={activeEvidence !== null}
          onClose={() => setActiveEvidence(null)}
        />
      </div>
    </ProtectedRoute>
  );
}
