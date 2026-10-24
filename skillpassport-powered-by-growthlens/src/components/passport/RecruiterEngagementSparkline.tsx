"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShieldCheck,
  Eye,
  ExternalLink,
  Lock,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface ShareLinkSummary {
  id: string;
  token: string;
  label: string;
  status: string;
  access_count: number;
  created_at: string;
  template_id?: string;
}

interface RecruiterEngagementSparklineProps {
  links: ShareLinkSummary[];
  totalAccessCount: number;
}

export default function RecruiterEngagementSparkline({
  links,
  totalAccessCount,
}: RecruiterEngagementSparklineProps) {
  const [selectedToken, setSelectedToken] = useState<string | null>(
    links[0]?.token || null
  );

  if (!links || links.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-paper text-center text-xs text-[#1C1C1C]/60 space-y-2">
        <Eye className="w-6 h-6 mx-auto opacity-40 text-[#1C1C1C]" />
        <p className="font-bold text-[#1C1C1C]">Zero Recruiter Links Created</p>
        <p>Issue an allowlisted share link to track employer views and engagement telemetry.</p>
      </div>
    );
  }

  // Calculate synthetic normalized points for visual sparkline
  const maxViews = Math.max(1, ...links.map((l) => l.access_count));
  const svgWidth = 260;
  const svgHeight = 60;

  // Generate sparkline path
  const points = links.map((l, i) => {
    const x = links.length === 1 ? svgWidth / 2 : (i / (links.length - 1)) * (svgWidth - 20) + 10;
    const y = svgHeight - (l.access_count / maxViews) * (svgHeight - 20) - 10;
    return { x, y, ...l };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const activeLink = links.find((l) => l.token === selectedToken) || links[0];

  return (
    <div className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-5 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
            Domain 6 · Recruiter Engagement Telemetry
          </span>
          <h3 className="text-base font-black text-[#1C1C1C] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#2E6941]" />
            Employer View Sparkline & Permission Auditing
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
            {totalAccessCount} Cumulative Views
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Sparkline Visual Card (7 cols) */}
        <div className="md:col-span-7 p-4 rounded-2xl bg-white border border-[#1C1C1C]/20 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1C]">
            <span>Link Fleet Access Frequency</span>
            <span className="text-[10px] font-mono text-[#1C1C1C]/50">Max: {maxViews} views/link</span>
          </div>

          {/* SVG Sparkline */}
          <div className="relative w-full h-[70px] bg-[#FAF8F5] rounded-xl border border-[#1C1C1C]/10 flex items-center justify-center p-2">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="overflow-visible"
            >
              {/* Reference Grid Line */}
              <line
                x1="0"
                y1={svgHeight - 10}
                x2={svgWidth}
                y2={svgHeight - 10}
                stroke="#1C1C1C"
                strokeOpacity="0.1"
                strokeDasharray="2 2"
              />

              {/* Sparkline Path */}
              <path
                d={pathD}
                fill="none"
                stroke="#2E6941"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {points.map((pt) => {
                const isSelected = selectedToken === pt.token;
                return (
                  <circle
                    key={pt.token}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5 : 3.5}
                    fill={isSelected ? "#1C1C1C" : "#DFE968"}
                    stroke="#1C1C1C"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:scale-125"
                    onClick={() => setSelectedToken(pt.token)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Active Link Inspector Strip */}
          {activeLink && (
            <div className="pt-2 border-t border-[#1C1C1C]/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-black text-[#1C1C1C] truncate max-w-[160px]">
                  {activeLink.label}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded uppercase bg-[#DFE968] border border-[#1C1C1C]">
                  {activeLink.access_count} Views
                </span>
              </div>
              <Link
                href={`/p/${activeLink.token}`}
                target="_blank"
                className="text-[11px] font-bold text-[#1C1C1C] hover:underline flex items-center gap-1 shrink-0"
              >
                <span>Inspect Projection</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Permission Invariant Grid (5 cols) */}
        <div className="md:col-span-5 space-y-2.5">
          <span className="text-[10px] font-mono font-black uppercase text-[#1C1C1C]/60 block px-1">
            ENFORCED ALLOWLIST SCOPE
          </span>

          <div className="p-2.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2E6941]" />
              <span className="font-bold text-[#1C1C1C]">Verified Skills Only</span>
            </div>
            <span className="text-[9.5px] font-mono font-bold text-[#2E6941] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              STRICT
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#B07219]" />
              <span className="font-bold text-[#1C1C1C]">Internal AI Thinking Traces</span>
            </div>
            <span className="text-[9.5px] font-mono font-bold text-[#B07219] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              REDACTED
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#9333EA]" />
              <span className="font-bold text-[#1C1C1C]">Direct Recruiter Inquiries</span>
            </div>
            <span className="text-[9.5px] font-mono font-bold text-[#9333EA] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              PERMITTED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
