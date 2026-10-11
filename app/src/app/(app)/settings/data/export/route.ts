// Eyes Opener: The download of a family's copy: GET /settings/data/export.
/**
 * The download of a family's copy: GET /settings/data/export.
 *
 * The file is built here, at this moment, for the signed-in guardian's own household, and sent straight to the
 * browser. The household comes from the sign-in and from nowhere else: the address carries no id, so there is no
 * address that could give one household another's file.
 * Checked on every download: a guardian seat, not child mode, and a copy that was asked for and is still open.
 * Anything else answers "not found". The answer is never stored by a browser or by anything in between.
 */
import { data as t } from "@/copy/data";
import { buildFamilyFile } from "@/lib/data/export";
import { copyToDownload, markDownloaded } from "@/lib/data/requests";
import { getMember, todayKey } from "@/lib/session";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function GET() {
  const m = await getMember();
  if (!m || m.childMode || !m.can("data")) return notFound();
  const now = new Date();
  const request = await copyToDownload(m, now);
  if (!request) return notFound();
  const file = await buildFamilyFile(m.account.id, { id: m.user.id, email: m.user.email }, now);
  if (!file) return notFound();
  await markDownloaded(request.id, now);
  return new Response(JSON.stringify(file, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${t.file.name(todayKey(now))}"`,
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
