"use client";

import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import SPFooter from "@/components/layout/SPFooter";
import Hero3DCard from "@/components/ui/Hero3DCard";
import ScrollReveal from "@/components/layout/ScrollReveal";
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
import { useEvidence } from "@/context/EvidenceContext";

export default function LandingPage() {
  const { isAuthenticated, logoutDemo } = useEvidence();
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION (Matching Exact Pedyssey 3-Column Layout with SkillPassport Content) ── */}
        <section className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 lg:pt-14 lg:pb-28 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* LEFT COLUMN: 2 Cards (Top Left -3°, Bottom Left -2°) */}
            <div className="lg:col-span-3 flex flex-col gap-6 lg:gap-8 order-2 lg:order-1">
              {/* Card 1: Top Left (-3° tilt) */}
              <Hero3DCard initialRotate={-3}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/50">-3°</span>
                  <div className="w-8 h-8 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[1px_1px_0px_#1C1C1C]">
                    <FileCode className="w-4.5 h-4.5 text-[#1C1C1C]" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#DFE968] border border-[#1C1C1C] uppercase tracking-wider hero-3d-pop">
                    EVIDENCE
                  </span>
                  <span className="text-sm font-extrabold truncate">PR #204: redis_pubsub.py</span>
                </div>
                <p className="text-xs font-medium text-[#1C1C1C]/70 mb-4">
                  Contributor • 14 commits verified
                </p>
                <div className="inline-block px-3 py-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[10px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C] hero-3d-pop">
                  VERIFIED CAPABILITY SIGNAL
                </div>
              </Hero3DCard>

              {/* Card 3: Bottom Left (-2° tilt) */}
              <Hero3DCard initialRotate={-2}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/50">-2°</span>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C] hero-3d-pop">
                    <Search className="w-3.5 h-3.5" />
                    PASSPORT PIPELINE
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5 text-[11px] font-black mb-3">
                  <span className="px-2.5 py-1.5 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop">WORK &amp; CODE</span>
                  <span>→</span>
                  <span className="px-2.5 py-1.5 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop">EVIDENCE</span>
                  <span>→</span>
                  <span className="px-2.5 py-1.5 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop">TAXONOMY</span>
                </div>
                <div className="flex items-center justify-between gap-1.5 text-[11px] font-black">
                  <span className="px-2.5 py-1.5 rounded border border-[#1C1C1C] bg-[#DFE968] hero-3d-pop">ROLE GAP</span>
                  <span>→</span>
                  <span className="px-2.5 py-1.5 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop">GROWTH</span>
                </div>
              </Hero3DCard>
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
                SkillPassport
              </h2>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#1C1C1C]">
                Your skills deserve more than a{" "}
                <span
                  className="font-normal inline-block transform -rotate-1 text-[#1C1C1C]"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  list.
                </span>{" "}
                Back them with{" "}
                <span
                  className="font-normal inline-block transform rotate-1 text-[#1C1C1C]"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  proof.
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg font-medium text-[#1C1C1C]/85 max-w-xl mx-auto leading-relaxed">
                SkillPassport turns git commits, project specs, and documents into an inspectable, evidence-backed capability passport powered by{" "}
                <strong className="font-bold text-[#1C1C1C]">GrowthLens</strong> intelligence and verifiable proof graphs.
              </p>

              {/* Dual CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href={isAuthenticated ? "/app/evidence" : "/login?redirect=/app/onboarding"}
                  className="bg-[#F6BB84] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs md:text-sm font-bold tracking-[0.08em] uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:opacity-95 transition-all shadow-[3px_3px_0px_#1C1C1C] hover:translate-y-[-1px]"
                >
                  ENTER EVIDENCE CENTER
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {isAuthenticated ? (
                  <button
                    onClick={logoutDemo}
                    className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs md:text-sm font-bold tracking-[0.08em] uppercase px-6 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#1C1C1C]/5 transition-all shadow-[2px_2px_0px_#1C1C1C]"
                  >
                    SIGN OUT / SWITCH DEMO
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/app/onboarding"
                    className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs md:text-sm font-bold tracking-[0.08em] uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#1C1C1C]/5 transition-all shadow-[2px_2px_0px_#1C1C1C]"
                  >
                    DEMO SIGN IN →
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: 2 Cards (Top Right +2°, Bottom Right +4°) */}
            <div className="lg:col-span-3 flex flex-col gap-6 lg:gap-8 order-3">
              {/* Card 2: Top Right (+2° tilt) */}
              <Hero3DCard initialRotate={2}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                    <span className="text-[11px] font-extrabold tracking-wider uppercase">
                      CANDIDATE CLAIM
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C] hero-3d-pop shadow-[1px_1px_0px_#1C1C1C]">
                      PROVEN
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/50">+2°</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase text-[#1C1C1C]/50">COMPETENCY:</p>
                <p className="text-sm font-semibold italic text-[#1C1C1C] mb-2.5">
                  &ldquo;Distributed Systems Architecture&rdquo;
                </p>
                <p className="text-[10px] font-bold uppercase text-[#1C1C1C]/50">EVIDENCE VERIFICATION:</p>
                <p className="text-xs font-medium text-[#1C1C1C]/90 mb-4 leading-snug">
                  &ldquo;14 commits, 3 PR approvals, 1 RFC doc. 94% confidence. Match for Staff Engineer.&rdquo;
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="text-[#1C1C1C]/50">CITATIONS:</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop shadow-[1px_1px_0px_#1C1C1C]">PR #204</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop shadow-[1px_1px_0px_#1C1C1C]">RFC-09</span>
                  <span className="px-2 py-1 rounded border border-[#1C1C1C] bg-white/80 hero-3d-pop shadow-[1px_1px_0px_#1C1C1C]">Git #88</span>
                </div>
              </Hero3DCard>

              {/* Card 4: Bottom Right (+4° tilt) */}
              <Hero3DCard initialRotate={4}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-extrabold tracking-wider uppercase shadow-[1px_1px_0px_#1C1C1C] hero-3d-pop">
                    <ShieldCheck className="w-4 h-4" />
                    VERIFIED PASSPORT
                  </div>
                  <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/50">+4°</span>
                </div>
                <p className="text-sm font-extrabold text-[#1C1C1C] mb-1.5">
                  AUDITABLE PROOF GRAPH
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-[#4A7A4E] mb-3 hero-3d-pop">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4A7A4E] animate-pulse"></span>
                  ZERO UNSUPPORTED CLAIMS
                </div>
                <p className="text-[11px] font-semibold text-[#1C1C1C]/60 leading-tight">
                  Canonical Taxonomy • Objective Verification Guard
                </p>
              </Hero3DCard>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: EVIDENCE DECOMPOSITION ────────────────────────── */}
        <section id="how-it-works" className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 border-t border-[#1C1C1C]/15">
          <ScrollReveal direction="up">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-extrabold tracking-[0.15em] uppercase mb-4 shadow-[2px_2px_0px_#1C1C1C]">
                LIFECYCLE &amp; DECOMPOSITION
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">
                Your work is more than{" "}
                <span
                  className="font-normal"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  bullet points.
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto mt-3">
                SkillPassport systematically transforms day-to-day engineering artifacts into an inspectable graph of verified competencies and growth opportunities.
              </p>
            </div>
          </ScrollReveal>

          {/* 4 Process Cards */}
          <ScrollReveal direction="up" delayMs={100}>
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[32px] p-6 md:p-8 shadow-[4px_4px_0px_#1C1C1C]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                        01 COLLECT
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                        <GitBranch className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold mb-2">Raw Work Ingestion</h3>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                      Commits, pull request reviews, project documents, and certificates without loss of author context or timestamps.
                    </p>
                  </div>
                </div>

                <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                        02 EXTRACT
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#FBF6DF] border border-[#1C1C1C] flex items-center justify-center">
                        <Layers className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold mb-2">Candidate Skills</h3>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                      Maps artifacts against canonical skills, preserving exact citations and distinguishing claims from proven work.
                    </p>
                  </div>
                </div>

                <div className="bg-[#F6C8D6]/60 border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                        03 VERIFY
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold mb-2">Verification Guard</h3>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                      Claims without sufficient evidence are flagged as candidate or insufficient, never prematurely verified.
                    </p>
                  </div>
                </div>

                <div className="bg-[#DFE968]/70 border border-[#1C1C1C] rounded-2xl p-5 flex flex-col justify-between shadow-[2px_2px_0px_#1C1C1C]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#1C1C1C]/60">
                        04 ACTION
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#1C1C1C] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold mb-2">Role Alignment &amp; Growth</h3>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                      Actionable roadmaps, practice projects, and targeted resources to bridge verified capability gaps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 3: 3x3 ARCHITECTURE GRID ────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 border-t border-[#1C1C1C]/15">
          <ScrollReveal direction="up">
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.15em] uppercase mb-4 shadow-[2px_2px_0px_#1C1C1C]">
                FULL SUITE
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight">
                Capabilities built for{" "}
                <span
                  className="font-normal"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  merit.
                </span>
              </h2>
              <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto mt-3">
                Every component is engineered to make capability demonstration transparent, objective, and auditable.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <FileCode className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    INGESTION
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Evidence Intelligence</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Deep extraction parsing commits, PR reviews, Jira tickets, and uploaded documents with strict SHA and author attribution.
                </p>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    VERIFIED
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Verified Skill Profile</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Every skill claim links directly to its underlying work items. Separate ratings for evidence strength and extraction confidence.
                </p>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F3A878] border border-[#1C1C1C] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    ALIGNMENT
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Role Matching &amp; Gaps</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Compare capability against versioned target roles to identify missing competencies, depth gaps, and evidence needs.
                </p>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <Compass className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    GROWTH
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Personalized Learning</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Sequenced curricula, practical mini-projects, and targeted resources designed to generate new evidence for verification.
                </p>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6BB84] border border-[#1C1C1C] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    SHARING
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Recruiter-Readable Passport</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Shareable capability credentials with granular access control, allowing recruiters to inspect verified artifacts in seconds.
                </p>
              </div>
            </div>

            <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-7 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center">
                    <Brain className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <span className="text-[9px] font-extrabold tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white/70">
                    GROWTHLENS AI
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2.5">Continuous Talent Intelligence</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  Powered by GrowthLens trajectory modeling, Weibull retention decay curves, and on-device private inference.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-14 text-center flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/features"
              className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C]"
            >
              EXPLORE THE ARCHITECTURE
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

      <SPFooter />
    </div>
  );
}
