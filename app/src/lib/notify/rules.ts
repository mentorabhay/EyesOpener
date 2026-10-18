/**
 * The rules of reminders, written to be read. Pure: no clock, no database.
 *
 *  - A reminder has a time of day (HH:MM, 24-hour) in its household's time zone and a set of week days.
 *  - It is due on a chosen day once the local time reaches its time, and stays due for three hours, so a run that
 *    comes a little late still sends it and one that comes much later does not send a stale one.
 *  - It fires at most once a local day (`lastSentOn`), and each firing has one key (`dedupeKey`), so running the
 *    service twice never sends it twice.
 *  - A reminder for a child, or a grown-up ticked as needing help, is kept between 7:00 and 20:30.
 */
export const KINDS = ["practice", "break", "outside", "checkup", "glasses", "drops", "custom"] as const;
export type ReminderKind = (typeof KINDS)[number];
export const isKind = (v: string): v is ReminderKind => (KINDS as readonly string[]).includes(v);

/** Monday is bit 0 … Sunday bit 6. */
export const EVERY_DAY = 127;
export const DUE_WINDOW_MINUTES = 180;
export const CHILD_QUIET = { from: 7 * 60, to: 20 * 60 + 30 };
export const NOTE_MAX = 80;

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const parseClock = (v: string): number | null => { const m = CLOCK.exec(v.trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** A reminder for a child, or for a grown-up ticked as needing help, moved inside the quiet hours. */
export const quietClock = (min: number) => Math.min(CHILD_QUIET.to, Math.max(CHILD_QUIET.from, min));
export const keptQuiet = (p: { kind: string; needsHelp?: boolean | null }) => p.kind === "child" || !!p.needsHelp;

/**
 * Who may set or change a profile's reminders (Ved, 18 October 2026):
 *  - for a child, or for a grown-up ticked as needing help (an older person, say): a guardian or co-guardian of the
 *    household, or a counsellor linked to that profile;
 *  - for any other grown-up: that grown-up, or a counsellor linked to them. A profile is not tied to the person who
 *    signs in, so every guardian or co-guardian of the household counts as "that grown-up" (Ved's choice).
 * A cheer seat and a device in child mode never set one. So today the three cases come to the same people; the rule
 * keeps them apart so a later tie between a person and their own profile changes only the adult line.
 */
export type Setter = "guardian" | "co_guardian" | "circle" | "counsellor";
export function maySetReminder(by: { role: Setter; linked?: boolean; childMode?: boolean }, p: { kind: string; needsHelp?: boolean | null }): boolean {
  if (by.childMode) return false;
  if (by.role === "counsellor") return !!by.linked;
  if (by.role === "circle") return false;
  return keptQuiet(p) ? true /* a parent or guardian */ : true /* the grown-up themself */;
}

export const daysFrom = (picked: readonly number[]) => picked.reduce((m, d) => (d >= 0 && d <= 6 ? m | (1 << d) : m), 0);
export const dayList = (days: number) => [0, 1, 2, 3, 4, 5, 6].filter((d) => days & (1 << d));

/** The local date (YYYY-MM-DD), week day (Monday 0) and minutes after midnight of a moment in a time zone. */
export function localParts(now: Date, timeZone: string) {
  let tz = timeZone;
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); } catch { tz = "Asia/Kolkata"; }
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  }).formatToParts(now).map((x) => [x.type, x.value]));
  const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, weekday: week, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
}

export interface DueInput { at: string; days: number; timeZone: string; active: boolean; lastSentOn: string | null }

/** True when the reminder should fire now. */
export function isDue(r: DueInput, now: Date): boolean {
  if (!r.active) return false;
  const at = parseClock(r.at);
  if (at === null) return false;
  const local = localParts(now, r.timeZone);
  if (!(r.days & (1 << local.weekday))) return false;
  if (r.lastSentOn === local.date) return false;
  return local.minutes >= at && local.minutes - at < DUE_WINDOW_MINUTES;
}

/** The one key of a reminder's firing on a local day. */
export const dedupeKey = (reminderId: string, localDate: string) => `rem:${reminderId}:${localDate}`;

/** Only a plain path of the site may be a notification's link. */
export const safeHref = (v: string | null | undefined) => (v && /^\/[a-z0-9/_-]*$/i.test(v) && !v.startsWith("//") && !v.startsWith("/api/") ? v : null);
