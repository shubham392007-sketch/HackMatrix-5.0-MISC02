"use client";

import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import {
  ArrowRight,
  FileCode,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Search,
  Activity,
  Layers,
  Cpu,
  Brain,
  Sliders,
  Users,
  Compass,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION (Matching Pedyssey 3-Column Layout) ─────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 lg:pt-14 lg:pb-28 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: 2 Cards (Top Left -3°, Bottom Left -2°) */}
            <div className="lg:col-span-3 flex flex-col gap-6 lg:gap-8 order-2 lg:order-1">
              {/* Card 1: Top Left (-3° tilt) */}
              <div className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[4px_4px_0px_#1C1C1C] transform lg:-rotate-3 transition-transform hover:rotate-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/50">-3°</span>
                  <div className="w-7 h-7 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <FileCode className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#DFE968] border border-[#1C1C1C] uppercase tracking-wider">
                    EVIDENCE
                  </span>
                  <span className="text-xs font-extrabold truncate">PR #142: worker_queue.py</span>
                </div>
                <p className="text-[11px] font-medium text-[#1C1C1C]/70 mb-3">
                  Maya Sharma • 42 commits indexed
                </p>
                <div className="inline-block px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[9px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C]">
                  VERIFIED TALENT SIGNAL
                </div>
              </div>

              {/* Card 3: Bottom Left (-2° tilt) */}
              <div className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[4px_4px_0px_#1C1C1C] transform lg:-rotate-2 transition-transform hover:rotate-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/50">-2°</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[9px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C]">
                    <Search className="w-3 h-3" />
                    TALENT PIPELINE
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-2">
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/70">GIT / JIRA</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/70">TAXONOMY</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/70">WEIBULL</span>
                </div>
                <div className="flex items-center justify-between gap-1 text-[10px] font-black">
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-[#DFE968]">QWEN3 8B</span>
                  <span>→</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/70">JUSTIFY</span>
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: Hero Headline, Description & CTAs */}
            <div className="lg:col-span-6 text-center space-y-5 order-1 lg:order-2 px-2 flex flex-col items-center">
              <h2
                className="text-[#1C1C1C] select-none tracking-tight leading-[1.05] mb-2 sm:mb-4 drop-shadow-sm font-normal whitespace-nowrap"
                style={{
                  fontFamily: "'Yellowtail', cursive",
                  fontSize: "clamp(3.75rem, 7.5vw, 6.75rem)",
                }}
              >
                GrowthLens
              </h2>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#1C1C1C]">
                Understand every{" "}
                <span
                  className="font-normal inline-block transform -rotate-1 text-[#1C1C1C]"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  trajectory.
                </span>{" "}
                Ask anything. Get insights that{" "}
                <span
                  className="font-normal inline-block transform rotate-1 text-[#1C1C1C]"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  matter.
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg font-medium text-[#1C1C1C]/85 max-w-xl mx-auto leading-relaxed">
                GrowthLens turns git commits, Jira tickets and workplace signals into an intelligent, continuous talent workspace using local{" "}
                <strong className="font-bold text-[#1C1C1C]">Qwen3 8B</strong> and hybrid{" "}
                <strong className="font-bold text-[#1C1C1C]">vector + Weibull retention</strong> modeling.
              </p>

              {/* Dual CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/employee/dashboard"
                  className="bg-[#F6BB84] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs md:text-sm font-bold tracking-[0.08em] uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:opacity-95 transition-all shadow-[3px_3px_0px_#1C1C1C] hover:translate-y-[-1px]"
                >
                  LAUNCH GROWTHLENS
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs md:text-sm font-bold tracking-[0.08em] uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#1C1C1C]/5 transition-all shadow-[2px_2px_0px_#1C1C1C]"
                >
                  EXPLORE ALL FEATURES →
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: 2 Cards (Top Right +2°, Bottom Right +4°) */}
            <div className="lg:col-span-3 flex flex-col gap-6 lg:gap-8 order-3">
              {/* Card 2: Top Right (+2° tilt) */}
              <div className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[4px_4px_0px_#1C1C1C] transform lg:rotate-2 transition-transform hover:rotate-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                    <span className="text-[10px] font-extrabold tracking-wider uppercase">
                      TALENT INSIGHT
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#DFE968] border border-[#1C1C1C]">
                      GROUNDED
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/50">+2°</span>
                  </div>
                </div>
                <p className="text-[9px] font-bold uppercase text-[#1C1C1C]/50">QUERY:</p>
                <p className="text-xs font-semibold italic text-[#1C1C1C] mb-2">
                  &ldquo;What is Maya Sharma&apos;s retention risk?&rdquo;
                </p>
                <p className="text-[9px] font-bold uppercase text-[#1C1C1C]/50">PREDICTED TRAJECTORY:</p>
                <p className="text-xs font-medium text-[#1C1C1C]/90 mb-3 leading-snug">
                  &ldquo;Distributed Systems half-life is 114 days. 18% decay risk over 90d. Recommend peer mentorship.&rdquo;
                </p>
                <div className="flex items-center gap-1 text-[9px] font-bold">
                  <span className="text-[#1C1C1C]/50">CITATIONS:</span>
                  <span className="px-1.5 py-0.5 rounded border border-[#1C1C1C] bg-white/70">PR #142</span>
                  <span className="px-1.5 py-0.5 rounded border border-[#1C1C1C] bg-white/70">Jira GL-89</span>
                  <span className="px-1.5 py-0.5 rounded border border-[#1C1C1C] bg-white/70">Git #31</span>
                </div>
              </div>

              {/* Card 4: Bottom Right (+4° tilt) */}
              <div className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[4px_4px_0px_#1C1C1C] transform lg:rotate-4 transition-transform hover:rotate-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[9px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    LOCAL TALENT AI
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/50">+4°</span>
                </div>
                <p className="text-xs font-extrabold text-[#1C1C1C] mb-1">
                  QWEN3 8B • OLLAMA
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A7A4E] mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#4A7A4E] animate-pulse"></span>
                  100% PRIVATE TALENT MODEL
                </div>
                <p className="text-[10px] font-semibold text-[#1C1C1C]/60 leading-tight">
                  Weibull Hazard Decay • 4-Factor Confidence Scoring
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 2: EVIDENCE DECOMPOSITION (Matching Pedyssey Image 2) ── */}
        <section id="features" className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 border-t border-[#1C1C1C]/15">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-extrabold tracking-[0.15em] uppercase mb-4 shadow-[2px_2px_0px_#1C1C1C]">
              EVIDENCE DECOMPOSITION
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">
              Your Evidence is more than{" "}
              <span
                className="font-normal"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                signals.
              </span>
            </h2>
            <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto mt-3">
              GrowthLens transforms raw workplace activities into a dynamic vector graph of verifiable competencies, survival curves, and cross-source evidence.
            </p>
          </div>

          {/* Large Rounded Container with 4 Horizontal Process Cards */}
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[32px] p-6 md:p-8 shadow-[4px_4px_0px_#1C1C1C]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1 */}
              <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                      01 INPUT
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold mb-2">
                    Raw Multi-Source Signals
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Full git commit diffs, PR comments, and Jira story resolutions without dropping author context or timestamps.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                      02 CHUNK & MAP
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#FBF6DF] border border-[#1C1C1C] flex items-center justify-center">
                      <Layers className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold mb-2">
                    Taxonomy-Aware Chunks
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Work activities mapped against 28 validated competencies with 4-factor confidence scoring algorithms.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-[#F6C8D6]/60 border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                      03 RERANK & SURVIVE
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                      <Activity className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold mb-2">
                    Weibull Survival Risk
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Parametric hazard modeling isolates top competencies at risk of decay across 30, 60, 90, and 180 day horizons.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-[#DFE968]/70 border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                      04 SYNTHESIS
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#1C1C1C] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                  </div>
                  <h3 className="text-base font-extrabold mb-2">
                    Grounded Growth Actions
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Synthesized by local Qwen3 8B strictly from cited evidence with counterfactual what-if simulation & peer mentorship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: 3x3 ARCHITECTURE GRID (Matching Pedyssey Images 4 & 5) ── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 border-t border-[#1C1C1C]/15">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.15em] uppercase mb-4 shadow-[2px_2px_0px_#1C1C1C]">
              FULL ARCHITECTURE
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">
              Features built for{" "}
              <span
                className="font-normal"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                growth.
              </span>
            </h2>
            <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto mt-3">
              Every tool, algorithm, and interface in GrowthLens was engineered to make complex talent understanding instant, accurate, and completely verifiable.
            </p>
          </div>

          {/* 3x3 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <FileCode className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    GITHUB + JIRA INGESTION
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Evidence Intelligence & Parsing
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Deep extraction parsing commits, PR reviews, Jira tickets, and peer feedback into structured evidence objects without loss of context.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    100% ON-DEVICE
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Local Edge Execution
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  All calculations, embeddings, indexes, and LLM inference run strictly on your local hardware. Zero telemetry. Zero data leakage.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F3A878] border border-[#1C1C1C] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    CHROMA + VECTOR RAG
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Hybrid Evidence Retrieval
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Combines dense semantic vector search with keyword matching across evidence items for high-precision justification queries.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    WEIBULL SURVIVAL
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Competency Trajectory & Decay
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Evaluates skill retention half-life, decay probability curves, and trend confidence from 28 engineered trajectory features.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <Sliders className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    COUNTERFACTUAL SIM
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  What-If Learning Path Simulator
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Simulate future skill retention when completing a project, assessment, or course with instant risk delta calculation.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F3A878] border border-[#1C1C1C] flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    QWEN3 8B VIA OLLAMA
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Growth Narrative & Justification
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Synthesizes holistic growth narratives, manager briefings, and evidence justifications with exact source attribution.
                </p>
              </div>
            </div>

            {/* Card 7 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    PRIVACY-SAFE BENCHMARK
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Peer Velocity Benchmarking
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Anonymized cohort percentiles showing skill velocity against peers who started at similar baseline competency levels.
                </p>
              </div>
            </div>

            {/* Card 8 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <Compass className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    YOUTUBE + MENTORS
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Growth Action Engine
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Real YouTube micro-learning videos and automatic peer mentorship matching when competency retention drops.
                </p>
              </div>
            </div>

            {/* Card 9 */}
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F3A878] border border-[#1C1C1C] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    TEAM SKILL MATRIX
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">
                  Team Heatmap & Pattern Insights
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Manager overview revealing collective blind spots, improving vs declining skill distribution, and strategic reskilling needs.
                </p>
              </div>
            </div>
          </div>

          {/* Deep Dive Action Banner */}
          <div className="mt-14 text-center flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/features"
              className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C]"
            >
              DEEP DIVE THE 4 CORE ENGINES
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#FBF6DF] transition-all shadow-[2px_2px_0px_#1C1C1C]"
            >
              READ OUR MANIFESTO
            </Link>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
}
