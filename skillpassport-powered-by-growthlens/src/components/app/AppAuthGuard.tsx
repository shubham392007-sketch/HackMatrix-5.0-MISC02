"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { Mail, ShieldAlert } from "lucide-react";

export default function AppAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isEmailVerified, isLoading, profile } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const target = pathname
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login?redirect=/app/evidence";
        router.replace(target);
      } else if (!isEmailVerified) {
        // Enforce email verification before any app workspace or onboarding access
        const emailQuery = user?.email ? `&email=${encodeURIComponent(user.email)}` : "";
        router.replace(`/auth/verify-email?status=unverified${emailQuery}`);
      } else {
        // If user is authenticated, verified, and profile is loaded with incomplete onboarding, guide to onboarding wizard
        const isOnboardingRoute = pathname === "/app/onboarding" || pathname === "/app/evidence/onboarding";
        if (profile && profile.onboarding_status && profile.onboarding_status !== "completed" && !isOnboardingRoute) {
          router.replace("/app/onboarding");
        }
      }
    }
  }, [isLoading, isAuthenticated, isEmailVerified, user, profile, pathname, router]);

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
        <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
          <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
            <LoadingAnimation size="md" className="relative z-10" />
            <p className="mt-4 text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
              VERIFYING SUPABASE SESSION ···
            </p>
          </div>
        </div>
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
        <div className="relative flex items-center justify-center max-w-md w-full mx-4">
          <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
            <h2 className="text-xl font-extrabold mb-1">Authentication Required</h2>
            <p className="text-xs font-bold text-[#1C1C1C]/60 uppercase tracking-wider mb-4">
              Please sign in to access your SkillPassport workspace
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname || "/app/evidence")}`}
              className="pill-btn pill-btn-primary text-xs"
            >
              Sign In to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unverified email screen
  if (!isEmailVerified) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "linear-gradient(180deg, #FBF1CF 0%, #F6C8D6 52%, #F3A878 100%)",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="w-12 h-12 rounded-full bg-[#DFE968] border-2 border-[#1C1C1C] flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1C1C1C]">
          <Mail className="w-6 h-6 text-[#1C1C1C]" />
        </div>
        <h2 className="text-xl font-extrabold mb-1">Email Verification Required</h2>
        <p className="text-xs font-bold text-[#1C1C1C]/60 uppercase tracking-wider mb-4 max-w-sm">
          Please verify your email address to access the Skill Passport onboarding wizard.
        </p>
        <Link
          href={`/auth/verify-email?status=unverified${user?.email ? `&email=${encodeURIComponent(user.email)}` : ""}`}
          className="pill-btn pill-btn-primary text-xs"
        >
          Check Verification Status →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
