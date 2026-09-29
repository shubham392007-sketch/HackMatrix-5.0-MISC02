"use client";

import React from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import DeveloperCard from "@/components/developers/DeveloperCard";
import { DEVELOPERS } from "@/data/developers";
import {
  ArrowRight,
  Shield,
  Cpu,
  GitBranch,
  Sparkles,
  Code2,
  Terminal,
} from "lucide-react";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-1 w-full">
        {/* ── 3.1 HERO INTRODUCTION ────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-14 lg:pt-18 lg:pb-20 text-center">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[10px] sm:text-[11px] font-black tracking-[0.16em] uppercase shadow-[2px_2px_0px_#1C1C1C]">
              <span className="w-2 h-2 rounded-full bg-[#DFE968] border border-[#1C1C1C]" />
              <span>THE TEAM BEHIND GROWTHLENS</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1C1C1C]">
              Meet the{" "}
              <span
                className="font-normal text-[#1C1C1C] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                Developers
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl mx-auto">
              Four minds. One mission. Building a smarter way to understand talent, track growth, and turn evidence into meaningful development.
            </p>
          </div>
        </section>

        {/* ── 3.2 3D DEVELOPER CARDS GRID ──────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
            {DEVELOPERS.map((dev, index) => (
              <DeveloperCard key={dev.id} developer={dev} index={index} />
            ))}
          </div>
        </section>

        {/* ── EDITORIAL PHILOSOPHY QUOTE ──────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-8 sm:p-12 rounded-[36px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/30 shadow-[4px_4px_0px_#1C1C1C] text-center space-y-4">
            <blockquote
              className="text-2xl sm:text-3xl md:text-4xl leading-snug font-normal text-[#1C1C1C]"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              &ldquo;Engineering talent isn&apos;t proven by subjective annual reviews. It is forged through everyday craftsmanship.&rdquo;
            </blockquote>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#1C1C1C]/60">
              GROWTHLENS CORE ARCHITECTURE PHILOSOPHY
            </p>
          </div>
        </section>

        {/* ── TEAM COMPETENCY & CRAFT FOCUS ────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
              HOW WE BUILT IT
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1C1C1C]">
              Local-First AI & Modern Mathematical Modeling
            </h2>
            <p className="text-sm font-medium text-[#1C1C1C]/75 mt-2">
              Combining on-premise generative AI with rigorous parametric survival curves to eliminate bias from capability evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] shadow-[3px_3px_0px_#1C1C1C]">
              <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                <Cpu className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <h3 className="text-lg font-black mb-2 text-[#1C1C1C]">
                Local Qwen3 8B RAG Pipeline
              </h3>
              <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                Zero external cloud leaks. Pull requests and Jira stories are extracted, chunked, and synthesized completely inside Ollama and persistent ChromaDB collections.
              </p>
            </div>

            <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 shadow-[3px_3px_0px_#1C1C1C]">
              <div className="w-10 h-10 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                <GitBranch className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <h3 className="text-lg font-black mb-2 text-[#1C1C1C]">
                PyTorch LSTM Trajectories
              </h3>
              <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                A custom bidirectional LSTM model with attention evaluates momentum trends across Improving, Stagnating, and Declining competency states over real calendar quarters.
              </p>
            </div>

            <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#F6BB84]/30 shadow-[3px_3px_0px_#1C1C1C]">
              <div className="w-10 h-10 rounded-xl bg-[#F6BB84] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                <Shield className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <h3 className="text-lg font-black mb-2 text-[#1C1C1C]">
                Verifiable Grounding & Privacy
              </h3>
              <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                Strict multi-tenant cryptographic isolation. Team benchmarks and peer cohort insights are strictly k-anonymized and server-side authorized.
              </p>
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION ─────────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="p-8 sm:p-12 lg:p-16 rounded-[40px] border-[2px] border-[#1C1C1C] bg-[#FBF1CF] text-center shadow-[6px_6px_0px_#1C1C1C] space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1C1C1C] tracking-tight">
              Ready to explore your growth trajectory?
            </h2>
            <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/80 max-w-xl mx-auto">
              Inspect your verified evidence items, simulate future capability interventions, or review team skill distributions in real time.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/employee/dashboard"
                className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C]"
              >
                OPEN WORKSPACE
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#FBF6DF] transition-all shadow-[2px_2px_0px_#1C1C1C]"
              >
                LEARN METHODOLOGY
              </Link>
            </div>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
}
