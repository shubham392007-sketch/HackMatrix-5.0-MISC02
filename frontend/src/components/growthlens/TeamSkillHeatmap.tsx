"use client";

import React from "react";
import { Users, AlertCircle, ArrowUpRight, ArrowRight, ArrowDownRight, HelpCircle } from "lucide-react";
import type { TeamHeatmap, HeatmapMember } from "@/lib/types";
import TrendIndicator from "./TrendIndicator";

interface TeamSkillHeatmapProps {
  heatmap: TeamHeatmap;
  onSelectMember?: (member: HeatmapMember, competency: string) => void;
  className?: string;
}

export default function TeamSkillHeatmap({
  heatmap,
  onSelectMember,
  className = "",
}: TeamSkillHeatmapProps) {
  const { members = [], competency_names = [], patterns = [] } = heatmap;

  const cellBg = (trend: string) => {
    switch (trend) {
      case "improving":
        return "bg-[#DFE968]/50 hover:bg-[#DFE968]/70 text-[#1C1C1C]";
      case "stagnating":
        return "bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] text-[#1C1C1C]";
      case "declining":
        return "bg-[#F6C8D6]/60 hover:bg-[#F6C8D6] text-[#1C1C1C]";
      default:
        return "bg-neutral-100/60 hover:bg-neutral-200/60 text-[#1C1C1C]/60";
    }
  };

  const trendGlyph = (trend: string) => {
    switch (trend) {
      case "improving":
        return "↑";
      case "stagnating":
        return "→";
      case "declining":
        return "↓";
      default:
        return "?";
    }
  };

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
            TEAM TALENT INTELLIGENCE
          </span>
          <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Team Competency Heatmap Matrix
          </h3>
          <p className="text-xs font-medium text-[#1C1C1C]/70 mt-0.5">
            Privacy-safe trajectory matrix across authorized team members.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968]/60">
            ↑ Improving
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF1CF]">
            → Stagnating
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6]">
            ↓ Declining
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-neutral-200">
            ? Need Evidence
          </span>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b-2 border-[#1C1C1C]">
              <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-[#1C1C1C] w-48">
                Team Member
              </th>
              {competency_names.map((comp) => (
                <th
                  key={comp}
                  className="py-3 px-3 text-[11px] font-black tracking-tight text-[#1C1C1C] text-center"
                >
                  <span className="line-clamp-2">{comp}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.learner_id} className="border-b border-[#1C1C1C]/15 hover:bg-black/5">
                <td className="py-3.5 px-4 font-black text-xs text-[#1C1C1C]">
                  <div>{member.name}</div>
                  <span className="text-[10px] font-mono font-medium text-[#1C1C1C]/50">
                    {member.learner_id}
                  </span>
                </td>

                {competency_names.map((comp) => {
                  const compData = member.competencies?.[comp] || {
                    trend: "insufficient",
                    confidence: 0,
                    score: 0,
                  };
                  return (
                    <td key={comp} className="py-2 px-2 text-center">
                      <button
                        onClick={() => onSelectMember && onSelectMember(member, comp)}
                        className={`w-full py-2 px-1 rounded-xl border border-[#1C1C1C] transition-all font-black text-sm shadow-[1px_1px_0px_#1C1C1C] ${cellBg(
                          compData.trend
                        )}`}
                        title={`${member.name} • ${comp}: ${compData.trend} (Conf: ${compData.confidence}%)`}
                      >
                        <span>{trendGlyph(compData.trend)}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pattern Insights Callouts */}
      {patterns.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#1C1C1C]/15">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] block mb-3">
            Algorithmic Pattern Observations
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patterns.map((pat, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl border border-[#1C1C1C] bg-white text-xs font-semibold text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] flex items-start gap-2.5"
              >
                <span className="w-2 h-2 rounded-full bg-[#DFE968] mt-1 shrink-0 border border-[#1C1C1C]" />
                <div>
                  <span className="font-black block text-[#1C1C1C]">{pat.competency}</span>
                  <span className="text-[#1C1C1C]/80 text-[11px] leading-relaxed">
                    {pat.observation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
