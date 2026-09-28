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
    { label: string; glyph: string; bg: string; text: string }
  > = {
    improving: {
      label: "IMPROVING",
      glyph: "↑",
      bg: "bg-[#DFE968]",
      text: "text-[#1C1C1C]",
    },
    stagnating: {
      label: "STAGNATING",
      glyph: "→",
      bg: "bg-[#FBF1CF]",
      text: "text-[#1C1C1C]",
    },
    declining: {
      label: "DECLINING",
      glyph: "↓",
      bg: "bg-[#F6C8D6]",
      text: "text-[#C85A54]",
    },
    insufficient: {
      label: "NEED EVIDENCE",
      glyph: "?",
      bg: "bg-neutral-200",
      text: "text-[#1C1C1C]/80",
    },
    insufficient_evidence: {
      label: "NEED EVIDENCE",
      glyph: "?",
      bg: "bg-neutral-200",
      text: "text-[#1C1C1C]/80",
    },
  };

  const cur = configs[norm] || configs.insufficient;

  if (showGlyphOnly) {
    const glyphSizes = {
      sm: "w-5 h-5 text-xs font-black",
      md: "w-6 h-6 text-sm font-black",
      lg: "w-8 h-8 text-base font-black",
    };
    return (
      <span
        title={cur.label}
        className={`inline-flex items-center justify-center rounded-full border border-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C] ${cur.bg} ${cur.text} ${glyphSizes[size]} ${className}`}
      >
        <span className="leading-none">{cur.glyph}</span>
      </span>
    );
  }

  const badgeSizes = {
    sm: "px-2.5 py-1 text-[9px] gap-1.5",
    md: "px-3 py-1.5 text-[10px] gap-1.5",
    lg: "px-4 py-2 text-xs gap-2",
  };

  const iconClasses = {
    sm: "w-3 h-3 stroke-[2.5]",
    md: "w-3.5 h-3.5 stroke-[2.5]",
    lg: "w-4 h-4 stroke-[2.5]",
  };

  const renderIcon = () => {
    switch (norm) {
      case "improving":
        return <ArrowUpRight className={`${iconClasses[size]} shrink-0`} />;
      case "stagnating":
        return <ArrowRight className={`${iconClasses[size]} shrink-0`} />;
      case "declining":
        return <ArrowDownRight className={`${iconClasses[size]} shrink-0`} />;
      case "insufficient":
      case "insufficient_evidence":
      default:
        return <HelpCircle className={`${iconClasses[size]} shrink-0`} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border-[1.5px] border-[#1C1C1C] font-black uppercase tracking-[0.08em] shadow-[1.5px_1.5px_0px_#1C1C1C] select-none whitespace-nowrap leading-none ${cur.bg} ${cur.text} ${badgeSizes[size]} ${className}`}
    >
      <span className="shrink-0 flex items-center justify-center leading-none">
        {renderIcon()}
      </span>
      <span className="leading-none">{cur.label}</span>
    </span>
  );
}
