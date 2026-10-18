/**
 * The top bar's search list: GET /api/search with the header `x-iopener-search: 1`, for anyone signed in to the member
 * app. Read once when the search opens; the browser does the matching. Anything else answers "not found".
 */
import { searchIndex } from "@/lib/search-index";
import { getMember } from "@/lib/session";
import { menuPages } from "@/components/shell/menu";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const m = req.headers.get("x-iopener-search") === "1" ? await getMember() : null;
  if (!m) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return Response.json({ items: await searchIndex(m, menuPages(m)) }, { headers: { "cache-control": "private, no-store" } });
}
