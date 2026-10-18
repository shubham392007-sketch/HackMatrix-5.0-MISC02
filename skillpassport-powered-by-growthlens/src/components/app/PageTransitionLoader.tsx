"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { useEvidence } from "@/context/EvidenceContext";

/**
 * PageTransitionLoader — Smooth, brand-aligned transition overlay between pages.
 *
 * Provides:
 * 1. Immediate visual feedback upon clicking any internal navigation link via a glowing top progress bar.
 * 2. An elegant frosted-glass loading overlay with the brand cursive "loading" vector stroke if
 *    page compilation or data loading takes longer than 120ms.
 * 3. Synchronization with EvidenceContext (isLoadingEvidence) so users never
 *    see an unstyled, empty, or frozen layout during page transitions.
 * 4. Graceful 300ms fade-out once the target page and data are ready.
 */
export default function PageTransitionLoader() {
  const pathname = usePathname();
  const { isLoadingEvidence } = useEvidence();

  const [isNavigating, setIsNavigating] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef<string>(pathname);

  // 1. Intercept internal anchor link clicks to provide instant visual feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement)?.closest("a") as HTMLAnchorElement | null;
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, new tabs, mailto/tel, or hash jumps
      if (
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if target is a different internal path
      try {
        const url = new URL(href, window.location.origin);
        const currentUrl = new URL(window.location.href);

        if (url.origin === currentUrl.origin) {
          const isSamePage =
            url.pathname === currentUrl.pathname && url.search === currentUrl.search;

          if (!isSamePage) {
            // Start navigation transition immediately
            startTransition();
          }
        }
      } catch {
        // invalid URL, ignore
      }
    };

    const handlePopState = () => {
      // Handle browser back/forward buttons
      startTransition();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const startTransition = () => {
    setIsNavigating(true);
    setProgress(15);

    // Debounce overlay display by 120ms to avoid flashes on instantaneous in-memory routes
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowOverlay(true);
    }, 120);

    // Animate top progress bar incrementally
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 65) return prev + Math.floor(Math.random() * 12) + 5;
        if (prev < 88) return prev + Math.floor(Math.random() * 4) + 1;
        return prev;
      });
    }, 150);

    // Safety timeout: never leave user stuck in loading screen if a route rejects
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      endTransition();
    }, 7000);
  };

  const endTransition = () => {
    setProgress(100);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

    setTimeout(() => {
      setIsNavigating(false);
      setShowOverlay(false);
      setTimeout(() => setProgress(0), 300);
    }, 200);
  };

  // 2. React to route changes via Next.js navigation hooks
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      // If we are currently navigating, wait for any active data load before ending
      if (!isLoadingEvidence) {
        endTransition();
      }
    }
  }, [pathname, isLoadingEvidence]);

  // 3. If evidence data was loading during navigation, finish once data resolves
  useEffect(() => {
    if (isNavigating && !isLoadingEvidence) {
      endTransition();
    }
  }, [isLoadingEvidence, isNavigating]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    };
  }, []);

  const active = isNavigating || showOverlay;

  return (
    <>
      {/* ── Top Slim Progress Bar ────────────────────────────────────────── */}
      {progress > 0 && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] h-[3.5px] pointer-events-none transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #1C1C1C 0%, #DFE968 100%)",
            boxShadow: "0 0 12px rgba(223, 233, 104, 0.9), 0 0 4px #1C1C1C",
          }}
        />
      )}

      {/* ── Frosted-Glass Centered Loading Overlay ────────────────────────── */}
      {showOverlay && (
        <div
          className={`fixed inset-0 z-[9990] flex flex-col items-center justify-center p-6 transition-opacity duration-300 backdrop-blur-sm select-none ${
            active ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            background: "rgba(251, 241, 207, 0.72)",
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] flex flex-col items-center justify-center max-w-sm w-full mx-4 animate-scaleUp">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-lg pointer-events-none" />

            {/* Cursive Brand Lottie Animation */}
            <LoadingAnimation size="md" className="relative z-10" />

            {/* Label and loading indicator */}
            <div className="mt-3 flex flex-col items-center gap-1.5 relative z-10 text-center">
              <p
                className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]"
                style={{ letterSpacing: "0.22em" }}
              >
                LOADING WORKSPACE ···
              </p>
              <span className="text-[10px] font-bold text-[#1C1C1C]/60 tracking-wider uppercase">
                Synchronizing Skill Passport
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
