"use client";

import { useState, useEffect } from "react";
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

const trendConfig: Record<TrendDirection, { glyph: string; bg: string; text: string }> = {
  improving: { glyph: "↑", bg: "bg-[#4A7A4E]/15", text: "text-[#4A7A4E]" },
  stagnating: { glyph: "→", bg: "bg-[#1C1C1C]/5", text: "text-[#1C1C1C]" },
  declining: { glyph: "↓", bg: "bg-[#C85A54]/15", text: "text-[#C85A54]" },
  insufficient: { glyph: "?", bg: "bg-neutral-200/50", text: "text-neutral-500" },
};

export default function HeatmapPage() {
  const [teamId, setTeamId] = useState(TEAMS[0].id);
  const [heatmap, setHeatmap] = useState<TeamHeatmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHeatmap = (id: string) => {
    setLoading(true);
    setError("");
    intelligence
      .teamHeatmap(id)
      .then(setHeatmap)
      .catch((e) => setError(e?.message || "Failed to load team heatmap."))
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
        if (active) setError(e?.message || "Failed to load team heatmap.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  return (
    <ProtectedRoute allowedRoles={["MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />
        <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full space-y-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
              MATRIX · COMPETENCY GRID
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              Team Skill Heatmap
            </h1>
            <p className="text-sm font-medium opacity-60">
              Visualize your team&apos;s competency landscape, trajectory directions, and knowledge concentration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
              ACTIVE ROSTER:
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
              <LoadingSkeleton type="table" count={5} />
            </div>
          )}

          {/* Error State with Retry */}
          {!loading && error && (
            <ErrorState
              title="Team skill heatmap unavailable"
              message={error}
              onRetry={() => loadHeatmap(teamId)}
              showSettingsLink={false}
            />
          )}

          {/* Content */}
          {!loading && !error && heatmap && (
            heatmap.members.length === 0 ? (
              <EmptyState
                type="team"
                title="No members in this roster"
                message="No employees are registered in this team group. Once employees join, their skill heatmap cells will appear here."
                primaryAction={{
                  label: "VIEW TEAM DIRECTORY",
                  href: "/manager/evidence",
                }}
              />
            ) : (
              <div className="space-y-8">
                {/* Heatmap Table */}
                <div className="gl-card overflow-x-auto p-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-[#FBF6DF] p-3 border-b border-r border-[#1C1C1C]/15 text-left text-[10px] font-bold tracking-[0.1em] uppercase">
                          MEMBER
                        </th>
                        {heatmap.competency_names.map((name) => (
                          <th
                            key={name}
                            className="p-2 border-b border-[#1C1C1C]/15 min-w-[80px]"
                          >
                            <div className="text-[9px] font-bold tracking-[0.06em] uppercase whitespace-nowrap transform -rotate-45 origin-bottom-left translate-x-3 text-[#1C1C1C]">
                              {name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.members.map((member) => (
                        <tr
                          key={member.learner_id}
                          className="border-b border-[#1C1C1C]/10 last:border-b-0 hover:bg-[#FBF1CF]/60 transition-colors"
                        >
                          <td className="sticky left-0 bg-[#FBF6DF] p-3 border-r border-[#1C1C1C]/15 text-sm font-semibold whitespace-nowrap">
                            {member.name}
                          </td>
                          {heatmap.competency_names.map((compName) => {
                            const data = member.competencies[compName];
                            const rawTrend = (data?.trend || "insufficient").toLowerCase();
                            const normTrend: TrendDirection =
                              rawTrend === "insufficient_evidence"
                                ? "insufficient"
                                : (rawTrend as TrendDirection);
                            const cfg = trendConfig[normTrend] || trendConfig.insufficient;
                            return (
                              <td
                                key={compName}
                                className={`p-2 text-center ${cfg.bg}`}
                                title={`${compName}: ${normTrend} (${data?.score ?? "N/A"})`}
                              >
                                <span className={`text-lg font-black ${cfg.text}`}>
                                  {cfg.glyph}
                                </span>
                                {data?.score !== undefined && (
                                  <p className="text-[9px] font-mono font-bold opacity-60 mt-0.5">
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
                  <span className="text-[10px] tracking-[0.1em] uppercase opacity-50 mr-2">
                    LEGEND:
                  </span>
                  {Object.entries(trendConfig).map(([key, cfg]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#1C1C1C]/20 ${cfg.bg} ${cfg.text}`}
                    >
                      <span className="font-bold">{cfg.glyph}</span> {key.toUpperCase()}
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
                                  ? "border-[#C85A54] text-[#C85A54] bg-[#F6C8D6]/40"
                                  : p.severity === "medium"
                                  ? "border-[var(--color-cta)] text-[var(--color-ink)] bg-[#F6BB84]/20"
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
            )
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
