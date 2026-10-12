"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import {
  ArrowRight,
  Loader2,
  Info,
  Sparkles,
  User,
  Users,
  Search,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { DemoRole } from "@/types/evidence";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect") || "/app/evidence";
  const { loginDemo } = useEvidence();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleInstantDemo = (role: DemoRole = "employee") => {
    loginDemo(role);
    router.push(redirectTarget);
  };

  const handlePrefillCredentials = () => {
    setEmail("alex.rivera@growthlens.io");
    setPassword("demo-secure-pass");
    setStatusMessage("Demo credentials filled. Click 'LOG IN' below to proceed.");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    loginDemo("employee", {
      contactEmail: email || "alex.rivera@growthlens.io",
      displayName: email ? email.split("@")[0].replace(".", " ") : "Alex Rivera",
    });

    setTimeout(() => {
      setLoading(false);
      router.push(redirectTarget);
    }, 350);
  };

  return (
    <div className="flex-1 w-full max-w-lg mx-auto space-y-6">
      <div className="text-center lg:text-left space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-[#1C1C1C]" />
          INTERACTIVE PROTOTYPE · DEMO READY
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1C1C] tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm font-medium text-[#1C1C1C]/75">
          Sign in to your SkillPassport powered by GrowthLens.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] flex items-start gap-2.5 shadow-[2px_2px_0_0_#1C1C1C]">
          <Info className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">{statusMessage}</p>
        </div>
      )}

      {/* ⚡ 1-Click Instant Demo Box */}
      <div className="bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[3px_3px_0px_#1C1C1C] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/70">
            FAST-TRACK ACCESS
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C]">
            Recommended
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleInstantDemo("employee")}
          className="w-full bg-[#F6BB84] hover:bg-[#f5ad70] active:scale-[0.99] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1C1C1C] cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>1-CLICK DEMO SIGN IN (ALEX RIVERA)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-2 border-t border-[#1C1C1C]/15">
          <p className="text-[11px] font-bold text-[#1C1C1C]/70 mb-2 uppercase tracking-wide">
            Or test another persona:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleInstantDemo("manager")}
              className="py-1.5 px-2 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#F6C8D6] text-[10px] font-bold text-center transition-all truncate"
              title="Engineering Director (Elena Rostova)"
            >
              👩‍💼 Manager
            </button>
            <button
              type="button"
              onClick={() => handleInstantDemo("recruiter")}
              className="py-1.5 px-2 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#DFE968] text-[10px] font-bold text-center transition-all truncate"
              title="Technical Recruiter (Marcus Vance)"
            >
              🔎 Recruiter
            </button>
            <button
              type="button"
              onClick={() => handleInstantDemo("auditor")}
              className="py-1.5 px-2 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#F6BB84] text-[10px] font-bold text-center transition-all truncate"
              title="AI Auditor (Dr. Sarah Chen)"
            >
              🛡️ Auditor
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <hr className="w-full border-t border-[#1C1C1C]/20" />
        <span className="absolute bg-[#FBF1CF] px-3 text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50">
          Or sign in with email
        </span>
      </div>

      {/* Standard Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-3">
            <label className="block text-[11px] font-black uppercase tracking-wider">
              Work Email
            </label>
            <button
              type="button"
              onClick={handlePrefillCredentials}
              className="text-[10px] font-extrabold text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline"
            >
              Fill Demo Email
            </button>
          </div>
          <input
            type="email"
            required
            autoComplete="email"
            className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] placeholder:text-[#1C1C1C]/40 font-medium text-xs sm:text-sm"
            placeholder="alex.rivera@growthlens.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-3">
            <label className="block text-[11px] font-black uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() =>
                setStatusMessage("For this prototype, enter any password or click 1-Click Demo Sign In.")
              }
              className="text-[10px] font-bold underline hover:opacity-80"
            >
              Need hint?
            </button>
          </div>
          <input
            type="password"
            required
            autoComplete="current-password"
            className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium text-xs sm:text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 mt-2 text-xs sm:text-sm font-extrabold tracking-wider py-3.5 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              AUTHENTICATING DEMO SESSION ···
            </>
          ) : (
            <>
              LOG IN &amp; ENTER WORKSPACE <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs font-medium text-[#1C1C1C]/70">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-extrabold text-[#1C1C1C] underline hover:text-[#4A7A4E] transition-colors"
        >
          Create demo account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-10 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left Column: Form Panel */}
          <Suspense fallback={<div className="text-center py-12">Loading login...</div>}>
            <LoginForm />
          </Suspense>

          {/* Right Column: Organic Graphic Visual */}
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[520px]">
            <div
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#DFE968] via-[#FBF1CF] to-[#F3A878] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C] space-y-4"
              style={{ borderRadius: "45% 55% 45% 55% / 58% 42% 55% 45%" }}
            >
              <h2
                className="text-5xl md:text-6xl text-[#1C1C1C] font-normal tracking-tight"
                style={{ fontFamily: "'Yellowtail', cursive", transform: "rotate(-4deg)" }}
              >
                SkillPassport
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1C1C]/80 max-w-[260px]">
                Powered by GrowthLens • Verifiable Skills
              </p>

              <div className="pt-4 space-y-2 text-left max-w-[280px]">
                <div className="flex items-center gap-2 text-xs font-bold bg-white/70 px-3 py-1.5 rounded-full border border-[#1C1C1C]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4A7A4E]" />
                  <span>14 Verified Git Commits</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-white/70 px-3 py-1.5 rounded-full border border-[#1C1C1C]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4A7A4E]" />
                  <span>Interactive Gap Analysis</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-white/70 px-3 py-1.5 rounded-full border border-[#1C1C1C]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#4A7A4E]" />
                  <span>Personalized Roadmaps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
