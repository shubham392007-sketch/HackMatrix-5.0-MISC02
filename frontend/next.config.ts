import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.212.252.240", "localhost:3000", "127.0.0.1:3000"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/feature4/:path*",
        destination: "http://127.0.0.1:8000/feature4/:path*",
      },
    ];
  },
};

export default nextConfig;
