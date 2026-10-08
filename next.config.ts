import type { NextConfig } from "next";

const assetHost = process.env.NEXT_PUBLIC_ASSET_HOST ?? "assets.picraft.ai";
const isProduction = process.env.NODE_ENV === "production";

/** Applied to every response. A CSP is not set here because analytics and error-monitoring scripts must be allowed first. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // No includeSubDomains or preload: other subdomains (assets, mail) may not serve HTTPS yet.
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: assetHost }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Generated API responses are per visitor and must never be stored by a shared cache.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      // Example files have a timestamp in their name, so a changed file always gets a new URL.
      {
        source: "/examples/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Logos and maker covers keep their file names, so they get a shorter cache with background refresh.
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
