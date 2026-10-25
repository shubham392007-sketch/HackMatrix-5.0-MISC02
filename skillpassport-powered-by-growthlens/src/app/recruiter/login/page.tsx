"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building, ArrowRight, RotateCw } from "lucide-react";

function RecruiterLoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/recruiter/dashboard";

  useEffect(() => {
    // The manager login is the unified recruiter/employer login
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [router, redirectTarget]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border-2 border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E0533C]/10 border border-[#E0533C]/30 flex items-center justify-center text-[#E0533C]">
          <Building className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#1A1918] tracking-tight">
            Unified Manager & Recruiter Sign In
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Employer and hiring manager accounts sign in directly via the unified SkillPassport login. Redirecting you now...
          </p>
        </div>
        <div className="flex justify-center py-2">
          <RotateCw className="w-6 h-6 text-[#1A1918] animate-spin" />
        </div>
        <div>
          <Link
            href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#E0533C] hover:underline"
          >
            <span>Click here if you are not automatically redirected</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RecruiterLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
          <RotateCw className="w-6 h-6 text-[#1A1918] animate-spin" />
        </div>
      }
    >
      <RecruiterLoginRedirectContent />
    </Suspense>
  );
}
