"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function EvidenceOnboardingRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading, profile } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login?redirect=/app/onboarding");
      } else if (profile?.onboarding_status === "completed") {
        router.replace("/app/evidence");
      } else {
        router.replace("/app/onboarding");
      }
    }
  }, [isLoading, isAuthenticated, profile, router]);

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
        Redirecting to Skill Passport Onboarding ···
      </p>
    </div>
  );
}
