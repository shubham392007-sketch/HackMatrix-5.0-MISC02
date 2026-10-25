"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function AppLoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams?.toString();
    const destination = params ? `/login?${params}` : "/login";
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FBF6DF] flex flex-col items-center justify-center p-6">
      <LoadingAnimation size="md" />
      <p className="mt-4 text-xs font-bold text-[#1C1C1C]/70 uppercase tracking-wider">
        Redirecting to secure login...
      </p>
    </div>
  );
}
