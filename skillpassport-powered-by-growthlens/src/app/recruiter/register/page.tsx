"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building,
  Mail,
  Lock,
  User,
  Briefcase,
  Globe,
  MapPin,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import { registerRecruiter } from "@/lib/recruiterApi";

export default function RecruiterRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !workEmail.trim() || !password || !organizationName.trim() || !jobTitle.trim()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await registerRecruiter({
        full_name: fullName.trim(),
        work_email: workEmail.trim().toLowerCase(),
        password,
        organization_name: organizationName.trim(),
        job_title: jobTitle.trim(),
        website: website.trim() || undefined,
        location: location.trim() || undefined,
      });

      if (res.success) {
        router.push("/recruiter/dashboard");
      }
    } catch (err: any) {
      console.error("Recruiter registration failed:", err);
      setErrorMessage(
        err.message || "Could not complete employer registration. Please check your inputs."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2">
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
            Employer Organization Registration
          </span>
        </div>
        <h2 className="text-2xl font-black text-[#1A1918] tracking-tight pt-1">
          Create Your Employer Workspace
        </h2>
        <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
          Publish verified job openings to Career Intelligence Mode C, inspect candidate-authorized Skill Passports, and hire with verified proof.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Registration Incomplete</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                  Your Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Connor"
                    required
                    className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                  Your Job Title *
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Head of Talent"
                    required
                    className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                  />
                </div>
              </div>
            </div>

            {/* Email & Password */}
            <div>
              <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                Work Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="sarah@acme-corp.com"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                Password * (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                />
              </div>
            </div>

            {/* Organization Info */}
            <div className="pt-2 border-t border-stone-200 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                Organization Details
              </span>

              <div>
                <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                  Company / Organization Name *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Acme Robotics Inc."
                    required
                    className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                    Company Website (optional)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://acme.io"
                      className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1918] mb-1.5">
                    Location / HQ (optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full bg-[#FAF8F5] border border-[#1A1918]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-full bg-[#1A1918] hover:bg-stone-800 border-2 border-[#1A1918] text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] flex items-center justify-center gap-2 transition-transform active:translate-y-0.5 disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Creating Organization Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Employer Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="pt-4 border-t border-stone-200 text-center space-y-2">
            <p className="text-xs text-stone-600">
              Already have an employer account?{" "}
              <Link
                href="/recruiter/login"
                className="font-bold text-[#1A1918] underline hover:text-[#E0533C]"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Governance banner */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[11px] text-stone-500">
            By creating an employer account, you agree to access candidate data strictly according to candidate-granted permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
