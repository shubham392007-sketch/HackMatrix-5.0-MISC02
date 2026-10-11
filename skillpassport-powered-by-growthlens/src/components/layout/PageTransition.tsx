"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    const timer = setTimeout(() => setAnimating(false), 480);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div key={pathname} className={animating ? "gl-page-enter" : ""}>
      {children}
    </div>
  );
}
