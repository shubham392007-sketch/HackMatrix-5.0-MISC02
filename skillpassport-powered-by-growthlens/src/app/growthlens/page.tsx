"use client";

import React from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import SPFooter from "@/components/layout/SPFooter";
import ScrollReveal from "@/components/layout/ScrollReveal";
import ScriptHeading from "@/components/ui/ScriptHeading";
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  LineChart,
  Compass,
  Lock,
  GitBranch,
  Sparkles,
  ExternalLink,
  Award,
  CheckCircle2,
  FolderSync,
  Activity,
  Share2,
  GraduationCap,
  Scale,
  Code2,
} from "lucide-react";

export default function GrowthLensPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-5 md:px-10 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0_0_#1C1C1C]">
              FOUNDATION & ECOSYSTEM
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1C1C1C]">
              GrowthLens: The Continuous{" "}
              <span
                className="font-normal text-[#1C1C1C] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                Talent Intelligence Engine.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto leading-relaxed">
              GrowthLens is the parent AI talent intelligence platform that pioneered evidence-backed capability tracking. Understand the architecture behind it and discover how <span className="font-bold text-[#1C1C1C]">SkillPassport</span> extends this intelligence into a portable, verifiable passport for every professional.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/app/passport"
                className="pill-btn pill-btn-primary text-xs"
              >
                OPEN SKILLPASSPORT APP <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <a
                href="#extension-model"
                className="pill-btn pill-btn-secondary text-xs"
              >
                HOW SKILLPASSPORT EXTENDS IT ↓
              </a>
            </div>
          </div>
        </section>

        {/* ── THE FOUNDING CREED ──────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-12 border-t border-[#1C1C1C]/15">
          <ScrollReveal>
            <div className="bg-[#DFE968]/30 rounded-[36px] border-[1.5px] border-[#1C1C1C] p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-[4px_4px_0_0_#1C1C1C]">
              <span className="text-[10px] font-black tracking-[0.16em] uppercase text-[#1C1C1C]/60 block mb-3">
                THE CORE AXIOM
              </span>
              <blockquote
                className="text-3xl sm:text-4xl md:text-5xl text-[#1C1C1C] leading-snug font-normal select-none"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                &ldquo;See capability as it changes.&rdquo;
              </blockquote>
              <p className="text-xs font-semibold text-[#1C1C1C]/75 max-w-xl mx-auto mt-6 leading-relaxed">
                Traditional engineering resumes and annual reviews are static snapshots tainted by recency bias. GrowthLens models capability as a live, evolving vector grounded in authentic workplace artifacts.
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* ── PARENT PLATFORM VS SKILLPASSPORT EXTENSION ───────────────── */}
        <section id="extension-model" className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1C1C1C]/15">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-extrabold tracking-[0.14em] uppercase mb-3 shadow-[2px_2px_0_0_#1C1C1C]">
                ARCHITECTURE & EXTENSION
              </span>
              <ScriptHeading
                preText="How SkillPassport"
                scriptWord="extends"
                postText="GrowthLens."
                className="text-3xl sm:text-4xl md:text-5xl"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/70 max-w-xl mx-auto mt-3">
                GrowthLens powers organizational talent intelligence from within. SkillPassport externalizes that verified truth into an individual, recruiter-ready credential.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Box 1: GrowthLens Core */}
            <ScrollReveal delayMs={50}>
              <div className="gl-card p-8 sm:p-10 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] bg-[#FBF6DF]">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-[#1C1C1C] text-white text-[10px] font-black uppercase tracking-wider">
                      ORGANIZATIONAL CORE
                    </span>
                    <span className="text-xs font-mono font-bold text-[#1C1C1C]/60">
                      Internal Enterprise
                    </span>
                  </div>

                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-[#1C1C1C]">
                      GrowthLens Platform
                    </h3>
                    <p className="text-xs font-semibold text-[#1C1C1C]/70 mt-1">
                      Continuous Talent Intelligence & Team Trajectory
                    </p>
                  </div>

                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Designed for engineering leaders, managers, and organizations. It continuously ingests development activity, models skill decay curves across teams, prevents knowledge loss, and provides predictive coaching.
                  </p>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]/70">
                      Core Enterprise Capabilities:
                    </h4>
                    <ul className="space-y-2.5 text-xs font-semibold text-[#1C1C1C]/80">
                      <li className="flex items-start gap-2.5">
                        <FolderSync className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                        <span><strong>Workstream Ingestion:</strong> Connects GitHub, Jira, and internal git repos to track daily contributions.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Activity className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                        <span><strong>Weibull Trajectory Modeling:</strong> Models skill half-lives, decay curves, and freshness scores.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <LineChart className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                        <span><strong>Team Skill Heatmaps:</strong> Enables engineering managers to pinpoint single points of failure across systems.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                        <span><strong>Enterprise Boundary:</strong> All confidential source code and proprietary PR text remain within the secure enterprise perimeter.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#1C1C1C]/15 mt-8 flex items-center justify-between text-[11px] font-bold text-[#1C1C1C]/60">
                  <span>Scope: Internal Teams & Leaders</span>
                  <span className="font-mono">Engine: Qwen3 / RAG</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Box 2: SkillPassport Extension */}
            <ScrollReveal delayMs={100}>
              <div className="gl-card p-8 sm:p-10 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] bg-[#DFE968]/20">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C] text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                      INDIVIDUAL EXTENSION
                    </span>
                    <span className="text-xs font-mono font-bold text-[#1C1C1C]/60">
                      Portable & Verifiable
                    </span>
                  </div>

                  <div>
                    <h3 className="text-3xl font-black tracking-tight text-[#1C1C1C] flex items-center gap-2">
                      <span>SkillPassport</span>
                      <span
                        className="text-2xl font-normal text-[#1C1C1C]"
                        style={{ fontFamily: "'Yellowtail', cursive" }}
                      >
                        by GrowthLens
                      </span>
                    </h3>
                    <p className="text-xs font-semibold text-[#1C1C1C]/70 mt-1">
                      Verifiable Capability Passport & Career Recruiter Layer
                    </p>
                  </div>

                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    The externalized bridge for individual engineers and professionals. It distills GrowthLens capability states into cryptographic, verifiable credentials that can be shared with recruiters while redacting proprietary IP.
                  </p>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]/70">
                      Extension Innovations:
                    </h4>
                    <ul className="space-y-2.5 text-xs font-semibold text-[#1C1C1C]/80">
                      <li className="flex items-start gap-2.5">
                        <Award className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                        <span><strong>Zero Hallucination Guard:</strong> Guarantees that no unverified or fabricated skills ever appear in the candidate passport.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Share2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                        <span><strong>Selective Privacy Projections:</strong> Creates role-tailored public links that mask employer confidential details.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Compass className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                        <span><strong>Real Role Demand Matching:</strong> Compares candidate capability states against real versioned roles rather than synthetic job listings.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <GraduationCap className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                        <span><strong>Closed-Loop Learning Mastery:</strong> Bridges gaps through roadmaps and mini-projects that generate new evidence for verification.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-8 border-t border-[#1C1C1C]/15 mt-8 flex items-center justify-between text-[11px] font-bold text-[#1C1C1C]">
                  <span>Scope: Candidate & Recruiter</span>
                  <Link
                    href="/app/passport"
                    className="font-extrabold flex items-center gap-1 hover:underline text-xs"
                  >
                    Explore Passport App <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── THE 4 FOUNDATIONAL ENGINES OF GROWTHLENS ─────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1C1C1C]/15">
          <ScrollReveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-extrabold tracking-[0.14em] uppercase mb-3 shadow-[2px_2px_0_0_#1C1C1C]">
                ENGINE ARCHITECTURE
              </span>
              <ScriptHeading
                preText="The four"
                scriptWord="foundational"
                postText="engines."
                className="text-3xl sm:text-4xl md:text-5xl"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/70 max-w-xl mx-auto mt-3">
                How GrowthLens transforms raw engineering code and project tickets into trustworthy capability intelligence.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Engine 1 */}
            <ScrollReveal delayMs={50}>
              <div className="gl-card p-6 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-[#FBF6DF]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <Layers className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                      ENGINE 01
                    </span>
                    <h3 className="text-lg font-black text-[#1C1C1C]">
                      Evidence Intelligence
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Continuously listens to git commits, PR discussions, and Jira tasks. Sanitizes secrets, performs automated identity mapping, and extracts verified capability signals.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1C1C1C]/10 text-[11px] font-mono font-bold text-[#1C1C1C]/60">
                  Output: Ingested Evidence Units
                </div>
              </div>
            </ScrollReveal>

            {/* Engine 2 */}
            <ScrollReveal delayMs={100}>
              <div className="gl-card p-6 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-[#FBF6DF]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <Activity className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                      ENGINE 02
                    </span>
                    <h3 className="text-lg font-black text-[#1C1C1C]">
                      Competency Trajectory
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Applies parametric Weibull decay curves to estimate skill retention over 30, 60, and 180 days. Quantifies evidence freshness and trend direction (Improving, Stagnating, Declining).
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1C1C1C]/10 text-[11px] font-mono font-bold text-[#1C1C1C]/60">
                  Output: Half-Life & Trajectory Vector
                </div>
              </div>
            </ScrollReveal>

            {/* Engine 3 */}
            <ScrollReveal delayMs={150}>
              <div className="gl-card p-6 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-[#FBF6DF]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#F3A878] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <Sparkles className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                      ENGINE 03
                    </span>
                    <h3 className="text-lg font-black text-[#1C1C1C]">
                      Growth Action Engine
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Triggers timely interventions before skills degrade below critical thresholds. Recommends targeted practice exercises, peer mentorship pairings, and code review assignments.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1C1C1C]/10 text-[11px] font-mono font-bold text-[#1C1C1C]/60">
                  Output: Personalized Interventions
                </div>
              </div>
            </ScrollReveal>

            {/* Engine 4 */}
            <ScrollReveal delayMs={200}>
              <div className="gl-card p-6 h-full flex flex-col justify-between border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-[#FBF6DF]">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                    <LineChart className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                      ENGINE 04
                    </span>
                    <h3 className="text-lg font-black text-[#1C1C1C]">
                      Growth Intelligence
                    </h3>
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                    Synthesizes comprehensive talent narratives with verifiable evidence citations. Delivers team heatmaps and privacy-preserving peer benchmark distributions without revealing colleague identities.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#1C1C1C]/10 text-[11px] font-mono font-bold text-[#1C1C1C]/60">
                  Output: Team Heatmaps & Briefings
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── THE PIPELINE: FROM WORK TO PASSPORT ─────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1C1C1C]/15">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-extrabold tracking-[0.14em] uppercase mb-3 shadow-[2px_2px_0_0_#1C1C1C]">
                DATA FLOW & PIPELINE
              </span>
              <ScriptHeading
                preText="From engineering work to"
                scriptWord="verifiable"
                postText="passport."
                className="text-3xl sm:text-4xl md:text-5xl"
              />
            </div>
          </ScrollReveal>

          <div className="relative max-w-4xl mx-auto">
            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Authentic Workplace Ingestion (GrowthLens Core)",
                  desc: "Git commits, Pull Requests, Jira sprint issues, and architectural deliverables are ingested. Secrets and personal data are stripped locally.",
                  badge: "Evidence Intelligence",
                  color: "#DFE968",
                },
                {
                  step: "02",
                  title: "AI Skill Extraction & Hallucination Guard (Domain 3)",
                  desc: "Candidate skills are identified from artifacts. The Hallucination Guard rejects unsupported claims, flags low confidence, and prompts human review.",
                  badge: "Zero Hallucination",
                  color: "#F6C8D6",
                },
                {
                  step: "03",
                  title: "Parametric Trajectory & Decay Modeling (GrowthLens Core)",
                  desc: "Skills are calibrated across frequency, recency, and complexity using Weibull curves to reflect authentic current mastery rather than stale achievements.",
                  badge: "Weibull Modeling",
                  color: "#F3A878",
                },
                {
                  step: "04",
                  title: "SkillPassport Compilation & Role Matching (Domain 2 & 4)",
                  desc: "Verified skills are consolidated into the user's SkillPassport and matched against real industry role demands to prioritize growth areas.",
                  badge: "SkillPassport Domain",
                  color: "#DFE968",
                },
                {
                  step: "05",
                  title: "Selective Recruiter Projections & Verified Sharing (Domain 6)",
                  desc: "The candidate generates tamper-evident, time-limited share links for recruiters. Confidential employer IP is redacted while leaving cryptographic verification intact.",
                  badge: "Recruiter Experience",
                  color: "#FBF6DF",
                },
              ].map((item, idx) => (
                <ScrollReveal key={item.step} delayMs={idx * 60}>
                  <div className="gl-card p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-[#FBF6DF]">
                    <div className="flex items-start gap-4">
                      <span className="w-10 h-10 rounded-xl bg-[#1C1C1C] text-[#DFE968] flex items-center justify-center font-black text-sm shrink-0">
                        {item.step}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-base font-extrabold text-[#1C1C1C]">
                            {item.title}
                          </h4>
                          <span
                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-[#1C1C1C]"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION ──────────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1C1C1C]/15">
          <ScrollReveal>
            <div className="bg-[#DFE968] rounded-[36px] border-[1.5px] border-[#1C1C1C] p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-[5px_5px_0_0_#1C1C1C] space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#1C1C1C]">
                Ready to experience your{" "}
                <span
                  className="font-normal text-[#1C1C1C]"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  SkillPassport?
                </span>
              </h2>
              <p className="text-sm font-semibold text-[#1C1C1C]/80 max-w-xl mx-auto leading-relaxed">
                Connect your first repository or explore the pre-loaded sandbox with 12 verified skills, live trajectory curves, and recruiter preview links.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/app/passport"
                  className="pill-btn pill-btn-primary text-xs"
                >
                  ENTER SKILLPASSPORT WORKSPACE <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
                <Link
                  href="/p/share-recruiter-demo"
                  className="pill-btn pill-btn-secondary text-xs"
                >
                  VIEW DEMO RECRUITER PASSPORT <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <SPFooter />
    </div>
  );
}
