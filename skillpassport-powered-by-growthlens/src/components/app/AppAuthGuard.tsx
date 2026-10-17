"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function AppAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, profile } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const target = pathname
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login?redirect=/app/evidence";
        router.replace(target);
      } else {
        // If user is authenticated and profile is loaded with incomplete onboarding, guide to onboarding wizard
        const isOnboardingRoute = pathname === "/app/onboarding" || pathname === "/app/evidence/onboarding";
        if (profile && profile.onboarding_status && profile.onboarding_status !== "completed" && !isOnboardingRoute) {
          router.replace("/app/onboarding");
        }
      }
    }
  }, [isLoading, isAuthenticated, profile, pathname, router]);

  // Loading state while verifying Supabase session
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        <LoadingAnimation size="lg" className="mb-2" />
        <p className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
          VERIFYING SUPABASE SESSION ···
        </p>
      </div>
    );
  }

  // Unauthenticated screen
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        <LoadingAnimation size="md" className="mb-2" />
        <h2 className="text-xl font-extrabold mb-1">Authentication Required</h2>
        <p className="text-xs font-bold text-[#1C1C1C]/60 uppercase tracking-wider mb-4">
          Please sign in to access your SkillPassport workspace
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname || "/app/evidence")}`}
          className="pill-btn pill-btn-primary text-xs"
        >
          Sign In or Sign Up →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
