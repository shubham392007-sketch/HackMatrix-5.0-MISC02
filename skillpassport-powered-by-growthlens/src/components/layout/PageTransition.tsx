"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Only scroll window on public pages (home, about, features, etc.)
    // In-app workspace routes (/app/*) maintain their own main content scroll container
    // so the persistent sidebar scroll position is never disturbed.
    if (!pathname.startsWith("/app")) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 relative z-[1]">
      {children}
    </div>
  );
}
