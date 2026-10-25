"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SPFooter() {
  return (
    <footer className="mt-20 border-t-2 border-[#1A1918] pt-16 pb-12 bg-[#FAF8F5] w-full relative z-10 shadow-[0_-4px_12px_rgba(26,25,24,0.04)]">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        {/* Top Section: Brand & Quick Action */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b-2 border-[#1A1918]/20">
          <div className="text-center md:text-left">
            <div className="inline-flex items-baseline font-bold text-[#1A1918] select-none tracking-tight text-5xl md:text-6xl">
              <span
                className="font-script text-[1.25em] font-normal leading-none -mr-0.5"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                Skill
              </span>
              <span className="font-sans font-bold tracking-tight">Passport</span>
              <span className="text-xl md:text-2xl font-serif italic text-[#1A1918]/80 ml-3 font-normal">
                by GrowthLens
              </span>
            </div>
            <p className="text-sm text-[#1A1918]/85 max-w-md mt-2 font-medium">
              Private, local-first document intelligence, evidence extraction and verifiable skill profiles powered by Qwen3 8B.
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
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 shadow-[2px_2px_0_0_#1A1918]"
            >
              OPEN PASSPORT <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Multi-Column Comprehensive Navigation Map */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-b border-[#1A1918]/20 text-left">
          {/* Column 1: Core Workspace */}
          <div>
            <h4 className="font-serif font-black text-sm tracking-wider text-[#1A1918] uppercase mb-4">
              Workspace & AI
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1A1918]/90">
              <li>
                <Link href="/" className="hover:text-[#1A1918] hover:underline">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/app/evidence/upload"
                  className="inline-flex items-center gap-1.5 text-[#1A1918] font-bold hover:underline"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#000000] border border-[#1A1918]"></span>
                  Passport Workspace
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-[#1A1918] hover:underline">
                  Features & Capabilities
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-[#1A1918] hover:underline">
                  How It Works (RAG Flow)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Product & Vision */}
          <div>
            <h4 className="font-serif font-black text-sm tracking-wider text-[#1A1918] uppercase mb-4">
              Product & Vision
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1A1918]/90">
              <li>
                <Link href="/about" className="hover:text-[#1A1918] hover:underline">
                  About SkillPassport
                </Link>
              </li>
              <li>
                <Link href="/features#evidence" className="hover:text-[#1A1918] hover:underline">
                  The Problem & Challenge
                </Link>
              </li>
              <li>
                <Link href="/growthlens" className="hover:text-[#1A1918] hover:underline">
                  Key Objectives
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-[#1A1918] hover:underline">
                  Technical Priorities
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Creator & Trust */}
          <div>
            <h4 className="font-serif font-black text-sm tracking-wider text-[#1A1918] uppercase mb-4">
              Creator & Trust
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1A1918]/90">
              <li>
                <Link href="/developers" className="hover:text-[#1A1918] hover:underline">
                  Developer Profile
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#1A1918] hover:underline">
                  Contact & Feedback
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#1A1918] hover:underline">
                  Privacy Policy (Local-First)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Local Tech Specs */}
          <div>
            <h4 className="font-serif font-black text-sm tracking-wider text-[#1A1918] uppercase mb-4">
              Local Architecture
            </h4>
            <div className="space-y-2.5 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]">
                <span className="font-black text-[#1A1918] block">LLM Engine:</span>
                <span className="text-[#1A1918]/80 font-medium">Qwen3 8B (via Ollama)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]">
                <span className="font-black text-[#1A1918] block">Hybrid Search:</span>
                <span className="text-[#1A1918]/80 font-medium">ChromaDB Dense + BM25 Sparse</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]">
                <span className="font-black text-[#1A1918] block">Neural Reranker:</span>
                <span className="text-[#1A1918]/80 font-medium">MiniLM Cross-Encoder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ecosystem Statement Ribbon */}
        <div className="py-6 my-2 flex flex-wrap items-center justify-around gap-6 md:gap-12 border-b border-[#1A1918]/20">
          <span className="font-serif italic text-lg md:text-2xl font-black tracking-widest text-[#1A1918]">
            LOCAL AI
          </span>
          <span className="font-sans font-black text-xs md:text-sm tracking-[0.25em] text-[#1A1918] uppercase">
            DOCUMENT RAG
          </span>
          <span className="font-serif text-lg md:text-2xl font-black tracking-wide text-[#1A1918]">
            PRIVATE BY DESIGN
          </span>
          <span className="font-sans font-black text-xs md:text-sm tracking-[0.2em] text-[#1A1918] uppercase">
            QWEN3 8B
          </span>
          <span className="font-serif italic text-base md:text-xl font-black text-[#1A1918]">
            OFFLINE READY
          </span>
        </div>

        {/* Bottom Copyright & Credit */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#1A1918]/80 gap-3">
          <p className="font-medium">
            © {new Date().getFullYear()} SkillPassport. Made by{" "}
            <Link href="/developers" className="underline font-bold text-[#1A1918] hover:text-[#000000]">
              Shubham Pokale
            </Link>
            . All processing stays 100% on your laptop.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#1A1918]/75">
            <span>Zero telemetry</span>
            <span>•</span>
            <span>Zero external API keys</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
