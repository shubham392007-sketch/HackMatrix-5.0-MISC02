"use client";

import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import SPFooter from "@/components/layout/SPFooter";
import ScrollReveal from "@/components/layout/ScrollReveal";
import ScriptHeading from "@/components/ui/ScriptHeading";
import {
  ArrowRight,
  GitBranch,
  FileCode,
  ShieldCheck,
  Target,
  BookOpen,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Compass,
  FileCheck,
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1A1918]">
      <SPHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-5 md:px-10 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1A1918] bg-[#000000] text-[#FAF8F5] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0_0_#1A1918]">
              CAPABILITIES & WORKFLOW
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1A1918]">
              Evidence-first skills.{" "}
              <br className="hidden sm:inline" />
              Transparent{" "}
              <span
                className="font-normal text-[#1A1918] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                verification.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1A1918]/80 max-w-2xl mx-auto leading-relaxed">
              Explore the four core mechanisms of SkillPassport designed to bridge raw engineering artifacts with provable career capability.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {[
                { label: "1. EVIDENCE INTELLIGENCE", href: "#evidence" },
                { label: "2. VERIFIED SKILL PROFILE", href: "#profile" },
                { label: "3. ROLE MATCHING", href: "#matching" },
                { label: "4. PERSONALIZED LEARNING", href: "#learning" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-full border border-[#1A1918] bg-[#FAF8F5] text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase hover:bg-[#000000] hover:text-[#FAF8F5] transition-all shadow-[2px_2px_0_0_#1A1918]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 1: EVIDENCE INTELLIGENCE ────────────────────────── */}
        <section id="evidence" className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="bg-[#FAF8F5] border-[1.5px] border-[#1A1918] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0_0_#1A1918]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#1A1918]/15 mb-10">
                <div className="max-w-2xl">
                  <span className="inline-block px-3 py-1 rounded-full border border-[#1A1918] bg-[#FAF8F5] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0_0_#1A1918]">
                    FEATURE 1 • TRACEABLE EVIDENCE
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                    Evidence Intelligence
                  </h2>
                  <p className="text-sm sm:text-base font-medium text-[#1A1918]/75 mt-2">
                    Transform raw work artifacts from repositories, design docs, issue boards, and certificates into auditable evidence objects.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#1A1918] flex items-center justify-center mb-4 shadow-[1px_1px_0_0_#1A1918]">
                      <GitBranch className="w-4 h-4 text-[#1A1918]" />
                    </div>
                    <h3 className="text-lg font-black mb-2">Repository & Code Commits</h3>
                    <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                      Indexes pull requests, commit diffs, and code review interactions while preserving author identity, timestamps, and commit SHAs.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#1A1918]/10 text-[10px] font-mono font-bold text-[#1A1918]/60">
                    HASH & TIMESTAMP INTEGRITY
                  </div>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-white shadow-[2px_2px_0_0_#1A1918] flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center mb-4 shadow-[1px_1px_0_0_#1A1918]">
                      <FileCode className="w-4 h-4 text-[#FAF8F5]" />
                    </div>
                    <h3 className="text-lg font-black mb-2">Project Documents & Architecture</h3>
                    <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                      Extracts demonstrated technical competencies from design documents, RFCs, technical specs, and architecture decisions.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#1A1918]/10 text-[10px] font-mono font-bold text-[#1A1918]/60">
                    SPEC & RFC TRACEABILITY
                  </div>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex flex-col justify-between">
                  <div>
                    <div className="w-9 h-9 rounded-xl bg-[#1A1918] text-white flex items-center justify-center mb-4 shadow-[1px_1px_0_0_#1A1918]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-black mb-2">Verified Certifications</h3>
                    <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                      Integrates verified credentials and educational outcomes, maintaining proof links to issuing authorities.
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-[#1A1918]/10 text-[10px] font-mono font-bold text-[#1A1918]/60">
                    AUTHENTICATED CREDENTIALS
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 2: VERIFIED SKILL PROFILE ───────────────────────── */}
        <section id="profile" className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="bg-[#FAF8F5] border-[1.5px] border-[#1A1918] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0_0_#1A1918]">
              <div className="max-w-2xl mb-10 pb-8 border-b border-[#1A1918]/15">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1A1918] bg-[#000000] text-[#FAF8F5] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0_0_#1A1918]">
                  FEATURE 2 • COMPETENCY MAPPING
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Evidence-Backed Skill Profile
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1A1918]/75 mt-2">
                  A structured representation of competencies where each claim is tied to supporting artifacts, recency, and verification certainty.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4 text-sm font-medium text-[#1A1918]/80 leading-relaxed">
                  <p>
                    Uploading a document or self-reporting an ability does not automatically verify a skill. SkillPassport establishes a rigorous relationship between:
                  </p>
                  <ul className="space-y-3 font-semibold">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                      <span><strong>The Skill Claim:</strong> What competency is being asserted.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                      <span><strong>Supporting Artifacts:</strong> Direct links to code commits, pull requests, and designs.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                      <span><strong>Recency & Freshness:</strong> When the capability was last applied in practice.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">4</span>
                      <span><strong>Confidence Metrics:</strong> Mathematical estimation based on quantity and diversity of evidence.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#FAF8F5] shadow-[3px_3px_0_0_#1A1918] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1A1918]/15 pb-3">
                    <span className="text-xs font-black uppercase tracking-wider">SAMPLE PASSPORT NODE</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#000000] border border-[#1A1918] text-[#FAF8F5]">
                      VERIFIED
                    </span>
                  </div>
                  <h4 className="text-lg font-black">Asynchronous Microservices</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Proficiency Band</span>
                      <span>ADVANCED (LEVEL 4)</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Confidence Level</span>
                      <span className="text-[#4A7A4E]">94% (HIGH CERTAINTY)</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Last Demonstrated</span>
                      <span>12 DAYS AGO</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1A1918] bg-white text-[11px] font-mono">
                    CITATIONS: PR #204 • RFC-09 • RabbitMQ Producer
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 3: ROLE MATCHING & SKILL GAPS ────────────────────── */}
        <section id="matching" className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="bg-[#FAF8F5] border-[1.5px] border-[#1A1918] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0_0_#1A1918]">
              <div className="max-w-2xl mb-10 pb-8 border-b border-[#1A1918]/15">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1A1918] bg-[#E0A96D] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0_0_#1A1918]">
                  FEATURE 3 • ROLE INTELLIGENCE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Role Matching & Gap Diagnostics
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1A1918]/75 mt-2">
                  Compare demonstrated capabilities against the exact requirements of a target engineering or leadership role.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-white shadow-[2px_2px_0_0_#1A1918]">
                  <div className="w-8 h-8 rounded-lg bg-[#000000] border border-[#1A1918] text-[#FAF8F5] flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[#FAF8F5]" />
                  </div>
                  <h4 className="text-base font-black mb-2">Proven Matches</h4>
                  <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                    Skills with robust, recent evidence that satisfy the target level required by the role description.
                  </p>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918]">
                  <div className="w-8 h-8 rounded-lg bg-[#E0A96D] border border-[#1A1918] flex items-center justify-center mb-3">
                    <HelpCircle className="w-4 h-4 text-[#1A1918]" />
                  </div>
                  <h4 className="text-base font-black mb-2">Partial Evidence</h4>
                  <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                    Areas with existing proof, but where recency or depth is below the target role threshold.
                  </p>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#F6C8D6]/60 shadow-[2px_2px_0_0_#1A1918]">
                  <div className="w-8 h-8 rounded-lg bg-[#1A1918] text-white flex items-center justify-center mb-3">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-black mb-2">Identified Gaps</h4>
                  <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                    Required capabilities with insufficient or zero demonstrated artifacts in the candidate&apos;s passport.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 4: PERSONALIZED LEARNING ────────────────────────── */}
        <section id="learning" className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="bg-[#FAF8F5] border-[1.5px] border-[#1A1918] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0_0_#1A1918]">
              <div className="max-w-2xl mb-10 pb-8 border-b border-[#1A1918]/15">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1A1918] bg-[#000000] text-[#FAF8F5] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0_0_#1A1918]">
                  FEATURE 4 • ACTION ENGINE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Personalized Learning Pathways
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1A1918]/75 mt-2">
                  Transform verified gaps into high-impact learning recommendations, practice milestones, and demonstration targets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] space-y-3">
                  <h3 className="text-xl font-black">Targeted Objectives</h3>
                  <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                    Rather than generic course bundles, recommendations focus strictly on the missing competency dimensions required to bridge the gap.
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-[#1A1918] text-xs font-mono">
                    OBJECTIVE: Implement Zero-Downtime Migration Pattern
                  </div>
                </div>

                <div className="p-6 rounded-[24px] border border-[#1A1918] bg-white shadow-[2px_2px_0_0_#1A1918] space-y-3">
                  <h3 className="text-xl font-black">Demonstration Milestones</h3>
                  <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                    Learning is only verified when backed by applied work. Every pathway defines clear project or code milestones to prove comprehension.
                  </p>
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#1A1918] text-xs font-mono">
                    PROOF TARGET: Ship Blue/Green Router in Staging
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 5: TRANSPARENCY & TRUST PANEL ───────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="scalloped-panel p-8 sm:p-12 shadow-[5px_5px_0_0_#1A1918] max-w-4xl mx-auto space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full border border-[#1A1918] bg-[#E0A96D] text-[10px] font-black tracking-[0.14em] uppercase shadow-[1.5px_1.5px_0_0_#1A1918]">
                TRANSPARENCY STANDARD
              </span>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#1A1918]">
                Separating Claims, Interpretations, and Proof
              </h2>

              <p className="text-sm sm:text-base font-medium text-[#1A1918]/80 leading-relaxed">
                In SkillPassport, raw artifacts (commits, diffs), model interpretations (skill tagging), and verification decisions are distinct layers. Users can inspect the exact evidence backing any rating at any time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-bold">
                <div className="p-4 bg-white rounded-xl border border-[#1A1918]">
                  <span className="text-[#1A1918]/60 block mb-1">LAYER 1</span>
                  IMMUTABLE EVIDENCE
                </div>
                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#1A1918]">
                  <span className="text-[#1A1918]/60 block mb-1">LAYER 2</span>
                  TAXONOMY MAPPING
                </div>
                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#1A1918]">
                  <span className="text-[#1A1918]/60 block mb-1">LAYER 3</span>
                  VERIFIED DECISION
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ── SECTION 6: CLOSING CTA ──────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-20 border-t border-[#1A1918]/15 text-center">
          <ScrollReveal>
            <div className="space-y-6 max-w-xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Ready to explore verifiable capability?
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/about"
                  className="pill-btn pill-btn-secondary text-xs sm:text-sm py-3.5 px-6"
                >
                  ABOUT THE PHILOSOPHY
                </Link>
                <Link
                  href="/signup"
                  className="pill-btn pill-btn-primary text-xs sm:text-sm py-3.5 px-6"
                >
                  CREATE YOUR PASSPORT <ArrowRight className="w-4 h-4" />
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
