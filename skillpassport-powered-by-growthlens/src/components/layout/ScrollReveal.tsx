"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "down" | "none";
}

export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayMs > 0) {
            setTimeout(() => setRevealed(true), delayMs);
          } else {
            setRevealed(true);
          }
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "-40px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  const dirClass =
    direction === "up"
      ? "gl-reveal-up"
      : direction === "down"
      ? "gl-reveal-down"
      : "gl-reveal-fade";

  return (
    <div
      ref={ref}
      className={`gl-reveal-base ${dirClass} ${revealed ? "gl-revealed" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
