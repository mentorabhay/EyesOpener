// Eyes Opener: The address a site picture is shown from: GET /pic/<picture id>/<width>.webp.
/**
 * A live or retired picture is served to anyone and kept by browsers and the Hosting CDN for a year: its bytes never
 * change for the same address. A draft is served only to staff who may use the Look and feel room, and never kept.
 */
import { getViewer } from "@/lib/auth";
import { staffCan } from "@/lib/roles";
import { pictureFile } from "@/lib/site-pictures/read";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const notFound = () => new Response("Not found", { status: 404 });

type Ctx = { params: Promise<{ id: string; file: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const { id, file } = await ctx.params;
  const m = /^(\d{2,4})\.webp$/.exec(file);
  if (!UUID.test(id) || !m) return notFound();
  const row = await pictureFile(id, Number(m[1])).catch(() => null);
  if (!row) return notFound();
  const draft = row.status === "draft";
  if (draft) {
    const viewer = await getViewer();
    if (!staffCan(viewer?.staff ?? null, "look")) return notFound();
  }
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.mime,
      "cache-control": draft ? "private, no-store" : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
