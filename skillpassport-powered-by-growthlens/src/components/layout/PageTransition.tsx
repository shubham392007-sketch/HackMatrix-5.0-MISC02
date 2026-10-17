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
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      {children}
    </div>
  );
}
