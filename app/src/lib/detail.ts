// Eyes Opener: What a session measured, as the member's own record keeps it. Pure helpers, unit-tested.
/**
 * What a session measured, as the member's own record keeps it. Pure helpers, unit-tested.
 * The numbers come from the browser, so they are cleaned on the server before they are stored and again when read.
 */

/** What a session measured: plain numbers by key (see `Stats` in the game kit). */
export type Detail = Record<string, number>;
/** At most this many numbers are kept for one session, each under a short plain key. */
export const DETAIL_MAX_KEYS = 16;
/** Keeps only finite numbers under short keys, rounded to two places. Anything else sent by the browser is dropped. */
export function cleanDetail(input: unknown): Detail | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const out: Detail = {};
  for (const [key, v] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= DETAIL_MAX_KEYS) break;
    if (/^[a-z][a-z0-9_]{0,23}$/.test(key) && typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1_000_000) out[key] = Math.round(v * 100) / 100;
  }
  return Object.keys(out).length ? out : null;
}

/** One finished session of the active profile, as the member's own record shows it. */
export interface PastSession { id: string; at: Date; minutes: number; score: number | null; detail: Detail | null; endReason: string | null }

/** The best value so far for each key across these sessions. `lower` lists the keys where a smaller number is better. */
export function bestOf(rows: readonly PastSession[], lower: readonly string[] = []): Detail & { score?: number } {
  const best: Record<string, number> = {};
  const take = (key: string, v: number) => { if (!(key in best) || (lower.includes(key) ? v < best[key] : v > best[key])) best[key] = v; };
  for (const r of rows) {
    if (typeof r.score === "number") take("score", r.score);
    for (const [key, v] of Object.entries(r.detail ?? {})) take(key, v);
  }
  return best;
}
