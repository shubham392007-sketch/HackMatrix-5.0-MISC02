"use client";

import { useState } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import { ArrowRight, Loader2, AlertCircle, CheckCircle, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPasswordForEmail(email.trim());
      if (error) {
        setErrorMessage(error.message || "Failed to send reset link. Please try again.");
        setLoading(false);
        return;
      }
      setSentSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-extrabold text-[#1C1C1C] tracking-tight">
              Reset Password
            </h1>
            <p className="text-sm font-medium text-[#1C1C1C]/75">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {sentSuccess ? (
            <div className="p-6 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-[#2E7D32]" />
                <h3 className="text-lg font-black text-[#1C1C1C]">Reset Email Sent</h3>
              </div>
              <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                If an account exists with <strong className="font-bold text-[#1C1C1C]">{email}</strong>, you will receive password reset instructions shortly.
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="pill-btn pill-btn-primary text-xs w-full justify-center"
                >
                  Return to Login →
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

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#DFE968] hover:bg-[#d4df55] active:scale-[0.99] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs sm:text-sm font-extrabold tracking-[0.06em] uppercase px-5 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1C1C1C] cursor-pointer transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SENDING RESET LINK ···</span>
                    </>
                  ) : (
                    <>
                      <span>SEND PASSWORD RESET EMAIL</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs font-black text-[#1C1C1C]/70 underline hover:text-[#1C1C1C]"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
