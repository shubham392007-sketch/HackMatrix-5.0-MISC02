"use client";

import { useState } from "react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { GitBranch, Check, ShieldCheck, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

const AVAILABLE_REPOS = [
  { name: "smart-irrigation-ai", desc: "IoT sensor telemetry and predictive watering", commits: 42, stars: 12 },
  { name: "worker-queue-engine", desc: "Asynchronous task queue with Redis and dead-letter", commits: 28, stars: 5 },
  { name: "distributed-auth-gateway", desc: "JWT session bridge and OAuth identity service", commits: 19, stars: 8 },
  { name: "legacy-analytics-cron", desc: "Historical batch export cron jobs in Python", commits: 9, stars: 1 },
];

export default function GitHubSourceFlow() {
  const { sources, connectSource } = useEvidence();
  const currentSource = sources.find((s) => s.type === "github");

  const [selected, setSelected] = useState<string[]>(
    currentSource?.selectedEntities || ["smart-irrigation-ai", "worker-queue-engine"]
  );
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleRepo = (repoName: string) => {
    if (selected.includes(repoName)) {
      setSelected(selected.filter((r) => r !== repoName));
    } else {
      setSelected([...selected, repoName]);
    }
  };

  const handleSync = () => {
    setSyncing(true);
    setSuccessMessage(null);
    setTimeout(() => {
      connectSource("github", selected);
      setSyncing(false);
      setSuccessMessage(
        `SUCCESS: Synchronized ${selected.length} repositories into local evidence store.`
      );
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="GitHub Repository Selection"
        description="Select repositories to inspect for commits, PR reviews, and architectural signals."
        backHref="/app/evidence/sources"
        backLabel="Connected Sources"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        {/* Connection Notice */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/40 border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <ShieldCheck className="w-5 h-5 text-[#4A7A4E] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black uppercase tracking-wider block text-[#1C1C1C]">
              SIMULATED AUTHORIZATION • ALEX RIVERA
            </span>
            <p className="font-medium text-[#1C1C1C]/80">
              Zero code leaves your browser. Commit hashes, diff statistics, and language distributions are calculated locally.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-[#DFE968] border border-[#1C1C1C] text-xs font-black text-[#1C1C1C]">
            {successMessage}
          </div>
        )}

        {/* Repositories List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">Authorized Repositories</h3>
            <span className="text-xs font-bold text-[#1C1C1C]/60">
              {selected.length} of {AVAILABLE_REPOS.length} Selected
            </span>
          </div>

          <div className="space-y-3">
            {AVAILABLE_REPOS.map((repo) => {
              const isChecked = selected.includes(repo.name);
              return (
                <div
                  key={repo.name}
                  onClick={() => toggleRepo(repo.name)}
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
                      <h4 className="text-sm font-black text-[#1C1C1C]">{repo.name}</h4>
                      <p className="text-xs font-medium text-[#1C1C1C]/70">{repo.desc}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono font-bold text-[#1C1C1C]/60">
                    {repo.commits} commits
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
              {syncing ? "SYNCING REPOSITORIES ···" : "SYNC SELECTED REPOSITORIES →"}
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
