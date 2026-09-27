"use client";

import React from "react";
import { ArrowUpRight, ArrowRight, ArrowDownRight, HelpCircle } from "lucide-react";
import type { TrendDirection } from "@/lib/types";

interface TrendIndicatorProps {
  trend: TrendDirection | "insufficient_evidence" | string;
  size?: "sm" | "md" | "lg";
  showGlyphOnly?: boolean;
  className?: string;
}

export default function TrendIndicator({
  trend,
  size = "md",
  showGlyphOnly = false,
  className = "",
}: TrendIndicatorProps) {
  const norm = (trend || "insufficient").toLowerCase();

  const configs: Record<
    string,
    { label: string; glyph: string; icon: React.ReactNode; bg: string; text: string }
  > = {
    improving: {
      label: "Improving",
      glyph: "↑",
      icon: <ArrowUpRight className="shrink-0" />,
      bg: "bg-[#DFE968]/70 border-[#1C1C1C]",
      text: "text-[#1C1C1C]",
    },
    stagnating: {
      label: "Stagnating",
      glyph: "→",
      icon: <ArrowRight className="shrink-0" />,
      bg: "bg-[#FBF1CF] border-[#1C1C1C]",
      text: "text-[#1C1C1C]",
    },
    declining: {
      label: "Declining",
      glyph: "↓",
      icon: <ArrowDownRight className="shrink-0" />,
      bg: "bg-[#F6C8D6] border-[#1C1C1C]",
      text: "text-[#1C1C1C]",
    },
    insufficient: {
      label: "Need Evidence",
      glyph: "?",
      icon: <HelpCircle className="shrink-0" />,
      bg: "bg-neutral-200/70 border-[#1C1C1C]/40",
      text: "text-[#1C1C1C]/70",
    },
    insufficient_evidence: {
      label: "Need Evidence",
      glyph: "?",
      icon: <HelpCircle className="shrink-0" />,
      bg: "bg-neutral-200/70 border-[#1C1C1C]/40",
      text: "text-[#1C1C1C]/70",
    },
  };

  const cur = configs[norm] || configs.insufficient;

  if (showGlyphOnly) {
    const glyphSizes = {
      sm: "w-5 h-5 text-xs font-black",
      md: "w-7 h-7 text-sm font-black",
      lg: "w-9 h-9 text-base font-black",
    };
    return (
      <span
        title={cur.label}
        className={`inline-flex items-center justify-center rounded-full border shadow-[1px_1px_0px_#1C1C1C] ${cur.bg} ${cur.text} ${glyphSizes[size]} ${className}`}
      >
        {cur.glyph}
      </span>
    );
  }

  const badgeSizes = {
    sm: "px-2.5 py-0.5 text-[9px] gap-1",
    md: "px-3 py-1 text-[10px] gap-1.5",
    lg: "px-4 py-1.5 text-xs gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#1C1C1C] font-extrabold uppercase tracking-wider shadow-[1.5px_1.5px_0px_#1C1C1C] ${cur.bg} ${cur.text} ${badgeSizes[size]} ${className}`}
    >
      <span className={iconSizes[size]}>
        {cur.icon}
      </span>
      <span>{cur.label}</span>
      <span className="font-mono opacity-60 ml-0.5">{cur.glyph}</span>
    </span>
  );
}
