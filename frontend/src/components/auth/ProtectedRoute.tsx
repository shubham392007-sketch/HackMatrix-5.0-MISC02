"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"EMPLOYEE" | "MANAGER" | "ADMIN">;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { authenticated, loading, role, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!authenticated) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (profile && !profile.onboarding_completed && pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
    }
  }, [authenticated, loading, pathname, router, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-between text-[#1C1C1C]">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="gl-card max-w-sm w-full p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col items-center gap-4 text-center">
            <div className="w-10 h-10 rounded-full border-3 border-[#1C1C1C] border-t-[#DFE968] animate-spin" />
            <p className="text-xs font-extrabold tracking-[0.14em] uppercase text-[#1C1C1C]">
              AUTHENTICATING TALENT RECORD ···
            </p>
          </div>
        </main>
        <GlobalFooter />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  // Check role permissions if route restricts roles
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex flex-col justify-between text-[#1C1C1C]">
        <GlobalHeader />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="gl-card max-w-md w-full p-8 border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#F6C8D6] border border-[#1C1C1C] mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-[#1C1C1C]" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Access Restricted</h2>
            <p className="text-sm font-medium text-gray-700">
              Your account has the role <span className="font-bold underline">{role}</span>, which is not authorized to access this intelligence view.
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.push(role === "MANAGER" ? "/manager/dashboard" : "/employee/dashboard")}
                className="pill-btn pill-btn-primary text-xs font-black uppercase px-6 py-2.5"
              >
                RETURN TO YOUR DASHBOARD →
              </button>
            </div>
          </div>
        </main>
        <GlobalFooter />
      </div>
    );
  }

  return <>{children}</>;
}
