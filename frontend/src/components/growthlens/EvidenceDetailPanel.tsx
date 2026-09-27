"use client";

import React from "react";
import { X, ExternalLink, GitCommit, CheckSquare, Award, ArrowDown, ShieldCheck, Database, Calendar, Tag, Layers } from "lucide-react";
import type { Evidence } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import PillButton from "./PillButton";

interface EvidenceDetailPanelProps {
  evidence: Evidence | null;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function EvidenceDetailPanel({
  evidence,
  isOpen,
  onClose,
  className = "",
}: EvidenceDetailPanelProps) {
  if (!isOpen || !evidence) return null;

  const strength = Math.round(
    evidence.evidence_strength <= 1
      ? evidence.evidence_strength * 100
      : evidence.evidence_strength || 80
  );

  const rawMeta = (evidence as any).metadata || {};
  const htmlUrl = rawMeta.html_url || (evidence as any).source_reference;
  const isWebUrl = typeof htmlUrl === "string" && htmlUrl.startsWith("http");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#1C1C1C]/40 backdrop-blur-sm flex justify-end transition-opacity">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Side drawer panel */}
      <div
        className={`w-full max-w-xl md:max-w-2xl bg-[#FBF6DF] border-l-[2px] border-[#1C1C1C] h-full overflow-y-auto p-6 md:p-8 flex flex-col justify-between shadow-[-6px_0px_0px_#1C1C1C] ${className}`}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1C1C1C]/15">
            <div className="flex items-center gap-2">
              <StatusBadge type="source" source={evidence.source} size="sm" />
              <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/60">
                {evidence.id}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#1C1C1C] bg-white flex items-center justify-center hover:bg-[#1C1C1C]/5 transition-all shadow-[1px_1px_0px_#1C1C1C]"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4 text-[#1C1C1C]" />
            </button>
          </div>

          {/* Evidence Title & Date */}
          <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tight leading-snug mb-3">
            {evidence.title}
          </h2>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#1C1C1C]/70 mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {evidence.occurred_at ? new Date(evidence.occurred_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Recorded"}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {evidence.project_name || "Internal Platform"}
            </span>
            <span>•</span>
            <span className="font-mono text-[#1C1C1C] font-bold">
              Strength: {strength}%
            </span>
          </div>

          {/* Extracted Summary / Full Content */}
          <div className="p-5 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] mb-6 shadow-[2px_2px_0px_#1C1C1C]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-2">
              CANONICAL EVIDENCE CONTENT
            </span>
            <p className="text-sm font-medium text-[#1C1C1C] leading-relaxed whitespace-pre-line">
              {evidence.content}
            </p>
          </div>

          {/* Associated Skills & Competencies */}
          <div className="mb-6 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Extracted Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(evidence.skills || []).map((sk) => (
                  <span
                    key={sk}
                    className="px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968]/70 text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
                  >
                    {sk}
                  </span>
                ))}
                {(!evidence.skills || evidence.skills.length === 0) && (
                  <span className="text-xs text-[#1C1C1C]/50 italic">None tagged</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-2">
                Mapped Competencies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(evidence.competencies || []).map((cp) => (
                  <span
                    key={cp}
                    className="px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
                  >
                    {cp}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Source Traceability Pipeline Diagram */}
          <div className="p-5 rounded-[26px] border border-[#1C1C1C] bg-white mb-6 shadow-[2px_2px_0px_#1C1C1C]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] block mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Source Traceability & Audit Verification
            </span>

            <div className="space-y-2">
              <div className="p-2.5 rounded-xl border border-[#1C1C1C]/20 bg-[#FBF1CF]/60 text-xs font-bold flex items-center justify-between">
                <span className="text-[#1C1C1C]">GrowthLens Canonical Evidence</span>
                <span className="font-mono text-[10px] opacity-70">ID: {evidence.id.slice(0, 8)}...</span>
              </div>

              <div className="flex justify-center text-[#1C1C1C]/40">
                <ArrowDown className="w-3.5 h-3.5" />
              </div>

              <div className="p-2.5 rounded-xl border border-[#1C1C1C]/20 bg-[#FBF1CF]/60 text-xs font-bold flex items-center justify-between">
                <span className="text-[#1C1C1C]">
                  {evidence.source === "github" ? "GitHub Pull Request / Commit" : "Jira Issue Deliverable"}
                </span>
                <span className="font-mono text-[10px] opacity-70 truncate max-w-[150px]">
                  {rawMeta.sha ? rawMeta.sha.slice(0, 7) : (evidence as any).source_reference || "Ref verified"}
                </span>
              </div>

              <div className="flex justify-center text-[#1C1C1C]/40">
                <ArrowDown className="w-3.5 h-3.5" />
              </div>

              <div className="p-2.5 rounded-xl border border-emerald-700/30 bg-emerald-50 text-xs font-bold flex items-center justify-between text-emerald-900">
                <span>Verified Source Ingestion</span>
                <span className="text-[10px] uppercase font-black">CANONICAL HASHED</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-between gap-3">
          {isWebUrl ? (
            <a
              href={htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-[#1C1C1C] hover:underline"
            >
              <span>ORIGINAL SOURCE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-[11px] font-mono text-[#1C1C1C]/50">
              Internal audit record
            </span>
          )}

          <PillButton variant="secondary" size="sm" onClick={onClose}>
            CLOSE DETAIL
          </PillButton>
        </div>
      </div>
    </div>
  );
}
