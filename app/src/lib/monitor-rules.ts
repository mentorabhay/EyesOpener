// Eyes Opener: The rules of the workday monitor, with no camera, no browser and no database in them, so they can be tested.
/**
 * The rules of the workday monitor, with no camera, no browser and no database in them, so they can be tested.
 * The page's engine (src/lib/monitor-core.ts) and the server (src/lib/monitor.ts) both use this file.
 *
 * What the monitor is (evidence framework, "Workday eye monitor"): habit coaching for a grown-up at a laptop or
 * desk screen. It measures three physical things with the camera (viewing distance, blinks, head position), times
 * the stretch of screen work since the last look-away, and prompts quietly. The worker owns it: there is no employer
 * view, nobody else's screen shows it, and it reads nothing about mood, stress, the pupil or where the eyes look.
 * It is not a test and it never says the eyes are fine.
 *
 * Where each number comes from:
 *  - 20 minutes and 20 seconds: the 20-20-20 rule as tested with camera-checked reminders by Talens-Estarelles and
 *    others, 2023, https://pubmed.ncbi.nlm.nih.gov/35963776/ (the same source as the look-away routine's guide).
 *  - 50 cm: the near end of the preferred eye-to-screen distance in the United States workplace guidance,
 *    https://www.osha.gov/etools/computer-workstations/components/monitors (the same source as the distance guide).
 *  - 5 blinks a minute: the average at a screen in 51 healthy adults, against about 16 in conversation
 *    (Freudenthaler and others, 2003, https://link.springer.com/article/10.1007/s00417-003-0786-6). It is used as
 *    the line under which a reminder is offered. It is not a line between healthy and unhealthy: none is agreed.
 *  - Everything marked "product rule" is a choice made for this app, with no study behind the exact figure.
 */
import { z } from "zod";

/** The slug the monitor's breaks and runs are kept under. It is not a catalogue item. */
export const MONITOR_SLUG = "workday-monitor";
/** The consent a guardian gives before a profile's camera is used (`consent.kind`). */
export const CAMERA_CONSENT = "camera";
export const CAMERA_CONSENT_VERSION = "monitor-2026-10";
/** The law in India treats everyone under 18 as a child and bans behavioural monitoring of children. */
export const ADULT_AGE = 18;

export const RULE = {
  /** A look-away break falls due after this much unbroken screen work. */
  breakEveryMin: 20,
  /** A look-away counts as a break when it lasts this long. The same as the Far Window companion. */
  breakSeconds: 20,
  /** "Later" puts the break prompt off for this long. Product rule. */
  laterMin: 5,
  /** The guidance: 50 cm or more from the eyes to a desk screen. */
  closeCm: 50,
  /** The camera's reading can be a few centimetres out, so the prompt waits until the reading is this low. Product rule. */
  closePromptCm: 45,
  /** Minutes in a row under `closePromptCm` before "sit back a little". Product rule. */
  closeMinutes: 3,
  /** Blinks a minute under which a reminder is offered (see the header). */
  lowBlinks: 5,
  /** Minutes in a row under `lowBlinks` before the reminder. Product rule. */
  lowBlinkMinutes: 5,
  /** A minute counts as "head tilted" when the head was off level for more than this share of it. Product rule. */
  tiltShare: 0.5,
  tiltMinutes: 5,
  /** The same coaching prompt never comes twice within this many minutes: the pace of the 20-minute rule. */
  sameKindMin: 20,
  /** After any prompt closes, no coaching prompt for this long. Product rule. */
  quietMin: 5,
  /** A coaching prompt takes itself away after this many seconds. Product rule. */
  coachSeconds: 90,
  /** Pictures further apart than this leave a gap in which nothing was watched. */
  watchGapMs: 3000,
  /** After a gap this long the stretch of screen work starts again from zero: nobody knows what happened in it. */
  longGapMin: 5,
  /** A minute is "measured" when the monitor watched for this many of its seconds and saw a face for this many. */
  minuteWatchedSec: 45,
  minuteFaceSec: 15,
  /** Fewest pictures behind a minute's distance and its head-position share. */
  minuteReadings: 10,
  /** A minute's blink number needs blinks to have been watchable for this many seconds. */
  blinkWatchedSec: 40,
  /** One-minute samples are kept this many days, then removed by the daily job. Day totals stay. Product rule. */
  keepDays: 35,
  /** The rule asks for one break every 20 minutes. The page counts the screen work; the server also lets at most one monitor break move the Rest ring in this many minutes. */
  ringEveryMin: 20,
} as const;

/** What the server accepts in one minute's numbers. Anything outside is refused whole. */
export const RANGE = {
  /** A desk screen. The distance method was checked up to 2 metres. */
  distanceCm: [15, 200],
  /** People do not blink more often than this for a whole minute. */
  blinksPerMin: [0, 80],
  posture: [0, 1],
  /** A day at the screen with no break at all. */
  minutesSinceBreak: [0, 1440],
  faceSeconds: [RULE.minuteFaceSec, 60],
} as const;

export const PROMPTS = ["break", "close", "blink", "tilt"] as const;
export type PromptKind = (typeof PROMPTS)[number];
export type CoachKind = Exclude<PromptKind, "break">;
export type PromptPrefs = Record<PromptKind, boolean>;
export const ALL_PROMPTS: PromptPrefs = { break: true, close: true, blink: true, tilt: true };

const MIN = 60_000;

/* ════════════════════════ the stretch of screen work ════════════════════════ */

export interface Stretch {
  /** Milliseconds at the screen since the last break. */
  screenMs: number;
  /**
   * Screen work that no break on the Rest ring has paid for yet, in milliseconds. The rule is one break for every
   * 20 minutes of screen work, so a break is "earned" when this holds 20 minutes, and then 20 minutes are taken off.
   * A member who looks away every 15 minutes earns three breaks an hour, the same as one who waits the full 20.
   */
  owedMs: number;
  /** A look-away in progress: when it began, and whether it has already been counted as a break. */
  away: { since: number; counted: boolean } | null;
  /** A 20-second break the member started by hand. */
  timed: { since: number } | null;
  /** Time of the last picture. */
  last: number | null;
}
export const startStretch = (): Stretch => ({ screenMs: 0, owedMs: 0, away: null, timed: null, last: null });

export interface BreakEvent {
  /** When the look-away began (the clock the caller uses). */
  at: number;
  /** True when the camera saw the member turn or leave for the whole 20 seconds. False for a break timed by hand. */
  seen: boolean;
  /** True when a break had fallen due: 20 minutes of screen work or more came before it. */
  due: boolean;
  /** True when 20 minutes of screen work stand behind it that no earlier break was counted for: it may move the Rest ring. */
  earned: boolean;
  /** Minutes at the screen before it. */
  afterMin: number;
}

const EVERY_MS = RULE.breakEveryMin * MIN;
/** The look-away has lasted 20 seconds. With no screen work before it there is nothing to take a break from: no break. */
function took(s: Stretch, at: number, seen: boolean): { stretch: Stretch; taken: BreakEvent | null } {
  const real = s.screenMs > 0, earned = real && s.owedMs >= EVERY_MS;
  return {
    stretch: { ...s, screenMs: 0, owedMs: earned ? s.owedMs - EVERY_MS : s.owedMs, timed: null, away: s.away ? { ...s.away, counted: true } : null },
    taken: real ? { at, seen, due: s.screenMs >= EVERY_MS, earned, afterMin: s.screenMs / MIN } : null,
  };
}

/**
 * One picture, or one tick of the clock with no picture (`atScreen` null).
 * `atScreen` is true when a face is in view and facing the screen.
 * A look-away of 20 seconds is a break. A shorter one is neither screen time nor a break.
 * A gap with no pictures is never counted as screen time and never as a break.
 */
export function stretchStep(s: Stretch, now: number, atScreen: boolean | null): { stretch: Stretch; taken: BreakEvent | null; restarted: boolean } {
  /* a break timed by hand ends by the clock, pictures or no pictures */
  if (s.timed && now - s.timed.since >= RULE.breakSeconds * 1000) {
    const done = took(s, s.timed.since, false);
    const next = atScreen === null ? done.stretch : { ...done.stretch, last: now, away: atScreen ? null : done.stretch.away ?? { since: now, counted: true } };
    return { stretch: next, taken: done.taken, restarted: false };
  }
  if (atScreen === null) return { stretch: s, taken: null, restarted: false };

  const gap = s.last === null ? 0 : now - s.last;
  if (s.last !== null && (gap > RULE.watchGapMs || gap < 0)) {
    /* nothing was watched in the gap */
    if (gap >= RULE.longGapMin * MIN || gap < 0) {
      return { stretch: { screenMs: 0, owedMs: 0, timed: null, last: now, away: atScreen ? null : { since: now, counted: true } }, taken: null, restarted: true };
    }
    return { stretch: { ...s, last: now, away: atScreen ? null : { since: now, counted: s.away?.counted ?? false } }, taken: null, restarted: false };
  }

  if (atScreen) {
    /* back at the screen: a counted look-away has ended, a short one is forgotten */
    const add = s.away || s.timed || s.last === null ? 0 : gap;
    return { stretch: { ...s, screenMs: s.screenMs + add, owedMs: s.owedMs + add, away: null, last: now }, taken: null, restarted: false };
  }
  const away = s.away ?? { since: now, counted: false };
  if (!away.counted && now - away.since >= RULE.breakSeconds * 1000) {
    const done = took({ ...s, away }, away.since, true);
    return { stretch: { ...done.stretch, last: now }, taken: done.taken, restarted: false };
  }
  return { stretch: { ...s, away, last: now }, taken: null, restarted: false };
}

/** The member pressed "Start 20 seconds". */
export const startTimed = (s: Stretch, now: number): Stretch => (s.timed ? s : { ...s, timed: { since: now } });
export const stopTimed = (s: Stretch): Stretch => ({ ...s, timed: null });
export const breakDue = (s: Stretch) => s.screenMs >= EVERY_MS;

/* ════════════════════════ one minute of numbers ════════════════════════ */

export interface FrameNumbers {
  /** Milliseconds this picture stands for: the time since the picture before it, or 0 after a gap. */
  coverMs: number;
  /** A face in view, facing the screen. */
  atScreen: boolean;
  /** Distance read from this picture, or null (no scale set, head not square, iris off the edge). */
  distanceCm: number | null;
  /** Head level, and leaning in, for a facing picture. Null when not known. */
  level: boolean | null;
  leaning: boolean | null;
  /** A blink that ended with this picture: 1 full, 0.5 is not used. */
  blink: "full" | "half" | null;
  /** Milliseconds since the last picture in which a blink would have been seen. */
  blinkMs: number;
}

export interface MinuteAcc {
  /** The start of the clock minute, in milliseconds since 1970. */
  at: number;
  watchedMs: number; faceMs: number; blinkMs: number;
  full: number; half: number;
  distances: number[];
  /** Pictures with a head position, how many were level and not leaning, and how many were off level. */
  posed: number; good: number; tilted: number;
  /** What fell due or was shown in this minute. */
  prompt: PromptKind | null;
}
export const minuteOf = (now: number) => Math.floor(now / MIN) * MIN;
export const startMinute = (now: number): MinuteAcc => ({ at: minuteOf(now), watchedMs: 0, faceMs: 0, blinkMs: 0, full: 0, half: 0, distances: [], posed: 0, good: 0, tilted: 0, prompt: null });

/** Adds one picture's numbers to the minute. Changes and returns the same object: it is called fifteen times a second. */
export function addFrame(acc: MinuteAcc, f: FrameNumbers): MinuteAcc {
  acc.watchedMs += f.coverMs;
  if (f.atScreen) acc.faceMs += f.coverMs;
  acc.blinkMs += f.blinkMs;
  if (f.blink === "full") acc.full += 1;
  if (f.blink === "half") acc.half += 1;
  if (f.distanceCm !== null) acc.distances.push(f.distanceCm);
  if (f.level !== null) {
    acc.posed += 1;
    if (!f.level) acc.tilted += 1;
    if (f.level && f.leaning !== true) acc.good += 1;
  }
  return acc;
}

/** One minute's numbers. A null field was not measured in that minute. */
export interface MinuteSample {
  at: number;
  watchedSeconds: number;
  faceSeconds: number;
  /** The middle value of the minute's distance readings, in centimetres. */
  distanceCm: number | null;
  /** Blinks in the minute, full and half together, scaled to a whole minute of watching. */
  blinksPerMin: number | null;
  halfBlinksPerMin: number | null;
  /** Share of the minute's pictures with the head level and not leaning in, 0 to 1. */
  posture: number | null;
  /** Share of the minute's pictures with the head off level. Used for the tilt prompt; not stored. */
  tilted: number | null;
  minutesSinceBreak: number;
  prompt: PromptKind | null;
}

const round = (v: number, places: number) => { const k = 10 ** places; return Math.round(v * k) / k; };
const middle = (values: readonly number[]) => { const s = [...values].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/**
 * Closes a minute. Null means "not measured": the monitor watched too little of it, or saw a face for too little
 * of it. Such a minute is never sent and never stored. Inside a measured minute, each number that rests on too few
 * pictures is null on its own.
 */
export function closeMinute(acc: MinuteAcc, screenMs: number): MinuteSample | null {
  const watched = Math.min(60, acc.watchedMs / 1000), face = Math.min(60, acc.faceMs / 1000);
  if (watched < RULE.minuteWatchedSec || face < RULE.minuteFaceSec) return null;
  const blinks = acc.blinkMs >= RULE.blinkWatchedSec * 1000;
  const perMin = (n: number) => round(Math.min(RANGE.blinksPerMin[1], (n * MIN) / acc.blinkMs), 1);
  return {
    at: acc.at,
    watchedSeconds: round(watched, 1),
    faceSeconds: round(face, 1),
    distanceCm: acc.distances.length >= RULE.minuteReadings ? round(middle(acc.distances), 1) : null,
    blinksPerMin: blinks ? perMin(acc.full + acc.half) : null,
    halfBlinksPerMin: blinks ? perMin(acc.half) : null,
    posture: acc.posed >= RULE.minuteReadings ? round(acc.good / acc.posed, 2) : null,
    tilted: acc.posed >= RULE.minuteReadings ? round(acc.tilted / acc.posed, 2) : null,
    minutesSinceBreak: round(Math.min(RANGE.minutesSinceBreak[1], screenMs / MIN), 1),
    prompt: acc.prompt,
  };
}

/* ════════════════════════ prompts ════════════════════════ */

/** The last `n` samples, when they are `n` minutes in a row with no minute missing. Otherwise null. */
function inARow(minutes: readonly MinuteSample[], n: number): MinuteSample[] | null {
  const tail = minutes.slice(-n);
  if (tail.length < n) return null;
  for (let i = 1; i < tail.length; i++) if (tail[i].at - tail[i - 1].at !== MIN) return null;
  return tail;
}

/** Which coaching prompts the last minutes call for, most pressing first. Minutes are oldest first. */
export function coachingFor(minutes: readonly MinuteSample[]): CoachKind[] {
  const out: CoachKind[] = [];
  const close = inARow(minutes, RULE.closeMinutes), blink = inARow(minutes, RULE.lowBlinkMinutes), tilt = inARow(minutes, RULE.tiltMinutes);
  if (close?.every((m) => m.distanceCm !== null && m.distanceCm < RULE.closePromptCm)) out.push("close");
  if (blink?.every((m) => m.blinksPerMin !== null && m.blinksPerMin < RULE.lowBlinks)) out.push("blink");
  if (tilt?.every((m) => m.tilted !== null && m.tilted > RULE.tiltShare)) out.push("tilt");
  return out;
}

export interface PromptState {
  showing: { kind: PromptKind; since: number } | null;
  lastShown: Partial<Record<PromptKind, number>>;
  lastClosed: number | null;
  /** The break prompt was put off until this time. */
  laterUntil: number | null;
}
export const startPrompts = (): PromptState => ({ showing: null, lastShown: {}, lastClosed: null, laterUntil: null });

const closed = (p: PromptState, now: number): PromptState => (p.showing ? { ...p, showing: null, lastClosed: now } : p);
const shown = (p: PromptState, kind: PromptKind, now: number): PromptState => ({ ...p, showing: { kind, since: now }, lastShown: { ...p.lastShown, [kind]: now } });

/**
 * What should be on show now. One prompt at a time. The break prompt stays until the break is taken or put off;
 * a coaching prompt goes away by itself. `coaching` is passed only when a minute has just closed.
 * `appeared` names a prompt that came on show in this call.
 */
export function promptStep(p: PromptState, now: number, i: { due: boolean; away: boolean; coaching?: readonly CoachKind[]; prefs: PromptPrefs }): { prompts: PromptState; appeared: PromptKind | null } {
  let next = p;
  if (next.showing?.kind === "break" && (!i.due || !i.prefs.break)) next = closed(next, now);
  if (next.showing && next.showing.kind !== "break" && now - next.showing.since >= RULE.coachSeconds * 1000) next = closed(next, now);

  const breakNow = i.due && i.prefs.break && !i.away && (next.laterUntil === null || now >= next.laterUntil);
  if (breakNow && next.showing?.kind !== "break") {
    return { prompts: shown(closed(next, now), "break", now), appeared: "break" };
  }
  if (!next.showing && !i.away && i.coaching?.length) {
    const quiet = next.lastClosed !== null && now - next.lastClosed < RULE.quietMin * MIN;
    const kind = quiet ? undefined : i.coaching.find((k) => i.prefs[k] && (next.lastShown[k] === undefined || now - next.lastShown[k]! >= RULE.sameKindMin * MIN));
    if (kind) return { prompts: shown(next, kind, now), appeared: kind };
  }
  return { prompts: next, appeared: null };
}

/** "Later" on the break prompt, or "Not now" on a coaching prompt. */
export function putOff(p: PromptState, now: number): PromptState {
  if (!p.showing) return p;
  return { ...closed(p, now), laterUntil: p.showing.kind === "break" ? now + RULE.laterMin * MIN : p.laterUntil };
}

/* ════════════════════════ what the server accepts ════════════════════════ */

const within = ([lo, hi]: readonly [number, number]) => z.number().min(lo).max(hi);

/** One measured minute as the page sends it. Nothing but numbers and the name of a prompt. */
export const minuteInput = z.object({
  at: z.number().int().refine((v) => v % MIN === 0),
  faceSeconds: within(RANGE.faceSeconds),
  distanceCm: within(RANGE.distanceCm).nullable(),
  blinksPerMin: within(RANGE.blinksPerMin).nullable(),
  halfBlinksPerMin: within(RANGE.blinksPerMin).nullable(),
  posture: within(RANGE.posture).nullable(),
  minutesSinceBreak: within(RANGE.minutesSinceBreak),
  prompt: z.enum(PROMPTS).nullable(),
}).strict().refine((m) => (m.blinksPerMin === null) === (m.halfBlinksPerMin === null) && (m.halfBlinksPerMin ?? 0) <= (m.blinksPerMin ?? 0) + 0.11);
export type MinuteInput = z.infer<typeof minuteInput>;

/** A break the monitor saw or timed. */
export const breakInput = z.object({
  at: z.number().int().positive(),
  seen: z.boolean(),
  due: z.boolean(),
  earned: z.boolean(),
}).strict();
export type BreakInput = z.infer<typeof breakInput>;

/** A minute is taken when it is over and not older than this. The page retries a failed send for a while. */
export const SEND_WINDOW_MIN = 15;
/** The page keeps its clock in step with the server's from the moment a run starts. This much disagreement is let through. */
export const CLOCK_SLACK_MS = 10_000;
export const minuteInTime = (at: number, now: number, runStartedAt: number) =>
  at + MIN <= now + CLOCK_SLACK_MS && at >= now - SEND_WINDOW_MIN * MIN && at >= minuteOf(runStartedAt) - MIN;
export const breakInTime = (at: number, now: number, runStartedAt: number) =>
  at + RULE.breakSeconds * 1000 <= now + CLOCK_SLACK_MS && at >= now - SEND_WINDOW_MIN * MIN && at >= runStartedAt - CLOCK_SLACK_MS;

/**
 * Does an earned monitor break move the Rest ring? `others` are today's breaks already in the care log, from the
 * monitor or from a care companion, with the time each began. Two rules beyond the day's limit of twelve:
 *  - "same": a companion break that began within two minutes of it is the same look-away, logged twice. Not kept.
 *  - "soon": a break that counted within 20 minutes of it. Kept in the log; the ring does not move.
 */
export const SAME_BREAK_MS = 2 * MIN;
export interface LoggedBreak { at: number; monitor: boolean; counted: boolean }
export function ringDecision(at: number, others: readonly LoggedBreak[]): "count" | "soon" | "same" {
  if (others.some((o) => o.at === at || (!o.monitor && Math.abs(o.at - at) <= SAME_BREAK_MS))) return "same";
  return others.some((o) => o.counted && Math.abs(at - o.at) < RULE.ringEveryMin * MIN) ? "soon" : "count";
}

/** May this profile use the monitor at all? Grown-ups only: see `ADULT_AGE`. */
export const isAdultProfile = (p: { kind: string }, age: number | null) => p.kind === "adult" && (age === null || age >= ADULT_AGE);

/* ════════════════════════ what the member sees afterwards ════════════════════════ */

/** India has one time all year: 5 hours 30 minutes ahead. The same day as `todayKey` in session.ts. */
const INDIA_MS = 330 * MIN;
/** Minutes after midnight in India. */
export const minuteOfDay = (at: number) => Math.floor((((at + INDIA_MS) % 86_400_000) + 86_400_000) % 86_400_000 / MIN);
export const dayKeyOf = (at: number) => new Date(at + INDIA_MS).toISOString().slice(0, 10);

export interface SampleRow { at: number; distanceCm: number | null; blinksPerMin: number | null; halfBlinksPerMin: number | null; posture: number | null; faceSeconds: number | null; prompt: string | null }
export interface BreakRow { at: number; counted: boolean; due: boolean; seen: boolean }

export interface Bin {
  /** Minutes after midnight where the bin starts. */
  start: number;
  /** Measured minutes in the bin. 0 means nothing was measured: the chart hatches it. */
  measured: number;
  distanceCm: number | null;
  blinksPerMin: number | null;
  /** Breaks that fell due, and breaks taken, in the bin. */
  due: number; taken: number;
}

export const BIN_MIN = 10;
/** The fewest measured minutes behind a bin's distance or blink figure. */
const BIN_NEEDS = 3;

/**
 * One day as ten-minute bins, from the first measured hour to the last (or the hours given).
 * A bin's figure is the middle value of its minutes and is null when fewer than three minutes carry one.
 */
export function dayBins(samples: readonly SampleRow[], breaks: readonly BreakRow[], hours?: readonly [number, number]): { from: number; to: number; bins: Bin[] } {
  const minutes = samples.map((s) => minuteOfDay(s.at));
  const from = hours ? hours[0] : minutes.length ? Math.floor(Math.min(...minutes) / 60) : 9;
  const to = hours ? hours[1] : minutes.length ? Math.floor(Math.max(...minutes) / 60) + 1 : 18;
  const bins: Bin[] = [];
  for (let start = from * 60; start < to * 60; start += BIN_MIN) {
    const mine = samples.filter((s) => { const m = minuteOfDay(s.at); return m >= start && m < start + BIN_MIN; });
    const of = (pick: (s: SampleRow) => number | null) => { const v = mine.map(pick).filter((x): x is number => x !== null); return v.length >= BIN_NEEDS ? round(middle(v), 1) : null; };
    bins.push({
      start, measured: mine.length,
      distanceCm: of((s) => s.distanceCm), blinksPerMin: of((s) => s.blinksPerMin),
      due: mine.filter((s) => s.prompt === "break").length,
      taken: breaks.filter((b) => { const m = minuteOfDay(b.at); return m >= start && m < start + BIN_MIN; }).length,
    });
  }
  return { from, to, bins };
}

export interface DayTotals {
  /** Measured minutes. */
  measured: number;
  distanceCm: number | null;
  blinksPerMin: number | null;
  /** Of all blinks counted, the share that were half blinks. A rough figure. */
  halfShare: number | null;
  /** Mean share of the time with the head level and not leaning in. */
  posture: number | null;
  /** Minutes closer than the guidance, out of the minutes with a distance. */
  closeMinutes: number; distanceMinutes: number;
  /** Breaks that fell due; of those, taken; and breaks taken before one was due. */
  due: number; taken: number; early: number;
  /** Breaks the monitor added to the Rest ring. */
  counted: number;
}

export function dayTotals(samples: readonly SampleRow[], breaks: readonly BreakRow[]): DayTotals {
  const nums = (pick: (s: SampleRow) => number | null) => samples.map(pick).filter((x): x is number => x !== null);
  const d = nums((s) => s.distanceCm), b = nums((s) => s.blinksPerMin), p = nums((s) => s.posture);
  const withHalf = samples.filter((s) => s.blinksPerMin !== null && s.halfBlinksPerMin !== null);
  const all = withHalf.reduce((sum, s) => sum + s.blinksPerMin!, 0), half = withHalf.reduce((sum, s) => sum + s.halfBlinksPerMin!, 0);
  const taken = breaks.filter((x) => x.due).length;
  return {
    measured: samples.length,
    distanceCm: d.length ? round(middle(d), 0) : null,
    blinksPerMin: b.length ? round(middle(b), 0) : null,
    halfShare: all > 0 ? round(half / all, 2) : null,
    posture: p.length ? round(p.reduce((s, v) => s + v, 0) / p.length, 2) : null,
    closeMinutes: d.filter((v) => v < RULE.closeCm).length, distanceMinutes: d.length,
    /* a due minute that was not stored would leave more taken than due: never show that */
    due: Math.max(samples.filter((s) => s.prompt === "break").length, taken),
    taken, early: breaks.length - taken,
    counted: breaks.filter((x) => x.counted).length,
  };
}
