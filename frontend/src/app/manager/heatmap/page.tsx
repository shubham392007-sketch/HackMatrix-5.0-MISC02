"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { intelligence } from "@/lib/api";
import type { TeamHeatmap, TrendDirection } from "@/lib/types";

const TEAMS = [
  { id: "team_core_engineering", name: "Core Engineering" },
  { id: "team_core_intelligence", name: "Core Intelligence" },
];

const trendConfig: Record<TrendDirection, { glyph: string; bg: string; text: string }> = {
  improving: { glyph: "↑", bg: "bg-[#4A7A4E]/10", text: "text-[#4A7A4E]" },
  stagnating: { glyph: "→", bg: "bg-[var(--color-ink)]/5", text: "text-[var(--color-ink)]" },
  declining: { glyph: "↓", bg: "bg-[#C85A54]/10", text: "text-[#C85A54]" },
  insufficient: { glyph: "?", bg: "bg-gray-100", text: "text-gray-400" },
};

export default function HeatmapPage() {
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

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col">
      <GlobalHeader />
      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
          Team Skill Heatmap
        </h1>
        <p className="text-sm font-medium opacity-60 mb-8">
          Visualize your team&apos;s competency landscape at a glance.
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
            LOADING HEATMAP · · ·
          </div>
        )}

        {error && (
          <div className="gl-card p-6 border-[#C85A54] text-sm text-[#C85A54]">
            {error}
          </div>
        )}

        {!loading && !error && heatmap && (
          <div className="space-y-8">
            {/* Heatmap Table */}
            <div className="gl-card overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-[var(--color-card)] p-3 border-b border-r border-[var(--color-ink)]/10 text-left text-[10px] font-bold tracking-[0.1em] uppercase">
                      MEMBER
                    </th>
                    {heatmap.competency_names.map((name) => (
                      <th
                        key={name}
                        className="p-2 border-b border-[var(--color-ink)]/10 min-w-[80px]"
                      >
                        <div className="text-[9px] font-bold tracking-[0.06em] uppercase whitespace-nowrap transform -rotate-45 origin-bottom-left translate-x-3">
                          {name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.members.map((member) => (
                    <tr key={member.learner_id} className="border-b border-[var(--color-ink)]/5 last:border-b-0">
                      <td className="sticky left-0 bg-[var(--color-card)] p-3 border-r border-[var(--color-ink)]/10 text-sm font-semibold whitespace-nowrap">
                        {member.name}
                      </td>
                      {heatmap.competency_names.map((compName) => {
                        const data = member.competencies[compName];
                        const trend: TrendDirection = data?.trend || "insufficient";
                        const cfg = trendConfig[trend];
                        return (
                          <td
                            key={compName}
                            className={`p-2 text-center ${cfg.bg}`}
                            title={`${compName}: ${trend} (${data?.score ?? "N/A"})`}
                          >
                            <span className={`text-lg font-bold ${cfg.text}`}>
                              {cfg.glyph}
                            </span>
                            {data?.score !== undefined && (
                              <p className="text-[9px] font-medium opacity-40 mt-0.5">
                                {Math.round(data.score)}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span className="text-[10px] tracking-[0.1em] uppercase opacity-50 mr-2">LEGEND:</span>
              {Object.entries(trendConfig).map(([key, cfg]) => (
                <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.glyph} {key.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Patterns */}
            {heatmap.patterns.length > 0 && (
              <div>
                <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase opacity-50 mb-4">
                  TEAM PATTERNS
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {heatmap.patterns.map((p, i) => (
                    <div
                      key={i}
                      className="gl-card p-5 stagger-item"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold">{p.competency}</span>
                        <span
                          className={`text-[9px] font-bold tracking-[0.08em] px-2 py-0.5 rounded-full border ${
                            p.severity === "high"
                              ? "border-[#C85A54] text-[#C85A54]"
                              : p.severity === "medium"
                              ? "border-[var(--color-cta)]"
                              : "border-[var(--color-ink)]/30 opacity-60"
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
          </div>
        )}
      </main>
      <GlobalFooter />
    </div>
    </ProtectedRoute>
  );
}
