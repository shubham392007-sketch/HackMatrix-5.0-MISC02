"use client";

import React from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  Users,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AppAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, authChecked, loginDemo } = useEvidence();

  // Wait until localStorage auth check finishes to avoid hydration flicker
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FBF1CF] flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]">
        <div className="w-10 h-10 border-4 border-[#1C1C1C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]/60">
          INITIALIZING SKILLPASSPORT ···
        </p>
      </div>
    );
  }

  // If not authenticated, require the demo sign in before granting access to /app features
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBF1CF] flex flex-col justify-between text-[#1C1C1C] p-4 sm:p-6 lg:p-10">
        {/* Top Header */}
        <div className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[#1C1C1C]/15">
          <Link href="/" className="flex items-center gap-2 group">
            <span
              className="text-2xl sm:text-3xl text-[#1C1C1C] leading-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              SkillPassport
            </span>
            <span
              className="text-base sm:text-lg text-[#1C1C1C] opacity-90 hidden sm:inline"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              by GrowthLens
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-extrabold text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline uppercase tracking-wider"
          >
            ← Back to Public Site
          </Link>
        </div>

        {/* Main Demo Sign In Hero Box */}
        <div className="max-w-4xl w-full mx-auto my-auto py-8 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F6BB84]/40 border border-[#1C1C1C] text-[11px] font-black uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-[#1C1C1C]" />
              AUTHENTICATION REQUIRED · DEMO ACCESS
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#1C1C1C]">
              Demo Sign In Required
            </h1>
            <p className="text-sm sm:text-base font-medium text-[#1C1C1C]/80 max-w-2xl mx-auto leading-relaxed">
              To access and explore the features of <strong className="font-extrabold text-[#1C1C1C]">SkillPassport</strong> (Evidence Intelligence, Verified Skill Profiles, Career Gaps, and Learning Roadmaps), please perform the demo sign in below.
            </p>
          </div>

          {/* Primary 1-Click Action Button (Styled after the Enter Evidence Center button) */}
          <div className="flex flex-col items-center justify-center gap-3">
            <button
              onClick={() => loginDemo("employee")}
              className="bg-[#F6BB84] hover:bg-[#f5ad70] active:scale-[0.99] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-sm sm:text-base font-extrabold tracking-[0.08em] uppercase px-8 sm:px-10 py-4 rounded-full inline-flex items-center gap-3 transition-all shadow-[4px_4px_0px_#1C1C1C] cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>1-CLICK DEMO SIGN IN (ALEX RIVERA · CANDIDATE)</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-[11px] font-bold text-[#1C1C1C]/60 uppercase tracking-wider">
              Instant access • No password needed • Full interactive prototype
            </p>
          </div>

          {/* Persona Selection Grid */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
              <span className="text-xs font-black tracking-wider uppercase text-[#1C1C1C]/70">
                Or select a specific test persona:
              </span>
              <Link
                href="/login"
                className="text-xs font-extrabold text-[#1C1C1C] hover:underline flex items-center gap-1"
              >
                Custom Login Form <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Persona 1: Candidate / Engineer */}
              <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between hover:shadow-[3px_3px_0px_#1C1C1C] transition-all">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#DFE968] border border-[#1C1C1C]">
                      CANDIDATE · DEFAULT
                    </span>
                    <User className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    Alex Rivera (Senior Software Engineer)
                  </h3>
                  <p className="text-xs text-[#1C1C1C]/75 font-medium leading-relaxed">
                    14 verified commits, pull request evidence, canonical taxonomy mapping, role gap analysis, and personalized learning roadmaps.
                  </p>
                </div>
                <button
                  onClick={() => loginDemo("employee")}
                  className="w-full py-2.5 px-4 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#DFE968] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[1px_1px_0px_#1C1C1C]"
                >
                  Sign In as Alex Rivera <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Persona 2: Engineering Manager */}
              <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between hover:shadow-[3px_3px_0px_#1C1C1C] transition-all">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#F6C8D6] border border-[#1C1C1C]">
                      LEADERSHIP
                    </span>
                    <Users className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    Elena Rostova (Engineering Director)
                  </h3>
                  <p className="text-xs text-[#1C1C1C]/75 font-medium leading-relaxed">
                    Team skill heatmap, competency growth trajectory, project allocation, and verification reviews across engineering teams.
                  </p>
                </div>
                <button
                  onClick={() => loginDemo("manager")}
                  className="w-full py-2.5 px-4 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#F6C8D6] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[1px_1px_0px_#1C1C1C]"
                >
                  Sign In as Elena Rostova <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Persona 3: Technical Recruiter */}
              <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between hover:shadow-[3px_3px_0px_#1C1C1C] transition-all">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#DFE968] border border-[#1C1C1C]">
                      HIRING
                    </span>
                    <Search className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    Marcus Vance (Technical Talent Lead)
                  </h3>
                  <p className="text-xs text-[#1C1C1C]/75 font-medium leading-relaxed">
                    Inspect shareable passports, evaluate role alignment against Job Descriptions, and verify candidate proof records in seconds.
                  </p>
                </div>
                <button
                  onClick={() => loginDemo("recruiter")}
                  className="w-full py-2.5 px-4 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#DFE968] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[1px_1px_0px_#1C1C1C]"
                >
                  Sign In as Marcus Vance <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Persona 4: AI Governance Auditor */}
              <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[2px_2px_0px_#1C1C1C] flex flex-col justify-between hover:shadow-[3px_3px_0px_#1C1C1C] transition-all">
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#F6BB84] border border-[#1C1C1C]">
                      GOVERNANCE
                    </span>
                    <ShieldCheck className="w-4 h-4 text-[#1C1C1C]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    Dr. Sarah Chen (Chief AI Auditor)
                  </h3>
                  <p className="text-xs text-[#1C1C1C]/75 font-medium leading-relaxed">
                    Audit hallucination guard, inspect prompt-injection defenses, review uncertainty calibration, and manage human review queue.
                  </p>
                </div>
                <button
                  onClick={() => loginDemo("auditor")}
                  className="w-full py-2.5 px-4 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#F6BB84] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[1px_1px_0px_#1C1C1C]"
                >
                  Sign In as Dr. Sarah Chen <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="max-w-4xl w-full mx-auto text-center pt-6 border-t border-[#1C1C1C]/15 text-xs text-[#1C1C1C]/60 font-medium">
          SkillPassport is an evidence-backed continuous talent intelligence platform powered by GrowthLens.
        </div>
      </div>
    );
  }

  // Once authenticated, render children normally
  return <>{children}</>;
}
