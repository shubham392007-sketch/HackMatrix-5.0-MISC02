"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { sanitizeRedirectUrl } from "@/lib/urlUtils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirect");
  const redirectTarget = sanitizeRedirectUrl(rawRedirect, "/app/evidence", {
    redirectOnboardingToEvidence: true,
  });
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTouched({ email: true, password: true });

    if (!email || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("email not confirmed")) {
          setErrorMessage(
            "Your email address has not been verified yet. Please check your inbox or visit the verification screen to request a new link."
          );
        } else {
          setErrorMessage(msg || "Failed to sign in. Please verify your credentials.");
        }
        setLoading(false);
        return;
      }

      // Verify email confirmation status and check onboarding state
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isConfirmed = Boolean(
          session.user.email_confirmed_at || (session.user as any).confirmed_at
        );
        if (!isConfirmed) {
          router.push(
            `/auth/verify-email?status=unverified&email=${encodeURIComponent(
              session.user.email || email.trim()
            )}`
          );
          return;
        }
      }

      if (session?.access_token) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
          let profileResp: Response | null = null;
          try {
            profileResp = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/profile/me`, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          } catch {
            // direct backend unavailable, try relative fallback
          }
          if (!profileResp || !profileResp.ok) {
            profileResp = await fetch("/api/v1/profile/me", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
          }
          if (profileResp && profileResp.ok) {
            const profileData = await profileResp.json();
            if (typeof window !== "undefined") {
              sessionStorage.setItem("sp_user_profile", JSON.stringify(profileData));
            }
            if (profileData.onboarding_status && profileData.onboarding_status !== "completed") {
              router.push("/app/onboarding");
              return;
            }
          }
        } catch (e) {
          console.warn("Could not verify profile onboarding state:", e);
        }
      }

      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-[28px] p-7 sm:p-9 md:p-10 shadow-[4px_4px_0px_#171717] flex flex-col justify-between transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        {/* Brand Monogram & Wordmark Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#171717] text-[#FAF8F5] flex items-center justify-center font-black text-xs tracking-tight shadow-[1.5px_1.5px_0_0_#E6AC70]">
            SP
          </div>
          <div className="flex items-center gap-1.5 select-none">
            <span
              className="text-xl sm:text-2xl text-[#171717] leading-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              SkillPassport
            </span>
          </div>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#E6AC70] text-[#171717] border border-[#171717] shadow-[0.5px_0.5px_0_0_#171717]">
            Auth
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#171717] tracking-tight">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#171717]/70 leading-relaxed">
            Sign in to continue to your SkillPassport workspace.
          </p>
        </div>

        {/* Global Error Notification */}
        {errorMessage && (
          <div className="p-3.5 mb-5 rounded-2xl bg-[#FFE4E6] border border-[#FECDD3] text-[#BE123C] shadow-sm flex items-start gap-2.5 text-xs font-semibold animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="leading-relaxed">{errorMessage}</p>
              {errorMessage.toLowerCase().includes("verified") && (
                <Link
                  href={`/auth/verify-email?status=unverified${
                    email ? `&email=${encodeURIComponent(email)}` : ""
                  }`}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-[#BE123C] underline hover:text-[#9F1239]"
                >
                  <span>Go to email verification &rarr;</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Email Field */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#171717]/45">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                placeholder="you@company.com"
                className={`w-full h-[52px] bg-white border rounded-full pl-11 pr-4 text-sm font-semibold text-[#171717] placeholder:text-[#171717]/35 focus:outline-none transition-all duration-200 ${
                  touched.email && !email
                    ? "border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200"
                    : "border-[#171717]/25 hover:border-[#171717]/50 focus:border-[#171717] focus:ring-2 focus:ring-[#E6AC70]/40 focus:shadow-[1px_1px_0_0_#171717]"
                }`}
              />
            </div>
            {touched.email && !email && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 ml-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Please enter your email address.
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase tracking-wider text-[#171717]"
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] font-bold text-[#171717]/70 hover:text-[#171717] underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#171717]/45">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                placeholder="••••••••••••"
                className={`w-full h-[52px] bg-white border rounded-full pl-11 pr-12 text-sm font-semibold text-[#171717] placeholder:text-[#171717]/35 focus:outline-none transition-all duration-200 ${
                  touched.password && !password
                    ? "border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200"
                    : "border-[#171717]/25 hover:border-[#171717]/50 focus:border-[#171717] focus:ring-2 focus:ring-[#E6AC70]/40 focus:shadow-[1px_1px_0_0_#171717]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#171717]/45 hover:text-[#171717] transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && !password && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 ml-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Please enter your password.
              </p>
            )}
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-[#171717] hover:bg-[#000000] border-[1.5px] border-[#171717] text-[#FAF8F5] text-xs sm:text-sm font-extrabold tracking-[0.08em] uppercase px-5 rounded-full flex items-center justify-center gap-2 shadow-[2.5px_2.5px_0_0_#171717] hover:shadow-[3.5px_3.5px_0_0_#171717] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_#171717] cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[2.5px_2.5px_0_0_#171717] group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#E6AC70]" />
                  <span>SIGNING IN ···</span>
                </>
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4 h-4 text-[#FAF8F5] group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Secondary Registration Link */}
      <div className="text-center pt-5 mt-6 border-t border-[#171717]/10">
        <p className="text-xs font-semibold text-[#171717]/70">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-extrabold text-[#171717] underline hover:text-[#E6AC70] ml-1 transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#171717] bg-transparent relative">
      <SPHeader />

      <main className="flex-1 flex items-center justify-center py-8 sm:py-12 md:py-16 px-4 sm:px-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch justify-items-center">
          {/* Left Column: Dedicated Authentication Panel */}
          <div className="w-full flex justify-center">
            <Suspense
              fallback={
                <div className="w-full max-w-[460px] h-[520px] bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-[28px] p-10 flex flex-col items-center justify-center shadow-[4px_4px_0_0_#171717]">
                  <LoadingAnimation size="md" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          {/* Right Column: Refined Product Information Card */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[460px] bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-[28px] p-7 sm:p-9 md:p-10 flex flex-col justify-between shadow-[4px_4px_0_0_#171717] transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
              <div>
                {/* GrowthLens Protocol Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171717] text-[#FAF8F5] text-[10px] font-mono font-bold tracking-wider uppercase mb-5 shadow-[1px_1px_0_0_#E6AC70]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E6AC70] animate-pulse" />
                  <span>GrowthLens Protocol</span>
                </div>

                {/* Primary Value Proposition Headline */}
                <h2 className="text-2xl sm:text-[26px] font-serif font-black text-[#171717] tracking-tight leading-snug mb-3">
                  Engineering merit backed by verifiable code evidence.
                </h2>

                <p className="text-xs sm:text-[13px] font-medium text-[#171717]/70 leading-relaxed mb-6">
                  SkillPassport transforms daily engineering artifacts into inspectable, tamper-evident competency signals without self-attestation.
                </p>

                {/* The 3 Core Pillars */}
                <div className="space-y-4">
                  {/* Pillar 1: Deterministic Ingestion */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#171717] text-[#171717] flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#171717] mt-0.5">
                      <GitBranch className="w-4 h-4 text-[#171717]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-xs font-black text-[#171717] uppercase tracking-wider">
                        Deterministic Ingestion
                      </h3>
                      <p className="text-xs text-[#171717]/70 leading-relaxed">
                        Claims are anchored to raw commit hashes, PR reviews, and author attribution.
                      </p>
                    </div>
                  </div>

                  {/* Pillar 2: Multi-Stage Verification */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#171717] text-[#171717] flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#171717] mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-[#2D5A43]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-xs font-black text-[#171717] uppercase tracking-wider">
                        Multi-Stage Verification
                      </h3>
                      <p className="text-xs text-[#171717]/70 leading-relaxed">
                        Zero synthetic padding. Every capability is verified against proven work.
                      </p>
                    </div>
                  </div>

                  {/* Pillar 3: Auditable Passport */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#171717] text-[#171717] flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#171717] mt-0.5">
                      <Sparkles className="w-4 h-4 text-[#E6AC70]" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-xs font-black text-[#171717] uppercase tracking-wider">
                        Auditable Passport
                      </h3>
                      <p className="text-xs text-[#171717]/70 leading-relaxed">
                        Shareable candidate view with granular privacy and verifiable provenance proofs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-divider & Footer */}
              <div className="pt-6 mt-6 border-t border-[#171717]/10 flex items-center justify-between text-[10.5px] font-mono font-bold tracking-wider text-[#171717]/60">
                <span>SKILLPASSPORT · v2.4</span>
                <span>AUDITABLE PROVENANCE</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
