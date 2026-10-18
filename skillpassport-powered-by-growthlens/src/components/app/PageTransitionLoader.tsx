"use client";

import GlobalPageTransitionLoader from "@/components/layout/GlobalPageTransitionLoader";

/**
 * Re-export GlobalPageTransitionLoader for backwards compatibility with any
 * components or layouts still referencing PageTransitionLoader.
 */
export default function PageTransitionLoader() {
  return null; // The global loader is mounted at RootLayout
}

export { GlobalPageTransitionLoader };
