import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    // Server-side only: proxy API requests to backend
    // In Docker: API_PROXY_URL=http://lia:8000 (internal network)
    // Local dev: defaults to http://localhost:8000
    const apiUrl = process.env.API_PROXY_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/auth/:path*", destination: `${apiUrl}/auth/:path*` },
      { source: "/users/:path*", destination: `${apiUrl}/users/:path*` },
      { source: "/admin/:path*", destination: `${apiUrl}/admin/:path*` },
    ];
  },
};

export default nextConfig;
// Force restart: fixed stale code issue
