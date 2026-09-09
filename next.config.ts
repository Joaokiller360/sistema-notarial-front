import type { NextConfig } from "next";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
  "https://developer.joaobarres.dev";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.76"],
  // Deriva la URL del WebSocket del mismo API_BASE (NEXT_PUBLIC_API_URL sin
  // /api/v1) para no mantener dos variables que puedan desincronizarse.
  // Un NEXT_PUBLIC_WS_URL explícito, si se define, tiene prioridad.
  env: {
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || API_BASE,
  },
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