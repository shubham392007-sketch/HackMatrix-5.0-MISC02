"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TrendBadge from "@/components/ui/TrendBadge";
import ConfidenceBadge from "@/components/ui/ConfidenceBadge";
import { trajectory, intelligence } from "@/lib/api";
import type { Learner, Competency, GrowthNarrative, PeerBenchmark, ConfidenceDecay, TrendDirection } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

type Tab = "narrative" | "benchmark" | "confidence";

export default function NarrativePage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [compId, setCompId] = useState("");
  const [tab, setTab] = useState<Tab>("narrative");

  const [narrative, setNarrative] = useState<GrowthNarrative | null>(null);
  const [benchmark, setBenchmark] = useState<PeerBenchmark | null>(null);
  const [decay, setDecay] = useState<ConfidenceDecay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    trajectory.learners().then((r) => {
      setLearners(r.learners);
      if (r.learners.length > 0) setLearnerId(r.learners[0].learner_id);
    });
  }, []);

  useEffect(() => {
    if (!learnerId) return;
    trajectory.competencies(learnerId).then((r) => {
      setCompetencies(r.competencies);
      if (r.competencies.length > 0) setCompId(r.competencies[0].competency_id);
    });
  }, [learnerId]);

  useEffect(() => {
    if (!learnerId) return;
    if (tab === "narrative") {
      setLoading(true);
      setError("");
      intelligence.narrative(learnerId)
        .then(setNarrative)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [learnerId, tab]);

  useEffect(() => {
    if (!learnerId || !compId) return;
    if (tab === "benchmark") {
      setLoading(true);
      setError("");
      intelligence.benchmark(learnerId, compId)
        .then(setBenchmark)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
    if (tab === "confidence") {
      setLoading(true);
      setError("");
      intelligence.confidenceDecay(learnerId, compId)
        .then(setDecay)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [learnerId, compId, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "narrative", label: "NARRATIVE" },
    { key: "benchmark", label: "BENCHMARK" },
    { key: "confidence", label: "CONFIDENCE" },
  ];

  const freshnessColors: Record<string, string> = {
    Fresh: "bg-[#4A7A4E]/10 text-[#4A7A4E]",
    Aging: "bg-[var(--color-cta)]/20 text-[var(--color-ink)]",
    Stale: "bg-[#C85A54]/10 text-[#C85A54]",
  };

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
          Growth Intelligence
        </h1>
        <p className="text-sm font-medium opacity-60 mb-8">
          Your growth story, backed by evidence.
        </p>

        {/* Selectors */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={learnerId}
            onChange={(e) => setLearnerId(e.target.value)}
            className="pill-input max-w-xs"
          >
            {learners.map((l) => (
              <option key={l.learner_id} value={l.learner_id}>
                {l.name} ({l.learner_id})
              </option>
            ))}
          </select>
          {tab !== "narrative" && (
            <select
              value={compId}
              onChange={(e) => setCompId(e.target.value)}
              className="pill-input max-w-xs"
            >
              {competencies.map((c) => (
                <option key={c.competency_id} value={c.competency_id}>
                  {c.competency_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pill-btn text-[10px] ${
                tab === t.key ? "pill-btn-primary" : "pill-btn-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20 text-sm font-semibold tracking-[0.06em] uppercase opacity-50 animate-pulse">
            GENERATING INSIGHTS · · ·
          </div>
        )}

        {error && (
          <div className="gl-card p-6 border-[#C85A54] text-[#C85A54] text-sm">
            {error}
          </div>
        )}

        {/* NARRATIVE TAB */}
        {!loading && !error && tab === "narrative" && narrative && (
          <div className="space-y-6">
            <div className="scalloped-panel p-6 md:p-8">
              <p className="text-sm md:text-base leading-relaxed font-medium whitespace-pre-line">
                {narrative.narrative}
              </p>
            </div>

            {narrative.manager_briefing && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="gl-card p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase mb-3 text-[#4A7A4E]">
                    KEY IMPROVEMENTS
                  </h3>
                  <ul className="space-y-1.5">
                    {narrative.manager_briefing.key_improvements.map((item, i) => (
                      <li key={i} className="text-sm font-medium flex gap-2">
                        <span className="text-[#4A7A4E]">↑</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="gl-card p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase mb-3">
                    STAGNATING AREAS
                  </h3>
                  <ul className="space-y-1.5">
                    {narrative.manager_briefing.stagnating_areas.map((item, i) => (
                      <li key={i} className="text-sm font-medium flex gap-2">
                        <span>→</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="gl-card p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase mb-3 text-[var(--color-cta)]">
                    SUGGESTED FOCUS
                  </h3>
                  <ul className="space-y-1.5">
                    {narrative.manager_briefing.suggested_focus.map((item, i) => (
                      <li key={i} className="text-sm font-medium flex gap-2">
                        <span>◎</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-[10px] font-semibold tracking-[0.08em] uppercase opacity-50">
              <span>EVIDENCE: {narrative.evidence_sources} sources</span>
              <span>COMPETENCIES: {narrative.competencies_analyzed} analyzed</span>
              <span>CONFIDENCE: {narrative.confidence_level}</span>
            </div>
          </div>
        )}

        {/* BENCHMARK TAB */}
        {!loading && !error && tab === "benchmark" && benchmark && (
          <div className="max-w-lg mx-auto text-center">
            {benchmark.benchmark_available ? (
              <div className="gl-card p-10">
                <p className="text-6xl md:text-8xl font-extrabold mb-2">
                  Top {100 - benchmark.percentile}%
                </p>
                <p className="text-sm font-medium opacity-60 mb-6">
                  among employees who started at a similar level
                </p>
                <div className="w-full bg-[var(--color-ink)]/10 rounded-full h-3 mb-6">
                  <div
                    className="bg-[var(--color-cta)] h-3 rounded-full transition-all duration-700"
                    style={{ width: `${benchmark.percentile}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-semibold tracking-[0.06em] uppercase opacity-40">
                  <span>Cohort: {benchmark.cohort_size}</span>
                  <span>{benchmark.comparison}</span>
                  <span>{benchmark.time_period}</span>
                </div>
              </div>
            ) : (
              <div className="gl-card p-10">
                <p className="text-4xl mb-4">🔒</p>
                <p className="text-sm font-medium opacity-60">
                  {benchmark.message || "Not enough comparable data for a privacy-safe benchmark."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* CONFIDENCE TAB */}
        {!loading && !error && tab === "confidence" && decay && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="gl-card p-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                  CONFIDENCE
                </p>
                <p className="text-3xl font-extrabold">{Math.round(decay.current_confidence * 100)}%</p>
              </div>
              <div className="gl-card p-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                  FRESHNESS
                </p>
                <p className="text-3xl font-extrabold">{Math.round(decay.freshness_score)}%</p>
              </div>
              <div className="gl-card p-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                  STATUS
                </p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold ${freshnessColors[decay.freshness_label] || ""}`}>
                  {decay.freshness_label}
                </span>
              </div>
              <div className="gl-card p-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                  DAYS INACTIVE
                </p>
                <p className="text-3xl font-extrabold">{decay.days_since_last_evidence}</p>
              </div>
            </div>

            {decay.decay_curve && decay.decay_curve.length > 0 && (
              <div className="gl-card p-6">
                <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase mb-4 opacity-60">
                  CONFIDENCE DECAY PROJECTION
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={decay.decay_curve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,28,28,0.1)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 10, fill: "#1C1C1C" }}
                      label={{ value: "Days", position: "bottom", fontSize: 10 }}
                    />
                    <YAxis
                      domain={[0, 1]}
                      tick={{ fontSize: 10, fill: "#1C1C1C" }}
                      tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                    />
                    <Tooltip
                      formatter={((v: number) => `${Math.round(v * 100)}%`) as never}
                      contentStyle={{
                        background: "#FBF6DF",
                        border: "1px solid #1C1C1C",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      dataKey="upper_band"
                      stroke="none"
                      fill="rgba(28,28,28,0.05)"
                      type="monotone"
                    />
                    <Area
                      dataKey="lower_band"
                      stroke="none"
                      fill="rgba(28,28,28,0.05)"
                      type="monotone"
                    />
                    <Line
                      dataKey="confidence"
                      stroke="#1C1C1C"
                      strokeWidth={2}
                      dot={false}
                      type="monotone"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
}
