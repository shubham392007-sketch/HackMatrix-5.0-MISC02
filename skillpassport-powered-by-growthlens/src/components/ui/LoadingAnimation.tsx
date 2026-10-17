"use client";

import React, { useEffect, useRef } from "react";
import animationData from "@/data/loadingAnimation.json";

export interface LoadingAnimationProps {
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  width?: number | string;
  height?: number | string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

/**
 * Universal brand loading animation using the custom cursive "loading" vector stroke.
 * Renders dynamically via lottie-web in SVG mode with smooth loop playback.
 */
export default function LoadingAnimation({
  size = "md",
  width,
  height,
  className = "",
  loop = true,
  autoplay = true,
  speed = 1,
}: LoadingAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    let animInstance: any = null;

    // Dynamic import to guarantee complete Next.js SSR / hydration safety
    import("lottie-web").then((lottieModule) => {
      if (!isMounted || !containerRef.current) return;
      const lottie = lottieModule.default || lottieModule;

      try {
        animInstance = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay,
          animationData,
        });

        if (speed !== 1 && animInstance.setSpeed) {
          animInstance.setSpeed(speed);
        }
      } catch (err) {
        console.warn("Failed to load Lottie animation:", err);
      }
    });

    return () => {
      isMounted = false;
      if (animInstance) {
        try {
          animInstance.destroy();
        } catch {}
      }
    };
  }, [loop, autoplay, speed]);

  // Dimension presets maintaining the 1920:1080 (16:9) aspect ratio of the composition
  const sizePresets: Record<string, { width: string; height: string }> = {
    sm: { width: "160px", height: "90px" },
    md: { width: "240px", height: "135px" },
    lg: { width: "360px", height: "202px" },
    xl: { width: "480px", height: "270px" },
    custom: { width: typeof width === "number" ? `${width}px` : width || "240px", height: typeof height === "number" ? `${height}px` : height || "135px" },
  };

  const currentSize = sizePresets[size] || sizePresets.md;

  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : currentSize.width,
        height: height ? (typeof height === "number" ? `${height}px` : height) : currentSize.height,
      }}
      aria-label="Loading..."
    />
  );
}
