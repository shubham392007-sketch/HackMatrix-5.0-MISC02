"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import RecruiterTopBar from "@/components/recruiter/RecruiterTopBar";
import RecruiterAuthGuard from "@/components/recruiter/RecruiterAuthGuard";
import PageTransitionLoader from "@/components/app/PageTransitionLoader";
import { useEvidence } from "@/context/EvidenceContext";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname.includes("/recruiter/login") ||
    pathname.includes("/recruiter/register");
  const mainScrollRef = useRef<HTMLElement>(null);
  const { isDatabaseUnavailable, refreshEvidenceData } = useEvidence();

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <RecruiterAuthGuard>
      <PageTransitionLoader />
      {/* Background is explicitly transparent so the interactive dot grid from RootLayout renders through */}
      <div className="min-h-screen flex flex-col bg-transparent text-[#1C1C1C] relative z-10">
        {/* Floating Capsule Top Navigation Bar */}
        <RecruiterTopBar />

        {/* Database Resilience & Recovery Banner if offline */}
        {isDatabaseUnavailable && (
          <div className="bg-[#1C1C1C] text-[#FBF1CF] px-4 py-2.5 text-xs flex items-center justify-between shadow-md border-b border-[#FBF1CF]/20 z-30 sticky top-16">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Working with local cached data. Cloud database connection is reconnecting...</span>
            </div>
            <button
              onClick={() => refreshEvidenceData()}
              className="underline hover:text-white font-medium ml-4 transition-colors text-[11px]"
            >
              Reconnect Now
            </button>
          </div>
        )}

        {/* Main Content Area with generous top spacing below the floating capsule */}
        <main
          ref={mainScrollRef}
          className="flex-1 flex flex-col min-w-0 pt-3"
          style={{ background: "transparent" }}
        >
          {children}
        </main>
      </div>
    </RecruiterAuthGuard>
  );
}
