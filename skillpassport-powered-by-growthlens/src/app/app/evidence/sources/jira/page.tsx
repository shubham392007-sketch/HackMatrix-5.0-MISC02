"use client";

import { useState } from "react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { Layers, Check, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

const AVAILABLE_PROJECTS = [
  { key: "AGRI", name: "Core Platform & Infrastructure", issues: 54 },
  { key: "DATA", name: "Telemetry & Pipeline Stream", issues: 32 },
  { key: "API", name: "External Gateway & Webhooks", issues: 18 },
  { key: "QA", name: "Automated End-to-End Suite", issues: 11 },
];

export default function JiraSourceFlow() {
  const { sources, connectSource } = useEvidence();
  const currentSource = sources.find((s) => s.type === "jira");

  const [selected, setSelected] = useState<string[]>(
    currentSource?.selectedEntities || ["AGRI (Core Platform)", "DATA (Pipeline Stream)"]
  );
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleProject = (projectName: string) => {
    if (selected.includes(projectName)) {
      setSelected(selected.filter((p) => p !== projectName));
    } else {
      setSelected([...selected, projectName]);
    }
  };

  const handleSync = () => {
    setSyncing(true);
    setSuccessMessage(null);
    setTimeout(() => {
      connectSource("jira", selected);
      setSyncing(false);
      setSuccessMessage(
        `SUCCESS: Synchronized ${selected.length} Jira projects into evidence library.`
      );
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Jira Project Selection"
        description="Select Jira projects to import closed user stories, pull request reviews, and sprint artifacts."
        backHref="/app/evidence/sources"
        backLabel="Connected Sources"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        <div className="p-5 rounded-2xl bg-[#F6BB84]/30 border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <ShieldCheck className="w-5 h-5 text-[#1C1C1C] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black uppercase tracking-wider block text-[#1C1C1C]">
              SIMULATED JIRA AUTHORIZATION • AGRITECH ENTERPRISE
            </span>
            <p className="font-medium text-[#1C1C1C]/80">
              Only issues where you are listed as Author, Assignee, or Reviewer will be extracted as individual capability evidence.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-[#DFE968] border border-[#1C1C1C] text-xs font-black text-[#1C1C1C]">
            {successMessage}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">Authorized Jira Projects</h3>
            <span className="text-xs font-bold text-[#1C1C1C]/60">
              {selected.length} Selected
            </span>
          </div>

          <div className="space-y-3">
            {AVAILABLE_PROJECTS.map((proj) => {
              const projLabel = `${proj.key} (${proj.name})`;
              const isChecked = selected.some((s) => s.includes(proj.key));
              return (
                <div
                  key={proj.key}
                  onClick={() => toggleProject(projLabel)}
                  className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-center justify-between cursor-pointer transition-all ${
                    isChecked
                      ? "bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C]"
                      : "bg-[#FBF1CF]/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-lg border border-[#1C1C1C] flex items-center justify-center ${
                        isChecked ? "bg-[#DFE968]" : "bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-4 h-4 text-[#1C1C1C]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FBF1CF] border border-[#1C1C1C]">
                          {proj.key}
                        </span>
                        <h4 className="text-sm font-black text-[#1C1C1C]">{proj.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono font-bold text-[#1C1C1C]/60">
                    {proj.issues} resolved tasks
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="pill-btn pill-btn-primary text-xs py-3 px-6"
            >
              {syncing ? "SYNCING JIRA ···" : "SYNC SELECTED PROJECTS →"}
            </button>
            <Link
              href="/app/evidence"
              className="pill-btn pill-btn-secondary text-xs py-3 px-6"
            >
              DONE / RETURN TO EVIDENCE
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
