"use client";

import React, { useRef, useState, useEffect } from "react";

interface Hero3DCardProps {
  initialRotate?: number; // e.g. -3, -2, 2, 4
  className?: string;
  children: React.ReactNode;
}

export default function Hero3DCard({
  initialRotate = 0,
  className = "",
  children,
}: Hero3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Smooth responsive 3D tilt tracking cursor
    const rX = Number(((y - 0.5) * -18).toFixed(2));
    const rY = Number(((x - 0.5) * 18).toFixed(2));

    setRotateX(rX);
    setRotateY(rY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  // When not hovered, the card rests at its initial decorative tilt (e.g. -3, -2, +2, +4 deg).
  // When hovered, it transitions to active 3D tilt with Z elevation and cursor tracking.
  const transformStyle = isReducedMotion
    ? undefined
    : isHovered
    ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(0deg) translateY(-8px) translateZ(16px)`
    : `perspective(1000px) rotateX(0deg) rotateY(0deg) rotateZ(${initialRotate}deg) translateY(0px) translateZ(0px)`;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hero-3d-container perspective-container preserve-3d w-full"
      style={{ perspective: "1000px" }}
    >
      <div
        className={`hero-3d-card p-6 md:p-7 transition-all duration-400 ease-out will-change-transform ${className}`}
        style={{
          transform: transformStyle,
          boxShadow: isHovered && !isReducedMotion
            ? "rgba(28, 28, 28, 0.35) 16px 24px 28px -6px, 8px 10px 0px #1C1C1C"
            : "4px 4px 0px #1C1C1C",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Content layer lifts subtly upward on hover but stays within card bounds */}
        <div
          className="hero-3d-content transition-transform duration-400 ease-out"
          style={{
            transform: isHovered && !isReducedMotion
              ? "translateY(-3px)"
              : "translateY(0px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
