import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/portal",
          destination: "/portal.html",
        },
      ],
    };
  },
};

export default nextConfig;
