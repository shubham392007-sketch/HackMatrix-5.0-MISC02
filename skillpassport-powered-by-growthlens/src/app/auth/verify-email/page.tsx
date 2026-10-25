"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SPHeader from "@/components/layout/SPHeader";
import {
  CheckCircle2,
  AlertTriangle,
  Mail,
  ArrowRight,
  RefreshCw,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isEmailVerified, resendVerificationEmail, isAuthenticated } = useAuth();

  const statusParam = searchParams?.get("status") || "pending";
  const emailParam = searchParams?.get("email") || user?.email || "";
  const nextParam = searchParams?.get("next") || "/app/onboarding";
  const messageParam = searchParams?.get("message") || "";

  const [emailInput, setEmailInput] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  // Synchronize emailParam if it arrives late
  useEffect(() => {
    if (emailParam && !emailInput) {
      setEmailInput(emailParam);
    }
  }, [emailParam, emailInput]);

  // Handle countdown and auto-redirect on verified success
  useEffect(() => {
    if (statusParam !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace(nextParam);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [statusParam, nextParam, router]);

  // Handle resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = (emailInput || emailParam).trim().toLowerCase();

    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setResendNotice("Please provide a valid email address.");
      return;
    }

    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setResendNotice(null);

    try {
      const { error } = await resendVerificationEmail(targetEmail);
      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("rate limit")) {
          setResendNotice("Email rate limit reached (30 emails/hr limit). Please wait a few minutes before resending.");
        } else {
          setResendNotice(`Could not resend email: ${msg}`);
        }
      } else {
        setResendNotice("A new verification email has been sent. Please check your inbox.");
        setResendCooldown(60);
      }
    } catch (err: any) {
      setResendNotice(err.message || "Failed to dispatch verification email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // State C: Verified Successfully
  if (statusParam === "success" || (isAuthenticated && isEmailVerified && statusParam === "pending")) {
    return (
      <div className="p-8 rounded-2xl bg-[#FFFFFF] border-[2px] border-[#1C1C1C] shadow-[5px_5px_0px_#1C1C1C] space-y-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#DFE968] border-2 border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#1C1C1C]">
          <CheckCircle2 className="w-8 h-8 text-[#1C1C1C]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>EMAIL CONFIRMED</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1C1C1C]">
            Email Verified Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-[#1C1C1C]/75 font-medium leading-relaxed">
            Your Skill Passport account is confirmed. Establishing your authenticated session and launching your onboarding setup...
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/30 text-xs font-bold text-[#1C1C1C]">
          Redirecting automatically in{" "}
          <span className="text-base font-extrabold text-[#E0533C]">{countdown}s</span> ···
        </div>

        <div>
          <button
            type="button"
            onClick={() => router.replace(nextParam)}
            className="w-full bg-[#000000] hover:bg-[#1A1918] active:scale-[0.99] border-[1.5px] border-[#1A1918] text-[#FAF8F5] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1C1C1C] cursor-pointer transition-all"
          >
            <span>CONTINUE TO ONBOARDING NOW</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // State D & E: Expired or Invalid Link
  if (statusParam === "expired" || statusParam === "invalid" || statusParam === "error") {
    const isExpired = statusParam === "expired";
    return (
      <div className="p-8 rounded-2xl bg-[#FFFFFF] border-[2px] border-[#1C1C1C] shadow-[5px_5px_0px_#1C1C1C] space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FFA69E] border-2 border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C] shrink-0">
            <AlertTriangle className="w-6 h-6 text-[#1C1C1C]" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#1C1C1C]">
              {isExpired ? "Verification Link Expired" : "Invalid Verification Link"}
            </h2>
            <p className="text-xs text-[#1C1C1C]/70">
              {isExpired
                ? "This confirmation link has expired or has already been used."
                : "The confirmation link was not recognized or is missing a valid token."}
            </p>
          </div>
        </div>

        {messageParam && (
          <div className="p-3 rounded-xl bg-[#FFA69E]/30 border border-[#E0533C] text-xs font-bold text-[#1C1C1C]">
            {messageParam}
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#1C1C1C]/25 text-xs text-[#1C1C1C]/80 space-y-2">
          <p className="font-bold text-[#1C1C1C]">Need a new confirmation link?</p>
          <p>
            Enter your registration email address below to receive a fresh verification link.
          </p>
        </div>

        <form onSubmit={handleResend} className="space-y-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@domain.com"
                required
                className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
              />
            </div>
          </div>

          {resendNotice && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold ${
                resendNotice.includes("sent") || resendNotice.includes("resent")
                  ? "bg-[#DFE968]/30 border-[#1C1C1C] text-[#1C1C1C]"
                  : "bg-[#FFA69E]/30 border-[#E0533C] text-[#E0533C]"
              }`}
            >
              {resendNotice}
            </div>
          )}

          <button
            type="submit"
            disabled={resendCooldown > 0 || resending}
            className="w-full bg-[#000000] hover:bg-[#1A1918] active:scale-[0.99] border-[1.5px] border-[#1A1918] text-[#FAF8F5] text-xs font-extrabold uppercase tracking-wider py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-50 transition-all cursor-pointer"
          >
            {resending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SENDING VERIFICATION EMAIL ···</span>
              </>
            ) : resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>REQUEST NEW VERIFICATION LINK</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C]/15 text-xs">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Create a new account</span>
          </Link>
          <Link
            href="/login"
            className="font-black text-[#1C1C1C] hover:text-[#E0533C] underline"
          >
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  // State A: Check Your Email (Pending / Unverified)
  return (
    <div className="p-8 rounded-2xl bg-[#FFFFFF] border-[2px] border-[#1C1C1C] shadow-[5px_5px_0px_#1C1C1C] space-y-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#DFE968] border-2 border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C] shrink-0">
          <Mail className="w-6 h-6 text-[#1C1C1C]" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#1C1C1C]">Check Your Email</h2>
          <p className="text-xs text-[#1C1C1C]/70">Confirmation required before onboarding</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/30 text-xs text-[#1C1C1C]/85 space-y-2">
        <p>
          Your account has been created. Please check your inbox and verify your email address before continuing to Skill Passport:
        </p>
        {emailInput ? (
          <p className="font-extrabold text-[#1C1C1C] text-sm break-all bg-white px-3 py-2 rounded-lg border border-[#1C1C1C]/20">
            {emailInput}
          </p>
        ) : null}
        <p className="text-[11px] text-[#1C1C1C]/70 pt-1">
          Clicking the confirmation link will verify your account and automatically direct you to the onboarding wizard.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-[#FAF7EE] border border-[#1C1C1C]/20 text-[11px] text-[#1C1C1C]/75 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
          <span>Did not receive the email?</span>
        </div>
        <p>
          Check your spam or junk folder. Emails usually arrive within 1–2 minutes.
        </p>
      </div>

      {resendNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold ${
            resendNotice.includes("sent") || resendNotice.includes("resent")
              ? "bg-[#DFE968]/30 border-[#1C1C1C] text-[#1C1C1C]"
              : "bg-[#FFA69E]/30 border-[#E0533C] text-[#E0533C]"
          }`}
        >
          {resendNotice}
        </div>
      )}

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={() => handleResend()}
          disabled={resendCooldown > 0 || resending}
          className="w-full bg-[#000000] hover:bg-[#1A1918] active:scale-[0.99] border-[1.5px] border-[#1A1918] text-[#FAF8F5] text-xs font-extrabold uppercase tracking-wider py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-50 transition-all cursor-pointer"
        >
          {resending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending Verification Email ···</span>
            </>
          ) : resendCooldown > 0 ? (
            <span>Resend Email in {resendCooldown}s</span>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resend Verification Email</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-between pt-2 text-xs">
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit email or register again</span>
          </Link>
          <Link
            href="/login"
            className="font-black text-[#1C1C1C] hover:text-[#E0533C] underline"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <Suspense
            fallback={
              <div className="flex justify-center items-center p-12">
                <LoadingAnimation size="lg" />
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
