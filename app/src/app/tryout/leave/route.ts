/** GET /tryout/leave: back from the try-out space to the person's own household (or their own area when they have none). */
import { jar as cookieJar } from "@/lib/cookie-jar";
import { getViewer } from "@/lib/auth";
import { TRYOUT_COOKIE } from "@/lib/session";
import { fromHere } from "@/lib/from-here";

export const dynamic = "force-dynamic";

/* a move by path only: behind the front door the request's own address is not the one the browser used */
const go = (to: string) => new Response(null, { status: 303, headers: { location: to, "cache-control": "no-store" } });

export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return go("/login");
  if (fromHere(req)) (await cookieJar()).delete(TRYOUT_COOKIE);
  const home = viewer.seat ? (viewer.seat === "circle" ? "/circle" : "/today") : viewer.home;
  return go(home);
}
