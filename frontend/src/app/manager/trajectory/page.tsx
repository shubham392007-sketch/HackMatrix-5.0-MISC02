"use client";

import React, { useState, useEffect, useCallback } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
  TrendIndicator,
  ProbabilityBreakdown,
  LoadingSkeleton,
  ErrorState,
  WhatIfSimulator,
} from "@/components/growthlens";
import {
  managerTrajectory,
  type ManagerTrajectoryTeamOverview,
  type ManagerTrajectoryTeamMember,
} from "@/lib/api";
import type { TrajectoryPrediction } from "@/lib/types";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  BarChart3,
  Calendar,
  Compass,
} from "lucide-react";
import Link from "next/link";

export default function ManagerTrajectoryPage() {
  const [overview, setOverview] = useState<ManagerTrajectoryTeamOverview | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeTrajectories, setEmployeeTrajectories] = useState<TrajectoryPrediction[]>([]);
  const [focusedCompetency, setFocusedCompetency] = useState<TrajectoryPrediction | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingTrajectories, setLoadingTrajectories] = useState<boolean>(false);
  const [refreshingInference, setRefreshingInference] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch departments
  useEffect(() => {
    managerTrajectory
      .departments()
      .then((data) => setDepartments(data.departments || []))
      .catch(() => {});
  }, []);

  // 2. Fetch team overview
  const loadOverview = useCallback(() => {
    setLoadingOverview(true);
    setError(null);
    managerTrajectory
      .teamOverview(selectedDept || undefined)
      .then((data) => {
        setOverview(data);
        if (data.team_members.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(data.team_members[0].employee_id);
        }
      })
      .catch((err) => {
        console.error("Failed to load trajectory overview:", err);
        setError("Unable to load team trajectory overview. Please check network connection.");
      })
      .finally(() => setLoadingOverview(false));
  }, [selectedDept, selectedEmployeeId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // 3. Fetch trajectories when selected employee changes
  const loadTrajectories = useCallback(
    (employeeId: string, forceRefresh = false) => {
      if (forceRefresh) setRefreshingInference(true);
      else setLoadingTrajectories(true);

      managerTrajectory
        .employeeTrajectories(employeeId, forceRefresh)
        .then((data) => {
          setEmployeeTrajectories(data.trajectories || []);
          if (data.trajectories && data.trajectories.length > 0) {
            setFocusedCompetency(data.trajectories[0]);
          } else {
            setFocusedCompetency(null);
          }
        })
        .catch((err) => {
          console.error("Failed to load employee trajectories:", err);
        })
        .finally(() => {
          setLoadingTrajectories(false);
          setRefreshingInference(false);
        });
    },
    []
  );

  useEffect(() => {
    if (selectedEmployeeId) {
      loadTrajectories(selectedEmployeeId, false);
    }
  }, [selectedEmployeeId, loadTrajectories]);

  const selectedMember = overview?.team_members.find(
    (m) => m.employee_id === selectedEmployeeId
  );

  const filteredMembers = (overview?.team_members || []).filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.department && m.department.toLowerCase().includes(q))
    );
  });

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1360px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-10">
          {/* Header & Badging */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase shadow-[2px_2px_0px_#1C1C1C]">
                  FEATURE 2 MANAGER VIEW
                </span>
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[10px] font-bold text-[#1C1C1C]/70 shadow-[2px_2px_0px_#1C1C1C]">
                  PYTORCH LSTM INFERENCE
                </span>
              </div>
              <ScriptHeading
                preText="Team competency"
                scriptWord="trajectories."
                level={1}
                className="mb-2"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Supervise continuous competency trends across your authorized team. Inspect temporal
                growth patterns, detect early skill stagnation, and test counterfactual interventions.
              </p>
            </div>

            {/* Department Filter & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#1C1C1C]/60" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="pill-input text-xs"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <PillButton
                variant="outline"
                size="sm"
                onClick={loadOverview}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? "animate-spin" : ""}`} />}
              >
                REFRESH TEAM
              </PillButton>
            </div>
          </div>

          {error && (
            <ErrorState
              title="Trajectory Intelligence Unavailable"
              message={error}
              onRetry={loadOverview}
            />
          )}

          {/* Aggregate Metrics Bar */}
          {loadingOverview ? (
            <LoadingSkeleton type="card" count={4} />
          ) : overview ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[3px_3px_0px_#1C1C1C]">
                <div className="flex items-center justify-between text-[#1C1C1C]/60 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">TRACKED MEMBERS</span>
                  <Activity className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black">{overview.total_members}</div>
                <span className="text-[11px] font-semibold text-[#1C1C1C]/60">
                  {overview.total_competencies_tracked} competencies evaluated
                </span>
              </div>

              <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/30 shadow-[3px_3px_0px_#1C1C1C]">
                <div className="flex items-center justify-between text-[#1C1C1C]/60 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-800">
                    IMPROVING
                  </span>
                  <TrendingUp className="w-4 h-4 text-green-700" />
                </div>
                <div className="text-2xl font-black text-green-950">
                  {overview.trend_distribution.improving}
                </div>
                <span className="text-[11px] font-semibold text-green-800/80">
                  Positive capability momentum
                </span>
              </div>

              <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF]/60 shadow-[3px_3px_0px_#1C1C1C]">
                <div className="flex items-center justify-between text-[#1C1C1C]/60 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">STAGNATING</span>
                  <Compass className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-2xl font-black">{overview.trend_distribution.stagnating}</div>
                <span className="text-[11px] font-semibold text-[#1C1C1C]/60">Plateaued trajectory</span>
              </div>

              <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 shadow-[3px_3px_0px_#1C1C1C]">
                <div className="flex items-center justify-between text-[#1C1C1C]/60 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-800">
                    ATTENTION NEEDED
                  </span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-2xl font-black text-red-950">
                  {overview.trend_distribution.declining}
                </div>
                <span className="text-[11px] font-semibold text-red-800/80">
                  Declining signal frequency
                </span>
              </div>

              <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white shadow-[3px_3px_0px_#1C1C1C] col-span-2 md:col-span-1">
                <div className="flex items-center justify-between text-[#1C1C1C]/60 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">AVG CONFIDENCE</span>
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black">
                  {Math.round(overview.average_confidence * 100)}%
                </div>
                <span className="text-[11px] font-semibold text-[#1C1C1C]/60">Calibrated certainty</span>
              </div>
            </div>
          ) : null}

          {/* Main Layout: Team Roster (Left) & Drilldown (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 4 Cols: Team Members Roster */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C1C1C]/15">
                <h3 className="text-base font-black uppercase tracking-wider">Team Roster</h3>
                <span className="text-xs font-mono font-bold text-[#1C1C1C]/60">
                  {filteredMembers.length} Members
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/40" />
                <input
                  type="text"
                  placeholder="Filter team member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pill-input text-xs pl-9 w-full"
                />
              </div>

              {/* Members List */}
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {filteredMembers.map((member) => {
                  const isSelected = member.employee_id === selectedEmployeeId;
                  return (
                    <div
                      key={member.employee_id}
                      onClick={() => setSelectedEmployeeId(member.employee_id)}
                      className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#FBF1CF] shadow-[4px_4px_0px_#1C1C1C] -translate-y-0.5"
                          : "bg-white hover:bg-[#FBF6DF]/60 shadow-[2px_2px_0px_#1C1C1C]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-sm font-black text-[#1C1C1C] leading-snug">
                            {member.name}
                          </h4>
                          <span className="text-[11px] font-medium text-[#1C1C1C]/60">
                            {member.department || "Core Engineering"}
                          </span>
                        </div>
                        {member.dominant_trend === "attention_needed" ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F6C8D6] text-red-900 border border-[#1C1C1C]">
                            ATTENTION
                          </span>
                        ) : member.dominant_trend === "improving" ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#DFE968] text-green-950 border border-[#1C1C1C]">
                            GROWING
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-neutral-200 text-neutral-800 border border-[#1C1C1C]">
                            STABLE
                          </span>
                        )}
                      </div>

                      {/* Mini Metric Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#1C1C1C]/10 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[#1C1C1C]/80">
                          {member.competency_count} Skills
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-[#1C1C1C]/80">
                          {member.total_evidence} Evidences
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#DFE968]/50 text-green-900">
                          ↑ {member.trend_distribution.improving}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#FBF1CF] text-amber-900">
                          → {member.trend_distribution.stagnating}
                        </span>
                        {member.trend_distribution.declining > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-[#F6C8D6] text-red-900">
                            ↓ {member.trend_distribution.declining}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Selected Employee Trajectory Drilldown */}
            <div className="lg:col-span-8 space-y-6">
              {selectedMember ? (
                <>
                  {/* Selected Member Header Card */}
                  <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-[1.5px] border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center text-lg font-black shadow-[2px_2px_0px_#1C1C1C]">
                        {selectedMember.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-[#1C1C1C]">{selectedMember.name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-[#1C1C1C]/30 font-bold">
                            {selectedMember.department || "Core Engineering"}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-medium text-[#1C1C1C]/60">
                          ID: {selectedMember.employee_id} • Avg Model Confidence:{" "}
                          {Math.round(selectedMember.average_confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={() => loadTrajectories(selectedMember.employee_id, true)}
                        loading={refreshingInference}
                        icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                      >
                        RE-RUN INFERENCE
                      </PillButton>

                      <Link
                        href={`/manager/evidence?employee_id=${selectedMember.employee_id}`}
                        className="pill-btn pill-btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-1"
                      >
                        <span>EVIDENCE</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Competency Trajectory Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                        Continuous Competency Evaluations ({employeeTrajectories.length})
                      </h4>
                      <span className="text-xs font-semibold text-[#1C1C1C]/60">
                        Click a competency to simulate counterfactuals
                      </span>
                    </div>

                    {loadingTrajectories ? (
                      <LoadingSkeleton type="card" count={3} />
                    ) : employeeTrajectories.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-white">
                        <BarChart3 className="w-8 h-8 mx-auto text-[#1C1C1C]/40 mb-2" />
                        <h5 className="font-bold text-sm">No trajectories persisted yet</h5>
                        <p className="text-xs text-[#1C1C1C]/60 mt-1">
                          Click &ldquo;Re-run Inference&rdquo; to calculate real-time trajectories
                          using the PyTorch LSTM model.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {employeeTrajectories.map((traj) => {
                          const isFocused =
                            focusedCompetency?.competency_id === traj.competency_id;
                          return (
                            <div
                              key={traj.competency_id}
                              onClick={() => setFocusedCompetency(traj)}
                              className={`p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white cursor-pointer transition-all ${
                                isFocused
                                  ? "ring-2 ring-[#1C1C1C] bg-[#DFE968]/20 shadow-[4px_4px_0px_#1C1C1C] -translate-y-0.5"
                                  : "hover:-translate-y-0.5 shadow-[2px_2px_0px_#1C1C1C]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50">
                                    {traj.competency_id}
                                  </span>
                                  <h5 className="text-sm font-black text-[#1C1C1C] leading-snug line-clamp-1">
                                    {traj.competency_name}
                                  </h5>
                                </div>
                                <TrendIndicator trend={traj.trend} size="sm" />
                              </div>

                              {/* Probabilities Distribution Bar */}
                              <div className="space-y-1 mb-3">
                                <div className="flex justify-between text-[10px] font-black tracking-tight text-[#1C1C1C]/70">
                                  <span>IMPROVING: {Math.round(traj.probabilities.improving * 100)}%</span>
                                  <span>STAGNATING: {Math.round(traj.probabilities.stagnating * 100)}%</span>
                                  <span>DECLINING: {Math.round(traj.probabilities.declining * 100)}%</span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden flex border border-[#1C1C1C]/20 bg-neutral-100">
                                  <div
                                    style={{ width: `${traj.probabilities.improving * 100}%` }}
                                    className="bg-[#DFE968]"
                                  />
                                  <div
                                    style={{ width: `${traj.probabilities.stagnating * 100}%` }}
                                    className="bg-[#FBF1CF]"
                                  />
                                  <div
                                    style={{ width: `${traj.probabilities.declining * 100}%` }}
                                    className="bg-[#F6C8D6]"
                                  />
                                </div>
                              </div>

                              {/* Metadata Badges */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C1C1C]/10 text-[11px] font-semibold text-[#1C1C1C]/70">
                                <div className="flex items-center gap-1.5">
                                  <StatusBadge type="freshness" freshness={traj.freshness} size="sm" />
                                  <span className="text-[10px] font-mono">
                                    {traj.days_since_last_evidence}d ago
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-[10px]">
                                  <span>Conf:</span>
                                  <span className="font-mono font-bold text-[#1C1C1C]">
                                    {Math.round(traj.confidence * 100)}%
                                  </span>
                                  <span>•</span>
                                  <span>{traj.evidence_count} ev</span>
                                </div>
                              </div>

                              {/* Explanation snippet */}
                              {traj.explanation && (
                                <p className="text-[11px] text-[#1C1C1C]/80 mt-3 pt-2 border-t border-dashed border-[#1C1C1C]/15 line-clamp-2">
                                  {traj.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Focused Competency Counterfactual Simulator */}
                  {focusedCompetency && (
                    <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1C1C1C]/15">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                            WHAT-IF COUNTERFACTUAL SIMULATOR
                          </span>
                          <h4 className="text-xl font-black text-[#1C1C1C]">
                            Simulate Growth Impact: {focusedCompetency.competency_name}
                          </h4>
                        </div>
                        <TrendIndicator trend={focusedCompetency.trend} size="md" />
                      </div>

                      {/* Embed existing WhatIfSimulator */}
                      <WhatIfSimulator
                        employeeId={selectedMember.employee_id}
                        competencyId={focusedCompetency.competency_id}
                        competencyName={focusedCompetency.competency_name}
                        currentTrend={focusedCompetency.trend}
                        currentConfidence={Math.round(focusedCompetency.confidence * 100)}
                      />

                      {/* Supporting Citations Traceability */}
                      {focusedCompetency.supporting_evidence_titles &&
                        focusedCompetency.supporting_evidence_titles.length > 0 && (
                          <div className="pt-4 border-t border-[#1C1C1C]/15">
                            <h5 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70 mb-2">
                              Observed Evidence Drivers ({focusedCompetency.supporting_evidence_titles.length})
                            </h5>
                            <div className="space-y-1.5">
                              {focusedCompetency.supporting_evidence_titles.map((title, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs font-medium text-[#1C1C1C]/80 flex items-center gap-2 bg-white/70 p-2 rounded-lg border border-[#1C1C1C]/10"
                                >
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200">
                                    {focusedCompetency.supporting_evidence_ids?.[idx] || `EV-${idx + 1}`}
                                  </span>
                                  <span className="truncate">{title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center rounded-[32px] border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-white">
                  <Compass className="w-10 h-10 mx-auto text-[#1C1C1C]/40 mb-3" />
                  <h4 className="text-base font-black">Select an employee from the roster</h4>
                  <p className="text-xs text-[#1C1C1C]/60 mt-1">
                    Inspect individual competency trajectories, review neural probabilities, and simulate growth actions.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Downstream Cross-Feature Bridge Section */}
          <div className="pt-8 border-t-[1.5px] border-[#1C1C1C]/15 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]/70">
              Downstream Talent Intelligence Connections
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/manager/evidence"
                className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#FBF6DF]/60 shadow-[3px_3px_0px_#1C1C1C] transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-green-700">
                  FEATURE 1: EVIDENCE
                </span>
                <h4 className="text-base font-black mt-1 group-hover:underline flex items-center justify-between">
                  <span>Team Evidence Intelligence</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h4>
                <p className="text-xs text-[#1C1C1C]/70 mt-1">
                  Inspect raw work artifacts, PR commit velocities, and Jira issue delivery powering these trajectories.
                </p>
              </Link>

              <Link
                href="/employee/recommendations"
                className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#FBF6DF]/60 shadow-[3px_3px_0px_#1C1C1C] transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  FEATURE 3: ACTIONS
                </span>
                <h4 className="text-base font-black mt-1 group-hover:underline flex items-center justify-between">
                  <span>Recommended Actions Engine</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h4>
                <p className="text-xs text-[#1C1C1C]/70 mt-1">
                  Prescribe targeted micro-learnings and peer mentorships for members with declining trajectory alerts.
                </p>
              </Link>

              <Link
                href="/manager/heatmap"
                className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#FBF6DF]/60 shadow-[3px_3px_0px_#1C1C1C] transition-all group"
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                  FEATURE 4: HEATMAP
                </span>
                <h4 className="text-base font-black mt-1 group-hover:underline flex items-center justify-between">
                  <span>Team Skill Heatmap</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </h4>
                <p className="text-xs text-[#1C1C1C]/70 mt-1">
                  View organizational skill distribution matrix and collective team capability trends.
                </p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
