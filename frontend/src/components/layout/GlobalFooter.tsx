"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GlobalFooter() {
  const pathname = usePathname();

  // Make sure the footer appears only on the home page of the website and nowhere else
  if (pathname !== "/") {
    return null;
  }

  return (
    <footer className="mt-auto border-t-[1.5px] border-[#1C1C1C] bg-transparent pt-16 pb-10 px-6 md:px-12 text-[#1C1C1C] w-full">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Header Row with Logo & CTAs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-12 border-b border-[#1C1C1C]/20">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="leading-none text-[#1C1C1C] font-normal tracking-tight inline-block"
                style={{
                  fontFamily: "'Yellowtail', cursive",
                  fontSize: "clamp(4.5rem, 10vw, 9rem)",
                }}
              >
                GrowthLens
              </span>
            </div>
            <p className="text-sm font-medium text-[#1C1C1C]/80 max-w-md">
              Private, continuous talent intelligence and skill trajectory modeling powered by local AI and Weibull survival analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/about"
              className="border-[1.5px] border-[#1C1C1C] bg-transparent text-[#1C1C1C] text-xs font-bold tracking-[0.08em] uppercase px-6 py-2.5 rounded-full hover:bg-[#1C1C1C]/5 transition-all"
            >
              HOW IT WORKS
            </Link>
            <Link
              href="/employee/dashboard"
              className="bg-[#F6BB84] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold tracking-[0.08em] uppercase px-6 py-2.5 rounded-full inline-flex items-center gap-1.5 hover:opacity-90 transition-all shadow-[2px_2px_0px_#1C1C1C]"
            >
              OPEN DASHBOARD
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Navigation & Architecture Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-12 border-b border-[#1C1C1C]/20">
          {/* Col 1 */}
          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C] mb-4">
              WORKSPACE & AI
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1C1C1C]/80">
              <li>
                <Link href="/" className="hover:text-[#1C1C1C] hover:underline">
                  Home Overview
                </Link>
              </li>
              <li>
                <Link href="/employee/dashboard" className="hover:text-[#1C1C1C] hover:underline flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A7A4E]"></span>
                  Employee Dashboard
                </Link>
              </li>
              <li>
                <Link href="/employee/evidence" className="hover:text-[#1C1C1C] hover:underline">
                  Evidence Feed
                </Link>
              </li>
              <li>
                <Link href="/employee/skills" className="hover:text-[#1C1C1C] hover:underline">
                  Competency Explorer
                </Link>
              </li>
              <li>
                <Link href="/employee/simulator" className="hover:text-[#1C1C1C] hover:underline">
                  What-If Simulator
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C] mb-4">
              PRODUCT & VISION
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1C1C1C]/80">
              <li>
                <Link href="/about" className="hover:text-[#1C1C1C] hover:underline">
                  About GrowthLens
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#1C1C1C] hover:underline">
                  The Retention Challenge
                </Link>
              </li>
              <li>
                <Link href="/employee/narrative" className="hover:text-[#1C1C1C] hover:underline">
                  Growth Intelligence
                </Link>
              </li>
              <li>
                <Link href="/manager/heatmap" className="hover:text-[#1C1C1C] hover:underline">
                  Team Heatmap Matrix
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C] mb-4">
              CREATOR & TRUST
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-[#1C1C1C]/80">
              <li>
                <span className="text-[#1C1C1C]">Developer: </span>
                <span className="font-bold underline decoration-2">Shubham Pokale</span>
              </li>
              <li>
                <span>Track: </span>
                <span className="font-bold">HackMatrix 5.0 — MISC02</span>
              </li>
              <li>
                <span className="text-[#1C1C1C]/70">Local-first verifiable talent intelligence</span>
              </li>
              <li>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full border border-[#4A7A4E] text-[#4A7A4E] text-[10px] font-bold bg-[#4A7A4E]/10">
                  100% PRIVATE & ON-DEVICE
                </span>
              </li>
            </ul>
          </div>

          {/* Col 4: Local Architecture Cards */}
          <div>
            <h4 className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C] mb-4">
              LOCAL ARCHITECTURE
            </h4>
            <div className="space-y-2.5">
              <div className="bg-[#FBF6DF]/80 border-[1.5px] border-[#1C1C1C] rounded-xl p-2.5 shadow-[2px_2px_0px_#1C1C1C]">
                <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#1C1C1C]/60">
                  LLM Engine:
                </p>
                <p className="text-xs font-extrabold text-[#1C1C1C]">
                  Qwen3 8B (via Ollama)
                </p>
              </div>

              <div className="bg-[#FBF6DF]/80 border-[1.5px] border-[#1C1C1C] rounded-xl p-2.5 shadow-[2px_2px_0px_#1C1C1C]">
                <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#1C1C1C]/60">
                  Hybrid Search:
                </p>
                <p className="text-xs font-extrabold text-[#1C1C1C]">
                  ChromaDB + Multi-Vector RAG
                </p>
              </div>

              <div className="bg-[#FBF6DF]/80 border-[1.5px] border-[#1C1C1C] rounded-xl p-2.5 shadow-[2px_2px_0px_#1C1C1C]">
                <p className="text-[9px] font-bold tracking-[0.08em] uppercase text-[#1C1C1C]/60">
                  Survival Modeling:
                </p>
                <p className="text-xs font-extrabold text-[#1C1C1C]">
                  Weibull Hazard Decay Model
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Big Editorial Marquee */}
        <div className="py-8 flex flex-wrap items-center justify-between gap-4 text-center border-b border-[#1C1C1C]/20 opacity-90 select-none">
          <span className="text-xs md:text-sm font-extrabold tracking-[0.2em] uppercase">
            LOCAL AI
          </span>
          <span className="text-xs md:text-sm font-extrabold tracking-[0.2em] uppercase">
            CONTINUOUS INTELLIGENCE
          </span>
          <span className="text-xs md:text-sm font-extrabold tracking-[0.2em] uppercase">
            PRIVATE BY DESIGN
          </span>
          <span className="text-xs md:text-sm font-extrabold tracking-[0.2em] uppercase">
            QWEN3 8B
          </span>
          <span className="text-xs md:text-sm font-extrabold tracking-[0.2em] uppercase">
            WEIBULL SURVIVAL
          </span>
        </div>

        {/* Bottom Metadata */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-medium text-[#1C1C1C]/60">
          <p>
            © 2026 GrowthLens. Made by <strong className="text-[#1C1C1C]">Shubham Pokale</strong>. All processing stays 100% on your infrastructure.
          </p>
          <p className="font-semibold text-[#1C1C1C]/80">
            Zero telemetry • Zero external API keys
          </p>
        </div>
      </div>
    </footer>
  );
}
