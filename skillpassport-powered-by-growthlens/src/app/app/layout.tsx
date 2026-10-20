"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import MobileTopNav from "@/components/app/MobileTopNav";
import AppAuthGuard from "@/components/app/AppAuthGuard";
import PageTransitionLoader from "@/components/app/PageTransitionLoader";
import { useEvidence } from "@/context/EvidenceContext";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/app/onboarding";
  const mainScrollRef = useRef<HTMLElement>(null);
  const { isDatabaseUnavailable, refreshEvidenceData } = useEvidence();

  // When opening a new feature screen, scroll the main content area to the top
  // while leaving the sidebar's scroll position untouched
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return (
    <AppAuthGuard>
      <PageTransitionLoader />
      {isOnboarding ? (
        <main
          className="min-h-screen w-full flex flex-col text-[#1C1C1C] overflow-y-auto"
          style={{
            background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
            backgroundAttachment: "fixed",
          }}
        >
          {children}
        </main>
      ) : (
        <div className="h-screen max-h-screen overflow-hidden flex flex-col lg:flex-row text-[#1C1C1C]">
          {/* Persistent App Sidebar on Desktop & Slide-out Drawer on Mobile/Tablet */}
          <AppSidebar />

          {/* Main Workspace Scroll Area with Home Screen Background */}
          <main
            ref={mainScrollRef}
            className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-y-auto custom-scrollbar"
            style={{
              background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
              backgroundAttachment: "fixed",
            }}
          >
            {/* Mobile / Tablet Top Navigation Bar (Hidden on lg and wider) */}
            <MobileTopNav />

            {/* Database Resilience & Recovery Banner */}
            {isDatabaseUnavailable && (
              <div className="bg-[#1C1C1C] text-[#FBF1CF] px-4 py-2.5 text-xs flex items-center justify-between shadow-md border-b border-[#FBF1CF]/20 z-40 sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <span className="font-medium">
                    Database is temporarily recovering from high load. Showing cached data — reconnecting automatically.
                  </span>
                </div>
                <button
                  onClick={() => refreshEvidenceData(true)}
                  className="text-[10px] font-bold uppercase tracking-wider bg-[#FBF1CF]/10 hover:bg-[#FBF1CF]/20 text-[#FBF1CF] px-2.5 py-1 rounded border border-[#FBF1CF]/30 transition shrink-0 ml-3"
                >
                  Retry Now
                </button>
              </div>
            )}

            {/* Page Content: animated on route change without re-mounting the sidebar */}
            <div key={pathname} className="flex-1 flex flex-col min-w-0 gl-page-enter">
              {children}
            </div>
          </main>
        </div>
      )}
    </AppAuthGuard>
  );
}
