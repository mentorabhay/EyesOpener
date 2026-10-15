/**
 * Chapters and eye breaks for watching a film in the two-eye cinema. Pure rules, unit-tested.
 *
 * Where the numbers come from (Eyes Opener's own library; none is a trial result):
 *  - The trials set a daily dose and allow it to be split. The library gives the cinema "60 min a day in chapters"
 *    and gives two-eye screen sessions chapters of 5 or 10 minutes (the catalogue's `dose` and `session` lines).
 *    One chapter of film is 10 minutes of watching, so six chapters make the daily hour.
 *  - The break between chapters is the library's look-away break: look at something 6 metres away for 20 seconds.
 *    That is the least a break lasts; a member may rest for longer.
 * No trial compared chapter lengths or break lengths. The dose itself (how many minutes a day) is the server's.
 */

/** One chapter: this many seconds of watching. */
export const CHAPTER_SECONDS = 600;
/** The eye break between two chapters lasts at least this long. */
export const BREAK_SECONDS = 20;
/** How far away to look in a break, in metres. */
export const BREAK_METRES = 6;

export interface ChapterPlan {
  chapterSeconds: number;
  breakSeconds: number;
  /** True only when a staff test household asked for shorter chapters, so a break can be tried without waiting. */
  shortened: boolean;
}

export const STANDARD_PLAN: ChapterPlan = { chapterSeconds: CHAPTER_SECONDS, breakSeconds: BREAK_SECONDS, shortened: false };

const TEST_CHAPTER_MIN = 10, TEST_BREAK_MIN = 3;

const wholeSeconds = (v: unknown) => {
  const n = typeof v === "string" && /^\d{1,5}$/.test(v) ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * The plan this viewer watches under. A family always gets the standard plan, whatever the address asks for.
 * Only a staff test household (`tester`) may ask for a shorter chapter or break, and never for a longer one.
 */
export function planFor(tester: boolean, ask: { chapter?: unknown; rest?: unknown } = {}): ChapterPlan {
  if (!tester) return STANDARD_PLAN;
  const chapter = wholeSeconds(ask.chapter), rest = wholeSeconds(ask.rest);
  const chapterSeconds = chapter === null ? CHAPTER_SECONDS : Math.max(TEST_CHAPTER_MIN, Math.min(CHAPTER_SECONDS, chapter));
  const breakSeconds = rest === null ? BREAK_SECONDS : Math.max(TEST_BREAK_MIN, Math.min(BREAK_SECONDS, rest));
  return { chapterSeconds, breakSeconds, shortened: chapterSeconds !== CHAPTER_SECONDS || breakSeconds !== BREAK_SECONDS };
}

export interface ChapterState {
  /** The chapter being watched now, counted from 1. */
  chapter: number;
  /** Chapters watched to their end in this session. */
  finished: number;
  /** Seconds of watching until the next break. 0 while a break is due. */
  toBreak: number;
  /** The film must pause for an eye break now. */
  breakDue: boolean;
}

/**
 * The one rule. In: seconds watched in this session (the session clock, which stands still while the film is
 * paused or a break runs), the breaks already taken in it, and the seconds the server allowed for the session.
 * Out: whether a break is due.
 *
 * A break is due each time another full chapter has been watched. No break is called when the allowed time is
 * used up at the same moment: the session ends there instead.
 */
export function chapterAt(watchedSeconds: number, breaksTaken: number, plan: ChapterPlan = STANDARD_PLAN, allowedSeconds = Infinity): ChapterState {
  const length = Math.max(1, plan.chapterSeconds);
  const watched = Math.max(0, Number.isFinite(watchedSeconds) ? watchedSeconds : 0);
  const taken = Math.max(0, Math.floor(Number.isFinite(breaksTaken) ? breaksTaken : 0));
  const finished = Math.floor(watched / length);
  const breakDue = finished > taken && watched < allowedSeconds;
  return {
    chapter: Math.min(finished, taken) + 1,
    finished,
    toBreak: breakDue ? 0 : Math.max(0, (taken + 1) * length - watched),
    breakDue,
  };
}

/** Seconds of a break still to run, given when it began and the time now (both in milliseconds on one clock). */
export const breakLeft = (startedMs: number, nowMs: number, breakSeconds = BREAK_SECONDS) =>
  Math.max(0, Math.ceil(breakSeconds - Math.max(0, nowMs - startedMs) / 1000));

/** Film time as the member reads it: 12:40, or 1:02:05 for a long film. */
export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), two = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${two(m)}:${two(s % 60)}` : `${m}:${two(s % 60)}`;
}
