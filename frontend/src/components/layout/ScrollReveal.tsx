"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "down" | "none";
}

/**
 * ScrollReveal — Viewport intersection observer component.
 *
 * Gently reveals sections, grids, cards, and data as the user scrolls down the page:
 * - 0% layout shift (preserves natural document flow)
 * - Fires once when entering viewport
 * - Respects prefers-reduced-motion
 * - Uses pure CSS classes for GPU acceleration
 */
export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Immediate display if prefers-reduced-motion is active
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const currentElem = elementRef.current;
    if (!currentElem) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(currentElem);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px", // Trigger slightly before reaching center
      }
    );

    observer.observe(currentElem);

    return () => {
      observer.disconnect();
    };
  }, []);

  const dirClass = direction === "up" ? "gl-reveal-up" : direction === "down" ? "gl-reveal-down" : "gl-reveal-fade";

  return (
    <div
      ref={elementRef}
      className={`gl-reveal-base ${dirClass} ${isVisible ? "gl-revealed" : ""} ${className}`}
      style={{
        transitionDelay: delayMs > 0 ? `${delayMs}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
