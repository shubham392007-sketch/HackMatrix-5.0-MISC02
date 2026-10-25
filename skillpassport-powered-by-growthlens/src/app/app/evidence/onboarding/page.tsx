"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function EvidenceOnboardingRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading, profile } = useAuth();

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!isLoading) {
      timer = setTimeout(() => {
        if (!isAuthenticated) {
          router.replace("/login?redirect=/app/onboarding");
        } else if (profile?.onboarding_status === "completed") {
          router.replace("/app/evidence");
        } else {
          router.replace("/app/evidence");
        }
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, isAuthenticated, profile, router]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]"
      style={{
        background: "transparent",
      }}
    >
      <div className="relative flex items-center justify-center max-w-sm w-full mx-4">
        <div className="absolute -inset-2 bg-[#DFE968]/30 rounded-3xl blur-xl pointer-events-none" />
        <div className="relative p-8 rounded-3xl bg-[#FBF6DF]/90 border-[1.5px] border-[#1C1C1C] shadow-[5px_5px_0_0_#1C1C1C] flex flex-col items-center justify-center w-full overflow-hidden">
          <LoadingAnimation size="md" className="relative z-10" />
          <p className="mt-4 text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
            Redirecting to Skill Passport Onboarding ···
          </p>
        </div>
      </div>
    </div>
  );
}
