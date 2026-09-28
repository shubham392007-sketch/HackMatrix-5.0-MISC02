"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TrendBadge from "@/components/ui/TrendBadge";
import { trajectory } from "@/lib/api";
import type { Learner, Competency, RetentionAssessment, SimulationResult } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

export default function SimulatorPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [compId, setCompId] = useState("");
  const [actionType, setActionType] = useState("assessment");
  const [score, setScore] = useState(80);
  const [overview, setOverview] = useState<RetentionAssessment | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trajectory.learners().then((data) => {
      setLearners(data.learners);
      if (data.learners.length > 0) setLearnerId(data.learners[0].learner_id);
    });
  }, []);

  useEffect(() => {
    if (!learnerId) return;
    setLoading(true);
    trajectory.competencies(learnerId).then((data) => {
      setCompetencies(data.competencies);
      if (data.competencies.length > 0) setCompId(data.competencies[0].competency_id);
    });
    trajectory.retention(learnerId)
      .then(setOverview)
      .finally(() => setLoading(false));
  }, [learnerId]);

  const handleSimulate = async () => {
    if (!learnerId || !compId) return;
    setSimulating(true);
    setError("");
    try {
      const res = await trajectory.simulate(learnerId, compId, actionType, score);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    }
    setSimulating(false);
  };

  const improvingCount = competencies.filter((c) => c.trend === "improving").length;
  const stagnatingCount = competencies.filter((c) => c.trend === "stagnating").length;
  const decliningCount = competencies.filter((c) => c.trend === "declining").length;

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-0">
          What could change?
        </h1>
        <p
          className="text-xl mb-8 opacity-80"
          style={{ fontFamily: "'Yellowtail', cursive" }}
        >
          Simulate your growth trajectory
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Overview */}
          <div className="space-y-4">
            <select
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              className="pill-input"
            >
              {learners.map((l) => (
                <option key={l.learner_id} value={l.learner_id}>
                  {l.name} ({l.learner_id})
                </option>
              ))}
            </select>

            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50 mt-4">
              GROWTH OVERVIEW
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "IMPROVING", value: improvingCount, color: "#4A7A4E" },
                { label: "STAGNATING", value: stagnatingCount },
                { label: "DECLINING", value: decliningCount, color: "#C85A54" },
              ].map((s) => (
                <div key={s.label} className="gl-card p-4 text-center">
                  <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                    {s.label}
                  </p>
                  <p
                    className="text-2xl font-extrabold"
                    style={{ color: s.color || "var(--color-ink)" }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {competencies.length > 0 && (
              <div className="space-y-2">
                {competencies.map((c) => (
                  <div key={c.competency_id} className="gl-card p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">{c.competency_name}</span>
                    <TrendBadge trend={c.trend} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Simulator */}
          <div className="space-y-4">
            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50">
              WHAT-IF SIMULATOR
            </h2>

            <div className="gl-card p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-50 block mb-1">
                  COMPETENCY
                </label>
                <select
                  value={compId}
                  onChange={(e) => setCompId(e.target.value)}
                  className="pill-input"
                >
                  {competencies.map((c) => (
                    <option key={c.competency_id} value={c.competency_id}>
                      {c.competency_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-50 block mb-1">
                  ACTION TYPE
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="pill-input"
                >
                  <option value="assessment">Assessment</option>
                  <option value="project_outcome">Project Outcome</option>
                  <option value="course_completion">Course Completion</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-50 block mb-1">
                  SIMULATED SCORE: {score}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full accent-[var(--color-cta)]"
                />
                <div className="flex justify-between text-[9px] opacity-40 font-semibold">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="pill-btn pill-btn-primary w-full justify-center"
              >
                {simulating ? "SIMULATING · · ·" : "SIMULATE →"}
              </button>
            </div>

            {error && (
              <div className="gl-card p-4 border-[#C85A54] text-sm text-[#C85A54]">{error}</div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="gl-card p-4">
                    <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-2">CURRENT</p>
                    <TrendBadge trend={result.baseline.trend} size="sm" />
                    <p className="text-sm font-semibold mt-2">Risk: {result.baseline.risk_level}</p>
                    <p className="text-sm font-semibold">Half-life: {result.baseline.half_life_days}d</p>
                  </div>
                  <div className="gl-card p-4 border-[var(--color-cta)]">
                    <p className="text-[9px] font-bold tracking-[0.1em] uppercase opacity-50 mb-2">PROJECTED</p>
                    <TrendBadge trend={result.projected.trend} size="sm" />
                    <p className="text-sm font-semibold mt-2">Risk: {result.projected.risk_level}</p>
                    <p className="text-sm font-semibold">Half-life: {result.projected.half_life_days}d</p>
                  </div>
                </div>

                <div className="gl-card p-4 text-center">
                  <p className="text-[10px] font-bold tracking-[0.08em] uppercase opacity-50 mb-1">RISK CHANGE</p>
                  <p className={`text-2xl font-extrabold ${result.risk_delta < 0 ? "text-[#4A7A4E]" : result.risk_delta > 0 ? "text-[#C85A54]" : ""}`}>
                    {result.risk_delta > 0 ? "+" : ""}{(result.risk_delta * 100).toFixed(1)}%
                  </p>
                </div>

                {result.projected.projected_curve && result.projected.projected_curve.length > 0 && (
                  <div className="gl-card p-5">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={result.projected.projected_curve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,28,28,0.1)" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
                        <Tooltip />
                        <Legend />
                        <Line dataKey="probability" name="Projected" stroke="#4A7A4E" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
