"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Info } from "lucide-react";

interface AppTopBarProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export default function AppTopBar({
  title,
  description,
  backHref,
  backLabel,
  children,
}: AppTopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FBF1CF]/95 backdrop-blur-sm border-b-[1.5px] border-[#1C1C1C] px-6 lg:px-10 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 hover:text-[#1C1C1C] mb-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{backLabel || "Back"}</span>
          </Link>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-[#1C1C1C]">
            {title}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-[#DFE968] border border-[#1C1C1C] uppercase shadow-[1px_1px_0_0_#1C1C1C]">
            DEMO DATA
          </span>
        </div>
        {description && (
          <p className="text-xs font-medium text-[#1C1C1C]/75 mt-0.5 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {children}
        <div className="h-6 w-[1px] bg-[#1C1C1C]/20 hidden md:block" />
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#1C1C1C]/70 bg-[#FBF6DF] px-3 py-1.5 rounded-full border border-[#1C1C1C]">
          <Info className="w-3.5 h-3.5 text-[#1C1C1C]" />
          <span>Interactive Prototype</span>
        </div>
      </div>
    </header>
  );
}
