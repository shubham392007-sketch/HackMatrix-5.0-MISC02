"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((mod) => mod.Agentation),
  { ssr: false }
);

export default function AgentationProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Explicit kill-switch
  if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "false") {
    return null;
  }

  // Active if explicitly enabled OR running in development / on localhost
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      process.env.NODE_ENV === "development");

  const isEnabled =
    process.env.NEXT_PUBLIC_ENABLE_AGENTATION === "true" || isDevHost;

  if (!isEnabled) {
    return null;
  }

  return <Agentation endpoint="http://localhost:4747" />;
}
