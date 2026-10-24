"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  SKILLPASSPORT_GLYPHS,
  SKILLPASSPORT_COMBINED_PATH,
  SKILLPASSPORT_VIEWBOX_WIDTH,
} from "./skillpassportPaths";

interface SkillPassportBootScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

/**
 * SkillPassportBootScreen — Premium Apple-style boot animation for SkillPassport Powered by GrowthLens.
 *
 * Renders the authentic Yellowtail brand wordmark "SkillPassport" animated with
 * stroke-drawing and progressive handwriting reveal sequence, accompanied by
 * the "Powered by GrowthLens" subtitle and the Moonwood sunset gradient.
 *
 * Ensures the entire splash screen appears completely, holds steadily, and then
 * smoothly transitions to reveal the home screen.
 */
export default function SkillPassportBootScreen({
  onComplete,
  minDurationMs = 2950,
}: SkillPassportBootScreenProps) {
  const [phase, setPhase] = useState<"init" | "drawing" | "holding" | "fading" | "done">("init");
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dismissBoot = () => {
    setPhase("fading");
    setTimeout(() => {
      setPhase("done");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("skillpassport_boot_seen", "true");
      }
      onComplete?.();
    }, 250);
  };

  useEffect(() => {
    // 1. Session storage check — only skip on deep internal pages if already seen in this session.
    // On the root home page ('/'), allow the complete splash sequence to play cleanly.
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const isHomePage = pathname === "/" || pathname === "";
    const hasSeenBoot =
      typeof window !== "undefined" &&
      sessionStorage.getItem("skillpassport_boot_seen");

    if (hasSeenBoot === "true") {
      setPhase("done");
      onComplete?.();
      return;
    }

    // 2. Prefers reduced motion check
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      setIsReducedMotion(true);
      const timer = setTimeout(() => {
        setPhase("fading");
        setTimeout(() => {
          setPhase("done");
          sessionStorage.setItem("skillpassport_boot_seen", "true");
          onComplete?.();
        }, 200);
      }, 500);
      return () => clearTimeout(timer);
    }

    // 3. Prevent scrolling during boot sequence
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 4. Calibrated Apple-style timing sequence
    // - 60ms: start stroke drawing
    // - 1650ms: all 13 letters fully drawn & solid filled -> enter "holding" phase
    // - 2500ms: start smooth fade-out (~850ms hold showing complete brand)
    // - 2950ms: mark done, restore overflow, reveal home screen
    const drawTimer = setTimeout(() => {
      setPhase("drawing");
    }, 60);

    const holdTimer = setTimeout(() => {
      setPhase("holding");
    }, 1650);

    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, 2500);

    const completeTimer = setTimeout(() => {
      setPhase("done");
      document.body.style.overflow = originalOverflow;
      sessionStorage.setItem("skillpassport_boot_seen", "true");
      onComplete?.();
    }, minDurationMs);

    return () => {
      clearTimeout(drawTimer);
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, [onComplete, minDurationMs]);

  if (phase === "done") {
    return null;
  }

  const viewBoxW = SKILLPASSPORT_VIEWBOX_WIDTH || 1320;

  return (
    <aside
      ref={containerRef}
      role="status"
      aria-live="polite"
      aria-label="SkillPassport Loading Screen (Click to skip)"
      onClick={dismissBoot}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-500 ease-out ${
        phase === "fading" ? "opacity-0 scale-[0.99] blur-[1px] pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{
        background: "#F5F2EB",
        backgroundColor: "#F5F2EB",
        minHeight: "100vh",
        height: "100dvh",
        width: "100vw",
      }}
    >
      <span className="sr-only">SkillPassport Powered by GrowthLens is loading.</span>

      {/* Centerpiece Container */}
      <div className="relative w-[92vw] sm:w-[84vw] md:w-[72vw] lg:w-[60vw] max-w-[980px] flex flex-col items-center justify-center px-2">
        <svg
          viewBox={`0 0 ${viewBoxW} 280`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle soft gradient definition for ambient glow */}
            <radialGradient id="sp-ambient-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group containing authentic Yellowtail brand wordmark */}
          <g>
            {/* Soft depth shadow underneath letterforms */}
            <path
              d={SKILLPASSPORT_COMBINED_PATH}
              fill="rgba(28, 28, 28, 0.07)"
              stroke="rgba(28, 28, 28, 0.07)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(0, 3)"
              className="transition-opacity duration-700 ease-out"
              style={{
                opacity: phase === "holding" || phase === "drawing" ? 1 : 0,
                transitionDelay: "0.5s",
              }}
            />

            {/* Authentic Yellowtail Glyphs: 13 letters (SkillPassport) */}
            {/* Stroke-drawing + solid ink fill sequence */}
            {SKILLPASSPORT_GLYPHS.map((glyph, idx) => (
              <path
                key={glyph.char + idx}
                d={glyph.d}
                fill="#1C1C1C"
                stroke="#1C1C1C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={phase === "init" ? "opacity-0" : "growthlens-boot-outline"}
                style={{
                  animationDelay: isReducedMotion ? "0s" : `${idx * 0.055}s`,
                }}
              />
            ))}
          </g>
        </svg>

        {/* Ambient warm radial glow behind the wordmark */}
        <div
          className="absolute inset-0 pointer-events-none -z-10 transition-opacity duration-1000 ease-out"
          style={{
            background:
              "none",
            opacity: phase === "holding" || phase === "drawing" ? 1 : 0,
          }}
        />

        {/* Powered by GrowthLens Tagline */}
        <div
          className={`mt-4 sm:mt-6 flex items-center justify-center gap-2 transition-all duration-700 ease-out ${
            phase === "holding" || phase === "drawing"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2"
          }`}
          style={{ transitionDelay: "0.85s" }}
        >
          <span className="text-[11px] sm:text-[13px] md:text-[14px] font-bold tracking-[0.25em] text-[#1C1C1C]/75 uppercase font-mono">
            Powered by GrowthLens
          </span>
        </div>
      </div>

      {/* Refined baseline brand subtitle */}
      <div
        className={`absolute bottom-10 md:bottom-14 text-center tracking-[0.22em] uppercase text-[10px] sm:text-[11px] md:text-[12px] font-semibold text-[#1C1C1C]/65 transition-opacity duration-700 ease-out ${
          phase === "holding" || phase === "drawing" ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: "1.05s" }}
      >
        <span className="font-mono">VERIFIABLE SKILLS & EVIDENCE INTELLIGENCE</span>
      </div>
    </aside>
  );
}
