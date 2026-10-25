"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import { Mail, ShieldAlert, RefreshCw, LogOut } from "lucide-react";

export default function AppAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isEmailVerified, isLoading, profile, profileError, refreshProfile, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!isLoading && !profileError) {
      if (!isAuthenticated) {
        const target = pathname
          ? `/login?redirect=${encodeURIComponent(pathname)}`
          : "/login?redirect=/app/evidence";
        timer = setTimeout(() => {
          router.replace(target);
        }, 0);
      } else if (!isEmailVerified) {
        // Enforce email verification before any app workspace or onboarding access
        const emailQuery = user?.email ? `&email=${encodeURIComponent(user.email)}` : "";
        timer = setTimeout(() => {
          router.replace(`/auth/verify-email?status=unverified${emailQuery}`);
        }, 0);
      } else {
        // If user is authenticated, verified, and profile is loaded with incomplete onboarding, guide to onboarding wizard
        const isOnboardingRoute = pathname === "/app/onboarding" || pathname === "/app/evidence/onboarding";
        if (profile && profile.onboarding_status !== "completed" && !isOnboardingRoute) {
          timer = setTimeout(() => {
            router.replace("/app/onboarding");
          }, 0);
        }
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, profileError, isAuthenticated, isEmailVerified, user, profile, pathname, router]);

  // Loading state while verifying Supabase session and user profile
  if (isLoading || (isAuthenticated && isEmailVerified && profile === null && !profileError)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "transparent",
        }}
      >
        <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
          <div className="absolute -inset-2 bg-[#000000]/5 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
            <LoadingAnimation size="md" className="relative z-10" />
            <p className="mt-4 text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
              VERIFYING WORKSPACE SESSION ···
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Recoverable profile-fetch failure (Authenticated and verified, but profile fetch failed)
  if (isAuthenticated && isEmailVerified && profile === null && profileError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "transparent",
        }}
      >
        <div className="relative flex items-center justify-center max-w-md w-full mx-4">
          <div className="absolute -inset-2 bg-[#000000]/5 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden text-center">
            <div className="w-12 h-12 rounded-full bg-[#E5484D]/10 text-[#E5484D] border-2 border-[#1C1C1C] flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1C1C1C]">
              <ShieldAlert className="w-6 h-6 text-[#E5484D]" />
            </div>
            <h2 className="text-xl font-extrabold mb-1">Session Calibration Error</h2>
            <p className="text-xs font-bold text-[#1C1C1C]/60 uppercase tracking-wider mb-3">
              Unable to load your SkillPassport workspace profile
            </p>
            <p className="text-xs text-[#1C1C1C]/80 mb-6 bg-[#1C1C1C]/5 p-3 rounded-xl border border-[#1C1C1C]/10 font-mono break-words max-w-full">
              {profileError}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={async () => {
                  setRetrying(true);
                  try {
                    await refreshProfile();
                  } finally {
                    setRetrying(false);
                  }
                }}
                disabled={retrying}
                className="pill-btn pill-btn-primary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                {retrying ? (
                  <LoadingAnimation size="sm" />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Session</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="pill-btn text-xs w-full sm:w-auto inline-flex items-center justify-center gap-2 border-[1.5px] border-[#1C1C1C] bg-[#FFFFFF] hover:bg-[#FAF8F5] text-[#1C1C1C] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
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
          background: "transparent",
        }}
      >
        <div className="relative flex items-center justify-center max-w-md w-full mx-4">
          <div className="absolute -inset-2 bg-[#000000]/5 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
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

  // Unauthenticated screen
  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
        style={{
          background: "transparent",
        }}
      >
        <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
          <div className="absolute -inset-2 bg-[#000000]/5 rounded-3xl blur-xl pointer-events-none" />
          <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
            <LoadingAnimation size="md" className="relative z-10" />
            <p className="mt-4 text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
              REDIRECTING TO LOGIN ···
            </p>
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
          background: "transparent",
        }}
      >
        <div className="w-12 h-12 rounded-full bg-[#000000] text-[#FAF8F5] border-2 border-[#1C1C1C] flex items-center justify-center mb-3 shadow-[2px_2px_0px_#1C1C1C]">
          <Mail className="w-6 h-6 text-[#FAF8F5]" />
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
