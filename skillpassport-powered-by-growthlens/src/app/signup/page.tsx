"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import {
  User,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  Mail,
  Lock,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const { signUp, resendVerificationEmail } = useAuth();

  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);

  // Resend state
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResendNotice(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const { error, needsEmailVerification } = await signUp(
        trimmedEmail,
        password,
        trimmedName,
        role
      );

      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("rate limit")) {
          setErrorMessage(
            "Email rate limit reached (Supabase default limits emails to 30/hour). Please wait a few minutes before submitting again."
          );
        } else {
          setErrorMessage(msg || "Failed to create account. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (needsEmailVerification) {
        // Genuine verification required: show dedicated Check Your Email screen
        setVerificationPending(true);
        setResendCooldown(60);
        setLoading(false);
      } else {
        // In environments where email confirmation is turned off, continue to onboarding
        router.push("/app/onboarding");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendNotice(null);

    try {
      const { error } = await resendVerificationEmail(email.trim().toLowerCase());
      if (error) {
        const msg = error.message || "";
        if (msg.toLowerCase().includes("rate limit")) {
          setResendNotice("Email rate limit reached (30 emails/hr limit). Please wait a few minutes before resending.");
        } else {
          setResendNotice(`Failed to resend: ${msg}`);
        }
      } else {
        setResendNotice("Verification email resent. Please check your inbox.");
        setResendCooldown(60);
      }
    } catch (err: any) {
      setResendNotice(err.message || "Could not resend email. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-5xl flex flex-col lg:flex-row items-center gap-12">
          {/* Left Column: Form / Verification Panel */}
          <div className="flex-1 w-full max-w-md mx-auto space-y-6">
            <div className="text-center lg:text-left space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-2">
                VERIFIED SKILL PASSPORT
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1C1C] tracking-tight">
                {verificationPending ? "Check Your Email" : "Create Account"}
              </h1>
              <p className="text-sm font-medium text-[#1C1C1C]/75">
                {verificationPending
                  ? "Verify your email address before continuing to Skill Passport."
                  : "Start your evidence-backed professional skill passport."}
              </p>
            </div>

            {verificationPending ? (
              /* Dedicated Check Your Email Screen */
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0px_#1C1C1C] space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                    <Mail className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C1C1C]">Verification Email Sent</h3>
                    <p className="text-xs text-[#1C1C1C]/70">Confirmation required to continue</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/30 text-xs text-[#1C1C1C]/85 space-y-2">
                  <p>
                    Your account has been created. We sent a verification link to:
                  </p>
                  <p className="font-extrabold text-[#1C1C1C] text-sm break-all bg-white px-3 py-1.5 rounded-lg border border-[#1C1C1C]/20">
                    {email}
                  </p>
                  <p className="text-[11px] text-[#1C1C1C]/70 pt-1">
                    Please click the link in your email to verify your address and automatically launch your evidence onboarding setup.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF7EE] border border-[#1C1C1C]/20 text-[11px] text-[#1C1C1C]/75 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Did not see the email?</span>
                  </div>
                  <p>
                    Check your spam or junk folder. Verification links may take 1–2 minutes to arrive depending on your email provider.
                  </p>
                </div>

                {resendNotice && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold ${
                      resendNotice.includes("resent")
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
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resending}
                    className="w-full bg-[#000000] hover:bg-[#1A1918] active:scale-[0.99] border-[1.5px] border-[#1A1918] text-[#FAF8F5] text-xs font-extrabold uppercase tracking-wider py-3 rounded-full flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Request ···</span>
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
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationPending(false);
                        setErrorMessage(null);
                        setResendNotice(null);
                      }}
                      className="inline-flex items-center gap-1 font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Edit email address</span>
                    </button>

                    <Link
                      href="/login"
                      className="font-black text-[#1C1C1C] hover:text-[#E0533C] underline"
                    >
                      Return to Login
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Signup Form */
              <>
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
                    <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
                      Choose Your Primary Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("employee")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] text-xs font-extrabold uppercase tracking-wider transition-all ${
                          role === "employee"
                            ? "bg-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                            : "bg-[#FFFFFF] text-[#1C1C1C]/60 hover:bg-[#FBF6DF]"
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>Professional</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("manager")}
                        className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] text-xs font-extrabold uppercase tracking-wider transition-all ${
                          role === "manager"
                            ? "bg-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                            : "bg-[#FFFFFF] text-[#1C1C1C]/60 hover:bg-[#FBF6DF]"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>Manager</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your Full Name"
                        required
                        disabled={loading}
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-60"
                      />
                    </div>
                  </div>

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
                        disabled={loading}
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        disabled={loading}
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-12 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-60"
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

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        required
                        disabled={loading}
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#000000] hover:bg-[#1A1918] active:scale-[0.99] border-[1.5px] border-[#1A1918] text-[#FAF8F5] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1C1C1C] cursor-pointer transition-all disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>CREATING ACCOUNT IN SUPABASE ···</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT & VERIFY EMAIL</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2 border-t border-[#1C1C1C]/15">
                  <p className="text-xs font-bold text-[#1C1C1C]/70">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-black text-[#1C1C1C] underline hover:text-[#E0533C]"
                    >
                      Log in here
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Organic Graphic Visual */}
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div
              className="w-full max-w-md h-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
              style={{ borderRadius: "58% 42% 55% 45% / 45% 55% 45% 55%" }}
            >
              <h2
                className="text-5xl md:text-6xl lg:text-7xl text-[#1C1C1C] mb-3 font-normal tracking-tight"
                style={{ fontFamily: "'Yellowtail', cursive", transform: "rotate(3deg)" }}
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
