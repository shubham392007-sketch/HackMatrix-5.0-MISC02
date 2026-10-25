"use client";

import React, { useEffect, useRef } from "react";

/**
 * SkillPassport Premium Interactive Floating Dotted Background
 * - Grid: 22px × 22px uniform square matrix spanning the entire viewport
 * - Base dot: 2.3px diameter (1.15px radius), rgba(35, 31, 28, 0.20) warm charcoal
 * - Floating interaction: 135px circular zone around the cursor
 * - Physics: Nearby dots gently lift and drift radially away with organic divergence (6–10px displacement)
 * - Motion: Frame-rate-independent exponential decay numerical simulation (~480–550ms return)
 * - Ambient accent: Subtle amber tint (#E6AC70) and gentle size scale (up to 1.85px radius)
 * - Performance: High-DPR canvas, pointer-events: none, zero-CPU idle sleep when resting
 * - Stacking: zIndex: 0 on top of the #F8F5EF base cream background and behind interactive page content (z >= 1)
 */
export default function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Check for accessibility reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Grid & particle physical parameters
    const GRID_SIZE = 22;
    const BASE_RADIUS = 1.15;
    const MAX_RADIUS = 1.85;
    const HOVER_RADIUS = 135;
    const HOVER_RADIUS_SQ = HOVER_RADIUS * HOVER_RADIUS;
    const MAX_DISP = 8.0; // 6–10px displacement range

    // Palette: Base Warm Charcoal #231F1C (35, 31, 28) and Brand Amber #E6AC70 (230, 172, 112)
    const BASE_R = 35;
    const BASE_G = 31;
    const BASE_B = 28;
    const BASE_ALPHA = 0.20;

    const AMBER_R = 230;
    const AMBER_G = 172;
    const AMBER_B = 112;
    const PEAK_ALPHA = 0.48;

    let mouseX = -9999;
    let mouseY = -9999;
    let targetMouseX = -9999;
    let targetMouseY = -9999;
    let isPointerOver = false;
    let isAnimating = false;
    let idleCounter = 0;
    let lastTime = performance.now();

    interface FloatingDot {
      originX: number;
      originY: number;
      dispX: number;
      dispY: number;
      targetDispX: number;
      targetDispY: number;
      angleVariance: number;
      currentRadius: number;
      targetRadius: number;
      amberWeight: number;
      targetAmberWeight: number;
      currentAlpha: number;
      targetAlpha: number;
    }

    let dots: FloatingDot[] = [];

    const initGrid = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots = [];
      const cols = Math.ceil(width / GRID_SIZE) + 1;
      const rows = Math.ceil(height / GRID_SIZE) + 1;

      const offsetX = (width % GRID_SIZE) / 2;
      const offsetY = (height % GRID_SIZE) / 2;

      for (let r = 0; r < rows; r++) {
        const dotY = Math.round(r * GRID_SIZE + offsetY);
        for (let c = 0; c < cols; c++) {
          const dotX = Math.round(c * GRID_SIZE + offsetX);
          // Deterministic organic angle variance so each particle drifts with subtle divergence
          const angleVariance = Math.sin(r * 12.9898 + c * 78.233) * 0.32;

          dots.push({
            originX: dotX,
            originY: dotY,
            dispX: 0,
            dispY: 0,
            targetDispX: 0,
            targetDispY: 0,
            angleVariance,
            currentRadius: BASE_RADIUS,
            targetRadius: BASE_RADIUS,
            amberWeight: 0,
            targetAmberWeight: 0,
            currentAlpha: BASE_ALPHA,
            targetAlpha: BASE_ALPHA,
          });
        }
      }

      draw(performance.now());
    };

    const draw = (currentTime: number) => {
      // Frame-rate independent delta time (clamped between 0.001s and 0.05s)
      const dt = Math.min(Math.max((currentTime - lastTime) / 1000, 0.001), 0.05);
      lastTime = currentTime;

      // Exponential decay blend factors (identical physics across 60Hz, 120Hz, 144Hz)
      const pointerBlend = 1 - Math.exp(-16 * dt);
      const dispBlend = 1 - Math.exp(-8.2 * dt); // ~480-550ms return duration
      const visualBlend = 1 - Math.exp(-9.0 * dt);

      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;

      // Smooth pointer tracking lerp
      if (isPointerOver && !prefersReducedMotion) {
        mouseX += (targetMouseX - mouseX) * pointerBlend;
        mouseY += (targetMouseY - mouseY) * pointerBlend;
      }

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        if (isPointerOver && !prefersReducedMotion) {
          const dx = dot.originX - mouseX;
          const dy = dot.originY - mouseY;
          const distSq = dx * dx + dy * dy;

          if (distSq < HOVER_RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            // Smooth cosine falloff (1.0 at epicenter -> 0.0 at 135px radius)
            const norm = dist / HOVER_RADIUS;
            const factor = 0.5 * (1 + Math.cos(norm * Math.PI));

            // Floating displacement: radial push away from cursor + organic swirl & subtle upward lift
            const baseAngle = Math.atan2(dy, dx);
            const totalAngle = baseAngle + dot.angleVariance * factor;
            const driftDistance = MAX_DISP * factor;

            // Subtle vertical buoyancy (-1.2px * factor) provides an organic floating sensation
            dot.targetDispX = Math.cos(totalAngle) * driftDistance;
            dot.targetDispY = Math.sin(totalAngle) * driftDistance - 1.2 * factor;

            dot.targetRadius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * factor;
            dot.targetAmberWeight = factor > 0.12 ? (factor - 0.12) / 0.88 : 0;
            dot.targetAlpha = BASE_ALPHA + (PEAK_ALPHA - BASE_ALPHA) * factor;
          } else {
            dot.targetDispX = 0;
            dot.targetDispY = 0;
            dot.targetRadius = BASE_RADIUS;
            dot.targetAmberWeight = 0;
            dot.targetAlpha = BASE_ALPHA;
          }
        } else {
          dot.targetDispX = 0;
          dot.targetDispY = 0;
          dot.targetRadius = BASE_RADIUS;
          dot.targetAmberWeight = 0;
          dot.targetAlpha = BASE_ALPHA;
        }

        // Fluid frame-rate-independent spring-lerp easing back to original coordinates
        const dX = dot.targetDispX - dot.dispX;
        if (Math.abs(dX) > 0.015) {
          dot.dispX += dX * dispBlend;
          activeParticles++;
        } else {
          dot.dispX = dot.targetDispX;
        }

        const dY = dot.targetDispY - dot.dispY;
        if (Math.abs(dY) > 0.015) {
          dot.dispY += dY * dispBlend;
          activeParticles++;
        } else {
          dot.dispY = dot.targetDispY;
        }

        // Radius interpolation
        const dR = dot.targetRadius - dot.currentRadius;
        if (Math.abs(dR) > 0.008) {
          dot.currentRadius += dR * visualBlend;
          activeParticles++;
        } else {
          dot.currentRadius = dot.targetRadius;
        }

        // Amber weight interpolation
        const dW = dot.targetAmberWeight - dot.amberWeight;
        if (Math.abs(dW) > 0.008) {
          dot.amberWeight += dW * visualBlend;
          activeParticles++;
        } else {
          dot.amberWeight = dot.targetAmberWeight;
        }

        // Alpha interpolation
        const dA = dot.targetAlpha - dot.currentAlpha;
        if (Math.abs(dA) > 0.004) {
          dot.currentAlpha += dA * visualBlend;
          activeParticles++;
        } else {
          dot.currentAlpha = dot.targetAlpha;
        }

        // Color blending between Charcoal Base and Brand Amber
        const w = dot.amberWeight;
        const r = Math.round(BASE_R + (AMBER_R - BASE_R) * w);
        const g = Math.round(BASE_G + (AMBER_G - BASE_G) * w);
        const b = Math.round(BASE_B + (AMBER_B - BASE_B) * w);
        const a = dot.currentAlpha;

        // Render particle at floating coordinates (origin + displacement)
        const renderX = dot.originX + dot.dispX;
        const renderY = dot.originY + dot.dispY;

        ctx.beginPath();
        ctx.arc(renderX, renderY, dot.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
        ctx.fill();
      }

      // Check whether to continue animation loop or sleep when idle
      if (activeParticles > 0 || isPointerOver) {
        idleCounter = 0;
        animationFrameId = requestAnimationFrame(draw);
      } else {
        idleCounter++;
        if (idleCounter < 12) {
          animationFrameId = requestAnimationFrame(draw);
        } else {
          isAnimating = false;
        }
      }
    };

    const triggerFrame = () => {
      if (!isAnimating && !prefersReducedMotion) {
        isAnimating = true;
        idleCounter = 0;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore touch gestures so mobile touch scrolling remains purely native
      if (e.pointerType === "touch") return;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (!isPointerOver) {
        isPointerOver = true;
        mouseX = targetMouseX;
        mouseY = targetMouseY;
      }
      triggerFrame();
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (!isPointerOver) {
        isPointerOver = true;
        mouseX = targetMouseX;
        mouseY = targetMouseY;
      }
      triggerFrame();
    };

    const handlePointerLeave = () => {
      isPointerOver = false;
      targetMouseX = -9999;
      targetMouseY = -9999;
      triggerFrame();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPointerOver = false;
        targetMouseX = -9999;
        targetMouseY = -9999;
      } else {
        triggerFrame();
      }
    };

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        initGrid();
      }, 100);
    };

    initGrid();

    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none select-none z-0"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "transparent",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
