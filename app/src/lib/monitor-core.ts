// Eyes Opener: The workday monitor's engine: what happens to each camera picture's facts, and to each tick of the clock.
/**
 * The workday monitor's engine: what happens to each camera picture's facts, and to each tick of the clock.
 * Pure. The page (src/app/(app)/today/monitor/monitor.tsx) owns the camera, the model and the sending; this file
 * turns what they give into a minute's numbers, breaks and prompts. A whole working day can be played through it
 * in a test with made-up faces and a made-up clock.
 *
 * What goes in: for each picture the facts from src/vision (never the picture, never the points), the time on the
 * page's steady clock, and the time of day. What comes out: at most one measured minute a minute, a break when
 * one was taken, and the prompt that came on show. A minute in which too little was watched gives nothing at all.
 */
import { blinkStep, distanceCm as distanceOf, median, postureOf, startBlinks, type BlinkState, type FaceFacts } from "@/vision";
import {
  addFrame, breakDue, closeMinute, coachingFor, minuteOf, promptStep, putOff, RULE, startMinute, startPrompts, startStretch, startTimed, stopTimed, stretchStep,
  type BreakEvent, type MinuteAcc, type MinuteSample, type PromptKind, type PromptPrefs, type PromptState, type Stretch,
} from "./monitor-rules";

export interface CoreSettings {
  /** This camera's scale, or null until the one-step set-up is done: distance is then not measured. */
  scale: number | null;
  /** The distance the scale was set at: the member's own usual seat. */
  usualCm: number | null;
  /** The member works on a second screen to the side: a turned head is still screen work. */
  sideScreen: boolean;
  prefs: PromptPrefs;
}

export interface Core {
  blinks: BlinkState;
  stretch: Stretch;
  minute: MinuteAcc;
  /** The last few measured minutes, oldest first. Kept for the prompts that look at minutes in a row. */
  minutes: MinuteSample[];
  prompts: PromptState;
  /** Time of day of the last picture, and what it showed. */
  seenAt: number | null;
  face: boolean; facing: boolean; tilt: number | null;
  /** The last second or two of distance readings, for the number on screen. */
  near: { at: number; cm: number }[];
  /** Blinks seen in the minute now running. */
  blinksNow: number;
  /** A break has fallen due in this stretch and was written into a minute. */
  dueMarked: boolean;
  /** Milliseconds a face has been in view, facing, with no way to see its blinks: pictures too far apart. */
  blindMs: number;
}

/** Learning a member's open level takes a second or two. Longer than this without seeing blinks means the pictures come too slowly. */
const BLIND_AFTER_MS = 4000;

export interface CoreOut { sample: MinuteSample | null; taken: BreakEvent | null; appeared: PromptKind | null }
const NOTHING: CoreOut = { sample: null, taken: null, appeared: null };

export const startCore = (now: number): Core => ({
  blinks: startBlinks(), stretch: startStretch(), minute: startMinute(now), minutes: [], prompts: startPrompts(),
  seenAt: null, face: false, facing: false, tilt: null, near: [], blinksNow: 0, dueMarked: false, blindMs: 0,
});

/** Closes the minute that has ended, if one has. */
function turnMinute(core: Core, now: number, s: CoreSettings): { core: Core; sample: MinuteSample | null; appeared: PromptKind | null } {
  if (minuteOf(now) === core.minute.at) return { core, sample: null, appeared: null };
  const sample = closeMinute(core.minute, core.stretch.screenMs);
  const minutes = sample ? [...core.minutes, sample].slice(-Math.max(RULE.lowBlinkMinutes, RULE.tiltMinutes, RULE.closeMinutes)) : core.minutes;
  let next: Core = { ...core, minute: startMinute(now), minutes, blinksNow: 0 };
  /* coaching prompts are weighed once a minute, from measured minutes only */
  let appeared: PromptKind | null = null;
  if (sample) {
    const step = promptStep(next.prompts, now, { due: breakDue(next.stretch), away: !!next.stretch.away, coaching: coachingFor(minutes), prefs: s.prefs });
    next = { ...next, prompts: step.prompts };
    appeared = step.appeared;
    if (appeared && appeared !== "break") next.minute.prompt = appeared;
  }
  return { core: next, sample, appeared };
}

/** Marks the minute in which a break fell due, once for each stretch. */
function markDue(core: Core): Core {
  if (!breakDue(core.stretch)) return core.dueMarked ? { ...core, dueMarked: false } : core;
  if (core.dueMarked) return core;
  core.minute.prompt = "break";
  return { ...core, dueMarked: true };
}

/**
 * One picture. `t` is the picture's time on the page's steady clock (for blinks); `now` is the time of day.
 * `facts` is null for "no face in view".
 */
export function coreFrame(core: Core, now: number, t: number, facts: FaceFacts | null, s: CoreSettings): { core: Core; out: CoreOut } {
  const turned = turnMinute(core, now, s);
  let next = turned.core;

  const gap = next.seenAt === null ? Infinity : now - next.seenAt;
  const coverMs = gap > RULE.watchGapMs || gap < 0 ? 0 : gap;
  const facing = !!facts && facts.facing;
  const atScreen = !!facts && (facts.facing || s.sideScreen);

  /* blinks: only from a face that is turned towards the camera */
  const blink = blinkStep(next.blinks, t, facing ? facts!.open : null);
  /* distance: only from a head that is nearly square, and only once the camera's scale is set */
  const cm = facts && facts.square ? distanceOf(facts.iris, facts.offCentre, s.scale) : null;
  const posture = facing ? postureOf(facts!, cm, s.usualCm) : null;

  addFrame(next.minute, { coverMs, atScreen, distanceCm: cm, level: posture ? posture.level : null, leaning: posture ? posture.leaning : null, blink: blink.blink, blinkMs: blink.watchedMs });

  const step = stretchStep(next.stretch, now, atScreen);
  next = {
    ...next, blinks: blink.state, stretch: step.stretch, seenAt: now, face: !!facts, facing, tilt: facing ? facts!.tilt : null,
    near: cm === null ? next.near.filter((r) => now - r.at <= 2000) : [...next.near.filter((r) => now - r.at <= 2000), { at: now, cm }],
    blinksNow: next.blinksNow + (blink.blink ? 1 : 0),
    dueMarked: step.taken || step.restarted ? false : next.dueMarked,
    blindMs: !facing || blink.watchedMs > 0 ? 0 : next.blindMs + coverMs,
  };
  next = markDue(next);
  const p = promptStep(next.prompts, now, { due: breakDue(next.stretch), away: !!next.stretch.away, prefs: s.prefs });
  next = { ...next, prompts: p.prompts };
  return { core: next, out: { sample: turned.sample, taken: step.taken, appeared: p.appeared ?? turned.appeared } };
}

/**
 * One tick of the clock, about once a second, pictures or no pictures. It closes a minute that has ended, ends a
 * break timed by hand, and takes away a prompt whose time is up.
 */
export function coreClock(core: Core, now: number, s: CoreSettings): { core: Core; out: CoreOut } {
  const turned = turnMinute(core, now, s);
  let next = turned.core;
  const step = stretchStep(next.stretch, now, null);
  if (step.stretch !== next.stretch) next = { ...next, stretch: step.stretch, dueMarked: step.taken ? false : next.dueMarked };
  const p = promptStep(next.prompts, now, { due: breakDue(next.stretch), away: !!next.stretch.away, prefs: s.prefs });
  if (p.prompts !== next.prompts) next = { ...next, prompts: p.prompts };
  if (next === core && !turned.sample) return { core, out: NOTHING };
  return { core: next, out: { sample: turned.sample, taken: step.taken, appeared: p.appeared ?? turned.appeared } };
}

/** The member's own presses. */
export const corePutOff = (core: Core, now: number): Core => ({ ...core, prompts: putOff(core.prompts, now) });
export const coreStartBreak = (core: Core, now: number): Core => ({ ...core, stretch: startTimed(core.stretch, now) });
export const coreStopBreak = (core: Core): Core => ({ ...core, stretch: stopTimed(core.stretch) });

export interface Live {
  /** Pictures are arriving and being read. False means the monitor is not watching right now. */
  watching: boolean;
  face: boolean; facing: boolean;
  /** Middle value of the last two seconds, or null: no scale, no face, or head not square. */
  distanceCm: number | null;
  /** Degrees off level, or null. */
  tilt: number | null;
  /** Seconds at the screen since the last break. */
  sinceBreakSec: number;
  /** Seconds into a look-away the camera is seeing, or null. */
  awaySec: number | null;
  /** Seconds left of a break timed by hand, or null. */
  timedLeftSec: number | null;
  /** Blinks a minute in the last measured minute, or null when that minute had no blink number. */
  blinksLastMinute: number | null;
  blinksThisMinute: number;
  /** True when pictures come too far apart for blinks to be counted. */
  blinksBlind: boolean;
  prompt: PromptKind | null;
  breakDue: boolean;
}

export function coreLive(core: Core, now: number): Live {
  const watching = core.seenAt !== null && now - core.seenAt <= RULE.watchGapMs;
  const last = core.minutes[core.minutes.length - 1];
  const fresh = last && now - last.at <= 150_000 ? last : undefined;
  const near = core.near.filter((r) => now - r.at <= 2000).map((r) => r.cm);
  return {
    watching, face: watching && core.face, facing: watching && core.facing,
    distanceCm: watching ? median(near) : null,
    tilt: watching ? core.tilt : null,
    sinceBreakSec: Math.floor(core.stretch.screenMs / 1000),
    awaySec: watching && core.stretch.away && !core.stretch.timed ? Math.floor((now - core.stretch.away.since) / 1000) : null,
    timedLeftSec: core.stretch.timed ? Math.max(0, Math.ceil(RULE.breakSeconds - (now - core.stretch.timed.since) / 1000)) : null,
    blinksLastMinute: fresh ? fresh.blinksPerMin : null,
    blinksThisMinute: core.blinksNow,
    blinksBlind: watching && core.facing && core.blindMs > BLIND_AFTER_MS,
    prompt: core.prompts.showing?.kind ?? null,
    breakDue: breakDue(core.stretch),
  };
}
