"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { Loader2 } from "lucide-react";

export default function AppAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authChecked } = useEvidence();

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      const target = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login?redirect=/app/onboarding";
      router.replace(target);
    }
  }, [authChecked, isAuthenticated, pathname, router]);

  // Wait until localStorage auth check finishes to avoid hydration flicker
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FBF1CF] flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]">
        <div className="w-10 h-10 border-4 border-[#1C1C1C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]/60">
          INITIALIZING SKILLPASSPORT ···
        </p>
      </div>
    );
  }

  // If not authenticated, require the user to sign in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBF1CF] flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#1C1C1C]" />
        <h2 className="text-xl font-extrabold mb-1">Authentication Required</h2>
        <p className="text-xs font-bold text-[#1C1C1C]/60 uppercase tracking-wider mb-4">
          Please sign in or sign up to access SkillPassport features ···
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname || "/app/onboarding")}`}
          className="pill-btn pill-btn-primary text-xs"
        >
          Go to Sign In / Sign Up →
        </Link>
      </div>
    );
  }

  // Once authenticated, render children normally
  return <>{children}</>;
}
