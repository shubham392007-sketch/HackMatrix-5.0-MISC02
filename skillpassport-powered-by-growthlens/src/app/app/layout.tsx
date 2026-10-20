"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import MobileTopNav from "@/components/app/MobileTopNav";
import AppAuthGuard from "@/components/app/AppAuthGuard";
import PageTransitionLoader from "@/components/app/PageTransitionLoader";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === "/app/onboarding";
  const mainScrollRef = useRef<HTMLElement>(null);

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
