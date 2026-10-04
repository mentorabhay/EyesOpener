/**
 * Child mode containment. While a device is in child mode, the grown-up screens are sealed and the child is
 * sent back to Today. A grown-up leaves child mode from the Family screen with the exit PIN.
 * Runs before every matched request; it reads one cookie and does no database work.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSealedPath } from "@/lib/roles";
import { verifyToken } from "@/lib/token";

export function proxy(req: NextRequest) {
  if (!isSealedPath(req.nextUrl.pathname)) return NextResponse.next();
  if (!verifyToken(req.cookies.get("io_child")?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/today";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/settings/:path*", "/family/:path*", "/admin/:path*", "/counsellor/:path*", "/sponsor/:path*", "/together/share/:path*", "/together/lights/:path*", "/login"],
};
