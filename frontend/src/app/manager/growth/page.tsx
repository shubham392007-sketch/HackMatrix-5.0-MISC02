"use client";

import React, { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
  TrendIndicator,
  ConfidenceBand,
  ProbabilityBreakdown,
  TeamSkillHeatmap,
  GrowthNarrativeCard,
  LoadingSkeleton,
  ErrorState,
} from "@/components/growthlens";
import {
  intelligence as intelligenceApi,
  trajectory as trajectoryApi,
  evidence as evidenceApi,
} from "@/lib/api";
import type { TeamHeatmap, HeatmapMember, TrajectoryPrediction } from "@/lib/types";
import { Users, Sparkles, TrendingUp, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

const TEAMS = [
  { id: "team_core_engineering", name: "Core Engineering" },
  { id: "team_core_intelligence", name: "Core Intelligence" },
];

export default function ManagerGrowthPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>(TEAMS[0].id);
  const [heatmap, setHeatmap] = useState<TeamHeatmap | null>(null);
  const [selectedMember, setSelectedMember] = useState<HeatmapMember | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<string>("");
  const [memberTrajectories, setMemberTrajectories] = useState<TrajectoryPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    intelligenceApi
      .teamHeatmap(selectedTeam)
      .then((data) => {
        if (!active) return;
        setHeatmap(data);
        if (data.members && data.members.length > 0) {
          setSelectedMember(data.members[0]);
          setSelectedCompetency(data.competency_names?.[0] || "");
        }
      })
      .catch((err) => {
        if (!active) return;
        // Fallback for demo
        const demoHeatmap: TeamHeatmap = {
          team_id: selectedTeam,
          team_name: selectedTeam === "team_core_engineering" ? "Core Engineering" : "Core Intelligence",
          competency_names: [
            "Backend Engineering & API Development",
            "Data Processing & Analytics",
            "Database Systems & Storage",
            "DevOps & Cloud Infrastructure",
            "Quality Assurance & Testing",
          ],
          members: [
            {
              learner_id: "shubham_pokale",
              name: "Shubham Pokale",
              competencies: {
                "Backend Engineering & API Development": { trend: "improving", confidence: 92, score: 88 },
                "Data Processing & Analytics": { trend: "insufficient", confidence: 0, score: 70 },
                "Database Systems & Storage": { trend: "improving", confidence: 73, score: 84 },
                "DevOps & Cloud Infrastructure": { trend: "insufficient", confidence: 0, score: 72 },
                "Quality Assurance & Testing": { trend: "improving", confidence: 70, score: 82 },
              },
            },
            {
              learner_id: "maya_sharma",
              name: "Maya Sharma",
              competencies: {
                "Backend Engineering & API Development": { trend: "improving", confidence: 85, score: 86 },
                "Data Processing & Analytics": { trend: "improving", confidence: 90, score: 91 },
                "Database Systems & Storage": { trend: "stagnating", confidence: 75, score: 80 },
                "DevOps & Cloud Infrastructure": { trend: "declining", confidence: 68, score: 65 },
                "Quality Assurance & Testing": { trend: "improving", confidence: 80, score: 84 },
              },
            },
            {
              learner_id: "alex_rivera",
              name: "Alex Rivera",
              competencies: {
                "Backend Engineering & API Development": { trend: "improving", confidence: 88, score: 89 },
                "Data Processing & Analytics": { trend: "stagnating", confidence: 80, score: 82 },
                "Database Systems & Storage": { trend: "improving", confidence: 82, score: 85 },
                "DevOps & Cloud Infrastructure": { trend: "improving", confidence: 84, score: 88 },
                "Quality Assurance & Testing": { trend: "stagnating", confidence: 72, score: 78 },
              },
            },
          ],
          patterns: [
            {
              competency: "Backend Engineering & API Development",
              observation: "Team exhibits strong positive momentum across pull request throughput and distributed queuing architecture.",
              severity: "low",
            },
            {
              competency: "DevOps & Cloud Infrastructure",
              observation: "Recent evidence is aging across 2 members. Reinforcement in container orchestration and CI/CD pipelines recommended.",
              severity: "medium",
            },
          ],
        };
        setHeatmap(demoHeatmap);
        setSelectedMember(demoHeatmap.members[0]);
        setSelectedCompetency(demoHeatmap.competency_names[0]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTeam]);

  // Load selected member's authoritative trajectories
  useEffect(() => {
    if (!selectedMember) return;
    trajectoryApi
      .allTrajectories(selectedMember.learner_id)
      .then((trajs) => {
        setMemberTrajectories(trajs);
      })
      .catch(() => {
        setMemberTrajectories([]);
      });
  }, [selectedMember]);

  const handleCellSelect = (member: HeatmapMember, comp: string) => {
    setSelectedMember(member);
    setSelectedCompetency(comp);
  };

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1360px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
                MANAGER INTELLIGENCE
              </span>
              <ScriptHeading
                preText="Team growth"
                scriptWord="intelligence."
                level={1}
                className="mb-2"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Supervise longitudinal competency trajectories across authorized team members with strict privacy boundaries.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                TEAM:
              </span>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="pill-input text-xs max-w-[240px]"
              >
                {TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && <LoadingSkeleton type="chart" />}

          {error && !loading && (
            <ErrorState
              title="Team Intelligence unavailable"
              message={error}
              onRetry={() => window.location.reload()}
            />
          )}

          {!loading && heatmap && (
            <>
              {/* Section 52: Team Skill Heatmap */}
              <TeamSkillHeatmap heatmap={heatmap} onSelectMember={handleCellSelect} />

              {/* Section 53: Member Detail Drilldown for Manager */}
              {selectedMember && (
                <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1C1C1C]/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center font-black text-sm">
                        {selectedMember.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-[#1C1C1C] tracking-tight">
                          {selectedMember.name}
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                          Authorized Employee: {selectedMember.learner_id}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/employee/skills?learner=${selectedMember.learner_id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-[#1C1C1C] hover:underline"
                    >
                      <span>VIEW FULL LEARNER PROFILE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Competency summary row for selected employee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {heatmap.competency_names.map((cName) => {
                      const cData = selectedMember.competencies?.[cName] || {
                        trend: "insufficient",
                        confidence: 0,
                        score: 0,
                      };
                      const isFocused = cName === selectedCompetency;

                      return (
                        <div
                          key={cName}
                          onClick={() => setSelectedCompetency(cName)}
                          className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white cursor-pointer transition-all ${
                            isFocused
                              ? "ring-2 ring-[#1C1C1C] bg-[#DFE968]/30 shadow-[3px_3px_0px_#1C1C1C] -translate-y-0.5"
                              : "hover:-translate-y-0.5 shadow-[2px_2px_0px_#1C1C1C]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                              COMPETENCY
                            </span>
                            <TrendIndicator trend={cData.trend} size="sm" />
                          </div>

                          <h5 className="text-sm font-black text-[#1C1C1C] tracking-tight line-clamp-1 mb-2">
                            {cName}
                          </h5>

                          <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-[#1C1C1C]/10 text-[#1C1C1C]/70">
                            <span>Score: {Math.round(cData.score || 75)} pts</span>
                            <span>Conf: {cData.confidence}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Growth Narrative for this employee */}
                  <GrowthNarrativeCard
                    narrativeText={`${selectedMember.name} has demonstrated steady technical progression in ${selectedCompetency || "core engineering"}. Recent project activity highlights active contribution with strong evidence traceability.`}
                    evidenceCount={18}
                    competenciesAnalyzed={heatmap.competency_names.length}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
