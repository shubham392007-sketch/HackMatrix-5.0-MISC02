"use client";

import React, { useState } from "react";
import { Terminal, Cpu, Database, Play, CheckCircle2, ArrowRight, Loader2, Sparkles, Layers } from "lucide-react";
import PillButton from "./PillButton";

export interface SyncResultInfo {
  found?: number;
  processed?: number;
  skipped?: number;
  source?: string;
}

interface EvidenceSyncPanelProps {
  onRunExtraction: (params: { source: string; limit: number; runAi: boolean }) => Promise<void>;
  isProcessing: boolean;
  activeStage?: "idle" | "source" | "parsing" | "tagging" | "indexing" | "complete";
  syncResult?: SyncResultInfo | null;
  className?: string;
}

export default function EvidenceSyncPanel({
  onRunExtraction,
  isProcessing,
  activeStage = "idle",
  syncResult = null,
  className = "",
}: EvidenceSyncPanelProps) {
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [limit, setLimit] = useState<number>(20);
  const [runAi, setRunAi] = useState<boolean>(true);

  const stages = [
    { id: "source", label: "SOURCE RETRIEVAL", desc: "Fetching commits & issues" },
    { id: "parsing", label: "CANONICAL PARSING", desc: "Normalizing schema & metadata" },
    { id: "tagging", label: "SKILL TAGGING", desc: "Qwen3 8B semantic extraction" },
    { id: "indexing", label: "EVIDENCE INDEXING", desc: "Vector embeddings into ChromaDB" },
  ];

  const getStageState = (stageId: string) => {
    if (activeStage === "complete") return "completed";
    if (activeStage === "idle") return "idle";
    const order = ["source", "parsing", "tagging", "indexing", "complete"];
    const activeIdx = order.indexOf(activeStage);
    const thisIdx = order.indexOf(stageId);
    if (thisIdx < activeIdx) return "completed";
    if (thisIdx === activeIdx) return "active";
    return "pending";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunExtraction({ source: selectedSource, limit, runAi });
  };

  return (
    <div
      className={`p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[4px_4px_0px_#1C1C1C] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
            CONTINUOUS INGESTION
          </span>
          <h2 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
            Build your evidence stream
          </h2>
          <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/70 mt-0.5">
            Extract raw commits and issues into verified, canonical competency records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
            ENGINE:
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[11px] font-black shadow-[1.5px_1.5px_0px_#1C1C1C]">
            <Sparkles className="w-3 h-3 text-purple-700" />
            Qwen3 8B + ChromaDB
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
              Source Stream
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              disabled={isProcessing}
              className="pill-input text-xs"
            >
              <option value="all">ALL CONNECTED SOURCES (GITHUB + JIRA)</option>
              <option value="github">GITHUB PULL REQUESTS & COMMITS</option>
              <option value="jira">JIRA SPRINT TICKETS & STORIES</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
              Batch Window Size
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isProcessing}
              className="pill-input text-xs"
            >
              <option value={10}>LATEST 10 ACTIVITY ITEMS</option>
              <option value={20}>LATEST 20 ACTIVITY ITEMS</option>
              <option value={50}>LATEST 50 ACTIVITY ITEMS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
              AI Skill Tagging
            </label>
            <div className="h-[46px] rounded-full border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] flex items-center px-4 justify-between shadow-[2px_2px_0px_#1C1C1C]">
              <span className="text-xs font-bold text-[#1C1C1C]">Local Qwen3 8B</span>
              <input
                type="checkbox"
                checked={runAi}
                onChange={(e) => setRunAi(e.target.checked)}
                disabled={isProcessing}
                className="w-4 h-4 accent-[#1C1C1C] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4-Stage Extraction Pipeline Visualization */}
        <div className="p-4 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF]/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Pipeline Status & Stages
            </span>
            {isProcessing && (
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 animate-pulse flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Ingestion active
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {stages.map((st, i) => {
              const state = getStageState(st.id);
              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    state === "completed"
                      ? "border-[#1C1C1C] bg-[#DFE968]/70 shadow-[2px_2px_0px_#1C1C1C]"
                      : state === "active"
                      ? "border-[#1C1C1C] bg-white ring-2 ring-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C]"
                      : "border-[#1C1C1C]/25 bg-white/40 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]">
                      0{i + 1}
                    </span>
                    {state === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                    ) : state === "active" ? (
                      <Loader2 className="w-3.5 h-3.5 text-purple-700 animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border border-[#1C1C1C]/50" />
                    )}
                  </div>
                  <div className="text-[11px] font-black tracking-tight text-[#1C1C1C] leading-snug">
                    {st.label}
                  </div>
                  <div className="text-[9px] font-medium text-[#1C1C1C]/70 truncate mt-0.5">
                    {st.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Extraction Completion Notification Banner */}
        {activeStage === "complete" && (
          <div className="p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-900 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] block">
                  Pipeline Extraction Succeeded
                </span>
                <span className="text-[11px] font-semibold text-[#1C1C1C]/80">
                  {syncResult
                    ? `Processed ${syncResult.processed ?? 0} record(s), ${syncResult.skipped ?? 0} up-to-date. Canonical records indexed in ChromaDB.`
                    : "Canonical evidence records parsed, verified with Qwen3, and indexed in ChromaDB."}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white text-[#1C1C1C]">
              SYNCED
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <PillButton
            type="submit"
            variant="primary"
            size="md"
            loading={isProcessing}
            icon={activeStage === "complete" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          >
            {isProcessing
              ? "PROCESSING EXTRACTION PIPELINE..."
              : activeStage === "complete"
              ? "EXTRACTION COMPLETE ✓"
              : "RUN EXTRACTION →"}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
