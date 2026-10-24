"use client";

import React, { useState } from "react";
import { Sliders, BarChart3, CheckCircle2, ChevronRight } from "lucide-react";

interface TopicMasteryComponentBarsProps {
  topics: Array<{
    id: string;
    title: string;
    current_mastery: number;
    knowledge_signal: number;
    practice_signal: number;
    assessment_signal: number;
    project_signal: number;
  }>;
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
}

export default function TopicMasteryComponentBars({
  topics,
  selectedTopicId,
  onSelectTopic,
}: TopicMasteryComponentBarsProps) {
  const [hoveredTopicId, setHoveredTopicId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Refined Header Explaining Deterministic Mastery Formulation */}
      <div className="p-3.5 rounded-xl bg-white border border-[#1A1918]/15 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1A1918]" />
          <span className="font-bold text-[#1A1918]">
            Mastery Evaluation Formula:
          </span>
          <span className="text-[#1A1918]/70 font-mono text-[11px]">
            0.30 &times; Knowledge + 0.25 &times; Practice + 0.20 &times; Assessment + 0.25 &times; Project
          </span>
        </div>
        <span className="text-[11px] font-mono font-semibold text-[#1A1918]/60">
          Click any module to simulate progress
        </span>
      </div>

      {/* Professional Unified Single-Color Mastery Cards */}
      <div className="space-y-3">
        {topics.map((t) => {
          const isSelected = selectedTopicId === t.id;
          const isHovered = hoveredTopicId === t.id;

          const kCont = t.knowledge_signal * 0.3;
          const pCont = t.practice_signal * 0.25;
          const aCont = t.assessment_signal * 0.2;
          const prjCont = t.project_signal * 0.25;
          const totalMastery = Math.round(kCont + pCont + aCont + prjCont);

          const getProficiencyTier = (m: number) => {
            if (m >= 85) return "Advanced";
            if (m >= 70) return "Proficient";
            if (m >= 40) return "Developing";
            return "Novice";
          };

          return (
            <div
              key={t.id}
              onClick={() => onSelectTopic(t.id)}
              onMouseEnter={() => setHoveredTopicId(t.id)}
              onMouseLeave={() => setHoveredTopicId(null)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-white border-[#1A1918] ring-2 ring-[#1A1918] shadow-md -translate-y-0.5"
                  : isHovered
                  ? "bg-white border-[#1A1918]/50 shadow-sm"
                  : "bg-white/80 border-[#1A1918]/15 hover:bg-white"
              }`}
            >
              {/* Header: Title and Mastery Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1A1918]">{t.title}</span>
                  {isSelected && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#1A1918] text-[#FAF8F5]">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-[#1A1918]">
                    Mastery: {totalMastery}%
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-[#1A1918]/20 bg-[#FAF8F5] text-[#1A1918]">
                    {getProficiencyTier(totalMastery)}
                  </span>
                </div>
              </div>

              {/* Single Unified Color Progress Bar */}
              <div className="h-3 w-full bg-[#1A1918]/10 rounded-full overflow-hidden p-0.5 border border-[#1A1918]/10">
                <div
                  style={{ width: `${Math.min(100, Math.max(0, totalMastery))}%` }}
                  className="bg-[#1A1918] h-full rounded-full transition-all duration-500 ease-out"
                />
              </div>

              {/* Professional Monochromatic Component Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#1A1918]/10 text-xs">
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#1A1918]/10 flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-[#1A1918]/70">Knowledge (30%)</span>
                  <span className="font-mono font-bold text-[#1A1918]">{t.knowledge_signal}%</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#1A1918]/10 flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-[#1A1918]/70">Practice (25%)</span>
                  <span className="font-mono font-bold text-[#1A1918]">{t.practice_signal}%</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#1A1918]/10 flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-[#1A1918]/70">Assessment (20%)</span>
                  <span className="font-mono font-bold text-[#1A1918]">{t.assessment_signal}%</span>
                </div>
                <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#1A1918]/10 flex items-center justify-between">
                  <span className="text-[10.5px] font-semibold text-[#1A1918]/70">Project (25%)</span>
                  <span className="font-mono font-bold text-[#1A1918]">{t.project_signal}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
