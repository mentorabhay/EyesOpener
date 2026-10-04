import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* lets the dev server be opened as 127.0.0.1 as well as localhost */
  allowedDevOrigins: ["127.0.0.1"],
  /* A container build sets NEXT_OUTPUT=standalone, which writes a self-contained server to .next/standalone. */
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
