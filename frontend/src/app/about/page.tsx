"use client";

import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Lock,
  Scale,
  BrainCircuit,
  Compass,
  History,
  Target,
  Users,
  Activity,
  GitBranch,
} from "lucide-react";

export default function AboutPage() {
  const coreValues = [
    {
      icon: <Scale className="w-5 h-5 text-[#1C1C1C]" />,
      title: "Zero Hallucination Grounding",
      desc: "If there is no direct pull request, commit, or ticket artifact to prove a competency signal, GrowthLens will never invent one. Every assessment cites its exact evidence IDs.",
      tag: "PROVENANCE FIRST",
      bg: "bg-[#DFE968]/50",
    },
    {
      icon: <Lock className="w-5 h-5 text-[#1C1C1C]" />,
      title: "100% Local Edge Sovereignty",
      desc: "Proprietary source code, commit diffs, and developer performance never leave your organization's perimeter. All embeddings, vector indexes, and LLM inference run on-premise.",
      tag: "AIR-GAPPED PRIVACY",
      bg: "bg-[#FBF1CF]",
    },
    {
      icon: <Activity className="w-5 h-5 text-[#1C1C1C]" />,
      title: "Longitudinal Over Static",
      desc: "Annual reviews suffer from extreme recency bias and memory loss. GrowthLens models capability continuously over months using temporal attention and Weibull hazard curves.",
      tag: "TIME-AWARE AI",
      bg: "bg-[#F6C8D6]/60",
    },
    {
      icon: <Users className="w-5 h-5 text-[#1C1C1C]" />,
      title: "Psychological Safety & Growth",
      desc: "We build tools for engineers to own their learning journey, not surveillance dashboards. Benchmarks are anonymous and k-anonymized to protect trust.",
      tag: "GROWTH-CENTRIC",
      bg: "bg-[#F6BB84]/40",
    },
  ];

  const methodologySteps = [
    {
      num: "01",
      title: "Evidence Ingestion & Entity Mapping",
      desc: "Webhooks listen to developer activity in GitHub and Jira. Commit messages, diff hunks, PR reviews, and sprint stories are parsed, normalized, and mapped to specific developer identities without storing credentials in plaintext.",
    },
    {
      num: "02",
      title: "Taxonomy & Vector RAG Pipeline",
      desc: "Textual work artifacts are matched against 28 validated engineering competencies. Chunks are converted into 768-dimensional dense vectors and indexed in local persistent ChromaDB with BM25 hybrid reranking.",
    },
    {
      num: "03",
      title: "PyTorch LSTM Sequence Classification",
      desc: "Chronological activity streams are transformed into 28-feature input tensors. A custom bidirectional PyTorch LSTM with soft attention heads evaluates momentum across Improving, Stagnating, and Declining classes.",
    },
    {
      num: "04",
      title: "Weibull Hazard & Freshness Decay",
      desc: "Competencies are subject to parametric survival modeling. When an engineer hasn't touched a skill area in 90+ days, confidence gracefully decays and flags actionable reinforcement interventions.",
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0px_#1C1C1C]">
              THE GROWTHLENS MANIFESTO
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1C1C1C]">
              More than data.{" "}
              <br />
              It&apos;s your{" "}
              <span
                className="font-normal text-[#1C1C1C] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                growth
              </span>{" "}
              story.
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1C1C1C]/80 leading-relaxed">
              We started GrowthLens with a simple realization: modern software engineers produce incredible work every single day, yet companies still evaluate talent using subjective, panic-inducing, once-a-year review rubrics.
            </p>
          </div>
        </section>

        {/* ── QUOTE SECTION ───────────────────────────────────────────── */}
        <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="p-8 sm:p-12 rounded-[36px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/30 shadow-[4px_4px_0px_#1C1C1C] text-center space-y-4">
            <blockquote
              className="text-2xl sm:text-3xl md:text-4xl leading-snug font-normal text-[#1C1C1C]"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              &ldquo;Real evidence. Deeper insights. Continuous growth.&rdquo;
            </blockquote>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#1C1C1C]/60">
              GROWTHLENS CORE PHILOSOPHY
            </p>
          </div>
        </section>

        {/* ── THE PROBLEM VS THE SOLUTION ─────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              Rethinking How Talent Is Understood
            </h2>
            <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 max-w-2xl mx-auto mt-2">
              Why static reviews fail, and why continuous mathematical trajectory intelligence changes everything.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="p-7 sm:p-9 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] text-[10px] font-black tracking-wider uppercase mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  THE LEGACY PARADIGM
                </div>
                <h3 className="text-2xl font-black mb-4">Subjective Annual Cycles</h3>
                <ul className="space-y-3 text-xs sm:text-sm font-medium text-[#1C1C1C]/85">
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#C85A54] font-black">✕</span>
                    <span><strong>Severe Recency Bias:</strong> Only what you shipped in the last 3 weeks gets remembered.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#C85A54] font-black">✕</span>
                    <span><strong>Artificial Single Scores:</strong> Boiling an engineer down to a single rating like &ldquo;Meets Expectations&rdquo; or &ldquo;3.5/5&rdquo;.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#C85A54] font-black">✕</span>
                    <span><strong>Zero Actionability:</strong> Feedback arrives months after projects wrap up, when context has already vanished.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-[#C85A54] font-black">✕</span>
                    <span><strong>Cloud Surveillance Anxiety:</strong> Third-party HR software harvesting private company repositories.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* The GrowthLens Way */}
            <div className="p-7 sm:p-9 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/50 shadow-[4px_4px_0px_#1C1C1C] flex flex-col justify-between">
              <div>
                <div className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-wider uppercase mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  THE GROWTHLENS PARADIGM
                </div>
                <h3 className="text-2xl font-black mb-4">Continuous Longitudinal Intelligence</h3>
                <ul className="space-y-3 text-xs sm:text-sm font-medium text-[#1C1C1C]/90">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                    <span><strong>Verifiable Audit Trails:</strong> Every score and claim links directly to immutable Git and Jira records.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                    <span><strong>Independent Multidimensional Vectors:</strong> 28 distinct competencies tracked without artificial score collapse.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                    <span><strong>Predictive Weibull Half-Life:</strong> Proactive alerts when a critical capability is beginning to plateau or decay.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
                    <span><strong>Isolated Counterfactual Simulations:</strong> What-If sandboxes allowing developers to plan their next technical milestone.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── CORE PILLARS & ARCHITECTURAL VALUES ─────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0px_#1C1C1C] mb-3">
              FOUNDATIONAL PILLARS
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              Engineering Principles We Never Compromise On
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((val) => (
              <div
                key={val.title}
                className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] ${val.bg} shadow-[3px_3px_0px_#1C1C1C] flex flex-col justify-between`}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                    {val.icon}
                  </div>
                  <h3 className="text-lg font-black mb-2 text-[#1C1C1C]">
                    {val.title}
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    {val.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/15 text-[9px] font-mono font-black uppercase text-[#1C1C1C]/60">
                  {val.tag}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STEP-BY-STEP MATHEMATICAL METHODOLOGY ───────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[36px] p-6 sm:p-10 lg:p-14 shadow-[5px_5px_0px_#1C1C1C]">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                END-TO-END PIPELINE
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
                How GrowthLens Analyzes Talent
              </h2>
              <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 mt-2">
                From raw Git commit byte streams to PyTorch tensor embeddings and verifiable executive summaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {methodologySteps.map((step) => (
                <div
                  key={step.num}
                  className="p-6 sm:p-7 rounded-[26px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2.5px_2.5px_0px_#1C1C1C] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-black px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-white text-[#1C1C1C]">
                        STAGE {step.num}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black mb-2 text-[#1C1C1C]">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION ─────────────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="p-8 sm:p-14 lg:p-16 rounded-[40px] border-[2px] border-[#1C1C1C] bg-[#FBF1CF] text-center shadow-[6px_6px_0px_#1C1C1C] space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1C1C1C] tracking-tight">
              See how your capability changes over time.
            </h2>
            <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/80 max-w-xl mx-auto">
              Explore your live competency trajectories, inspect verifiable evidence items, or run a counterfactual what-if simulation today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
              <Link
                href="/employee/dashboard"
                className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-4 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C]"
              >
                EXPLORE YOUR DASHBOARD
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-4 rounded-full inline-flex items-center gap-2 hover:bg-[#FBF6DF] transition-all shadow-[2px_2px_0px_#1C1C1C]"
              >
                VIEW ALL 4 FEATURES
              </Link>
            </div>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
}
