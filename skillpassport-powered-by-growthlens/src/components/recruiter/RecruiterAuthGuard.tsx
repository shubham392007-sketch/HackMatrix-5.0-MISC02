"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  getCurrentRecruiterProfile,
  logoutRecruiter,
  RecruiterProfile,
} from "@/lib/recruiterApi";
import { Building, ShieldAlert, RotateCw, ArrowRight, LogOut, Briefcase } from "lucide-react";

export default function RecruiterAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthenticated" | "forbidden">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyRecruiterAccess() {
      try {
        // 1. Verify that a valid Supabase session exists
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          if (isMounted) {
            setAuthStatus("unauthenticated");
            const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
            router.replace(`/recruiter/login${redirectParam}`);
          }
          return;
        }

        // 2. Query backend to verify active organization membership
        const recProfile = await getCurrentRecruiterProfile();
        if (isMounted) {
          setProfile(recProfile);
          setAuthStatus("authorized");
        }
      } catch (err: any) {
        if (isMounted) {
          const detail = err.message || "Employer authorization required.";
          setErrorMessage(detail);
          setAuthStatus("forbidden");
        }
      }
    }

    verifyRecruiterAccess();

    // Listen to real-time auth state updates (e.g., signout from another tab)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        if (isMounted) {
          setAuthStatus("unauthenticated");
          router.replace("/recruiter/login");
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const handleSignOutAndSwitch = async () => {
    await logoutRecruiter();
    router.replace("/recruiter/login");
  };

  // 1. Verification Loading Screen
  if (authStatus === "checking") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-[#1A1918]">
        <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] flex flex-col items-center justify-center max-w-sm w-full">
          <RotateCw className="w-8 h-8 text-[#1A1918] animate-spin mb-4" />
          <p className="text-xs font-black tracking-widest uppercase text-[#1A1918]/80">
            VERIFYING EMPLOYER WORKSPACE ···
          </p>
          <span className="text-[11px] text-stone-500 mt-1">Checking organization credentials</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Screen
  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-[#1A1918]">
        <div className="relative p-8 rounded-3xl bg-[#FAF8F5] border-[1.5px] border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] flex flex-col items-center justify-center max-w-sm w-full space-y-3">
          <Building className="w-8 h-8 text-[#E0533C]" />
          <h2 className="text-lg font-black tracking-tight">Employer Sign In Required</h2>
          <p className="text-xs text-stone-600">
            Please sign in to access candidate Skill Passports and manage job openings.
          </p>
          <Link
            href={`/recruiter/login?redirect=${encodeURIComponent(pathname || "/recruiter/dashboard")}`}
            className="w-full py-2.5 rounded-full bg-[#1A1918] text-[#FAF8F5] text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-[2px_2px_0_0_#1A1918]"
          >
            <span>Go to Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. Authenticated but Unauthorized (e.g. Candidate without Recruiter Membership)
  if (authStatus === "forbidden") {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center text-[#1A1918]">
        <div className="relative p-8 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] flex flex-col items-center justify-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <ShieldAlert className="w-6 h-6 text-amber-800" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight">Recruiter Authorization Required</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              {errorMessage || "Your authenticated account does not currently possess an active recruiter or hiring manager membership."}
            </p>
          </div>

          <div className="w-full pt-2 space-y-2">
            <Link
              href="/app/evidence"
              className="w-full py-2.5 rounded-full bg-[#1A1918] text-[#FAF8F5] text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors shadow-[2px_2px_0_0_#1A1918]"
            >
              <Briefcase className="w-4 h-4" />
              <span>Return to Candidate Workspace</span>
            </Link>
            
            <Link
              href="/recruiter/register"
              className="w-full py-2.5 rounded-full bg-[#FAF8F5] border border-[#1A1918] text-[#1A1918] text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-100 transition-colors shadow-[1.5px_1.5px_0_0_#1A1918]"
            >
              <Building className="w-4 h-4" />
              <span>Register an Employer Organization</span>
            </Link>

            <button
              onClick={handleSignOutAndSwitch}
              className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Recruiter
  return <>{children}</>;
}
