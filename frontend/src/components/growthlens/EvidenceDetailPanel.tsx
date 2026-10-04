"use client";

import React, { useEffect } from "react";
import {
  X,
  ExternalLink,
  GitCommit,
  CheckSquare,
  Award,
  ArrowDown,
  ShieldCheck,
  Calendar,
  Tag,
  Layers,
  User,
  Hash,
  FileCode,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
} from "lucide-react";
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
  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !evidence) return null;

  const strength = Math.round(
    evidence.evidence_strength <= 1
      ? evidence.evidence_strength * 100
      : evidence.evidence_strength || 80
  );

  const rawMeta = (evidence as any).metadata || {};
  const htmlUrl = rawMeta.html_url || (evidence as any).source_reference;
  const isWebUrl = typeof htmlUrl === "string" && htmlUrl.startsWith("http");

  // Commit-specific fields extracted cleanly
  const commitSha =
    rawMeta.sha ||
    (typeof evidence.source_reference === "string" && evidence.source_reference.includes("#")
      ? evidence.source_reference.split("#")[1]
      : null);
  const authorName = rawMeta.author_username || rawMeta.author_name || (evidence as any).author || null;
  const authorEmail = rawMeta.author_email || null;
  const repository = rawMeta.repository || evidence.project_name || evidence.project_id || "shubham392007-sketch/HackMatrix-5.0-MISC02";
  const aiSummary = (evidence as any).ai_summary || null;
  const isGithub = (evidence.source || "").toLowerCase().includes("github");
  const isJira = (evidence.source || "").toLowerCase().includes("jira");

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#1C1C1C]/60 backdrop-blur-sm flex justify-end transition-opacity duration-300"
      style={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Click outside backdrop to close */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onClose}
        aria-label="Close drawer backdrop"
      />

      {/* Side drawer panel */}
      <div
        className={`w-full max-w-xl md:max-w-2xl bg-[#FBF6DF] text-[#1C1C1C] border-l-[2px] border-[#1C1C1C] h-full overflow-y-auto p-6 md:p-8 flex flex-col justify-between shadow-[-8px_0px_0px_#1C1C1C] transition-transform duration-300 ease-out ${className}`}
        style={{ opacity: 1, color: "#1C1C1C" }}
      >
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C1C]/15">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge type="source" source={evidence.source} size="sm" />
              {commitSha && (
                <span className="px-2.5 py-0.5 rounded-full border border-[#1C1C1C] bg-white font-mono text-[10px] font-black text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C] flex items-center gap-1">
                  <Hash className="w-2.5 h-2.5 text-[#1C1C1C]/60" />
                  {commitSha.slice(0, 7)}
                </span>
              )}
              <span className="text-[10px] font-mono text-[#1C1C1C]/60 truncate max-w-[140px]">
                {evidence.id}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-[#1C1C1C] bg-white flex items-center justify-center hover:bg-[#1C1C1C]/10 transition-all shadow-[2px_2px_0px_#1C1C1C] shrink-0 active:translate-y-0.5"
              aria-label="Close detail panel"
            >
              <X className="w-4 h-4 text-[#1C1C1C]" />
            </button>
          </div>

          {/* Evidence / Commit Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#1C1C1C]/20 bg-[#DFE968] text-[#1C1C1C] inline-flex items-center gap-1">
                {isGithub ? <GitCommit className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
                {isGithub ? "VERIFIED GIT COMMIT" : isJira ? "JIRA ISSUE" : "CANONICAL EVIDENCE"}
              </span>
              <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/70">
                {evidence.evidence_type || "commit"}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight leading-snug break-words">
              {evidence.title}
            </h2>
          </div>

          {/* Metadata Grid (Author, Date, Repo, Strength) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C]">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> Date
              </span>
              <span className="text-xs font-mono font-bold text-[#1C1C1C] truncate block">
                {evidence.occurred_at
                  ? new Date(evidence.occurred_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Recorded"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5 flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Author
              </span>
              <span className="text-xs font-mono font-bold text-[#1C1C1C] truncate block" title={authorEmail || authorName || "Verified"}>
                {authorName || "Verified"}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Repository
              </span>
              <span className="text-xs font-mono font-bold text-[#1C1C1C] truncate block" title={repository}>
                {repository.split("/").pop() || repository}
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5 flex items-center gap-1">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" /> Strength
              </span>
              <span className="text-xs font-mono font-black text-emerald-800 block">
                {strength}% VERIFIED
              </span>
            </div>
          </div>

          {/* AI Extraction Summary (if available) */}
          {aiSummary && (
            <div className="p-4 rounded-[22px] border border-[#1C1C1C] bg-[#DFE968]/30 shadow-[2px_2px_0px_#1C1C1C]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                AI SYNTHESIZED EVIDENCE SUMMARY
              </span>
              <p className="text-xs md:text-sm font-medium text-[#1C1C1C] leading-relaxed">
                {aiSummary}
              </p>
            </div>
          )}

          {/* Canonical Content / Full Commit Message */}
          <div className="p-5 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70 block mb-2 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              FULL COMMIT MESSAGE & PAYLOAD
            </span>
            <div className="text-xs md:text-sm font-mono font-medium text-[#1C1C1C] leading-relaxed whitespace-pre-wrap bg-white/70 p-3.5 rounded-xl border border-[#1C1C1C]/15 max-h-56 overflow-y-auto">
              {evidence.content || "No extended content provided."}
            </div>
          </div>

          {/* Associated Skills & Competencies */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70 block mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Extracted Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(evidence.skills || []).map((sk) => (
                  <span
                    key={sk}
                    className="px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
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
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70 block mb-2 flex items-center gap-1.5">
                <Award className="w-3 h-3" /> Mapped Competencies
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(evidence.competencies || []).map((cp) => (
                  <span
                    key={cp}
                    className="px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
                  >
                    {cp}
                  </span>
                ))}
                {(!evidence.competencies || evidence.competencies.length === 0) && (
                  <span className="text-xs text-[#1C1C1C]/50 italic">None mapped</span>
                )}
              </div>
            </div>
          </div>

          {/* Source Traceability & Audit Verification */}
          <div className="p-5 rounded-[26px] border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C]">
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
                  {isGithub ? "GitHub Commit / PR Ref" : isJira ? "Jira Issue Key" : "Upstream Activity Ref"}
                </span>
                <span className="font-mono text-[10px] opacity-70 truncate max-w-[200px]">
                  {commitSha ? commitSha.slice(0, 10) : (evidence as any).source_reference || "Verified ref"}
                </span>
              </div>

              <div className="flex justify-center text-[#1C1C1C]/40">
                <ArrowDown className="w-3.5 h-3.5" />
              </div>

              <div className="p-2.5 rounded-xl border border-emerald-700/30 bg-emerald-50 text-xs font-bold flex items-center justify-between text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Verified Ingestion & Vector Indexing
                </span>
                <span className="text-[10px] uppercase font-black">CHROMA + POSTGRES</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-6 mt-6 border-t border-[#1C1C1C]/15 flex items-center justify-between gap-3">
          {isWebUrl ? (
            <a
              href={htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-xs font-black uppercase text-[#1C1C1C] hover:bg-[#DFE968]/80 shadow-[2px_2px_0px_#1C1C1C] transition-all"
            >
              <span>VIEW ON GITHUB</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-[11px] font-mono text-[#1C1C1C]/60 font-bold">
              ✓ Canonical PostgreSQL Record
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
