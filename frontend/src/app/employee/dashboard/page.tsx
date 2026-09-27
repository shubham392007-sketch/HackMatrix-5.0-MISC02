"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import CompetencyCard from "@/components/ui/CompetencyCard";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { trajectory } from "@/lib/api";
import type { Learner, Competency } from "@/lib/types";

export default function EmployeeDashboard() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState("");
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    trajectory
      .learners()
      .then((data) => {
        setLearners(data.learners);
        if (data.learners.length > 0)
          setSelectedLearner(data.learners[0].learner_id);
      })
      .catch((err) => {
        setError(err.message || "Failed to load learners");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedLearner) return;
    setLoading(true);
    setError("");
    trajectory
      .competencies(selectedLearner)
      .then((data) => setCompetencies(data.competencies))
      .catch((err) => setError(err.message || "Failed to load competencies"))
      .finally(() => setLoading(false));
  }, [selectedLearner]);

  const total = competencies.length;
  const improving = competencies.filter((c) => c.trend === "improving").length;
  const stagnating = competencies.filter((c) => c.trend === "stagnating").length;
  const declining = competencies.filter((c) => c.trend === "declining").length;

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
      <GlobalHeader />
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              Good morning! 👋
            </h1>
            <p className="text-sm font-medium opacity-60">
              Here&apos;s your talent intelligence for this quarter.
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

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 text-sm font-semibold tracking-[0.06em] uppercase opacity-50 animate-pulse">
            GATHERING YOUR EVIDENCE · · ·
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="gl-card p-6 border-[#C85A54] text-sm text-[#C85A54]">
            {error}
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "TOTAL", value: total },
                { label: "IMPROVING", value: improving, color: "#4A7A4E" },
                { label: "STAGNATING", value: stagnating },
                { label: "DECLINING", value: declining, color: "#C85A54" },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="gl-card p-5 text-center stagger-item"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <p className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-50 mb-1">
                    {s.label}
                  </p>
                  <p
                    className="text-3xl font-extrabold"
                    style={{ color: s.color || "var(--color-ink)" }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Competency Grid */}
            <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50 mb-4">
              YOUR COMPETENCIES
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {competencies.map((c, i) => (
                <div
                  key={c.competency_id}
                  className="stagger-item"
                  style={
                    { animationDelay: `${(i + 4) * 80}ms`, "--stagger": `${(i + 4) * 80}ms` } as React.CSSProperties
                  }
                >
                  <CompetencyCard
                    competency={c}
                    learnerId={selectedLearner}
                  />
                </div>
              ))}
            </div>

            {competencies.length === 0 && (
              <div className="gl-card p-10 text-center">
                <p className="text-sm font-medium opacity-50">
                  No competencies found for this learner yet.
                </p>
              </div>
            )}
          </>
        )}
      </main>
      <GlobalFooter />
    </div>
    </ProtectedRoute>
  );
}
