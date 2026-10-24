"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((mod) => mod.Agentation),
  { ssr: false }
);

export default function AgentationProvider() {
  // Only connect to Agentation toolbar server if explicitly enabled
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== "true"
  ) {
    return null;
  }

  // Only mount if an explicit endpoint is configured or standalone mode is requested
  const endpoint = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT;
  return endpoint ? <Agentation endpoint={endpoint} /> : <Agentation />;
}
