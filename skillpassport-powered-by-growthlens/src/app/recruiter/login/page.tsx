"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { loginRecruiter } from "@/lib/recruiterApi";

export default function RecruiterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both work email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await loginRecruiter({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        router.push("/recruiter/dashboard");
      }
    } catch (err: any) {
      console.error("Recruiter login failed:", err);
      setErrorMessage(
        err.message || "Invalid work email or password. Please verify your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1A1918] text-[#FAF8F5] flex items-center justify-center font-black text-base shadow-[2px_2px_0_0_#1A1918]">
            SP
          </div>
          <span className="text-xl font-black text-[#1A1918] tracking-tight">
            Skill Passport
          </span>
        </Link>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0533C]/10 border border-[#E0533C]/30 text-xs font-bold text-[#E0533C]">
            <Building className="w-3.5 h-3.5" />
            Recruiter & Employer Portal
          </span>
        </div>
        <h2 className="text-2xl font-black text-[#1A1918] tracking-tight pt-1">
          Sign In to Employer Workspace
        </h2>
        <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
          Access candidate-shared Skill Passports, publish verified openings to Career Intelligence, and inspect candidate proof.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Access Denied</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918] focus:ring-2 focus:ring-[#1A1918]/10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#1A1918]">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918] focus:ring-2 focus:ring-[#1A1918]/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-full bg-[#1A1918] hover:bg-stone-800 border-2 border-[#1A1918] text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex items-center justify-center gap-2 transition-transform active:translate-y-0.5 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Employer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="pt-4 border-t border-stone-200 text-center space-y-2">
            <p className="text-xs text-stone-600">
              New hiring organization?{" "}
              <Link
                href="/recruiter/register"
                className="font-bold text-[#1A1918] underline hover:text-[#E0533C]"
              >
                Create employer account
              </Link>
            </p>
            <p className="text-[11px] text-stone-500">
              Are you a job candidate?{" "}
              <Link
                href="/login"
                className="font-bold text-[#1A1918] hover:underline"
              >
                Sign in to Candidate Portal &rarr;
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-mono text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-side organization isolation & verified credentials</span>
        </div>
      </div>
    </div>
  );
}
