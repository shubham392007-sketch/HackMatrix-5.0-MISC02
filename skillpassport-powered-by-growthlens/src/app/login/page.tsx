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
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get("redirect") || "/app/evidence";
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
            // direct backend unavailable, try relative
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

      router.push(redirectTarget || "/app/evidence");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-lg mx-auto space-y-6">
      <div className="text-center lg:text-left space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-2">
          SECURE SUPABASE AUTHENTICATION
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1C1C] tracking-tight">
          Welcome back
        </h1>
        <p className="text-sm font-medium text-[#1C1C1C]/75">
          Sign in to access your personal SkillPassport evidence workspace.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{errorMessage}</p>
            {errorMessage.toLowerCase().includes("verified") && (
              <Link
                href={`/auth/verify-email?status=unverified${email ? `&email=${encodeURIComponent(email)}` : ""}`}
                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] underline hover:text-[#E0533C]"
              >
                <span>Go to verification screen &rarr;</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Main Authentication Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              required
              className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[11px] font-black text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-12 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50 hover:text-[#1C1C1C]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#DFE968] hover:bg-[#d4df55] active:scale-[0.99] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1C1C1C] cursor-pointer transition-all disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AUTHENTICATING WITH SUPABASE ···</span>
            </>
          ) : (
            <>
              <span>LOG IN TO WORKSPACE</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-[#1C1C1C]/15">
        <p className="text-xs font-bold text-[#1C1C1C]/70">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/signup"
            className="font-black text-[#1C1C1C] underline hover:text-[#E0533C]"
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
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-5xl flex flex-col lg:flex-row items-center gap-12">
          <Suspense
            fallback={
              <div className="flex-1 flex justify-center items-center p-12">
                <LoadingAnimation size="md" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Right Column: Organic Graphic Visual */}
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div
              className="w-full max-w-md h-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
              style={{ borderRadius: "45% 55% 45% 55% / 58% 42% 55% 45%" }}
            >
              <h2
                className="text-5xl md:text-6xl lg:text-7xl text-[#1C1C1C] mb-3 font-normal tracking-tight"
                style={{ fontFamily: "'Yellowtail', cursive", transform: "rotate(-4deg)" }}
              >
                SkillPassport
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1C1C]/80 max-w-[260px]">
                Powered by GrowthLens • Verifiable Skills
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
