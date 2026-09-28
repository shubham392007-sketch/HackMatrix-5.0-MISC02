"use client";

import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import {
  ArrowRight,
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
  FileCode,
  Sparkles,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Workflow,
  Lock,
  History,
  Lightbulb,
  Radar,
  Network,
} from "lucide-react";

export default function FeaturesPage() {
  const jumpLinks = [
    { label: "1. EVIDENCE INTELLIGENCE", href: "#feature-1" },
    { label: "2. COMPETENCY TRAJECTORY", href: "#feature-2" },
    { label: "3. WHAT-IF SIMULATOR", href: "#feature-3" },
    { label: "4. GROWTH INTELLIGENCE", href: "#feature-4" },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-1 w-full">
        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <section className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-[0.14em] uppercase shadow-[2px_2px_0px_#1C1C1C]">
              THE ARCHITECTURAL SUITE
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-[#1C1C1C]">
              Four continuous engines.{" "}
              <br className="hidden sm:inline" />
              One{" "}
              <span
                className="font-normal text-[#1C1C1C] inline-block transform -rotate-1"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                verifiable
              </span>{" "}
              truth.
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto leading-relaxed">
              GrowthLens deprecates flawed annual performance reviews by converting day-to-day engineering artifacts into longitudinal mathematical models with 100% on-device AI privacy.
            </p>

            {/* Quick jump anchor bar */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-4">
              {jumpLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase hover:bg-[#DFE968] transition-all shadow-[2px_2px_0px_#1C1C1C]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE 1: EVIDENCE INTELLIGENCE ENGINE ─────────────────── */}
        <section id="feature-1" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0px_#1C1C1C]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#1C1C1C]/15 mb-10">
              <div className="max-w-2xl">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  FEATURE 1 • CONTINUOUS EVIDENCE EXTRACTION & RAG
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Evidence Intelligence Engine
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 mt-2">
                  Never evaluate an engineer without hard proof. Ingest, normalize, chunk, and index real workplace signals with zero manual record keeping.
                </p>
              </div>

              <Link
                href="/employee/evidence"
                className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-black tracking-wider uppercase px-6 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C] shrink-0"
              >
                OPEN EVIDENCE EXPLORER
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <GitBranch className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">GitHub & Jira Ingestion</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Automated webhooks and REST polling ingest commit diffs, pull request comments, code reviews, and Jira issue resolutions with original timestamps and commit SHA attribution.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  TOKEN-REDACTED • STRICT OAUTH
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Layers className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Taxonomy-Aware Chunking</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Raw diffs and tickets are mapped to 28 core competencies across Engineering, QA, Architecture, and DevOps using domain-validated taxonomies with 4-factor confidence scoring.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  COMPETENCIES C01 - C28
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#DFE968]/40 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] text-white flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Dense Vector + Hybrid RAG</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Embedded into persistent local ChromaDB vector collections. Justification queries fuse dense semantic similarity with exact keyword token filters for audit-grade accuracy.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  CHROMADB PERSISTENT • NOMIC EMBED
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE 2: CONTINUOUS COMPETENCY TRAJECTORY ENGINE ──────── */}
        <section id="feature-2" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0px_#1C1C1C]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#1C1C1C]/15 mb-10">
              <div className="max-w-2xl">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  FEATURE 2 • PYTORCH LSTM TEMPORAL ATTENTION
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Competency Trajectory Engine
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 mt-2">
                  Talent is dynamic. Our deep learning model analyzes longitudinal sequence tensors to predict whether an engineer is Improving, Stagnating, or Declining.
                </p>
              </div>

              <Link
                href="/employee/skills"
                className="bg-[#1C1C1C] text-[#FBF6DF] text-xs font-black tracking-wider uppercase px-6 py-3.5 rounded-full inline-flex items-center gap-2 hover:bg-[#1C1C1C]/90 transition-all shadow-[3px_3px_0px_#DFE968] shrink-0"
              >
                VIEW LIVE TRAJECTORIES
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Cpu className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">PyTorch Temporal Attention LSTM</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Custom bidirectional LSTM neural network with soft attention heads over chronological observation sequences. Outperforms static linear heuristics and prevents recency bias.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  28 INPUT FEATURES • CROSS-ENTROPY LOSS
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Activity className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Weibull Retention & Hazard Modeling</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Parametric survival curves quantify skill half-life in days, projecting cumulative decay risk across 30, 60, 90, and 180 day horizons so teams can intervene before skills fade.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  HALF-LIFE DECAY CURVES • HAZARD RATE
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#DFE968]/30 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] text-[#DFE968] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Evidence-Grounded Confidence</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Confidence decays gracefully if no fresh evidence is registered. When fewer than 3 observations exist, the engine strictly flags &ldquo;Need Evidence&rdquo; rather than manufacturing a false score.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  FRESH • RECENT • AGING • STALE
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE 3: WHAT-IF SIMULATOR & ACTION ENGINE ───────────── */}
        <section id="feature-3" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0px_#1C1C1C]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#1C1C1C]/15 mb-10">
              <div className="max-w-2xl">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6BB84] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  FEATURE 3 • COUNTERFACTUAL LEARNING SANDBOX
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  What-If Simulator & Action Engine
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 mt-2">
                  Test hypothetical learning paths in an isolated sandbox. Project risk deltas, extend skill half-life, and route peer mentorship with exact evidence justification.
                </p>
              </div>

              <Link
                href="/employee/simulator"
                className="bg-[#F6BB84] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-black tracking-wider uppercase px-6 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C] shrink-0"
              >
                LAUNCH WHAT-IF SIMULATOR
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Sliders className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Counterfactual Sandbox</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Inject simulated project deliveries, certifications, or assessments into the LSTM model to compute counterfactual trajectory projections without modifying production database records.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  ZERO DB MUTATION • ISOLATED INFERENCE
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#F6BB84] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Lightbulb className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Instant Risk Delta Analysis</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    See the quantified impact immediately: baseline risk vs. projected risk, expected half-life expansion, and probability shift across Improving, Stagnating, and Declining classes.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  DELTA TENSOR • PREDICTED HALF-LIFE
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#DFE968]/30 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] text-white flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Automated Peer Mentorship</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    When an engineer exhibits skill decay risk, GrowthLens automatically identifies teammates with accelerating trajectories in that exact competency to propose peer mentorship pairings.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  ONE-CLICK MENTORSHIP REQUESTS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE 4: HOLISTIC NARRATIVES & TEAM HEATMAP ──────────── */}
        <section id="feature-4" className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[#1C1C1C]/15">
          <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-[36px] p-6 sm:p-10 lg:p-12 shadow-[5px_5px_0px_#1C1C1C]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-[#1C1C1C]/15 mb-10">
              <div className="max-w-2xl">
                <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#F6C8D6] text-[10px] font-black tracking-wider uppercase mb-3 shadow-[1.5px_1.5px_0px_#1C1C1C]">
                  FEATURE 4 • NARRATIVES, BENCHMARKS & TEAM INTELLIGENCE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Growth Intelligence & Heatmaps
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/75 mt-2">
                  Transform raw numbers into human-readable narratives, privacy-safe peer benchmarks, and full engineering organization skill topologies.
                </p>
              </div>

              <Link
                href="/employee/narrative"
                className="bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-black tracking-wider uppercase px-6 py-3.5 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C] shrink-0"
              >
                READ GROWTH NARRATIVE
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">AI-Synthesized Growth Narratives</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Local Qwen3 8B weaves longitudinal activity records into coherent prose, citing specific pull requests, code reviews, and project tickets to back every claim.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  PROVENANCE CITATIONS [1], [2] • ZERO FLUFF
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#FBF1CF] shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Radar className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Privacy-Safe Peer Benchmarking</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Compare progress against anonymous tenure cohorts using k-anonymity safeguards. Individual scores of peers are never exposed, protecting psychological safety.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  K-ANONYMITY • ZERO PEER SURVEILLANCE
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-[24px] border border-[#1C1C1C] bg-[#DFE968]/40 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] text-white flex items-center justify-center mb-4 shadow-[1px_1px_0px_#1C1C1C]">
                    <Network className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black mb-2">Team Skill Heatmap & Anomaly Radar</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                    Engineering leaders gain instant visibility into team-wide competency coverage, identifying single points of failure, collective skill plateaus, and training needs.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  CROSS-TEAM TOPOLOGY • ROLE BENCHMARKS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION SECTION ─────────────────────────────────── */}
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="p-8 sm:p-14 lg:p-16 rounded-[40px] border-[2px] border-[#1C1C1C] bg-[#FBF1CF] text-center shadow-[6px_6px_0px_#1C1C1C] space-y-6">
            <span
              className="text-4xl sm:text-6xl md:text-7xl font-normal text-[#1C1C1C] block select-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              Ready to see real growth?
            </span>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#1C1C1C] tracking-tight max-w-2xl mx-auto">
              Step into the future of evidence-backed talent intelligence.
            </h2>

            <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/80 max-w-xl mx-auto">
              No cloud lock-in. No external API data harvesting. Pure mathematical talent trajectory modeling running on your local machine.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/employee/dashboard"
                className="bg-[#F6BB84] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-4 rounded-full inline-flex items-center gap-2 hover:translate-y-[-1px] transition-all shadow-[3px_3px_0px_#1C1C1C]"
              >
                OPEN WORKSPACE NOW
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-black tracking-wider uppercase px-8 py-4 rounded-full inline-flex items-center gap-2 hover:bg-[#FBF6DF] transition-all shadow-[2px_2px_0px_#1C1C1C]"
              >
                READ OUR PHILOSOPHY
              </Link>
            </div>
          </div>
        </section>
      </main>

      <GlobalFooter />
    </div>
  );
}
