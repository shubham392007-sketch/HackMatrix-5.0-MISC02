"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Eye,
  SlidersHorizontal,
  Link2,
  Printer,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Check,
  Loader2,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import PassportBuilder from "@/components/passport/PassportBuilder";

export default function PassportBuilderPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isFinalized = localStorage.getItem("sp_master_content_finalized") === "true";
      if (isFinalized) {
        setConfirmed(true);
      }
    }

    const handleFinalizedEvent = () => {
      setConfirmed(true);
      setConfirming(false);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    };

    window.addEventListener("sp_passport_content_finalized", handleFinalizedEvent);
    return () => window.removeEventListener("sp_passport_content_finalized", handleFinalizedEvent);
  }, []);

  const handleConfirmFlow = () => {
    setConfirming(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sp_trigger_confirm_builder_flow"));
    }
    // Optimistic fallback in case the child event finishes fast
    setTimeout(() => {
      setConfirming(false);
      setConfirmed(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 800);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Passport Builder & Customizer"
        description="Personalize optional sections, add professional experience and portfolio projects, and choose your default layout archetype."
        badge="Domain 6 · Content Builder"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Prominent Confirmation Button for Passport Content Builder Flow */}
          <button
            type="button"
            onClick={handleConfirmFlow}
            disabled={confirming}
            id="confirm-passport-flow-btn"
            title="Finalize and confirm this passport content builder flow to be displayed on your Live Passport"
            className={`pill-btn text-[11px] py-1.5 px-3.5 flex items-center gap-1.5 border border-[#1C1C1C] transition-all cursor-pointer font-black shrink-0 ${
              confirmed
                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-800 shadow-[1px_1px_0_0_#065f46]"
                : "bg-[#000000] hover:bg-[#1A1918] text-[#FAF8F5] border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] active:translate-x-[1px] active:translate-y-[1px]"
            }`}
          >
            {confirming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FAF8F5]" />
            ) : (
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  confirmed ? "text-emerald-700 stroke-[2.5]" : "text-[#FAF8F5] stroke-[2.5]"
                }`}
              />
            )}
            <span>{confirmed ? "Content Flow Confirmed ✓" : "Confirm Content Flow"}</span>
          </button>

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
        {/* Banner notifying when confirmed */}
        {(confirmed || showNotification) && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-700/40 shadow-[2px_2px_0_0_#065f46] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 transition-all animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  Passport Content Flow Confirmed
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  The sections, custom ordering, and portfolio entries customized in this builder flow are confirmed and active for your Live Passport.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Link
                href="/app/passport/preview"
                className="text-xs font-extrabold px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-[1px_1px_0_0_#064e3b] flex items-center gap-1.5 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View in Live Preview &rarr;</span>
              </Link>
            </div>
          </div>
        )}

        <PassportBuilder />
      </div>
    </div>
  );
}
