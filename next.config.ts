import type { NextConfig } from "next";

// The app lives at mg.joelbary.com/domino
const nextConfig: NextConfig = {
  basePath: "/domino",
  async redirects() {
    return [{ source: "/", destination: "/domino", basePath: false, permanent: false }];
  },
};

export default nextConfig;
