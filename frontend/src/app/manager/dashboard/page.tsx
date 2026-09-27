"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import TrendBadge from "@/components/ui/TrendBadge";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
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

  useEffect(() => {
    setLoading(true);
    setError("");
    intelligence.teamHeatmap(teamId)
      .then(setHeatmap)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  const countTrends = (trend: TrendDirection) => {
    if (!heatmap) return 0;
    return heatmap.members.reduce((acc, m) => {
      return acc + Object.values(m.competencies).filter((c) => c.trend === trend).length;
    }, 0);
  };

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
        <GlobalHeader />
        <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
          Team Intelligence
        </h1>
        <p className="text-sm font-medium opacity-60 mb-8">
          Overall team skill landscape and key insights.
        </p>

        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="pill-input max-w-xs mb-8"
        >
          {TEAMS.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        {loading && (
          <div className="text-center py-20 text-sm font-semibold tracking-[0.06em] uppercase opacity-50 animate-pulse">
            LOADING TEAM DATA · · ·
          </div>
        )}

        {error && (
          <div className="gl-card p-6 border-[#C85A54] text-sm text-[#C85A54]">
            {error}
          </div>
        )}

        {!loading && !error && heatmap && (
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
                              ? "border-[#C85A54] text-[#C85A54]"
                              : p.severity === "medium"
                              ? "border-[var(--color-cta)] text-[var(--color-ink)]"
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

            {/* Quick Links */}
            <div className="flex gap-3">
              <Link href="/manager/heatmap" className="pill-btn pill-btn-primary">
                VIEW HEATMAP →
              </Link>
            </div>
          </div>
        )}
      </main>
      <GlobalFooter />
    </div>
    </ProtectedRoute>
  );
}
