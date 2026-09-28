"use client";

import React from "react";
import { GitPullRequest, CheckSquare, RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import StatusBadge, { ConnectionStatus } from "./StatusBadge";
import PillButton from "./PillButton";

interface SourceConnectionCardProps {
  provider: "github" | "jira";
  status: ConnectionStatus;
  lastSync?: string;
  evidenceCount: number;
  onSync: () => void;
  onTest: () => void;
  isSyncing?: boolean;
  isTesting?: boolean;
  details?: Record<string, unknown>;
  className?: string;
}

export default function SourceConnectionCard({
  provider,
  status,
  lastSync = "Never",
  evidenceCount = 0,
  onSync,
  onTest,
  isSyncing = false,
  isTesting = false,
  details,
  className = "",
}: SourceConnectionCardProps) {
  const isGithub = provider === "github";
  const name = isGithub ? "GitHub" : "Jira Cloud";
  const icon = isGithub ? (
    <GitPullRequest className="w-5 h-5 text-[#1C1C1C]" />
  ) : (
    <CheckSquare className="w-5 h-5 text-[#1C1C1C]" />
  );
  const iconBg = isGithub ? "bg-[#DFE968]" : "bg-[#F3A878]";
  const description = isGithub
    ? "Ingests pull requests, commits, and code review signals from connected repositories."
    : "Synchronizes sprint issues, completed deliverables, and engineering stories.";

  return (
    <div
      className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C] ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-black text-lg text-[#1C1C1C] tracking-tight leading-none mb-1">
                {name}
              </h3>
              <StatusBadge type="connection" status={status} size="sm" />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60 block leading-none mb-1">
              EVIDENCE
            </span>
            <span className="text-2xl font-black font-mono text-[#1C1C1C] leading-none">
              {evidenceCount}
            </span>
          </div>
        </div>

        <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed mb-4">
          {description}
        </p>

        <div className="p-3 rounded-xl border border-[#1C1C1C]/20 bg-[#FBF1CF]/60 mb-5 flex items-center justify-between text-xs font-semibold">
          <span className="text-[#1C1C1C]/70">Last Synchronized:</span>
          <span className="font-mono text-[#1C1C1C] font-bold">
            {isSyncing ? "Syncing in progress..." : lastSync}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1C1C1C]/15">
        <PillButton
          variant="primary"
          size="sm"
          loading={isSyncing}
          onClick={onSync}
          icon={<RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />}
        >
          {isSyncing ? "SYNCING..." : "SYNC NOW"}
        </PillButton>

        <PillButton
          variant="secondary"
          size="sm"
          loading={isTesting}
          onClick={onTest}
        >
          {isTesting ? "CHECKING..." : "TEST CONNECTION"}
        </PillButton>
      </div>
    </div>
  );
}
