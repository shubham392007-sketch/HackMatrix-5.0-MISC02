"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import CompetencyCard from "@/components/ui/CompetencyCard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { trajectory } from "@/lib/api";
import type { Learner, Competency, TrendDirection } from "@/lib/types";

type FilterType = "all" | TrendDirection;

export default function EmployeeSkills() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState("");
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    trajectory.learners().then((data) => {
      setLearners(data.learners);
      if (data.learners.length > 0) setSelectedLearner(data.learners[0].learner_id);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedLearner) return;
    setLoading(true);
    setError("");
    trajectory.competencies(selectedLearner)
      .then((data) => setCompetencies(data.competencies))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedLearner]);

  const filtered = filter === "all"
    ? competencies
    : competencies.filter((c) => c.trend === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "ALL" },
    { key: "improving", label: "IMPROVING" },
    { key: "stagnating", label: "STAGNATING" },
    { key: "declining", label: "DECLINING" },
  ];

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
        <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
                Your Competencies
              </h1>
              <p className="text-sm font-medium opacity-60">
                Track your growth over time with evidence-backed insights.
              </p>
            </div>
            <select
              className="pill-input max-w-xs"
              value={selectedLearner}
              onChange={(e) => setSelectedLearner(e.target.value)}
            >
              {learners.map((l) => (
                <option key={l.learner_id} value={l.learner_id}>
                  {l.name} ({l.learner_id})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`pill-btn text-[10px] ${
                  filter === f.key ? "pill-btn-primary" : "pill-btn-secondary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-20 text-sm font-semibold tracking-[0.06em] uppercase opacity-50 animate-pulse">
              GATHERING YOUR EVIDENCE · · ·
            </div>
          )}

          {error && (
            <div className="gl-card p-6 border-[#C85A54] text-sm text-[#C85A54]">{error}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="gl-card p-10 text-center">
              <p className="text-sm font-medium opacity-50">
                No competencies match this filter.
              </p>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c, i) => (
                <div
                  key={c.competency_id}
                  className="stagger-item"
                  style={
                    { animationDelay: `${i * 80}ms`, "--stagger": `${i * 80}ms` } as React.CSSProperties
                  }
                >
                  <CompetencyCard competency={c} learnerId={selectedLearner} />
                </div>
              ))}
            </div>
          )}
        </main>
        <GlobalFooter />
      </div>
    </ProtectedRoute>
  );
}
