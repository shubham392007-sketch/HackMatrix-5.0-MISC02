"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [role, setRole] = useState<"employee" | "manager">("employee");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationPending, setVerificationPending] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
      const { error } = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        role
      );

      if (error) {
        setErrorMessage(error.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      // Direct authenticated user straight into unified onboarding setup
      router.push("/app/onboarding");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during registration.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-5xl flex flex-col lg:flex-row items-center gap-12">
          {/* Left Column: Form Panel */}
          <div className="flex-1 w-full max-w-md mx-auto space-y-6">
            <div className="text-center lg:text-left space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider mb-2">
                CREATE SUPABASE ACCOUNT
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1C1C1C] tracking-tight">
                Create Account
              </h1>
              <p className="text-sm font-medium text-[#1C1C1C]/75">
                Start your evidence-backed professional skill passport.
              </p>
            </div>

            {verificationPending ? (
              <div className="p-6 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-[#2E7D32]" />
                  <h3 className="text-lg font-black text-[#1C1C1C]">Confirmation Email Sent</h3>
                </div>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  We have dispatched a verification email to <strong className="font-bold text-[#1C1C1C]">{email}</strong>. Please click the confirmation link in the email to activate your account and begin your evidence onboarding.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#1C1C1C] underline"
                  >
                    <span>Return to Login</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
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
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
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
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
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
                        className="w-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] placeholder:text-[#1C1C1C]/35 focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                      />
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
                        <span>CREATING ACCOUNT IN SUPABASE ···</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT & BEGIN SETUP</span>
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
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#F3A878] via-[#FBF1CF] to-[#DFE968] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
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
