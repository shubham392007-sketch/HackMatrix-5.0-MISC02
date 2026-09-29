"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoadingSkeleton from "@/components/growthlens/LoadingSkeleton";
import ErrorState from "@/components/growthlens/ErrorState";
import EmptyState from "@/components/growthlens/EmptyState";
import { intelligence } from "@/lib/api";
import type { TeamHeatmap, TrendDirection } from "@/lib/types";

const TEAMS = [
  { id: "team_core_engineering", name: "Core Engineering" },
  { id: "team_core_intelligence", name: "Core Intelligence" },
];

export default function ManagerDashboard() {
  const [teamId, setTeamId] = useState(TEAMS[0].id);
  const [heatmap, setHeatmap] = useState<TeamHeatmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTeamData = (id: string) => {
    setLoading(true);
    setError("");
    intelligence
      .teamHeatmap(id)
      .then(setHeatmap)
      .catch((e) => setError(e?.message || "Failed to load team intelligence data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    intelligence
      .teamHeatmap(teamId)
      .then((data) => {
        if (active) setHeatmap(data);
      })
      .catch((e) => {
        if (active) setError(e?.message || "Failed to load team intelligence data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  const countTrends = (trend: TrendDirection) => {
    if (!heatmap) return 0;
    return heatmap.members.reduce((acc, m) => {
      return acc + Object.values(m.competencies).filter((c) => c.trend === trend).length;
    }, 0);
  };

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />
        <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full space-y-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
              MANAGER VIEW · TEAM INTELLIGENCE
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              Team Intelligence
            </h1>
            <p className="text-sm font-medium opacity-60">
              Overall team skill landscape, capability distribution, and high-impact interventions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
              ACTIVE TEAM:
            </span>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="pill-input max-w-xs text-xs"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-6">
              <LoadingSkeleton type="stats" />
              <div className="grid md:grid-cols-2 gap-4">
                <LoadingSkeleton type="card" count={2} />
              </div>
            </div>
          )}

          {/* Error State with Retry */}
          {!loading && error && (
            <ErrorState
              title="Team intelligence interrupted"
              message={error}
              onRetry={() => loadTeamData(teamId)}
              showSettingsLink={false}
            />
          )}

          {/* Content */}
          {!loading && !error && heatmap && (
            heatmap.members.length === 0 ? (
              <EmptyState
                type="team"
                title="No members registered for this team"
                message="No employees are currently mapped to this team. Once employees complete registration or are assigned to this team, aggregate metrics will appear."
                primaryAction={{
                  label: "VIEW ALL EMPLOYEES",
                  href: "/manager/evidence",
                }}
              />
            ) : (
              <div className="space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "TEAM SIZE", value: heatmap.members.length },
                    { label: "COMPETENCIES", value: heatmap.competency_names.length },
                    { label: "IMPROVING", value: countTrends("improving"), color: "#4A7A4E" },
                    { label: "STAGNATING", value: countTrends("stagnating") },
                    { label: "DECLINING", value: countTrends("declining"), color: "#C85A54" },
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

                {/* Key Patterns / Insights */}
                {heatmap.patterns.length > 0 && (
                  <div>
                    <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50 mb-4">
                      KEY INSIGHTS
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      {heatmap.patterns.map((p, i) => (
                        <div
                          key={i}
                          className="gl-card p-5 stagger-item"
                          style={{ animationDelay: `${(i + 5) * 80}ms` }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold">{p.competency}</span>
                            <span
                              className={`text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-full border ${
                                p.severity === "high"
                                  ? "border-[#C85A54] text-[#C85A54] bg-[#F6C8D6]/40"
                                  : p.severity === "medium"
                                  ? "border-[var(--color-cta)] text-[var(--color-ink)] bg-[#F6BB84]/20"
                                  : "border-[var(--color-ink)]/30 text-[var(--color-ink)]/60"
                              }`}
                            >
                              {p.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium opacity-70">{p.observation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-[#1C1C1C]/15">
                  <Link href="/manager/evidence" className="pill-btn pill-btn-primary">
                    TEAM EVIDENCE →
                  </Link>
                  <Link href="/manager/trajectory" className="pill-btn pill-btn-secondary">
                    TEAM TRAJECTORY →
                  </Link>
                  <Link href="/manager/heatmap" className="pill-btn pill-btn-secondary">
                    TEAM HEATMAP →
                  </Link>
                  <Link href="/manager/growth" className="pill-btn pill-btn-outline">
                    TEAM GROWTH →
                  </Link>
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
