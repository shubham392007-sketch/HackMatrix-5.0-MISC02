"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Eye,
  SlidersHorizontal,
  Link2,
  Printer,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import PassportBuilder from "@/components/passport/PassportBuilder";

export default function PassportBuilderPage() {
  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Passport Builder & Customizer"
        description="Personalize optional sections, add professional experience and portfolio projects, and choose your default layout archetype."
        badge="Domain 6 · Content Builder"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/preview"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </Link>
          <Link
            href="/app/passport/export"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Printer className="w-3 h-3" />
            <span>Export PDF</span>
          </Link>
          <Link
            href="/app/passport/share"
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Link2 className="w-3 h-3" />
            <span>Create Share Link &rarr;</span>
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
        <PassportBuilder />
      </div>
    </div>
  );
}
