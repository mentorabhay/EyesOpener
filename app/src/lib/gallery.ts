/**
 * Locked Gallery: the rules, pure. Tested in gallery.test.ts; src/lib/gallery-data.ts reads and writes.
 *
 * What the gallery is:
 * - Depth pictures. Each is a field of dots in which a shape exists only as a depth step: one eye alone sees dots
 *   and nothing else. The step is finer from picture to picture. A picture is always drawn truly, at its own step,
 *   whether the member has reached it or not: the "lock" is the member's own eyes, never a cover over the picture.
 * - Faint pictures. Each is a shape a little darker than a grey field, drawn with the same greys as the Faint
 *   letters check-up, and looked at the way that check-up is taken: with one eye covered.
 * - Effort trophies. They come from showing up: practice days and weeks with practice. A day counts once, however
 *   long it was. Nothing here reads a score, a speed, a level or minutes beyond the day's practice.
 *
 * What "reached" means:
 * - A picture is marked reached from the member's own check-up results, on the server. Nobody can mark one by
 *   pressing something, and a mark is never taken away: a later result that is worse leaves the gallery as it was.
 * - A depth picture is reached by a Depth check-up that found depth at the picture's step or finer.
 * - A faint picture is reached by the Faint letters check-up of the eye the picture is meant for: the weaker eye
 *   when one is known, otherwise both eyes.
 *
 * What it never says: that anything will get better. A picture that is not reached says only what it is drawn at.
 */

/* ───────────── the pictures ───────────── */

export type ShapeKey = "kite" | "fish" | "boat" | "bird" | "star" | "balloon" | "tree" | "house" | "moon";

export interface DepthItem { slug: string; kind: "depth"; shape: ShapeKey; /** The depth step, in arcseconds. */ arcsec: number }
export interface FaintItem { slug: string; kind: "faint"; shape: ShapeKey; /** The step of the Faint letters check-up, in logCS. */ logCs: number }
export interface DaysItem { slug: string; kind: "days"; /** Practice days it takes. */ days: number }
export interface WeeksItem { slug: string; kind: "weeks"; /** Weeks with practice it takes. */ weeks: number }
export type GalleryItem = DepthItem | FaintItem | DaysItem | WeeksItem;

/**
 * Depth steps, coarsest first. Each is half the one before, as the steps of the Depth check-up are. The check-up
 * starts near 1600 arcseconds, so the first picture is one step finer than the coarsest result there is.
 */
export const DEPTH_ITEMS: readonly DepthItem[] = [
  { slug: "depth-800", kind: "depth", shape: "kite", arcsec: 800 },
  { slug: "depth-400", kind: "depth", shape: "fish", arcsec: 400 },
  { slug: "depth-200", kind: "depth", shape: "boat", arcsec: 200 },
  { slug: "depth-100", kind: "depth", shape: "bird", arcsec: 100 },
  { slug: "depth-50", kind: "depth", shape: "star", arcsec: 50 },
];

/** Steps of the Faint letters check-up (it moves in steps of 0.15 logCS and ends at 1.65, the faintest an ordinary screen shows). */
export const FAINT_ITEMS: readonly FaintItem[] = [
  { slug: "faint-090", kind: "faint", shape: "balloon", logCs: 0.9 },
  { slug: "faint-120", kind: "faint", shape: "tree", logCs: 1.2 },
  { slug: "faint-150", kind: "faint", shape: "house", logCs: 1.5 },
  { slug: "faint-165", kind: "faint", shape: "moon", logCs: 1.65 },
];

export const DAYS_ITEMS: readonly DaysItem[] = [1, 7, 30, 60, 100].map((days) => ({ slug: `days-${days}`, kind: "days", days }));
export const WEEKS_ITEMS: readonly WeeksItem[] = [4, 8, 12].map((weeks) => ({ slug: `weeks-${weeks}`, kind: "weeks", weeks }));

export const GALLERY_ITEMS: readonly GalleryItem[] = [...DEPTH_ITEMS, ...FAINT_ITEMS, ...DAYS_ITEMS, ...WEEKS_ITEMS];
export const itemBySlug = (slug: string) => GALLERY_ITEMS.find((i) => i.slug === slug);

/* ───────────── depth pictures ───────────── */

/**
 * A screen shows depth in whole pixels, so a stored result is a whole number of pixels turned into an angle, and it
 * can land a little over a round step: 801 arcseconds for a step of 800. A result within a tenth of the step counts.
 */
export const DEPTH_SLACK = 1.1;

/** A stored Depth check-up result. `note` "worse" means even the largest step was not seen: no depth was found. */
export interface DepthResult { value: number; note: string | null; takenAt: Date }

/** Did this check-up find depth at all? */
export const foundDepth = (r: Pick<DepthResult, "note" | "value">) => r.note !== "worse" && Number.isFinite(r.value) && r.value > 0;

/** Does this result reach a depth step? */
export const reachesDepth = (r: Pick<DepthResult, "note" | "value">, arcsec: number) => foundDepth(r) && r.value <= arcsec * DEPTH_SLACK;

/** The first check-up that reached the step, or null. `results` may be in any order. */
export function depthReachedAt(results: readonly DepthResult[], arcsec: number): Date | null {
  const hits = results.filter((r) => reachesDepth(r, arcsec)).map((r) => r.takenAt.getTime());
  return hits.length ? new Date(Math.min(...hits)) : null;
}

/**
 * How many whole pixels a depth picture is drawn with on a screen whose one pixel is `pixelArcsec` wide:
 * the largest whole number of pixels that still counts as reaching the step. 0 means this screen cannot show a step
 * this fine. Because a result on the same screen is also a whole number of pixels, a member has reached the
 * picture exactly when a check-up found the step it is drawn at, or a finer one: the drawing and the rule agree.
 */
export function depthPixels(arcsec: number, pixelArcsec: number): number {
  if (!(pixelArcsec > 0) || !(arcsec > 0)) return 0;
  return Math.floor((arcsec * DEPTH_SLACK) / pixelArcsec + 1e-9);
}

/**
 * How the two eyes' pictures are placed, in whole pixels. `ground` is where the dots around the shape sit and
 * `shape` where the dots of the shape sit, as a crossed offset: positive floats in front of the screen, negative
 * sits behind it. They differ by exactly `pixels`. The step is split around the screen so that every dot is drawn
 * apart for the two eyes, inside the shape and outside it: with the glasses off, the shape then does not stand out
 * as the only part with coloured edges.
 */
export function depthPlanes(pixels: number): { ground: number; shape: number } {
  const ground = -Math.ceil(pixels / 2);
  return { ground, shape: ground + pixels };
}

/** Where one eye's copy of a dot goes, in pixels from its own place, for a crossed offset: [left eye, right eye]. */
export const eyeShifts = (offset: number): [number, number] => [Math.ceil(offset / 2), -Math.floor(offset / 2)];

/* ───────────── faint pictures ───────────── */

export type Side = "left" | "right";
/** A stored Faint letters result for one eye, in logCS. Higher is fainter. */
export interface FaintResult { eye: Side | null; value: number; takenAt: Date }

/** Stored values are four-byte reals: a step of 1.65 can come back as 1.6499999. */
const FAINT_SLACK = 0.005;
export const reachesFaint = (value: number, logCs: number) => Number.isFinite(value) && value >= logCs - FAINT_SLACK;

/**
 * The eye a faint picture is looked at with: the weaker eye when one is known. With no weaker eye the picture is
 * for both eyes, one at a time, and both have to reach it.
 */
export const faintEyes = (weakEye: Side | null): Side[] => (weakEye ? [weakEye] : ["left", "right"]);

/** When the faint step was first reached by every eye it is meant for, or null. */
export function faintReachedAt(results: readonly FaintResult[], logCs: number, weakEye: Side | null): Date | null {
  const first = faintEyes(weakEye).map((eye) => {
    const hits = results.filter((r) => r.eye === eye && reachesFaint(r.value, logCs)).map((r) => r.takenAt.getTime());
    return hits.length ? Math.min(...hits) : null;
  });
  return first.every((t): t is number => t !== null) ? new Date(Math.max(...first)) : null;
}

/** The latest Faint letters result of each eye the pictures are meant for. Null for an eye never tested. */
export function latestFaint(results: readonly FaintResult[], weakEye: Side | null): { eye: Side; value: number | null }[] {
  return faintEyes(weakEye).map((eye) => {
    const mine = results.filter((r) => r.eye === eye).sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
    return { eye, value: mine[0]?.value ?? null };
  });
}

/** The latest Depth check-up, or null when none was taken. */
export function latestDepth(results: readonly DepthResult[]): DepthResult | null {
  return [...results].sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime())[0] ?? null;
}

/* ───────────── effort trophies ───────────── */

/** One day of the eye day, as `day_summary` keeps it. */
export interface DayRow { day: string; trainMinutes: number; trainGoal: number }

/** Half a minute short still reads as the whole on the rings, so it counts here too. */
const DAY_SLACK = 0.5;

/**
 * A practice day: the day's practice was done. With minutes set for the day, that means they were reached. On a
 * day with none set (no programme), any practice makes it a practice day. More minutes never make it count twice,
 * and nothing above the day's own minutes is read.
 */
export const isPracticeDay = (d: Pick<DayRow, "trainMinutes" | "trainGoal">) =>
  d.trainGoal > 0 ? d.trainMinutes >= d.trainGoal - DAY_SLACK : d.trainMinutes > 0;

/** The practice days, oldest first, each once. */
export const practiceDays = (rows: readonly DayRow[]) => [...new Set(rows.filter(isPracticeDay).map((r) => r.day))].sort();

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
/** The Monday of the week a day is in. */
export const mondayOf = (day: string) => new Date(utc(day).getTime() - ((utc(day).getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);

/** The first practice day of each week that had one, oldest first. The weeks need not follow one another. */
export function practiceWeeks(days: readonly string[]): string[] {
  const first = new Map<string, string>();
  for (const day of [...days].sort()) if (!first.has(mondayOf(day))) first.set(mondayOf(day), day);
  return [...first.values()];
}

export interface Effort {
  /** Practice days so far, oldest first. */
  days: string[];
  /** The first practice day of each week with practice, oldest first. */
  weeks: string[];
}
export const effortOf = (rows: readonly DayRow[]): Effort => { const days = practiceDays(rows); return { days, weeks: practiceWeeks(days) }; };

/** The day an effort trophy was reached (a day key), or null. It is the day the count was reached, not today. */
export function effortReachedOn(item: DaysItem | WeeksItem, e: Effort): string | null {
  return item.kind === "days" ? e.days[item.days - 1] ?? null : e.weeks[item.weeks - 1] ?? null;
}
/** How far along an effort trophy is: never more than what it takes. */
export function effortProgress(item: DaysItem | WeeksItem, e: Effort): { done: number; of: number } {
  const of = item.kind === "days" ? item.days : item.weeks, have = item.kind === "days" ? e.days.length : e.weeks.length;
  return { done: Math.min(have, of), of };
}

/* ───────────── what is reached ───────────── */

export interface Facts {
  depth: readonly DepthResult[];
  faint: readonly FaintResult[];
  weakEye: Side | null;
  days: readonly DayRow[];
  /** Turns a day key into the moment that day began for the member. */
  startOfDay: (day: string) => Date;
}

/** Every item the facts reach, with the moment each was first reached. The gallery keeps a mark for each. */
export function reached(f: Facts): { slug: string; at: Date }[] {
  const effort = effortOf(f.days);
  return GALLERY_ITEMS.flatMap((item) => {
    let at: Date | null;
    if (item.kind === "depth") at = depthReachedAt(f.depth, item.arcsec);
    else if (item.kind === "faint") at = faintReachedAt(f.faint, item.logCs, f.weakEye);
    else { const day = effortReachedOn(item, effort); at = day ? f.startOfDay(day) : null; }
    return at ? [{ slug: item.slug, at }] : [];
  });
}

/* ───────────── a picture made of dots ───────────── */

/** A small random number maker that gives the same numbers for the same seed, so a picture is the same every time. */
export function numbersFrom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from a slug. */
export const seedOf = (slug: string) => [...slug].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** The top left corner of one square dot, in whole pixels, in the picture's own place before any shift. */
export interface Dot { x: number; y: number }

/** How many dots a panel gets: enough to cover about four tenths of it, dots lying over one another now and then. */
export const dotCount = (width: number, height: number, cell: number, reach = 0) => Math.round((0.5 * (width + 2 * reach) * height) / (cell * cell));

/**
 * Dots scattered at random over a panel, the same way for the same seed. They are not on a grid: dots lie beside,
 * across and over one another everywhere, so no place in the picture has a texture of its own.
 * `reach` widens the scatter on both sides, so that dots moved sideways for one eye still fill the panel's edges.
 */
export function dotField(seed: number, count: number, width: number, height: number, cell: number, reach = 0): Dot[] {
  const next = numbersFrom(seed), dots: Dot[] = [];
  for (let i = 0; i < count; i++) dots.push({ x: Math.floor(next() * (width + 2 * reach)) - reach, y: Math.floor(next() * (height + cell)) - cell });
  return dots;
}

/**
 * The dots one eye is shown. Two scatters make the picture: `ground`, which lies everywhere, and `figure`, of
 * which only the dots whose middle is inside the shape are used. `inShape` takes a point of the picture's own
 * place; `shiftGround` and `shiftFigure` are how far this eye's copy of each scatter is moved, in pixels.
 *
 *  - A dot is always drawn whole. It belongs to the shape or to the ground by its middle, and is never cut at the
 *    shape's edge, so no row of slivers marks the edge.
 *  - A ground dot is left out for this eye when its middle would lie behind the shape as this eye sees it. The
 *    shape is nearer, so it hides what is behind it, and it hides a slightly different strip from each eye.
 *  - Every place of the panel therefore gets dots from scatters of the same thickness: the ground's, the shape's,
 *    or near the edge a part of each. One eye's picture has the same share of dots all over. Only the two eyes
 *    together, by how far apart the copies are, can find the shape.
 */
export function eyeDots(ground: readonly Dot[], figure: readonly Dot[], cell: number, inShape: (x: number, y: number) => boolean, shiftGround: number, shiftFigure: number): Dot[] {
  const half = cell / 2, out: Dot[] = [];
  for (const d of figure) if (inShape(d.x + half, d.y + half)) out.push({ x: d.x + shiftFigure, y: d.y });
  for (const d of ground) if (!inShape(d.x + half + shiftGround - shiftFigure, d.y + half)) out.push({ x: d.x + shiftGround, y: d.y });
  return out;
}
