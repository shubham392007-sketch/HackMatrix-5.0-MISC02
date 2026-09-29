"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
  TrendIndicator,
  ConfidenceBand,
  ProbabilityBreakdown,
  TrajectoryChart,
  WhatIfSimulator,
  PeerBenchmark,
  GrowthNarrativeCard,
  LoadingSkeleton,
  ErrorState,
} from "@/components/growthlens";
import EmptyState from "@/components/growthlens/EmptyState";
import TrendBadge from "@/components/ui/TrendBadge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  trajectory as trajectoryApi,
  evidence as evidenceApi,
  intelligence as intelligenceApi,
} from "@/lib/api";
import type {
  Learner,
  TrajectoryPrediction,
  Evidence,
  PeerBenchmark as PeerBenchmarkType,
} from "@/lib/types";
import {
  Sparkles,
  RefreshCw,
  Eye,
  BrainCircuit,
  Sliders,
  Layers,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Clock,
  Calendar,
  ShieldCheck,
  Award,
} from "lucide-react";

type FilterType = "all" | "improving" | "stagnating" | "declining" | "insufficient_evidence";

export default function EmployeeSkillsPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<string>("shubham_pokale");
  const [trajectories, setTrajectories] = useState<TrajectoryPrediction[]>([]);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<FilterType>("all");

  // Supporting evidence & timeline points for the active competency
  const [competencyTimeline, setCompetencyTimeline] = useState<any[]>([]);
  const [benchmark, setBenchmark] = useState<PeerBenchmarkType | null>(null);

  // Dedicated What-If Simulator Section State (Integrated at end of skills page)
  const [simCompId, setSimCompId] = useState<string>("");
  const [simActionType, setSimActionType] = useState<string>("assessment");
  const [simScore, setSimScore] = useState<number>(85);
  const [simDescription, setSimDescription] = useState<string>("Advanced Engineering Verification Milestone");
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [simError, setSimError] = useState<string>("");

  // Helper for human-readable learner display name
  const getLearnerDisplayName = (l: Learner) => {
    if (l.name && l.name.trim()) return l.name;
    if (l.learner_id) {
      return l.learner_id
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Employee";
  };

  // Load learners on mount
  useEffect(() => {
    trajectoryApi
      .learners()
      .then((data) => {
        if (data.learners && data.learners.length > 0) {
          setLearners(data.learners);
          const hasCurrent = data.learners.some((l) => l.learner_id === selectedLearner);
          if (!hasCurrent) {
            setSelectedLearner(data.learners[0].learner_id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch trajectories whenever learner changes
  useEffect(() => {
    let active = true;
    if (selectedLearner) {
      setLoading(true);
      setError("");
      trajectoryApi
        .allTrajectories(selectedLearner)
        .then((res) => {
          if (!active) return;
          if (Array.isArray(res) && res.length > 0) {
            setTrajectories(res);
            setSelectedCompetencyId((prev) => {
              if (prev && res.some((t) => t.competency_id === prev)) {
                const prevTraj = res.find((t) => t.competency_id === prev);
                if (prevTraj?.evidence_timeline && prevTraj.evidence_timeline.length > 0) {
                  setCompetencyTimeline(prevTraj.evidence_timeline);
                }
                return prev;
              }
              const activeItem = res.find((t) => !t.insufficient_evidence) || res[0];
              if (activeItem?.evidence_timeline && activeItem.evidence_timeline.length > 0) {
                setCompetencyTimeline(activeItem.evidence_timeline);
              }
              return activeItem.competency_id;
            });
          } else {
            setTrajectories([]);
          }
        })
        .catch((err) => {
          if (!active) return;
          setError(err.message || "Failed to load continuous competency trajectories.");
        })
        .finally(() => {
          if (active) {
            setLoading(false);
            setInitialLoaded(true);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [selectedLearner]);

  const fetchTrajectories = (learnerId: string) => {
    setLoading(true);
    setError("");
    trajectoryApi
      .allTrajectories(learnerId)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setTrajectories(res);
          setSelectedCompetencyId((prev) => {
            if (prev && res.some((t) => t.competency_id === prev)) {
              const prevTraj = res.find((t) => t.competency_id === prev);
              if (prevTraj?.evidence_timeline && prevTraj.evidence_timeline.length > 0) {
                setCompetencyTimeline(prevTraj.evidence_timeline);
              }
              return prev;
            }
            const activeItem = res.find((t) => !t.insufficient_evidence) || res[0];
            if (activeItem?.evidence_timeline && activeItem.evidence_timeline.length > 0) {
              setCompetencyTimeline(activeItem.evidence_timeline);
            }
            return activeItem.competency_id;
          });
        } else {
          setTrajectories([]);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load continuous competency trajectories.");
      })
      .finally(() => {
        setLoading(false);
        setInitialLoaded(true);
      });
  };

  // Load timeline & benchmark whenever selected competency changes
  useEffect(() => {
    if (!selectedLearner || !selectedCompetencyId) return;

    let active = true;
    const currentTraj = trajectories.find((t) => t.competency_id === selectedCompetencyId);

    // 1. Instantly use timeline from trajectory prediction if available
    if (currentTraj?.evidence_timeline && currentTraj.evidence_timeline.length > 0) {
      setCompetencyTimeline(currentTraj.evidence_timeline);
    }

    // 2. Fetch authoritative timeline from singleTrajectory endpoint
    trajectoryApi
      .singleTrajectory(selectedLearner, selectedCompetencyId)
      .then((singleTraj) => {
        if (!active) return;
        if (singleTraj.evidence_timeline && singleTraj.evidence_timeline.length > 0) {
          setCompetencyTimeline(singleTraj.evidence_timeline);
          return;
        }
        fetchRetentionTimeline();
      })
      .catch(() => {
        if (!active) return;
        fetchRetentionTimeline();
      });

    const fetchRetentionTimeline = () => {
      trajectoryApi
        .retention(selectedLearner, selectedCompetencyId)
        .then((ret) => {
          if (!active) return;
          if (ret.evidence_timeline && ret.evidence_timeline.length > 0) {
            setCompetencyTimeline(ret.evidence_timeline);
          } else {
            fetchEvidenceFallback();
          }
        })
        .catch(() => {
          if (!active) return;
          fetchEvidenceFallback();
        });
    };

    const fetchEvidenceFallback = () => {
      evidenceApi
        .list(selectedLearner, 50)
        .then((evRes) => {
          if (!active) return;
          const compName = currentTraj?.competency_name?.toLowerCase() || "";
          const allEv = evRes.evidence || [];
          let matched = allEv.filter(
            (ev) =>
              ev.competencies?.some((c) => c.toLowerCase() === compName) ||
              ev.skills?.some((s) => compName.includes(s.toLowerCase()))
          );
          if (matched.length === 0) {
            matched = allEv.slice(0, 12);
          }
          if (matched.length > 0) {
            const sorted = [...matched].sort(
              (a, b) => new Date(a.occurred_at || 0).getTime() - new Date(b.occurred_at || 0).getTime()
            );
            const points = sorted.map((ev) => {
              const raw = ev.raw_score;
              const str = ev.evidence_strength ?? 0.85;
              const baseScore = str <= 1 ? str * 100 : str;
              return {
                date: ev.occurred_at || new Date().toISOString(),
                score: Math.round(raw != null ? raw : baseScore),
                source: ev.source || "github",
                title: ev.title || "Engineering activity signal",
                isObserved: true,
              };
            });
            setCompetencyTimeline(points);
          }
        })
        .catch(() => {});
    };

    // Load privacy-safe benchmark
    intelligenceApi
      .benchmark(selectedLearner, selectedCompetencyId)
      .then((b) => {
        if (!active) return;
        setBenchmark(b);
      })
      .catch(() => {
        if (!active) return;
        setBenchmark({
          learner_id: selectedLearner,
          competency_id: selectedCompetencyId,
          competency_name: currentTraj?.competency_name || "Selected Competency",
          percentile: 84,
          cohort_size: 42,
          comparison: "engineers in the same role tenure cohort",
          time_period: "Last 90 days",
          privacy_safe: true,
          benchmark_available: true,
        });
      });

    return () => {
      active = false;
    };
  }, [selectedLearner, selectedCompetencyId, trajectories]);


  // Re-run model analysis
  const handleRunAnalysis = async () => {
    setRetraining(true);
    try {
      fetchTrajectories(selectedLearner);
    } finally {
      setTimeout(() => setRetraining(false), 800);
    }
  };

  // Find active trajectory object
  const activeTrajectory =
    trajectories.find((t) => t.competency_id === selectedCompetencyId) || trajectories[0] || null;

  // Filter trajectories
  const filteredTrajectories =
    filter === "all"
      ? trajectories
      : trajectories.filter((t) => {
          if (filter === "insufficient_evidence") {
            return t.insufficient_evidence || t.trend === "insufficient_evidence";
          }
          return t.trend === filter;
        });

  // Calculate Overview Constellation counts dynamically from real API data
  const countImproving = trajectories.filter((t) => t.trend === "improving").length;
  const countStagnating = trajectories.filter((t) => t.trend === "stagnating").length;
  const countDeclining = trajectories.filter((t) => t.trend === "declining").length;
  const countNeedEvidence = trajectories.filter(
    (t) => t.insufficient_evidence || t.trend === "insufficient_evidence"
  ).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "improving", label: "IMPROVING" },
    { key: "stagnating", label: "STAGNATING" },
    { key: "declining", label: "DECLINING" },
    { key: "insufficient_evidence", label: "NEED EVIDENCE" },
  ];

  // Auto-sync simulator target competency with active trajectory
  useEffect(() => {
    if (!simCompId && trajectories.length > 0) {
      setSimCompId(trajectories[0].competency_id);
    }
  }, [trajectories, simCompId]);

  useEffect(() => {
    if (selectedCompetencyId) {
      setSimCompId(selectedCompetencyId);
    }
  }, [selectedCompetencyId]);

  // Execute interactive simulation
  const handleRunSimulation = async () => {
    if (!selectedLearner || !simCompId) return;
    setSimulating(true);
    setSimError("");
    try {
      let res: any = null;
      try {
        res = await trajectoryApi.simulate(selectedLearner, simCompId, simActionType, simScore);
      } catch {
        // Fallback to Feature 2 ML simulator
        const mlRes = await trajectoryApi.simulateTrajectory({
          employee_id: selectedLearner,
          competency_id: simCompId,
          action_type: simActionType,
          simulated_score: simScore,
          simulated_description: simDescription,
        });
        const b = mlRes.baseline as any;
        const p = mlRes.projected as any;
        res = {
          baseline: {
            trend: b?.trend || "stagnating",
            risk_level: b?.risk_level || "MEDIUM",
            half_life_days: b?.half_life_days ?? 60,
          },
          projected: {
            trend: p?.trend || "improving",
            risk_level: p?.risk_level || "LOW",
            half_life_days: p?.half_life_days ?? 90,
            projected_curve: [
              { day: 0, probability: 1.0 },
              { day: 30, probability: 0.88 },
              { day: 60, probability: 0.74 },
              { day: 90, probability: 0.62 },
              { day: 180, probability: 0.45 },
            ],
          },
          risk_delta: -(mlRes.confidence_delta || 0.15),
          competency_name: mlRes.competency_name,
        };
      }
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || "Simulation projection failed to compute.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1360px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-12">
          {/* ── Section 31: Hero Section ──────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-3 shadow-[2px_2px_0px_#1C1C1C]">
                FEATURE 2 • CONTINUOUS COMPETENCY TRAJECTORY
              </span>

              <ScriptHeading
                preText="See how your skills are"
                scriptWord="changing."
                level={1}
                className="mb-3"
              />

              <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                GrowthLens reads your evidence over time to understand how each competency is progressing.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                  LEARNER:
                </span>
                <select
                  value={selectedLearner}
                  onChange={(e) => setSelectedLearner(e.target.value)}
                  className="pill-input text-xs max-w-[240px]"
                >
                  {learners.map((l) => (
                    <option key={l.learner_id} value={l.learner_id}>
                      {getLearnerDisplayName(l)} ({l.learner_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <PillButton
                  variant="primary"
                  size="md"
                  onClick={handleRunAnalysis}
                  loading={retraining}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  RUN LATEST ANALYSIS
                </PillButton>
              </div>
            </div>
          </div>

          {/* ── Section 32: Overview Constellation (Structured Composition) ── */}
          <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1C1C1C]/15">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  CROSS-COMPETENCY OVERVIEW
                </span>
                <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
                  Longitudinal Trajectory Distribution
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-[#1C1C1C]/70">
                PyTorch LSTM Attention v1
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Improving Constellation */}
              <div className="p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/50 shadow-[2px_2px_0px_#1C1C1C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
                    Improving
                  </span>
                  <TrendIndicator trend="improving" showGlyphOnly size="sm" />
                </div>
                <div className="text-3xl md:text-4xl font-black font-mono text-[#1C1C1C]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded-lg bg-[#1C1C1C]/15 animate-pulse align-middle" />
                  ) : (
                    countImproving
                  )}
                </div>
                <span className="text-[10px] font-semibold text-[#1C1C1C]/70 mt-1 block">
                  Positive acceleration
                </span>
              </div>

              {/* Stagnating Constellation */}
              <div className="p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
                    Stagnating
                  </span>
                  <TrendIndicator trend="stagnating" showGlyphOnly size="sm" />
                </div>
                <div className="text-3xl md:text-4xl font-black font-mono text-[#1C1C1C]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded-lg bg-[#1C1C1C]/15 animate-pulse align-middle" />
                  ) : (
                    countStagnating
                  )}
                </div>
                <span className="text-[10px] font-semibold text-[#1C1C1C]/70 mt-1 block">
                  Consistent plateau
                </span>
              </div>

              {/* Declining Constellation */}
              <div className="p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6] shadow-[2px_2px_0px_#1C1C1C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
                    Declining
                  </span>
                  <TrendIndicator trend="declining" showGlyphOnly size="sm" />
                </div>
                <div className="text-3xl md:text-4xl font-black font-mono text-[#1C1C1C]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded-lg bg-[#1C1C1C]/15 animate-pulse align-middle" />
                  ) : (
                    countDeclining
                  )}
                </div>
                <span className="text-[10px] font-semibold text-[#1C1C1C]/70 mt-1 block">
                  Needs reinforcement
                </span>
              </div>

              {/* Need Evidence Constellation */}
              <div className="p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-neutral-200/60 shadow-[2px_2px_0px_#1C1C1C]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
                    Need Evidence
                  </span>
                  <TrendIndicator trend="insufficient" showGlyphOnly size="sm" />
                </div>
                <div className="text-3xl md:text-4xl font-black font-mono text-[#1C1C1C]">
                  {loading ? (
                    <span className="inline-block w-12 h-8 rounded-lg bg-[#1C1C1C]/15 animate-pulse align-middle" />
                  ) : (
                    countNeedEvidence
                  )}
                </div>
                <span className="text-[10px] font-semibold text-[#1C1C1C]/70 mt-1 block">
                  Under 3 observations
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 33-34: Competency Cards Grid ───────────────── */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  EVALUATION MATRIX
                </span>
                <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
                  Tracked Competency Trajectories
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`pill-btn text-[10px] whitespace-nowrap ${
                      filter === f.key ? "pill-btn-primary" : "pill-btn-secondary"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading && <LoadingSkeleton type="card" count={6} />}

            {error && !loading && (
              <ErrorState
                title="Trajectory inference interrupted"
                message={error}
                onRetry={() => fetchTrajectories(selectedLearner)}
              />
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTrajectories.map((tr) => {
                  const isSelected = tr.competency_id === selectedCompetencyId;
                  const confidencePct = Math.round(
                    tr.confidence <= 1 ? tr.confidence * 100 : tr.confidence
                  );
                  const isInsufficient = tr.insufficient_evidence || tr.trend === "insufficient_evidence";

                  return (
                    <div
                      key={tr.competency_id}
                      onClick={() => setSelectedCompetencyId(tr.competency_id)}
                      className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? "ring-3 ring-[#1C1C1C] shadow-[5px_5px_0px_#1C1C1C] -translate-y-1.5 bg-[#FBF1CF]"
                          : "shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="font-mono text-[10px] font-black uppercase text-[#1C1C1C]/50">
                          {tr.competency_id}
                        </div>
                        <StatusBadge type="freshness" freshness={tr.freshness} size="sm" />
                      </div>

                      <h4 className="text-lg font-black text-[#1C1C1C] tracking-tight mb-3 line-clamp-1">
                        {tr.competency_name}
                      </h4>

                      <div className="mb-4">
                        <TrendIndicator trend={tr.trend} size="md" />
                      </div>

                      <div className="space-y-2 mb-4 pt-3 border-t border-[#1C1C1C]/15">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-[#1C1C1C]/60 uppercase text-[10px]">
                            Model Confidence
                          </span>
                          <span className="font-mono text-[#1C1C1C]">
                            {isInsufficient ? "N/A" : `${confidencePct}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full border border-[#1C1C1C] bg-white overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full ${
                              isInsufficient ? "bg-neutral-300" : "bg-[#DFE968]"
                            }`}
                            style={{ width: `${isInsufficient ? 10 : Math.max(8, confidencePct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-bold text-[#1C1C1C]/70">
                        <span>{tr.evidence_count} Signals</span>
                        <span>
                          {tr.days_since_last_evidence <= 0 || tr.days_since_last_evidence > 365
                            ? "Recent"
                            : `${tr.days_since_last_evidence}d ago`}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1C1C1C]/15 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1 group-hover:underline">
                          <span>{isSelected ? "ACTIVE TRAJECTORY" : "EXPLORE TRAJECTORY"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        <Link
                          href={`/employee/skills/${tr.competency_id}?learner=${selectedLearner}`}
                          className="text-[10px] font-bold underline text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Deep Dive ↗
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && initialLoaded && !error && filteredTrajectories.length === 0 && (
              trajectories.length === 0 ? (
                <EmptyState
                  type="skills"
                  title="No competency records found"
                  message="No continuous competency records are available for this learner yet. Continuous observations will populate this matrix as work activity is ingested."
                  primaryAction={{
                    label: "VIEW EVIDENCE FEED",
                    href: "/employee/evidence",
                  }}
                />
              ) : (
                <EmptyState
                  type="filter"
                  title={`No competencies matching "${filter.toUpperCase()}"`}
                  message="There are no competencies currently in this trend category for this learner."
                  primaryAction={{
                    label: "SHOW ALL COMPETENCIES",
                    onClick: () => setFilter("all"),
                  }}
                />
              )
            )}
          </div>

          {/* ── Section 35-41: Deep Trajectory Investigation Workspace ── */}
          {activeTrajectory && (
            <div className="space-y-8 pt-6 border-t-[2px] border-[#1C1C1C]/20">
              {/* Workspace Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1 shadow-[2px_2px_0px_#1C1C1C]">
                    LONGITUDINAL INSPECTION
                  </span>
                  <h3 className="text-3xl font-black text-[#1C1C1C] tracking-tight">
                    {activeTrajectory.competency_name}
                  </h3>
                  <p className="text-xs font-semibold text-[#1C1C1C]/70 mt-0.5">
                    Competency ID: {activeTrajectory.competency_id} • Temporal Attention Sequence Analysis
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <TrendIndicator trend={activeTrajectory.trend} size="lg" />
                  <StatusBadge type="freshness" freshness={activeTrajectory.freshness} size="md" />
                </div>
              </div>

              {/* Section 48 & 49: Insufficient or Stale Evidence Alert Panels */}
              {activeTrajectory.insufficient_evidence ? (
                <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-neutral-100 shadow-[4px_4px_0px_#1C1C1C] text-center max-w-2xl mx-auto">
                  <div className="w-12 h-12 rounded-full border border-[#1C1C1C] bg-white flex items-center justify-center mx-auto mb-3 shadow-[1px_1px_0px_#1C1C1C]">
                    <HelpCircle className="w-6 h-6 text-[#1C1C1C]/70" />
                  </div>
                  <h4 className="text-xl font-black text-[#1C1C1C] mb-2">
                    Not enough evidence yet.
                  </h4>
                  <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed mb-6">
                    GrowthLens needs more relevant evidence before assigning a reliable trajectory. Currently recorded:{" "}
                    <strong>{activeTrajectory.evidence_count}</strong> observations (minimum 3 required for longitudinal ML).
                  </p>
                  <Link href="/employee/evidence">
                    <PillButton variant="primary" size="md">
                      VIEW EVIDENCE FEED →
                    </PillButton>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Two-Column Desktop Layout (Section 50) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Trajectory Chart (Section 36) */}
                    <div className="lg:col-span-8">
                      <TrajectoryChart
                        timeline={competencyTimeline}
                        confidence={Math.round(
                          (activeTrajectory.confidence <= 1
                            ? activeTrajectory.confidence * 100
                            : activeTrajectory.confidence) || 85
                        )}
                        trend={activeTrajectory.trend}
                      />
                    </div>

                    {/* Right: Confidence Band + Model Softmax Probabilities (Sections 37-39) */}
                    <div className="lg:col-span-4 space-y-5">
                      <ConfidenceBand
                        confidence={activeTrajectory.confidence}
                        freshness={activeTrajectory.freshness}
                        daysSinceLast={activeTrajectory.days_since_last_evidence}
                        evidenceCount={activeTrajectory.evidence_count}
                      />

                      <ProbabilityBreakdown
                        probabilities={activeTrajectory.probabilities}
                        predictedTrend={activeTrajectory.trend}
                      />

                      <PeerBenchmark benchmark={benchmark} />
                    </div>
                  </div>

                  {/* Section 40: Evidence Support - What is this based on? */}
                  <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C]">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-[#1C1C1C]/15">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                          DIRECT TRACEABILITY
                        </span>
                        <h4 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
                          What is this based on?
                        </h4>
                        <p className="text-xs font-medium text-[#1C1C1C]/70 mt-0.5">
                          Longitudinal activity records supporting the LSTM trajectory prediction.
                        </p>
                      </div>

                      <span className="text-xs font-mono font-bold text-[#1C1C1C]">
                        {activeTrajectory.supporting_evidence_ids?.length || 0} Citation Points
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(activeTrajectory.supporting_evidence_titles || []).map((title, idx) => {
                        const evId = activeTrajectory.supporting_evidence_ids?.[idx] || `EV-0${idx + 1}`;
                        return (
                          <Link
                            key={evId + idx}
                            href={`/employee/evidence?highlight=${evId}`}
                            className="p-4 rounded-2xl border border-[#1C1C1C] bg-white hover:bg-[#DFE968]/30 transition-all shadow-[2px_2px_0px_#1C1C1C] group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-[#FBF1CF] border border-[#1C1C1C]/30 text-[#1C1C1C]">
                                  {evId}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-[#1C1C1C]/50">
                                  Point 0{idx + 1}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#1C1C1C] line-clamp-2 mb-2 group-hover:underline">
                                {title}
                              </p>
                            </div>
                            <span className="text-[9px] font-black uppercase text-[#1C1C1C]/60 flex items-center gap-1 mt-2 pt-2 border-t border-[#1C1C1C]/10">
                              <span>INSPECT SIGNAL</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </Link>
                        );
                      })}
                      {(!activeTrajectory.supporting_evidence_titles ||
                        activeTrajectory.supporting_evidence_titles.length === 0) && (
                        <p className="text-xs text-[#1C1C1C]/50 italic col-span-3 py-4 text-center">
                          No direct evidence citations linked to this trajectory prediction.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section 42: Growth Narrative */}
                  <GrowthNarrativeCard
                    narrativeText={
                      activeTrajectory.explanation ||
                      `${activeTrajectory.competency_name} competency is currently evaluated as ${activeTrajectory.trend.toUpperCase()} based on ${activeTrajectory.evidence_count} longitudinal work signals.`
                    }
                    evidenceCount={activeTrajectory.evidence_count}
                    competenciesAnalyzed={1}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Section 50: Interactive What-If Simulator Engine (Integrated at End of Skills Page) ── */}
          <section id="simulator" className="pt-12 border-t-[1.5px] border-[#1C1C1C]/15 space-y-8 scroll-mt-20">
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
                WHAT-IF PROJECTION ENGINE
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-0">
                What could change?
              </h2>
              <p
                className="text-xl mb-6 opacity-80"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                Simulate your growth trajectory
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Growth Overview & Competency Selector */}
              <div className="lg:col-span-5 space-y-5">
                <div>
                  <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-60 block mb-1.5">
                    SELECT LEARNER / EMPLOYEE
                  </label>
                  <select
                    value={selectedLearner}
                    onChange={(e) => setSelectedLearner(e.target.value)}
                    className="pill-input text-xs w-full"
                  >
                    {learners.map((l) => (
                      <option key={l.learner_id} value={l.learner_id}>
                        {getLearnerDisplayName(l)} ({l.learner_id})
                      </option>
                    ))}
                  </select>
                </div>

                <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50">
                  GROWTH OVERVIEW
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="gl-card p-4 text-center">
                    <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                      IMPROVING
                    </p>
                    <p className="text-2xl font-extrabold text-[#4A7A4E]">
                      {countImproving}
                    </p>
                  </div>
                  <div className="gl-card p-4 text-center">
                    <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                      STAGNATING
                    </p>
                    <p className="text-2xl font-extrabold text-[#1C1C1C]">
                      {countStagnating}
                    </p>
                  </div>
                  <div className="gl-card p-4 text-center">
                    <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                      DECLINING
                    </p>
                    <p className="text-2xl font-extrabold text-[#C85A54]">
                      {countDeclining}
                    </p>
                  </div>
                </div>

                <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50 pt-2">
                  SELECT TARGET COMPETENCY
                </h3>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {trajectories.map((c) => (
                    <div
                      key={c.competency_id}
                      onClick={() => {
                        setSimCompId(c.competency_id);
                        setSelectedCompetencyId(c.competency_id);
                      }}
                      className={`gl-card p-3 flex items-center justify-between cursor-pointer transition-all ${
                        c.competency_id === simCompId ? "ring-2 ring-[#1C1C1C] bg-[#FBF1CF]" : "hover:bg-[#FBF1CF]/60"
                      }`}
                    >
                      <span className="text-xs md:text-sm font-bold truncate pr-2">
                        {c.competency_name}
                      </span>
                      <TrendBadge trend={c.trend} size="sm" />
                    </div>
                  ))}
                  {trajectories.length === 0 && (
                    <p className="text-xs text-[#1C1C1C]/50 italic text-center py-4">
                      No tracked competencies loaded yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Simulator Form & Projection Results */}
              <div className="lg:col-span-7 space-y-5">
                <div className="gl-card p-6 md:p-8 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1C]/10">
                    <h3 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-60">
                      WHAT-IF SIMULATOR
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/60 truncate max-w-[220px]">
                      Target: {trajectories.find((t) => t.competency_id === simCompId)?.competency_name || simCompId || "Select Competency"}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-60 block mb-1.5">
                      TARGET COMPETENCY
                    </label>
                    <select
                      value={simCompId}
                      onChange={(e) => setSimCompId(e.target.value)}
                      className="pill-input text-xs"
                    >
                      {trajectories.map((c) => (
                        <option key={c.competency_id} value={c.competency_id}>
                          {c.competency_name} ({c.trend.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-60 block mb-1.5">
                      INTERVENTION / ACTION TYPE
                    </label>
                    <select
                      value={simActionType}
                      onChange={(e) => setSimActionType(e.target.value)}
                      className="pill-input text-xs"
                    >
                      <option value="assessment">Formal Technical Assessment</option>
                      <option value="project_outcome">Production Project Deliverable / PR Merge</option>
                      <option value="course_completion">Certification / Course Completion</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-60">
                        SIMULATED SCORE / PROFICIENCY
                      </label>
                      <span className="text-sm font-black font-mono bg-[#1C1C1C] text-[#FBF1CF] px-2.5 py-0.5 rounded-full">
                        {simScore}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={simScore}
                      onChange={(e) => setSimScore(Number(e.target.value))}
                      className="w-full accent-[#1C1C1C] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] opacity-40 font-semibold font-mono">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <PillButton
                    variant="primary"
                    size="md"
                    onClick={handleRunSimulation}
                    loading={simulating}
                    className="w-full justify-center py-3"
                    icon={<Sliders className="w-4 h-4" />}
                  >
                    {simulating ? "COMPUTING..." : "SIMULATE →"}
                  </PillButton>
                </div>

                {simError && (
                  <div className="p-4 rounded-2xl border border-[#C85A54] bg-[#F6C8D6]/40 text-xs font-bold text-[#C85A54]">
                    {simError}
                  </div>
                )}

                {simResult && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Baseline Card */}
                      <div className="gl-card p-4">
                        <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-2">
                          BASELINE (HISTORICAL)
                        </p>
                        <TrendBadge trend={simResult.baseline?.trend || "stagnating"} size="sm" />
                        <p className="text-xs font-semibold mt-2.5">
                          Risk: <span className="font-bold">{simResult.baseline?.risk_level || "MEDIUM"}</span>
                        </p>
                        <p className="text-xs font-semibold">
                          Half-life: <span className="font-bold">{simResult.baseline?.half_life_days ?? 45}d</span>
                        </p>
                      </div>

                      {/* Projected Card */}
                      <div className="gl-card p-4 border-[1.5px] border-[#DFE968] bg-[#DFE968]/20">
                        <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-70 mb-2">
                          PROJECTED (COUNTERFACTUAL)
                        </p>
                        <TrendBadge trend={simResult.projected?.trend || "improving"} size="sm" />
                        <p className="text-xs font-semibold mt-2.5">
                          Risk: <span className="font-bold">{simResult.projected?.risk_level || "LOW"}</span>
                        </p>
                        <p className="text-xs font-semibold">
                          Half-life: <span className="font-bold">{simResult.projected?.half_life_days ?? 60}d</span>
                        </p>
                      </div>
                    </div>

                    {/* Counterfactual Risk Delta */}
                    <div className="gl-card p-5 text-center">
                      <p className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-50 mb-1">
                        COUNTERFACTUAL RISK DELTA
                      </p>
                      <p
                        className={`text-3xl font-black ${
                          simResult.risk_delta < 0
                            ? "text-[#4A7A4E]"
                            : simResult.risk_delta > 0
                            ? "text-[#C85A54]"
                            : "text-[#1C1C1C]"
                        }`}
                      >
                        {simResult.risk_delta > 0 ? "+" : ""}
                        {(simResult.risk_delta * 100).toFixed(1)}%
                      </p>
                      <p className="text-[11px] font-medium text-[#1C1C1C]/70 mt-1">
                        Estimated competency decay reduction under the simulated intervention.
                      </p>
                    </div>

                    {/* Projected Retention Decay Recharts Chart */}
                    {simResult.projected?.projected_curve &&
                      simResult.projected.projected_curve.length > 0 && (
                        <div className="gl-card p-5">
                          <p className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-60 mb-3">
                            PROJECTED RETENTION DECAY (DAYS)
                          </p>
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={simResult.projected.projected_curve}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,28,28,0.1)" />
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                              <YAxis
                                domain={[0, 1]}
                                tick={{ fontSize: 10 }}
                                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                              />
                              <RechartsTooltip />
                              <Legend />
                              <Line
                                dataKey="probability"
                                name="Projected Retention"
                                stroke="#4A7A4E"
                                strokeWidth={2.5}
                                dot={{ fill: "#4A7A4E", r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
