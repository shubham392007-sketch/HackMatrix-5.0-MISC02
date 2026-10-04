"use client";

import React, { useEffect, useState, useRef } from "react";
import { GROWTHLENS_GLYPHS, GROWTHLENS_COMBINED_PATH } from "./growthlensPaths";

interface GrowthLensBootScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

/**
 * GrowthLensBootScreen — Premium Apple-style boot animation for GrowthLens.
 *
 * Renders the 100% authentic Yellowtail brand wordmark "GrowthLens" (exact letterforms,
 * curves, and weights matching the official logo) animated with an Apple-inspired
 * stroke-drawing and progressive handwriting reveal sequence.
 *
 * Features:
 * - 100% Authentic letterforms from Yellowtail font vectors
 * - SVG stroke-dasharray & stroke-dashoffset progressive outline drawing
 * - Sweep reveal simulating natural pen-writing from G to s
 * - GrowthLens Moonwood gradient background continuity
 * - Smooth cinematic hold & soft dissolve into the application
 * - Session-storage cache: runs once per session
 * - Accessible with prefers-reduced-motion support
 */
export default function GrowthLensBootScreen({
  onComplete,
  minDurationMs = 5200,
}: GrowthLensBootScreenProps) {
  const [phase, setPhase] = useState<"init" | "drawing" | "holding" | "fading" | "done">("init");
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Session storage check — only play once per browser session
    const hasSeenBoot = typeof window !== "undefined" && sessionStorage.getItem("growthlens_boot_seen");
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
          sessionStorage.setItem("growthlens_boot_seen", "true");
          onComplete?.();
        }, 300);
      }, 700);
      return () => clearTimeout(timer);
    }

    // 3. Prevent scroll and accidental interaction during boot sequence
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 4. Timing sequence:
    // 0 - 150ms: Clean background setup
    // 150ms - 3800ms: Wordmark handwriting and stroke-dashoffset reveal
    // 3800ms - 4800ms: Completed wordmark hold
    // 4800ms - 5400ms: Soft dissolve transition into main website
    const drawTimer = setTimeout(() => {
      setPhase("drawing");
    }, 150);

    const holdTimer = setTimeout(() => {
      setPhase("holding");
    }, 3800);

    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, 4800);

    const completeTimer = setTimeout(() => {
      setPhase("done");
      document.body.style.overflow = originalOverflow;
      sessionStorage.setItem("growthlens_boot_seen", "true");
      onComplete?.();
    }, 5450);

    return () => {
      clearTimeout(drawTimer);
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, [onComplete]);

  if (phase === "done") {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      role="status"
      aria-live="polite"
      aria-label="GrowthLens Loading Screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none pointer-events-none transition-all duration-700 ease-out ${
        phase === "fading" ? "opacity-0 scale-[0.99] blur-[1px]" : "opacity-100 scale-100"
      }`}
      style={{
        background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
        backgroundColor: "#FBF1CF",
        minHeight: "100vh",
        height: "100dvh",
        width: "100vw",
      }}
    >
      <span className="sr-only">GrowthLens is loading. Continuous talent intelligence platform.</span>

      {/* Centerpiece Container */}
      <div className="relative w-[90vw] sm:w-[80vw] md:w-[68vw] lg:w-[56vw] max-w-[880px] aspect-[1040/260] flex items-center justify-center px-2">
        <svg
          viewBox="0 0 1040 260"
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Linear clip-path mask that smoothly sweeps across the 10 letters */}
            <clipPath id="growthlens-write-mask">
              <rect
                x="0"
                y="0"
                height="260"
                className={isReducedMotion ? "" : "growthlens-reveal-mask"}
                style={isReducedMotion ? { width: "100%" } : undefined}
              />
            </clipPath>

            {/* Subtle soft gradient definition for the pen flourish highlight */}
            <radialGradient id="gl-ambient-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#DFE968" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#DFE968" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group masked by progressive write-sweep to produce authentic handwriting revelation */}
          <g clipPath="url(#growthlens-write-mask)">
            {/* Ambient subtle blur shadow stroke behind authentic letterforms */}
            <path
              d={GROWTHLENS_COMBINED_PATH}
              fill="rgba(28, 28, 28, 0.08)"
              stroke="rgba(28, 28, 28, 0.08)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(0, 3)"
            />

            {/* Authentic Yellowtail Glyphs: Drawing with stroke-dashoffset + fill settle */}
            {GROWTHLENS_GLYPHS.map((glyph, idx) => (
              <path
                key={glyph.char + idx}
                d={glyph.d}
                fill="#1C1C1C"
                stroke="#1C1C1C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="growthlens-boot-outline"
                style={{
                  animationDelay: `${idx * 0.14}s`,
                }}
              />
            ))}
          </g>
        </svg>

        {/* Ambient warm radial glow behind the wordmark */}
        <div
          className="absolute inset-0 pointer-events-none -z-10 transition-opacity duration-1000 ease-out"
          style={{
            background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(223, 233, 104, 0.22), transparent 70%)",
            opacity: phase === "holding" || phase === "drawing" ? 1 : 0,
          }}
        />
      </div>

      {/* Refined baseline brand subtitle */}
      <div
        className={`absolute bottom-10 md:bottom-14 text-center tracking-[0.22em] uppercase text-[11px] md:text-[12px] font-semibold text-[#1C1C1C]/65 transition-opacity duration-700 ease-out ${
          phase === "holding" || phase === "drawing" ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="font-mono">CONTINUOUS TALENT INTELLIGENCE</span>
      </div>
    </aside>
  );
}
