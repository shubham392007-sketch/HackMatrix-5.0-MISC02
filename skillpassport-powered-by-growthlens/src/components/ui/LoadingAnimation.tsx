"use client";

import React, { useId } from "react";

export interface LoadingAnimationProps {
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  width?: number | string;
  height?: number | string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

// Exact bezier curve coordinates tracing the signature cursive handwritten word "loading"
// with start flourish entering smoothly and tail flourish terminating neatly inside the container box boundaries.
const CURSIVE_LOADING_PATH =
  "M 450.00 620.00 C 470.00 620.00, 500.00 620.00, 522.67 620.00 C 571.52 606.26, 630.67 583.00, 654.00 543.00 C 677.33 503.00, 708.00 377.00, 676.67 377.00 C 639.33 377.00, 630.67 600.22, 679.33 601.00 C 710.67 601.50, 719.33 538.51, 737.80 538.51 C 739.33 538.51, 738.67 538.00, 738.67 538.00 C 738.67 538.00, 729.83 542.30, 729.83 541.49 C 711.33 556.00, 713.65 601.00, 743.33 601.00 C 786.00 601.00, 778.00 532.00, 759.33 532.00 C 742.00 532.00, 749.33 580.50, 782.67 580.50 C 810.00 580.50, 816.67 532.00, 840.67 532.00 C 860.00 532.00, 862.67 540.50, 862.67 540.50 C 862.67 540.50, 861.25 532.12, 841.08 532.12 C 814.41 532.12, 807.11 574.11, 812.00 586.50 C 817.33 600.00, 832.80 607.61, 848.67 585.00 C 855.33 575.50, 854.67 560.00, 854.67 560.00 C 854.67 560.00, 855.43 576.75, 860.00 588.00 C 869.33 611.00, 891.33 595.00, 898.67 583.50 C 904.47 574.39, 923.00 532.25, 942.33 532.25 C 942.33 532.12, 944.50 532.62, 944.50 532.62 C 944.50 532.62, 941.08 532.31, 941.08 532.38 C 938.58 532.53, 909.83 543.50, 909.83 575.00 C 909.83 590.50, 918.33 598.28, 925.69 598.28 C 942.00 598.28, 950.78 574.59, 951.33 573.75 C 965.67 552.25, 1007.33 395.50, 974.67 395.50 C 944.67 395.50, 944.67 540.50, 961.33 573.00 C 964.88 579.91, 972.00 597.75, 983.33 597.75 C 997.00 597.75, 1022.83 576.25, 1022.83 522.25 C 1022.83 505.38, 1011.33 604.00, 1037.67 604.00 C 1068.33 604.00, 1088.33 526.75, 1099.33 526.75 C 1110.33 526.75, 1101.00 596.75, 1105.33 596.75 C 1109.67 596.75, 1135.00 535.00, 1153.67 535.00 C 1169.00 535.00, 1149.67 601.00, 1171.33 601.00 C 1214.33 601.00, 1199.67 533.25, 1243.67 533.25 C 1254.67 533.25, 1263.00 542.25, 1263.00 542.25 C 1263.00 542.25, 1253.00 533.25, 1243.67 533.25 C 1211.00 533.25, 1193.25 588.76, 1224.33 598.75 C 1229.00 600.25, 1253.67 593.25, 1253.67 557.25 C 1253.67 543.25, 1252.67 687.40, 1252.67 724.50 C 1252.67 752.50, 1227.02 791.94, 1213.33 755.00 C 1206.67 737.00, 1220.00 678.00, 1242.67 651.50 C 1260.10 631.12, 1298.47 563.06, 1302.33 553.94 C 1315.00 553.00, 1340.00 552.00, 1350.00 552.00";

/**
 * Universal brand loading animation rendering the signature cursive "loading" vector stroke.
 * Renders natively via hardware-accelerated SVG with zero external dependencies,
 * ensuring instant display during SSR, streaming page loads, and client transitions.
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
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  const sizePresets: Record<string, { width: string; height: string }> = {
    sm: { width: "160px", height: "80px" },
    md: { width: "240px", height: "120px" },
    lg: { width: "340px", height: "170px" },
    xl: { width: "460px", height: "230px" },
    custom: {
      width: typeof width === "number" ? `${width}px` : width || "240px",
      height: typeof height === "number" ? `${height}px` : height || "120px",
    },
  };

  const currentSize = sizePresets[size] || sizePresets.md;
  const finalWidth = width ? (typeof width === "number" ? `${width}px` : width) : currentSize.width;
  const finalHeight = height ? (typeof height === "number" ? `${height}px` : height) : currentSize.height;

  const durationSec = (2.2 / (speed || 1)).toFixed(2);

  return (
    <div
      className={`inline-flex items-center justify-center pointer-events-none select-none overflow-hidden ${className}`}
      style={{
        width: finalWidth,
        height: finalHeight,
      }}
      aria-label="Loading..."
      role="progressbar"
    >
      <svg
        viewBox="420 330 960 450"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-hidden"
        style={{ overflow: "hidden" }}
      >
        <defs>
          <linearGradient id={`loader-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FB8282" />
            <stop offset="50%" stopColor="#FB7CAA" />
            <stop offset="100%" stopColor="#FB76D1" />
          </linearGradient>
          <style>{`
            @keyframes cursive-draw-${safeId} {
              0% {
                stroke-dashoffset: 3400;
                opacity: 0.95;
              }
              46% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
              72% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
              100% {
                stroke-dashoffset: -3400;
                opacity: 0.9;
              }
            }
            .cursive-stroke-${safeId} {
              stroke-dasharray: 3400;
              stroke-dashoffset: 3400;
              animation: cursive-draw-${safeId} ${durationSec}s cubic-bezier(0.45, 0, 0.25, 1) ${
                loop ? "infinite" : "1"
              };
              animation-play-state: ${autoplay ? "running" : "paused"};
              animation-fill-mode: ${loop ? "none" : "forwards"};
            }
            @media (prefers-reduced-motion: reduce) {
              .cursive-stroke-${safeId} {
                animation: none;
                stroke-dashoffset: 0;
              }
            }
          `}</style>
        </defs>

        <path
          d={CURSIVE_LOADING_PATH}
          fill="none"
          stroke={`url(#loader-grad-${safeId})`}
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="3400"
          className={`cursive-stroke-${safeId}`}
        />
      </svg>
    </div>
  );
}
