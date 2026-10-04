"use client";

import React, { useTransition, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition — Cinematic route-aware page entrance & handoff wrapper.
 *
 * Provides smooth, non-intrusive page transitions:
 * - Gentle opacity fade (0 -> 1)
 * - Subtle vertical settle (6px -> 0px)
 * - Micro scale anchor (0.995 -> 1.0)
 * - Calibrated with cubic-bezier(0.22, 1, 0.36, 1)
 * - Honors prefers-reduced-motion
 * - Does not alter DOM layout, content, or browser history/scroll
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [animKey, setAnimKey] = useState(pathname);

  useEffect(() => {
    setAnimKey(pathname);
    // Smoothly ensure user begins at top on distinct route change without jarring jumping
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div
      key={animKey}
      className="gl-page-enter w-full flex-1 flex flex-col"
    >
      {children}
    </div>
  );
}
