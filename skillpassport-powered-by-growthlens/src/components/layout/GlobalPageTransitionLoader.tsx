"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

interface ContextMeta {
  title: string;
  subtitle: string;
}

function getNavigationContext(targetPath: string): ContextMeta {
  if (!targetPath) {
    return {
      title: "LOADING WORKSPACE ···",
      subtitle: "Synchronizing Skill Passport",
    };
  }

  const p = targetPath.toLowerCase();

  if (p.includes("/app/evidence/sources")) {
    return {
      title: "CONNECTED SOURCES ···",
      subtitle: "Loading connected repositories, documents & sync configurations",
    };
  }
  if (p.includes("/app/evidence/upload")) {
    return {
      title: "UPLOAD WORK & DOCS ···",
      subtitle: "Preparing evidence upload parser & document ingestion",
    };
  }
  if (p.includes("/app/evidence/library")) {
    return {
      title: "EVIDENCE LIBRARY ···",
      subtitle: "Loading verified records, provenance graphs & commit logs",
    };
  }
  if (p.includes("/app/evidence/runs")) {
    return {
      title: "INGESTION RUNS ···",
      subtitle: "Retrieving ingestion status, sync progress & worker queues",
    };
  }
  if (p.includes("/app/evidence")) {
    return {
      title: "EVIDENCE INTELLIGENCE ···",
      subtitle: "Synchronizing evidence repository & proof graph",
    };
  }
  if (p.includes("/app/skills/candidates") || p.includes("/app/skills/review")) {
    return {
      title: "CANDIDATE REVIEW ···",
      subtitle: "Loading candidate skills & evidence supporting claims",
    };
  }
  if (p.includes("/app/skills/explorer") || p.includes("/app/skills/taxonomy")) {
    return {
      title: "SKILL TAXONOMY ···",
      subtitle: "Querying canonical capability ontology & mapped skills",
    };
  }
  if (p.includes("/app/skills")) {
    return {
      title: "SKILL INTELLIGENCE ···",
      subtitle: "Accessing verified competencies & capability matrix",
    };
  }
  if (p.includes("/app/ai/guard")) {
    return {
      title: "HALLUCINATION GUARD ···",
      subtitle: "Evaluating claim support & provenance citations",
    };
  }
  if (p.includes("/app/ai/audit")) {
    return {
      title: "AI AUDIT TRAIL ···",
      subtitle: "Loading immutable decision logs & model operations",
    };
  }
  if (p.includes("/app/ai")) {
    return {
      title: "AI GOVERNANCE ···",
      subtitle: "Connecting AI workspace, validation & trust verification",
    };
  }
  if (p.includes("/app/passport")) {
    return {
      title: "SKILL PASSPORT ···",
      subtitle: "Compiling verifiable credentials & capability signals",
    };
  }
  if (p.includes("/app/onboarding")) {
    return {
      title: "SETUP WIZARD ···",
      subtitle: "Preparing your personalized evidence workflow",
    };
  }
  if (p.includes("/login") || p.includes("/signup") || p.includes("/auth")) {
    return {
      title: "SUPABASE AUTH ···",
      subtitle: "Initializing secure encrypted session",
    };
  }
  if (p.includes("/features")) {
    return {
      title: "SYSTEM FEATURES ···",
      subtitle: "Loading SkillPassport architecture & capabilities",
    };
  }
  if (p.includes("/about") || p.includes("/developers")) {
    return {
      title: "SKILL PASSPORT ···",
      subtitle: "Loading platform information",
    };
  }

  return {
    title: "OPENING PAGE ···",
    subtitle: "Synchronizing Skill Passport",
  };
}

/**
 * GlobalPageTransitionLoader
 *
 * Universal navigation loader that guarantees instant tactile feedback across the entire application:
 * 1. Progress Bar: Springs to life at 20% on any click or programmatic navigation.
 * 2. Visual Transition Overlay: If the page takes >75ms to prepare/fetch data, renders
 *    the brand frosted-glass card with the authentic cursive Lottie "loading" stroke
 *    and contextual metadata based on destination.
 * 3. History Interception: Monkey-patches history.pushState and history.replaceState to capture
 *    all router.push / router.replace calls automatically.
 * 4. Safety Guard: Automatically dismisses after 5000ms under any network failure or cancellation.
 */
export default function GlobalPageTransitionLoader() {
  const pathname = usePathname();

  const [isNavigating, setIsNavigating] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetContext, setTargetContext] = useState<ContextMeta>({
    title: "OPENING PAGE ···",
    subtitle: "Synchronizing Skill Passport",
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathnameRef = useRef<string>(pathname);

  const startTransition = useCallback((destinationUrl?: string) => {
    // Always defer state updates to macrotask queue so it NEVER runs inside useInsertionEffect or render phase
    setTimeout(() => {
      if (destinationUrl) {
        setTargetContext(getNavigationContext(destinationUrl));
      }

      setIsNavigating(true);
      setProgress((prev) => (prev > 15 ? prev : 22));

      // Fast debounce: show overlay if navigation takes longer than 75ms
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowOverlay(true);
      }, 75);

      // Increment progress bar smoothly
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 60) return prev + Math.floor(Math.random() * 12) + 8;
          if (prev < 88) return prev + Math.floor(Math.random() * 4) + 2;
          if (prev < 94) return prev + 1;
          return prev;
        });
      }, 120);

      // Safety timeout: never freeze the screen permanently if navigation fails
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = setTimeout(() => {
        endTransition();
      }, 5500);
    }, 0);
  }, []);

  const endTransition = useCallback(() => {
    setTimeout(() => {
      setProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);

      setTimeout(() => {
        setIsNavigating(false);
        setShowOverlay(false);
        setTimeout(() => setProgress(0), 250);
      }, 180);
    }, 0);
  }, []);

  // 1. Intercept internal anchor link clicks
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag or element with data-href or role="link"
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const target = el.closest("a") as HTMLAnchorElement | null;
      if (!target) {
        // Also check elements with data-navigate
        const navEl = el.closest("[data-navigate]") as HTMLElement | null;
        if (navEl) {
          const dest = navEl.getAttribute("data-navigate");
          if (dest && dest !== window.location.pathname) {
            startTransition(dest);
          }
        }
        return;
      }

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, new tabs, downloads, mailto/tel, or hash-only jumps
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
            startTransition(url.pathname);
          }
        }
      } catch {
        // invalid URL, ignore
      }
    };

    const handlePopState = () => {
      startTransition(window.location.pathname);
    };

    const handleCustomNavigateStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      startTransition(customEvent.detail?.destination || customEvent.detail?.target);
    };

    const handleCustomNavigateEnd = () => {
      endTransition();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("app:navigate-start", handleCustomNavigateStart);
    window.addEventListener("app:navigate-end", handleCustomNavigateEnd);

    // 2. Safely capture router.push() via history.pushState deferred to macrotask
    // Note: We never intercept replaceState as Next.js uses it internally for React tree hydration
    const originalPushState = window.history.pushState;

    window.history.pushState = function (...args) {
      const url = args[2];
      if (url) {
        try {
          const nextUrl = new URL(url.toString(), window.location.origin);
          if (
            nextUrl.pathname !== window.location.pathname ||
            nextUrl.search !== window.location.search
          ) {
            setTimeout(() => {
              startTransition(nextUrl.pathname);
            }, 0);
          }
        } catch {}
      }
      return originalPushState.apply(this, args);
    };

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("app:navigate-start", handleCustomNavigateStart);
      window.removeEventListener("app:navigate-end", handleCustomNavigateEnd);
      window.history.pushState = originalPushState;
    };
  }, [startTransition, endTransition]);

  // 3. React to pathname changes
  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      endTransition();
    }
  }, [pathname, endTransition]);

  // Cleanup timers on unmount
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
          className="fixed top-0 left-0 right-0 z-[99999] h-[3.5px] pointer-events-none transition-all duration-200 ease-out"
          style={{
            width: `${progress}%`,
            background: "#1E3A5F",
            boxShadow: "0 0 14px rgba(30, 58, 95, 0.6), 0 0 4px #1C1C1C",
          }}
        />
      )}

      {/* ── Frosted-Glass Centered Loading Overlay ────────────────────────── */}
      {showOverlay && (
        <div
          className={`fixed inset-0 z-[99990] flex flex-col items-center justify-center p-6 transition-opacity duration-200 backdrop-blur-[3px] select-none ${
            active ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            background: "rgba(245, 242, 235, 0.85)",
          }}
          aria-live="polite"
          aria-busy="true"
        >
          <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-2 bg-[#DFE968]/35 rounded-3xl blur-xl pointer-events-none" />

            {/* Centered Cream Card Strictly Containing Everything Inside */}
            <div className="relative p-7 sm:p-9 rounded-3xl bg-[#FBF6DF]/95 border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full animate-scaleUp overflow-hidden">
              {/* Cursive Brand Animation */}
              <LoadingAnimation size="md" className="relative z-10" />

              {/* Label and loading indicator */}
              <div className="mt-3 flex flex-col items-center gap-1.5 relative z-10 text-center">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[9px] font-black uppercase tracking-wider mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C1C] animate-ping" />
                  <span>NAVIGATING</span>
                </div>
                <p
                  className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]"
                  style={{ letterSpacing: "0.2em" }}
                >
                  {targetContext.title}
                </p>
                <span className="text-[11px] font-medium text-[#1C1C1C]/75 tracking-normal max-w-[260px] leading-snug">
                  {targetContext.subtitle}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
