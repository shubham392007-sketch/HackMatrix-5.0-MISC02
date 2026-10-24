import type { NextConfig } from "next";

/**
 * Resolves the backend proxy destination URL based on environment configuration.
 * - BACKEND_INTERNAL_URL: Server-side only URL (VPC / internal service mesh)
 * - NEXT_PUBLIC_BACKEND_URL: Public backend URL (shared with client components)
 * - Defaults to http://127.0.0.1:8001 for local development
 * Strips trailing slashes and avoids duplicate /api/v1 prefixes.
 */
export function getBackendProxyTarget(env: Record<string, string | undefined> = process.env): string {
  const rawTarget =
    env.BACKEND_INTERNAL_URL ||
    env.NEXT_PUBLIC_BACKEND_URL ||
    "http://127.0.0.1:8001";

  let cleanTarget = rawTarget.trim().replace(/\/+$/, "");
  if (cleanTarget.endsWith("/api/v1")) {
    cleanTarget = cleanTarget.slice(0, -"/api/v1".length);
  }
  return `${cleanTarget}/api/v1/:path*`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: getBackendProxyTarget(),
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/app/login",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
