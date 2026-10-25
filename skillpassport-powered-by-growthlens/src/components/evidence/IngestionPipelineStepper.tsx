"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  FileCode,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ProcessingStageRecord } from "@/types/evidence";

interface IngestionPipelineStepperProps {
  stages: ProcessingStageRecord[];
  runId: string;
  status: "completed" | "processing" | "partially_completed" | "failed";
}

export default function IngestionPipelineStepper({
  stages,
  runId,
  status,
}: IngestionPipelineStepperProps) {
  const [selectedStageIdx, setSelectedStageIdx] = useState<number | null>(null);
  const [showAllLogs, setShowAllLogs] = useState<boolean>(false);

  // If stages array is empty, render clean empty fallback
  if (!stages || stages.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-[#1C1C1C]/20 bg-[#FBF1CF]/40 text-center text-xs text-[#1C1C1C]/60">
        Stage telemetry initialized — awaiting stage execution events.
      </div>
    );
  }

  const getStatusIcon = (stStatus: ProcessingStageRecord["status"]) => {
    switch (stStatus) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-[#4A7A4E]" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-[#1C1C1C] animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-[#C85A54]" />;
      default:
        return <Clock className="w-4 h-4 text-[#1C1C1C]/40" />;
    }
  };

  const getStatusStyles = (stStatus: ProcessingStageRecord["status"]) => {
    switch (stStatus) {
      case "completed":
        return "bg-[#DFE968]/70 border-[#1C1C1C] text-[#1C1C1C]";
      case "processing":
        return "bg-[#FAF8F5] border-[#1C1C1C] text-[#1C1C1C] ring-2 ring-[#1C1C1C]";
      case "failed":
        return "bg-[#F6C8D6] border-[#BA1A1A] text-[#BA1A1A]";
      default:
        return "bg-white/60 border-[#1C1C1C]/20 text-[#1C1C1C]/50";
    }
  };

  const activeStage = selectedStageIdx !== null ? stages[selectedStageIdx] : null;

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-[#1C1C1C]/70" />
          Pipeline Execution Stepper ({stages.length} Stages)
        </span>
        <button
          type="button"
          onClick={() => setShowAllLogs(!showAllLogs)}
          className="text-[10px] font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] flex items-center gap-1 underline underline-offset-2"
        >
          {showAllLogs ? (
            <>
              <span>Collapse Log View</span>
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              <span>Expand Raw Logs</span>
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Horizontal Multi-Stage Visual Stepper */}
      <div className="p-4 rounded-2xl bg-white border border-[#1C1C1C]/20 shadow-[2px_2px_0_0_#1C1C1C]">
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {stages.map((st, idx) => {
            const isSelected = selectedStageIdx === idx;
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={`${st.stage}-${idx}`}>
                <button
                  type="button"
                  onClick={() => setSelectedStageIdx(isSelected ? null : idx)}
                  className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all shrink-0 min-w-[110px] max-w-[140px] ${getStatusStyles(
                    st.status
                  )} ${isSelected ? "ring-2 ring-[#1C1C1C] -translate-y-0.5 shadow-sm" : "hover:scale-[1.02]"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-mono font-bold text-[#1C1C1C]/50">
                      0{idx + 1}
                    </span>
                    {getStatusIcon(st.status)}
                  </div>
                  <span className="text-xs font-black truncate w-full text-center">
                    {st.stage}
                  </span>
                  <span className="text-[9px] font-mono text-[#1C1C1C]/60 truncate w-full mt-0.5">
                    {st.timestamp || "Finished"}
                  </span>
                </button>

                {!isLast && (
                  <div className="shrink-0 flex items-center px-1 text-[#1C1C1C]/30">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Selected Stage Inspector Drawer */}
        {activeStage && (
          <div className="mt-3 pt-3 border-t border-[#1C1C1C]/10 bg-[#FBF6DF]/50 p-3 rounded-xl border border-[#1C1C1C]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#1C1C1C]">
                  Stage {selectedStageIdx! + 1}: {activeStage.stage}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full uppercase bg-[#1C1C1C] text-[#FAF8F5]">
                  {activeStage.status}
                </span>
              </div>
              <p className="text-xs text-[#1C1C1C]/80 font-medium">
                {activeStage.detail || "Step completed successfully without errors."}
              </p>
            </div>
            <div className="text-[10px] font-mono text-[#1C1C1C]/50 shrink-0 sm:text-right">
              <div>Recorded: {activeStage.timestamp}</div>
              <div className="text-[9px] text-[#4A7A4E] font-bold flex items-center sm:justify-end gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3" /> Verified Sanitized
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Raw Chronological Logs (Toggled or Expanded) */}
      {showAllLogs && (
        <div className="space-y-1.5 text-xs animate-fadeIn">
          {stages.map((st, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#FBF1CF] border border-[#1C1C1C]/15"
            >
              <div className="flex items-center gap-2.5">
                {getStatusIcon(st.status)}
                <span className="font-black text-[#1C1C1C]">{st.stage}:</span>
                <span className="text-[#1C1C1C]/80 font-medium">{st.detail}</span>
              </div>
              <span className="text-[10px] font-mono text-[#1C1C1C]/50 shrink-0">
                {st.timestamp}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
