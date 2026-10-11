"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, Sparkles } from "lucide-react";

export default function SPFooter() {
  return (
    <footer className="w-full border-t-[1.5px] border-[#1C1C1C] bg-[#FBF1CF]/60 pt-16 pb-12 px-6 md:px-12 mt-auto">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Header Row with Wordmark */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-[#1C1C1C]/15">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-baseline gap-3">
              <span
                className="text-4xl sm:text-5xl md:text-6xl text-[#1C1C1C] leading-none"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                SkillPassport
              </span>
              <span
                className="text-2xl sm:text-3xl text-[#1C1C1C] opacity-90"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                by GrowthLens
              </span>
            </div>
            <p className="text-sm font-medium text-[#1C1C1C]/80 leading-relaxed">
              An evidence-first capability record connecting real engineering work, documents, and code into an inspectable profile with verified competence and targeted growth pathways.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/#how-it-works"
              className="pill-btn pill-btn-secondary text-xs"
            >
              HOW IT WORKS
            </Link>
            <Link
              href="/signup"
              className="pill-btn pill-btn-primary text-xs"
            >
              CREATE PASSPORT <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4-Column Editorial Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-b border-[#1C1C1C]/15 text-xs">
          {/* Column 1: Core Navigation */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1C1C1C]/60">
              EXPLORE
            </h4>
            <ul className="space-y-2 font-bold">
              <li>
                <Link href="/" className="hover:underline">Home Overview</Link>
              </li>
              <li>
                <Link href="/features" className="hover:underline">4 Core Capabilities</Link>
              </li>
              <li>
                <Link href="/growthlens" className="hover:underline">GrowthLens Parent Platform</Link>
              </li>
              <li>
                <Link href="/about" className="hover:underline">About & Manifesto</Link>
              </li>
              <li>
                <Link href="/developers" className="hover:underline">Developers & Architecture</Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Capabilities */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1C1C1C]/60">
              CAPABILITIES
            </h4>
            <ul className="space-y-2 font-bold">
              <li>
                <Link href="/features#evidence" className="hover:underline">Evidence Intelligence</Link>
              </li>
              <li>
                <Link href="/features#profile" className="hover:underline">Verified Skill Profile</Link>
              </li>
              <li>
                <Link href="/features#matching" className="hover:underline">Role Matching & Gaps</Link>
              </li>
              <li>
                <Link href="/features#learning" className="hover:underline">Personalized Learning</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Privacy */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1C1C1C]/60">
              TRUST & FOUNDATION
            </h4>
            <div className="space-y-2 text-[#1C1C1C]/80 font-medium">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-wider uppercase shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1C1C1C]" />
                TRACEABLE PROOF
              </div>
              <p className="text-[11px] leading-relaxed pt-1">
                Every skill claim is tied directly to source artifacts. No unverifiable resume assertions.
              </p>
            </div>
          </div>

          {/* Column 4: Architectural Integration */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1C1C1C]/60">
              POWERED BY GROWTHLENS
            </h4>
            <p className="text-[11px] leading-relaxed font-medium text-[#1C1C1C]/80">
              SkillPassport uses GrowthLens&apos;s continuous talent modeling, Weibull decay analysis, and local-first AI architecture.
            </p>
            <div className="pt-1">
              <Link
                href="/developers"
                className="text-[10px] font-black uppercase tracking-wider underline hover:text-[#4A7A4E]"
              >
                VIEW ARCHITECTURAL SPEC →
              </Link>
            </div>
          </div>
        </div>

        {/* Marquee Banner */}
        <div className="py-4 overflow-hidden border-b border-[#1C1C1C]/15 select-none">
          <div className="flex items-center justify-between text-[10px] font-black tracking-[0.2em] uppercase text-[#1C1C1C]/60 flex-wrap gap-4">
            <span>EVIDENCE OVER ASSERTION</span>
            <span>•</span>
            <span>AUDITABLE PROOF</span>
            <span>•</span>
            <span>ROLE GAP ANALYSIS</span>
            <span>•</span>
            <span>STRUCTURED LEARNING</span>
            <span>•</span>
            <span>GROWTHLENS ENGINE</span>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-[#1C1C1C]/70">
          <div>
            © {new Date().getFullYear()} SkillPassport Powered by GrowthLens. Built for transparent, verifiable capability demonstration.
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
            <span>Prototype Phase</span>
            <span>•</span>
            <span>Zero Telemetry</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
