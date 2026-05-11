import type { NextConfig } from "next";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "https://dev.joaobarres.dev";

const nextConfig: NextConfig = {
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
