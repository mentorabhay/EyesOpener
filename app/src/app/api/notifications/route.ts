/**
 * The open app's check for new notifications: GET /api/notifications?since=<ms> with the header
 * `x-iopener-notify: 1`, for a signed-in grown-up. It first fires the household's due reminders (so reminders work
 * while the app is open, with no scheduler), then answers the unread count, anything newer than `since`, and with
 * `list=1` the latest eight for the bell's list.
 * POST with `{ id }` or `{ all: true }` marks as read. Anything else answers "not found".
 */
import { getMember } from "@/lib/session";
import { checkMine, freshFor, listFor, markRead, unreadCount } from "@/lib/notify/service";

export const dynamic = "force-dynamic";
const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
const ok = (b: unknown) => Response.json(b, { headers: { "cache-control": "no-store" } });

async function who(req: Request) {
  if (req.headers.get("x-iopener-notify") !== "1") return null;
  const m = await getMember();
  return m && !m.childMode ? m : null;
}

export async function GET(req: Request) {
  const m = await who(req);
  if (!m) return notFound();
  await checkMine(m.account.id);
  const sinceMs = Number(new URL(req.url).searchParams.get("since"));
  const since = Number.isFinite(sinceMs) && sinceMs > 0 ? new Date(sinceMs) : new Date(Date.now() - 5 * 60_000);
  const wantList = new URL(req.url).searchParams.get("list") === "1";
  const [count, fresh, recent] = await Promise.all([unreadCount(m.user.id), freshFor(m.user.id, since), wantList ? listFor(m.user.id, 8) : Promise.resolve([])]);
  return ok({
    count, now: Date.now(),
    fresh: fresh.map((f) => ({ ...f, createdAt: f.createdAt.getTime() })),
    recent: recent.map((r) => ({ id: r.id, title: r.title, body: r.body, href: r.href, createdAt: r.createdAt.getTime(), read: !!r.readAt })),
  });
}

export async function POST(req: Request) {
  const m = await who(req);
  if (!m) return notFound();
  const body = (await req.json().catch(() => null)) as { id?: unknown; all?: unknown } | null;
  if (body?.all === true) await markRead(m.user.id);
  else if (typeof body?.id === "string" && /^[0-9a-f-]{36}$/.test(body.id)) await markRead(m.user.id, body.id);
  else return notFound();
  return ok({ count: await unreadCount(m.user.id) });
}
