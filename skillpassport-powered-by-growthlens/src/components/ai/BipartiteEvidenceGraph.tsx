"use client";

import React, { useState } from "react";
import { Layers, ShieldCheck, Sparkles } from "lucide-react";
import { EvidenceMappingItem } from "@/types/ai";

interface BipartiteEvidenceGraphProps {
  mappings: EvidenceMappingItem[];
  selectedMappingId: string;
  onSelectMapping: (id: string) => void;
}

export default function BipartiteEvidenceGraph({
  mappings,
  selectedMappingId,
  onSelectMapping,
}: BipartiteEvidenceGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<{ type: "evidence" | "skill"; id: string } | null>(
    null
  );

  if (!mappings || mappings.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-white text-center text-xs text-[#1C1C1C]/60 space-y-2">
        <Layers className="w-8 h-8 mx-auto opacity-40 text-[#1C1C1C]" />
        <p className="font-bold text-[#1C1C1C]">No Active Bipartite Graph Edges</p>
        <p>Connect evidence sources and run extraction to populate graph relationships.</p>
      </div>
    );
  }

  // Deduplicate left side (Evidence items) and right side (Skill labels)
  const evidenceNodes = Array.from(
    new Map(
      mappings.map((m) => [
        m.evidence_id,
        {
          id: m.evidence_id,
          title: m.evidence_title || m.evidence_id,
          sourceType: m.source_type,
        },
      ])
    ).values()
  ).slice(0, 7);

  const skillNodes = Array.from(
    new Map(
      mappings.map((m) => [
        m.candidate_label,
        {
          id: m.candidate_label,
          label: m.candidate_label,
        },
      ])
    ).values()
  ).slice(0, 7);

  return (
    <div className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
            Domain 5 · Graph Intelligence
          </span>
          <h3 className="text-base font-black text-[#1C1C1C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1C1C1C]" />
            Evidence-to-Skill Bipartite Topological Graph
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-[#4A7A4E] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> High Confidence (&ge;0.85)
          </span>
          <span className="text-[#B07219] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Candidate Link
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-center relative py-2">
        {/* Left Column: Evidence Artifact Nodes (5 cols) */}
        <div className="col-span-5 space-y-2.5 z-10">
          <span className="text-[9.5px] font-mono font-black uppercase text-[#1C1C1C]/50 px-1 block">
            WORK EVIDENCE ARTIFACTS
          </span>
          {evidenceNodes.map((ev) => {
            const isHovered = hoveredNode?.type === "evidence" && hoveredNode?.id === ev.id;
            const hasActiveMapping = mappings.some(
              (m) => m.id === selectedMappingId && m.evidence_id === ev.id
            );

            return (
              <div
                key={ev.id}
                onMouseEnter={() => setHoveredNode({ type: "evidence", id: ev.id })}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  hasActiveMapping || isHovered
                    ? "bg-white border-[#1C1C1C] shadow-md ring-2 ring-[#1C1C1C] -translate-x-0.5"
                    : "bg-[#FBF1CF]/60 border-[#1C1C1C]/20 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-[#1C1C1C] text-[#FAF8F5]">
                    {ev.sourceType || "Artifact"}
                  </span>
                </div>
                <h4 className="text-[11px] font-bold text-[#1C1C1C] truncate" title={ev.title}>
                  {ev.title}
                </h4>
              </div>
            );
          })}
        </div>

        {/* Center: SVG Bezier Spline Connector Area (2 cols) */}
        <div className="col-span-2 h-full flex items-center justify-center relative min-h-[300px]">
          <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
            {mappings.map((m) => {
              const evIdx = evidenceNodes.findIndex((e) => e.id === m.evidence_id);
              const skIdx = skillNodes.findIndex((s) => s.id === m.candidate_label);

              if (evIdx === -1 || skIdx === -1) return null;

              const yStart = ((evIdx + 0.5) / evidenceNodes.length) * 100;
              const yEnd = ((skIdx + 0.5) / skillNodes.length) * 100;

              const isSelected = selectedMappingId === m.id;
              const isHovered =
                (hoveredNode?.type === "evidence" && hoveredNode?.id === m.evidence_id) ||
                (hoveredNode?.type === "skill" && hoveredNode?.id === m.candidate_label);

              const strokeColor = isSelected
                ? "#1C1C1C"
                : isHovered
                ? "#2E6941"
                : "#1C1C1C";
              const strokeOpacity = isSelected ? 1 : isHovered ? 0.85 : 0.2;
              const strokeWidth = isSelected ? 3 : isHovered ? 2.5 : 1.5;

              return (
                <path
                  key={m.id}
                  d={`M 0,${yStart}% C 50,${yStart}% 50,${yEnd}% 100,${yEnd}%`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>

        {/* Right Column: Extracted Competencies (5 cols) */}
        <div className="col-span-5 space-y-2.5 z-10">
          <span className="text-[9.5px] font-mono font-black uppercase text-[#1C1C1C]/50 px-1 block text-right">
            EXTRACTED COMPETENCIES
          </span>
          {skillNodes.map((sk) => {
            const isHovered = hoveredNode?.type === "skill" && hoveredNode?.id === sk.id;
            const matchingMap = mappings.find((m) => m.candidate_label === sk.id);
            const isSelected = matchingMap?.id === selectedMappingId;

            return (
              <div
                key={sk.id}
                onClick={() => {
                  if (matchingMap) onSelectMapping(matchingMap.id);
                }}
                onMouseEnter={() => setHoveredNode({ type: "skill", id: sk.id })}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer text-right ${
                  isSelected || isHovered
                    ? "bg-[#DFE968]/70 border-[#1C1C1C] shadow-md ring-2 ring-[#1C1C1C] translate-x-0.5"
                    : "bg-white border-[#1C1C1C]/20 hover:bg-[#FAF8F5]"
                }`}
              >
                <h4 className="text-xs font-black text-[#1C1C1C] truncate">{sk.label}</h4>
                <span className="text-[9.5px] font-mono text-[#4A7A4E] font-bold block mt-0.5">
                  Verified Invariant
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
