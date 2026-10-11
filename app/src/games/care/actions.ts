// Eyes Opener: Writes for the care companions. Every action reads the member fresh, checks what this person may do,.
"use server";
/**
 * Writes for the care companions. Every action reads the member fresh, checks what this person may do,
 * validates what the browser sent and works only on the active profile.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { care as t } from "@/copy/games-care";
import { BREAK_KINDS, FAR_FINDS, logBreak, logOutdoor, OUTDOOR_MAX, OUTDOOR_MIN, outdoorEntries, ranLongEnough, type BreakKind } from "@/lib/care";
import { requireMember, todayKey } from "@/lib/session";
import { signToken, verifyToken } from "@/lib/token";
import { skyFound, skyThings } from "./picks";
import type { CareState } from "./state";

const TICKET_MS = 15 * 60_000;

/** The companion pages and the rings on /today show what was just written. */
function refresh() {
  revalidatePath("/train/games/[slug]/play", "page");
  revalidatePath("/today");
}

const yes = (message: string): CareState => ({ ok: true, message });
const no = (message: string): CareState => ({ ok: false, message });

/* ───────────── outdoor time ───────────── */

/** One visit outdoors, logged in Sky Spotter: the minutes, and what was found on today's list. */
export async function outdoorLog(_: CareState, form: FormData): Promise<CareState> {
  const m = await requireMember();
  const r = t.outdoor.result;
  if (!m.can("train")) return no(r.not_allowed);
  const minutes = z.coerce.number().int().min(OUTDOOR_MIN).max(OUTDOOR_MAX).safeParse(form.get("minutes"));
  if (!minutes.success) return no(r.badMinutes);
  const day = todayKey(), slug = "sky-spotter";

  /* What was found is checked against today's list, and only new finds are kept. */
  const ticked = z.array(z.string().max(40)).max(10).safeParse(form.getAll("found"));
  const allowed = new Set(skyThings(day).map((x) => x.id));
  const before = skyFound(await outdoorEntries(m, slug, day, day));
  const fresh = [...new Set(ticked.success ? ticked.data : [])].filter((id) => allowed.has(id) && !before.has(id));

  const out = await logOutdoor(m, { day, slug, minutes: minutes.data, found: fresh.length, data: { found: fresh } });
  if (!out.ok) return no(out.reason === "day_full" ? r.day_full : out.reason === "not_allowed" ? r.not_allowed : r.badMinutes);
  refresh();
  return yes(out.counted <= 0 ? r.foundOnly : out.counted < minutes.data ? r.partly(out.counted) : r.saved(out.counted));
}

/* ───────────── breaks ─────────────
 * A break begins with a ticket signed by the server. Finishing hands the ticket back, so the server knows
 * the timer ran for its full length and that one break is logged once. */

interface Ticket { p: string; k: BreakKind; at: number }

export async function breakBegin(kind: BreakKind): Promise<{ ok: true; ticket: string } | { ok: false; message: string }> {
  const m = await requireMember();
  const k = z.enum(BREAK_KINDS).safeParse(kind);
  if (!m.can("train") || !k.success) return { ok: false, message: t.breaks.result.not_allowed };
  const at = Date.now();
  return { ok: true, ticket: signToken<Ticket>({ p: m.profile.id, k: k.data, at, exp: at + TICKET_MS }) };
}

export async function breakFinish(ticket: string, found: string[]): Promise<NonNullable<CareState>> {
  const m = await requireMember();
  const r = t.breaks.result;
  if (!m.can("train")) return { ok: false, message: r.not_allowed };
  const input = z.object({ ticket: z.string().max(600), found: z.array(z.string().max(40)).max(12) }).safeParse({ ticket, found });
  const pass = input.success ? verifyToken<Ticket>(input.data.ticket) : null;
  if (!input.success || !pass || pass.p !== m.profile.id || !BREAK_KINDS.includes(pass.k)) return { ok: false, message: r.failed };
  if (!ranLongEnough(pass.k, Date.now() - pass.at)) return { ok: false, message: r.too_soon };

  let data: Record<string, unknown> = {};
  if (pass.k === "far") {
    const allowed = new Set(t.far.things.map((x) => x.id));
    const things = [...new Set(input.data.found)].filter((id) => allowed.has(id));
    if (things.length !== FAR_FINDS) return { ok: false, message: t.far.pickTitle };
    data = { found: things };
  }
  const out = await logBreak(m, { kind: pass.k, slug: pass.k === "blink" ? "blink-garden" : "far-window", day: todayKey(), startedAt: pass.at, data });
  if (!out.ok) return { ok: false, message: out.reason === "already" ? r.already : r.not_allowed };
  refresh();
  return { ok: true, message: out.counted ? r.counted : r.full };
}
