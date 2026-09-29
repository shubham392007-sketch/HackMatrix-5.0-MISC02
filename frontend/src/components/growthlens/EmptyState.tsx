"use client";

import React from "react";
import Link from "next/link";
import { FolderOpen, Search, Inbox, Sparkles, FilterX, Users } from "lucide-react";
import PillButton from "./PillButton";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "lime" | "dark" | "outline";
}

interface EmptyStateProps {
  type?: "default" | "search" | "filter" | "evidence" | "skills" | "recommendations" | "team";
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export default function EmptyState({
  type = "default",
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  // Preset defaults if title/message/icon are omitted
  const defaults = {
    default: {
      icon: <Inbox className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No data available",
      message: "There is nothing to display here right now.",
    },
    search: {
      icon: <Search className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No search results found",
      message: "Try refining your query or resetting active filters to find what you are looking for.",
    },
    filter: {
      icon: <FilterX className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No matching items",
      message: "No entries match the currently selected filter. Switch filters to explore more entries.",
    },
    evidence: {
      icon: <FolderOpen className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No evidence recorded yet",
      message: "Evidence is ingested continuously from connected developer activity, Jira tickets, PRs, and manual assessments.",
    },
    skills: {
      icon: <Sparkles className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No competency milestones yet",
      message: "As evidence items are analyzed and validated, competencies and trajectory projections will appear here.",
    },
    recommendations: {
      icon: <Sparkles className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No recommended actions pending",
      message: "Great work! You are currently meeting trajectory targets across all monitored competencies.",
    },
    team: {
      icon: <Users className="w-6 h-6 text-[#1C1C1C]" />,
      title: "No team members found",
      message: "No registered employees match this team roster or filter criteria.",
    },
  };

  const activeDefaults = defaults[type] || defaults.default;
  const displayTitle = title || activeDefaults.title;
  const displayMessage = message || activeDefaults.message;
  const displayIcon = icon || activeDefaults.icon;

  const renderAction = (action: EmptyStateAction, isPrimary: boolean) => {
    const btn = (
      <PillButton
        variant={action.variant || (isPrimary ? "primary" : "secondary")}
        onClick={action.onClick}
        icon={action.icon}
      >
        {action.label}
      </PillButton>
    );

    if (action.href) {
      return (
        <Link key={action.label} href={action.href}>
          {btn}
        </Link>
      );
    }

    return <React.Fragment key={action.label}>{btn}</React.Fragment>;
  };

  return (
    <div
      className={`p-8 md:p-10 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] text-center max-w-xl mx-auto my-8 ${className}`}
    >
      <div className="w-12 h-12 rounded-full border-[1.5px] border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#1C1C1C]">
        {displayIcon}
      </div>

      <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight mb-2">
        {displayTitle}
      </h3>

      <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/75 leading-relaxed mb-6">
        {displayMessage}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && renderAction(primaryAction, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}
    </div>
  );
}
