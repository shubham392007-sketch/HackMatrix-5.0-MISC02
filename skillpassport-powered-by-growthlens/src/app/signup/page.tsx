"use client";

import { useState } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import { User, Users, ArrowRight, Loader2, Info } from "lucide-react";

import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"EMPLOYEE" | "MANAGER">("EMPLOYEE");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    // Direct user straight to Domain 1 Evidence Workspace
    setTimeout(() => {
      setLoading(false);
      router.push("/app/evidence");
    }, 450);
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-[#1C1C1C]">
      <SPHeader />

      <main className="flex-grow flex items-center justify-center py-12 px-6">
        <div className="container mx-auto max-w-6xl flex flex-col lg:flex-row items-center gap-16">
          {/* Left Column: Form Panel */}
          <div className="flex-1 w-full max-w-md mx-auto">
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold mb-2">Create passport</h1>
              <p className="text-base font-medium text-gray-700">
                Join SkillPassport Powered by GrowthLens.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#1C1C1C] text-xs font-bold shadow-[2px_2px_0_0_#1C1C1C]">
                {errorMessage}
              </div>
            )}

            {statusMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
                <Info className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{statusMessage}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Role Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("EMPLOYEE")}
                    className={`py-3 px-4 rounded-full border-[1.5px] border-[#1C1C1C] flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase transition-all ${
                      role === "EMPLOYEE"
                        ? "bg-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
                        : "bg-[#FBF6DF] opacity-70"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("MANAGER")}
                    className={`py-3 px-4 rounded-full border-[1.5px] border-[#1C1C1C] flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase transition-all ${
                      role === "MANAGER"
                        ? "bg-[#F6C8D6] shadow-[2px_2px_0_0_#1C1C1C]"
                        : "bg-[#FBF6DF] opacity-70"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Reviewer
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="pill-btn pill-btn-primary w-full flex justify-center items-center gap-2 mt-4 text-sm font-extrabold tracking-wider py-4 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    CREATING PASSPORT ···
                  </>
                ) : (
                  <>
                    GET STARTED <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-extrabold underline hover:text-[#4A7A4E] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right Column: Organic Graphic Visual */}
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#DFE968] via-[#FBF1CF] to-[#F3A878] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
              style={{ borderRadius: "58% 42% 55% 45% / 45% 55% 45% 55%" }}
            >
              <h2
                className="text-5xl md:text-6xl lg:text-7xl text-[#1C1C1C] mb-3 font-normal tracking-tight"
                style={{ fontFamily: "'Yellowtail', cursive", transform: "rotate(3deg)" }}
              >
                SkillPassport
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1C1C]/80 max-w-[260px]">
                Powered by GrowthLens • Join the Network
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
