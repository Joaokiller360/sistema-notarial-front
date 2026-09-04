import type { NextConfig } from "next";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "https://developer.joaobarres.dev";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.31"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "developer.joaobarres.dev",
        pathname: "/uploads/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${API_BASE}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;