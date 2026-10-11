"use client";

import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { Activity, CheckCircle2, XCircle, RotateCcw, Clock } from "lucide-react";

export default function IngestionRunsPage() {
  const { ingestionRuns, retryIngestionRun } = useEvidence();

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Ingestion Runs &amp; Monitor"
        description="Inspect pipeline stages, job histories, background discovery tasks, and retry failed imports."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">Recent Pipeline Executions</h3>
            <span className="text-xs font-bold text-[#1C1C1C]/60">
              {ingestionRuns.length} Total Runs
            </span>
          </div>

          <div className="space-y-4">
            {ingestionRuns.map((run) => (
              <div
                key={run.runId}
                className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#1C1C1C]/60">
                        {run.runId}
                      </span>
                      <span className="text-xs text-[#1C1C1C]/30">•</span>
                      <h4 className="text-sm font-black text-[#1C1C1C]">{run.source}</h4>
                    </div>
                    <span className="text-[10px] text-[#1C1C1C]/60 block mt-0.5">
                      Started: {run.startTime} {run.completionTime && `• Completed: ${run.completionTime}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {run.status === "completed" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54] flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> FAILED
                      </span>
                    )}
                  </div>
                </div>

                {run.errorMessage && (
                  <div className="p-3 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center justify-between">
                    <span>{run.errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => retryIngestionRun(run.runId)}
                      className="pill-btn pill-btn-primary text-[10px] py-1 px-3 ml-2 flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>RETRY NOW</span>
                    </button>
                  </div>
                )}

                {/* Processing Stage Timeline */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                    STAGE TIMELINE &amp; LOGS
                  </span>
                  <div className="space-y-1 text-xs">
                    {run.stages.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#FBF1CF] border border-[#1C1C1C]/20"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#4A7A4E]" />
                          <span className="font-black">{st.stage}:</span>
                          <span className="text-[#1C1C1C]/80 font-medium">{st.detail}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#1C1C1C]/50">{st.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
