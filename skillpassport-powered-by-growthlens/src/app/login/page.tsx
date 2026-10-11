"use client";

import { useState } from "react";
import Link from "next/link";
import SPHeader from "@/components/layout/SPHeader";
import { ArrowRight, AlertCircle, Loader2, Info } from "lucide-react";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

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
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-4xl font-extrabold mb-3">Welcome back</h1>
              <p className="text-lg font-medium text-gray-700">
                Sign in to your SkillPassport powered by GrowthLens.
              </p>
            </div>

            {statusMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
                <Info className="w-5 h-5 text-[#1C1C1C] flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold leading-relaxed">{statusMessage}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider ml-4">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] placeholder:text-gray-400 font-medium"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="block text-xs font-black uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setStatusMessage(
                        "Password reset is disabled in this public prototype demonstration."
                      )
                    }
                    className="text-xs font-bold underline hover:opacity-80"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="pill-input w-full bg-[#FBF6DF] border-[#1C1C1C] font-medium"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                    VALIDATING CREDENTIALS ···
                  </>
                ) : (
                  <>
                    LOG IN <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm font-medium">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-extrabold underline hover:text-[#4A7A4E] transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>

          {/* Right Column: Organic Graphic Visual */}
          <div className="hidden lg:flex flex-1 justify-center relative w-full h-[540px]">
            <div
              className="w-full max-w-md h-full bg-gradient-to-tr from-[#DFE968] via-[#FBF1CF] to-[#F3A878] border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C]"
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
