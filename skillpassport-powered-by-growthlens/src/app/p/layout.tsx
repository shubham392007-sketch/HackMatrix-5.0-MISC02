import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, ExternalLink, Sparkles } from "lucide-react";

export default function RecruiterPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#1C1C1C] font-sans antialiased selection:bg-[#DFE968] selection:text-[#1C1C1C]">
      {/* Top Banner - Recruiter Notice */}
      <div className="bg-[#1C1C1C] text-[#FBF1CF] text-xs py-2 px-4 border-b border-ink/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DFE968] animate-pulse"></span>
            <span className="font-mono uppercase tracking-wider text-[11px]">
              Verified Candidate Passport View
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">
              Zero unverified assertions. All skills backed by repository evidence.
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/70">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#DFE968]" /> Allowlist-Restricted Projection
            </span>
          </div>
        </div>
      </div>

      {/* Recruiter Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-ink/10 px-4 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-ink/15 flex items-center justify-center font-black text-ink shadow-sm group-hover:scale-105 transition-transform">
                SP
              </div>
              <div>
                <div className="flex items-center gap-2 leading-none">
                  <span
                    className="text-2xl tracking-tight text-ink"
                    style={{ fontFamily: "'Yellowtail', cursive" }}
                  >
                    SkillPassport
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF1CF] border border-ink/15 text-ink uppercase tracking-wide">
                    GrowthLens
                  </span>
                </div>
                <p className="text-[11px] text-ink/60 font-medium mt-0.5">
                  Verified Talent & Provenance Engine
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cryptographic Provenance Verified</span>
            </div>
            <Link
              href="/app/passport"
              className="px-3.5 py-1.5 rounded-full bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold tracking-wide transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Candidate Portal</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Recruiter Footer */}
      <footer className="mt-auto border-t border-ink/10 bg-[#FAF6EC] py-10 px-4 text-xs text-ink/70">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-ink/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-ink text-sm">
                SkillPassport Provenance & Verification Standard
              </span>
            </div>
            <div className="text-xs text-ink/60 font-mono">
              SPEC-IM03 • RECRUITER SAFE PROJECTION
            </div>
          </div>

          <p className="text-ink/70 leading-relaxed max-w-3xl">
            This candidate passport is rendered via a strict privacy allowlist projection. All verified skills displayed here have been deterministically corroborated against authentic repository commits, merged pull requests, and peer-reviewed technical deliverables. Candidate self-reported claims, speculative generative text, and internal AI training logs are strictly prohibited from this projection.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2">
            <div className="flex items-center gap-4 text-ink/60">
              <span>© {new Date().getFullYear()} GrowthLens Intelligence</span>
              <span>•</span>
              <span>Privacy & Data Minimization Guaranteed</span>
              <span>•</span>
              <span>GDPR / CCPA Candidate Controlled</span>
            </div>
            <div className="flex items-center gap-2 text-ink/70 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-[#DFE968]" />
              <span>SkillPassport Powered by GrowthLens</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
