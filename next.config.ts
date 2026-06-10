import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // API routes read public/content via fs; tracing would bundle all demo assets (~300MB+).
  outputFileTracingExcludes: {
    "/api/*": [
      "./public/content/**/*",
      "./public/channel-styles/**/*",
      "./public/renders/**/*",
    ],
  },
};

export default nextConfig;
