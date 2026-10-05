import type { NextConfig } from "next";

// The app lives at domino.joelbary.com (root). Old /domino links still work.
const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async rewrites() {
    // Keeps Render's health check (/domino/api/health) working without changing settings.
    return [{ source: "/domino/api/health", destination: "/api/health" }];
  },
  async redirects() {
    return [
      { source: "/domino", destination: "/", permanent: false },
      { source: "/domino/:path((?!api/health).*)", destination: "/:path", permanent: false },
    ];
  },
};

export default nextConfig;
