/**
 * GET /tryout: opens the person's try-out space in this browser (lib/session.ts TRYOUT_COOKIE) and goes to its Today.
 * For staff, verified counsellors and sponsors only; anyone else, and a press from another site, goes to their home.
 */
import { jar as cookieJar } from "@/lib/cookie-jar";
import { getViewer } from "@/lib/auth";
import { mayTryOut, TRYOUT_COOKIE } from "@/lib/session";
import { secureCookies } from "@/lib/token";
import { fromHere } from "@/lib/from-here";

export const dynamic = "force-dynamic";

/* a move by path only: behind the front door the request's own address is not the one the browser used */
const go = (to: string) => new Response(null, { status: 303, headers: { location: to, "cache-control": "no-store" } });

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return go("/login");
  if (!mayTryOut(viewer) || !fromHere(req)) return go(viewer.home);
  (await cookieJar()).set(TRYOUT_COOKIE, "1", { path: "/", sameSite: "lax", httpOnly: true, secure: secureCookies(), maxAge: 60 * 60 * 12 });
  return go("/today");
}
