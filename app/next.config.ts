import type { NextConfig } from "next";

/**
 * Sent with every answer. None of them limits what the pages themselves load; they close ways in from outside.
 *  - nosniff: a browser never guesses a file's type
 *  - frame rules: no other site can show IOpener inside a frame and trick a click
 *  - base-uri, form-action, object-src: a page cannot be pointed at another site's base, forms or plug-ins
 *  - referrer: other sites learn the site's address, never the page a person was on
 *  - permissions: the camera is for IOpener's own pages only (the on-device eye checks); the rest stay off
 *  - transport security: a browser that has seen the site over https never goes back to http
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  /* lets the dev server be opened as 127.0.0.1 as well as localhost */
  allowedDevOrigins: ["127.0.0.1"],
  /* A container build sets NEXT_OUTPUT=standalone, which writes a self-contained server to .next/standalone. */
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
