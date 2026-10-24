"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function InteractiveDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.removeAttribute("data-theme");
      try { localStorage.removeItem("sp-theme"); } catch {}
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Grid spacing & sizing (slightly larger architectural drafting matrix)
    const GRID_SIZE = 28;
    const BASE_RADIUS = 2.0;
    const MAX_RADIUS = 4.4;
    const HOVER_RADIUS = 150;

    let mouseX = -9999;
    let mouseY = -9999;
    let targetMouseX = -9999;
    let targetMouseY = -9999;
    let isMouseOver = false;
    let isAnimating = false;
    let idleCounter = 0;

    interface Dot {
      x: number;
      y: number;
      currentRadius: number;
      targetRadius: number;
      intensity: number;
    }

    let dots: Dot[] = [];

    // Check if sidebar is present on desktop (256px width on /app/ routes)
    const getSidebarWidth = () => {
      const isDesktop = window.innerWidth >= 1024;
      const isAppRoute = pathname?.startsWith("/app");
      return isDesktop && isAppRoute ? 256 : 0;
    };

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
      const sidebarW = getSidebarWidth();
      const startX = sidebarW > 0 ? sidebarW + 8 : 0;
      const usableWidth = width - startX;

      const cols = Math.ceil(usableWidth / GRID_SIZE) + 1;
      const rows = Math.ceil(height / GRID_SIZE) + 1;

      const offsetX = startX + (usableWidth % GRID_SIZE) / 2;
      const offsetY = (height % GRID_SIZE) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dotX = Math.round(c * GRID_SIZE + offsetX);
          // Strictly exclude dots that fall into the sidebar region
          if (dotX < sidebarW) continue;

          dots.push({
            x: dotX,
            y: Math.round(r * GRID_SIZE + offsetY),
            currentRadius: BASE_RADIUS,
            targetRadius: BASE_RADIUS,
            intensity: 0,
          });
        }
      }

      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const sidebarW = getSidebarWidth();

      // Permanent Executive Press Palette: base ink #1A1918, hover highlight Pitch Black #000000
      const baseR = 26;
      const baseG = 25;
      const baseB = 24;

      const highlightR = 0;
      const highlightG = 0;
      const highlightB = 0;

      let animatingDotsCount = 0;

      // Cursor smoothing
      mouseX += (targetMouseX - mouseX) * 0.22;
      mouseY += (targetMouseY - mouseY) * 0.22;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Never draw on sidebar area
        if (sidebarW > 0 && dot.x < sidebarW) continue;

        if (isMouseOver && mouseX >= sidebarW) {
          const dx = mouseX - dot.x;
          const dy = mouseY - dot.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < HOVER_RADIUS * HOVER_RADIUS) {
            const dist = Math.sqrt(distSq);
            const factor = Math.pow(1 - dist / HOVER_RADIUS, 1.8);
            dot.targetRadius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * factor;
            dot.intensity = factor;
          } else {
            dot.targetRadius = BASE_RADIUS;
            dot.intensity = 0;
          }
        } else {
          dot.targetRadius = BASE_RADIUS;
          dot.intensity = 0;
        }

        // Spring easing toward target radius
        const delta = dot.targetRadius - dot.currentRadius;
        if (Math.abs(delta) > 0.02) {
          dot.currentRadius += delta * 0.18;
          animatingDotsCount++;
        } else {
          dot.currentRadius = dot.targetRadius;
        }

        const intensity = dot.intensity;
        const currentR = Math.round(baseR + (highlightR - baseR) * intensity);
        const currentG = Math.round(baseG + (highlightG - baseG) * intensity);
        const currentB = Math.round(baseB + (highlightB - baseB) * intensity);
        const currentAlpha = 0.11 + intensity * 0.42;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${currentR}, ${currentG}, ${currentB}, ${currentAlpha})`;
        ctx.fill();
      }

      if (animatingDotsCount > 0 || isMouseOver) {
        idleCounter = 0;
        animationFrameId = requestAnimationFrame(draw);
      } else {
        idleCounter++;
        if (idleCounter < 20) {
          animationFrameId = requestAnimationFrame(draw);
        } else {
          isAnimating = false;
        }
      }
    };

    const triggerFrame = () => {
      if (!isAnimating) {
        isAnimating = true;
        idleCounter = 0;
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (!isMouseOver) {
        isMouseOver = true;
        mouseX = targetMouseX;
        mouseY = targetMouseY;
      }
      triggerFrame();
    };

    const handlePointerLeave = () => {
      isMouseOver = false;
      targetMouseX = -9999;
      targetMouseY = -9999;
      triggerFrame();
    };

    initGrid();

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("resize", initGrid, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("resize", initGrid);
    };
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 select-none"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
