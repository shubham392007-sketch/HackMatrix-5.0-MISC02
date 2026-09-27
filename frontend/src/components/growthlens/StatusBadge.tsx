"use client";

import React from "react";
import { GitPullRequest, CheckSquare, Award, Terminal, BookOpen, MessageSquare, Check, RefreshCw, AlertTriangle } from "lucide-react";

export type SourceType = "github" | "jira" | "assessment" | "project" | "course" | "feedback" | string;
export type ConnectionStatus = "connected" | "syncing" | "synced" | "needs_attention" | "not_connected";
export type FreshnessStatus = "fresh" | "recent" | "aging" | "stale";

interface StatusBadgeProps {
  type?: "source" | "connection" | "freshness";
  source?: SourceType;
  status?: ConnectionStatus;
  freshness?: FreshnessStatus;
  size?: "sm" | "md";
  className?: string;
}

export default function StatusBadge({
  type = "source",
  source = "github",
  status = "connected",
  freshness = "fresh",
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-[10px]";

  if (type === "source") {
    const s = (source || "").toLowerCase();
    const config: Record<string, { label: string; bg: string; icon: React.ReactNode }> = {
      github: { label: "GITHUB", bg: "bg-[#DFE968]/70", icon: <GitPullRequest className="w-3 h-3" /> },
      jira: { label: "JIRA", bg: "bg-[#F3A878]/60", icon: <CheckSquare className="w-3 h-3" /> },
      assessment: { label: "ASSESSMENT", bg: "bg-[#F6C8D6]", icon: <Award className="w-3 h-3" /> },
      project: { label: "PROJECT", bg: "bg-[#DFE968]/50", icon: <Terminal className="w-3 h-3" /> },
      project_outcome: { label: "PROJECT", bg: "bg-[#DFE968]/50", icon: <Terminal className="w-3 h-3" /> },
      course: { label: "COURSE", bg: "bg-[#FBF1CF]", icon: <BookOpen className="w-3 h-3" /> },
      course_completion: { label: "COURSE", bg: "bg-[#FBF1CF]", icon: <BookOpen className="w-3 h-3" /> },
      feedback: { label: "FEEDBACK", bg: "bg-white", icon: <MessageSquare className="w-3 h-3" /> },
    };

    const cur = config[s] || { label: s.toUpperCase(), bg: "bg-neutral-100", icon: null };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] font-extrabold uppercase tracking-wider text-[#1C1C1C] ${cur.bg} ${sizeClasses} ${className}`}
      >
        {cur.icon}
        <span>{cur.label}</span>
      </span>
    );
  }

  if (type === "connection") {
    if (status === "connected") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] bg-[#DFE968]/50 font-bold uppercase tracking-wider text-[#1C1C1C] ${sizeClasses} ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
          <span>Connected</span>
        </span>
      );
    }
    if (status === "syncing") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] bg-[#F6BB84]/40 font-bold uppercase tracking-wider text-[#1C1C1C] ${sizeClasses} ${className}`}>
          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          <span>Syncing...</span>
        </span>
      );
    }
    if (status === "synced") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] bg-white font-bold uppercase tracking-wider text-[#1C1C1C] ${sizeClasses} ${className}`}>
          <Check className="w-2.5 h-2.5 text-emerald-700" />
          <span>Synced</span>
        </span>
      );
    }
    if (status === "needs_attention") {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] font-bold uppercase tracking-wider text-[#1C1C1C] ${sizeClasses} ${className}`}>
          <AlertTriangle className="w-2.5 h-2.5 text-[#C85A54]" />
          <span>Needs attention</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C]/40 bg-neutral-200/50 font-bold uppercase tracking-wider text-[#1C1C1C]/60 ${sizeClasses} ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
        <span>Not connected</span>
      </span>
    );
  }

  // Freshness
  const freshConfig = {
    fresh: { label: "Fresh", bg: "bg-[#DFE968]/70", dot: "bg-emerald-700" },
    recent: { label: "Recent", bg: "bg-[#DFE968]/40", dot: "bg-emerald-600" },
    aging: { label: "Aging", bg: "bg-[#F6BB84]/50", dot: "bg-amber-600" },
    stale: { label: "Stale", bg: "bg-[#F6C8D6]", dot: "bg-[#C85A54]" },
  };
  const f = freshConfig[freshness] || freshConfig.fresh;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#1C1C1C] font-extrabold uppercase tracking-wider text-[#1C1C1C] ${f.bg} ${sizeClasses} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
      <span>{f.label}</span>
    </span>
  );
}
