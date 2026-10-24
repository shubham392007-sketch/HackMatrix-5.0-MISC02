"use client";

import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import SPFooter from "@/components/layout/SPFooter";
import ScrollReveal from "@/components/layout/ScrollReveal";
import ScriptHeading from "@/components/ui/ScriptHeading";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  Layers,
  Sparkles,
  Compass,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1A1918]">
      <SPHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-5 md:px-10 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1A1918] bg-[#1E3A5F] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0_0_#1A1918]">
              THE SKILLPASSPORT MANIFESTO
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1A1918]">
              Make demonstrated skills{" "}
              <span
                className="font-normal text-[#1A1918] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                easier to see.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1A1918]/80 max-w-2xl mx-auto leading-relaxed">
              Why should engineering capability be confined to self-written bullet points on a static resume when daily work produces rich, inspectable evidence?
            </p>
          </div>
        </section>

        {/* ── MANIFESTO QUOTE BLOCK ───────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-12 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="bg-[#1E3A5F]/30 rounded-[36px] border-[1.5px] border-[#1A1918] p-8 sm:p-14 text-center max-w-4xl mx-auto shadow-[4px_4px_0_0_#1A1918]">
              <blockquote
                className="text-3xl sm:text-4xl md:text-5xl text-[#1A1918] leading-snug font-normal select-none"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                &ldquo;Real evidence. Deeper insights. Continuous growth.&rdquo;
              </blockquote>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1A1918]/70 mt-6">
                THE FOUNDATIONAL CREED OF GROWTHLENS & SKILLPASSPORT
              </p>
            </div>
          </ScrollReveal>
        </section>

        {/* ── THE PROBLEM VS THE APPROACH ─────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1A1918] bg-[#FAF8F5] text-[10px] font-extrabold tracking-[0.14em] uppercase mb-3 shadow-[2px_2px_0_0_#1A1918]">
                PARADIGM SHIFT
              </span>
              <ScriptHeading
                preText="Resumes vs."
                scriptWord="evidence-based"
                postText="passports."
                className="text-3xl sm:text-4xl md:text-5xl"
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Paradigm */}
            <ScrollReveal delayMs={50}>
              <div className="bg-[#F6C8D6]/40 border-[1.5px] border-[#1A1918] rounded-[32px] p-8 h-full shadow-[3px_3px_0_0_#1A1918] space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A54] block mb-2">
                    LEGACY HIRING & APPRAISALS
                  </span>
                  <h3 className="text-2xl font-black">The Assertion Paradigm</h3>
                </div>

                <ul className="space-y-4 text-xs font-bold">
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-[#C85A54] shrink-0 mt-0.5" />
                    <span>Self-reported skill lists with zero verifiable proof.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-[#C85A54] shrink-0 mt-0.5" />
                    <span>Annual reviews plagued by recency bias and subjective memory.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-[#C85A54] shrink-0 mt-0.5" />
                    <span>Opaque role rejections with no actionable diagnostic feedback.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-[#C85A54] shrink-0 mt-0.5" />
                    <span>Decoupled learning courses with no proven workplace demonstration.</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            {/* The SkillPassport Paradigm */}
            <ScrollReveal delayMs={100}>
              <div className="bg-[#1E3A5F]/50 border-[1.5px] border-[#1A1918] rounded-[32px] p-8 h-full shadow-[3px_3px_0_0_#1A1918] space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4A7A4E] block mb-2">
                    SKILLPASSPORT METHODOLOGY
                  </span>
                  <h3 className="text-2xl font-black">The Verification Paradigm</h3>
                </div>

                <ul className="space-y-4 text-xs font-bold">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                    <span>Every competency tied to inspectable commits, PRs, and docs.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                    <span>Continuous longitudinal modeling of skill recency and decay.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                    <span>Granular gap breakdowns comparing demonstrated capability to roles.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                    <span>Actionable pathways leading to concrete demonstration milestones.</span>
                  </li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── 5 PRODUCT PRINCIPLES ─────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full border border-[#1A1918] bg-[#1E3A5F] text-[10px] font-extrabold tracking-[0.14em] uppercase mb-3 shadow-[2px_2px_0_0_#1A1918]">
                GUIDING TENETS
              </span>
              <ScriptHeading
                preText="Five core product"
                scriptWord="principles."
                className="text-3xl sm:text-4xl md:text-5xl"
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Evidence Before Assertion",
                desc: "We never claim an engineer knows a skill unless there are inspectable artifacts demonstrating it in practice.",
              },
              {
                num: "02",
                title: "Transparency Over Certainty",
                desc: "We make confidence levels explicit. When evidence is sparse, we declare uncertainty rather than fabricating false certainty.",
              },
              {
                num: "03",
                title: "Proficiency ≠ Verification",
                desc: "An advanced self-reported capability is distinct from verified competency. We clearly separate the two across all surfaces.",
              },
              {
                num: "04",
                title: "Explainable Recommendations",
                desc: "Every suggested learning path or mentor connection explains exactly why it was suggested and what gap it addresses.",
              },
              {
                num: "05",
                title: "Learning Must Be Demonstrated",
                desc: "Completing a course is not enough; true capability is only recognized when applied to real code, projects, or architecture.",
              },
              {
                num: "06",
                title: "Privacy by Design",
                desc: "All processing respects local sovereignty. Talent intelligence belongs to the engineer, not external tracking networks.",
              },
            ].map((p, idx) => (
              <ScrollReveal key={p.num} delayMs={idx * 50}>
                <div className="gl-card p-6 h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#1A1918]/50 block mb-3">
                      PRINCIPLE {p.num}
                    </span>
                    <h4 className="text-lg font-black mb-2">{p.title}</h4>
                    <p className="text-xs font-medium text-[#1A1918]/80 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ── RELATIONSHIP WITH GROWTHLENS ─────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-10 py-16 border-t border-[#1A1918]/15">
          <ScrollReveal>
            <div className="scalloped-panel p-8 sm:p-14 max-w-4xl mx-auto space-y-6 shadow-[5px_5px_0_0_#1A1918]">
              <span className="inline-block px-4 py-1.5 rounded-full border border-[#1A1918] bg-[#E0A96D] text-[10px] font-black tracking-[0.14em] uppercase shadow-[1.5px_1.5px_0_0_#1A1918]">
                ECOSYSTEM ARCHITECTURE
              </span>

              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1A1918]">
                SkillPassport &amp; GrowthLens
              </h2>

              <p className="text-sm sm:text-base font-medium text-[#1A1918]/80 leading-relaxed">
                SkillPassport is developed as an extension within the GrowthLens product family. While GrowthLens delivers organizational talent intelligence, longitudinal retention modeling, and team heatmaps, SkillPassport delivers the portable, individual-facing capability passport that engineers can share and verify.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/developers"
                  className="pill-btn pill-btn-primary text-xs"
                >
                  ENGINEERING ARCHITECTURE <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/features"
                  className="pill-btn pill-btn-secondary text-xs"
                >
                  VIEW ALL FEATURES
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
