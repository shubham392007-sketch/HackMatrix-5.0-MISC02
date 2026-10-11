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
 */
export default function SkillPassportBootScreen({
  onComplete,
  minDurationMs = 5200,
}: SkillPassportBootScreenProps) {
  const [phase, setPhase] = useState<"init" | "drawing" | "holding" | "fading" | "done">("init");
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Session storage check — only play once per browser session
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
      sessionStorage.setItem("skillpassport_boot_seen", "true");
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

  const viewBoxW = SKILLPASSPORT_VIEWBOX_WIDTH || 1244;

  return (
    <aside
      ref={containerRef}
      role="status"
      aria-live="polite"
      aria-label="SkillPassport Loading Screen"
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
      <span className="sr-only">SkillPassport Powered by GrowthLens is loading.</span>

      {/* Centerpiece Container */}
      <div className="relative w-[92vw] sm:w-[84vw] md:w-[72vw] lg:w-[60vw] max-w-[960px] flex flex-col items-center justify-center px-2">
        <svg
          viewBox={`0 0 ${viewBoxW} 260`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            {/* Linear clip-path mask that smoothly sweeps across the letters */}
            <clipPath id="skillpassport-write-mask">
              <rect
                x="0"
                y="0"
                height="260"
                className={isReducedMotion ? "" : "growthlens-reveal-mask"}
                style={isReducedMotion ? { width: "100%" } : undefined}
              />
            </clipPath>

            {/* Subtle soft gradient definition for the pen flourish highlight */}
            <radialGradient id="sp-ambient-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#DFE968" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#DFE968" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group masked by progressive write-sweep to produce authentic handwriting revelation */}
          <g clipPath="url(#skillpassport-write-mask)">
            {/* Ambient subtle blur shadow stroke behind authentic letterforms */}
            <path
              d={SKILLPASSPORT_COMBINED_PATH}
              fill="rgba(28, 28, 28, 0.08)"
              stroke="rgba(28, 28, 28, 0.08)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(0, 3)"
            />

            {/* Authentic Yellowtail Glyphs: Drawing with stroke-dashoffset + fill settle */}
            {SKILLPASSPORT_GLYPHS.map((glyph, idx) => (
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
                  animationDelay: `${idx * 0.11}s`,
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
              "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(223, 233, 104, 0.22), transparent 70%)",
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
          style={{ transitionDelay: "1.2s" }}
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
      >
        <span className="font-mono">VERIFIABLE SKILLS & EVIDENCE INTELLIGENCE</span>
      </div>
    </aside>
  );
}
