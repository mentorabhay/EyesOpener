/**
 * The clips on the server: who may run one, saving what it measured, and what was done before.
 * The rules are in clip-rules.ts and are tested without a database.
 *
 * What reaches this file from a member's device is what the browser measured: answers by number, matches, dots,
 * seconds. No picture and no face point is ever sent. Every read and write is for the active profile and the
 * screen of the household of the person signed in: no id comes from the browser.
 *
 * A clip that measures the same thing as a check-up is saved by the check-ups' own function (`saveResults`), so the
 * same rules apply: the seat, the age, the measured screen and the baseline. A screen colour is saved by the screen
 * colours' own function (`saveStep`). Only what is new to clips is written here.
 */
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { holdDemand } from "@/clips/maths";
import { tests } from "@/data";
import { clipDef, clipTest, isCalibration, type ClipDef, type Eye, type OfferedClip, type SetKey } from "@/data/clips";
import { db, schema } from "@/db";
import type { LensMatch } from "@/engine";
import { eyeOf, recomputeFromResults, saveResults, testBlock, type NewResult } from "@/lib/eye-profile";
import { isAdultProfile } from "@/lib/monitor-rules";
import { programmeView } from "@/lib/programme";
import { saveStep } from "@/lib/screen";
import { mayCalibrate, rawOf, screenFacts } from "@/lib/screen-rules";
import { todayKey, type Member } from "@/lib/session";
import { clipState, planSet, resolveClip, type Blocked, type ClipPerson, type ClipRow, type Outcome, type Refused, type SetPlan } from "./clip-rules";

const R = schema.clipRun, T = schema.testResult, C = schema.consent;

/** The version of the words a guardian agrees to when allowing the camera for the clips (src/copy/clips.ts, `camera`). */
export const CAMERA_CONSENT_VERSION = "clips-2026-10";

/* ───────────── who ───────────── */

const liveCamera = (m: Member) => and(eq(C.profileId, m.profile.id), eq(C.accountId, m.account.id), eq(C.kind, "camera"), isNull(C.revokedAt));

/** True when a guardian's consent to the camera stands for the active profile, whichever feature it was given on. */
export async function cameraAllowed(m: Member): Promise<boolean> {
  const [row] = await db.select({ id: C.id }).from(C).where(liveCamera(m)).limit(1);
  return !!row;
}

/** A guardian or co-guardian allows the camera for the active profile. Recorded once. Never in child mode. */
export async function allowClipCamera(m: Member): Promise<boolean> {
  if (!m.can("consent")) return false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`consent:${m.profile.id}:camera`}))`);
    const [live] = await tx.select({ id: C.id }).from(C).where(liveCamera(m)).limit(1);
    if (!live) await tx.insert(C).values({ profileId: m.profile.id, accountId: m.account.id, userId: m.user.id, kind: "camera", textVersion: CAMERA_CONSENT_VERSION });
  });
  return true;
}

/** What `clipState` needs to know about the person signed in, the active profile and the household's screen. */
export async function clipPerson(m: Member): Promise<ClipPerson> {
  return {
    block: testBlock(m),
    guardian: mayCalibrate(m),
    adult: isAdultProfile(m.profile, m.age),
    cameraAllowed: await cameraAllowed(m),
    dist: m.device?.distanceCm ?? null,
  };
}

/* ───────────── what the runner is given ───────────── */

/** Everything a clip's screen part needs from the server. Plain values: it crosses to the browser. */
export interface ClipCtx {
  screen: { ppc: number; dist: number; gamma: number } | null;
  /** The eye the cyan lens sits over: the weaker eye (the stronger one when the inks are swapped), or the left eye until a weaker eye is known. */
  cyanEye: Eye;
  /** Which ink the weaker eye sees (engine/profile.ts). */
  weakInk: "cyan" | "red";
  /** The stronger eye's contrast from the eye settings, and the member's letter and target sizes in page dots. */
  contrast: number; letterPx: number; targetPx: number;
  /** Under 12: a grown-up runs the near point check. */
  young: boolean;
  child: boolean;
  name: string;
  /** May this person allow the camera here and now? */
  canAllowCamera: boolean;
  /** The pull a hold clip is set at, in prism dioptres: half of the last fusion break, or the default. */
  holdPd: number;
  /** The colour leak on record for this screen, as shares, or null when it is not measured. */
  leak: { red: number; cyan: number } | null;
  /** How many reading clips this profile has done: the passage changes each time. */
  readings: number;
}

export async function clipContext(m: Member): Promise<ClipCtx> {
  const d = m.device, facts = d && screenFacts(d);
  const [[lastBreak], [read]] = await Promise.all([
    db.select({ value: T.value }).from(T).where(and(eq(T.profileId, m.profile.id), eq(T.testKey, "fusion_break"))).orderBy(desc(T.takenAt)).limit(1),
    db.select({ n: sql<number>`count(*)::int` }).from(T).where(and(eq(T.profileId, m.profile.id), eq(T.testKey, "reading_speed"))),
  ]);
  const ppc = d?.pxPerCm ?? 0;
  return {
    screen: d ? { ppc: d.pxPerCm, dist: d.distanceCm, gamma: d.gamma } : null,
    cyanEye: m.eye ? eyeOf(m.eye.cyanEye) : "L",
    weakInk: m.eye?.weakInk === "red" ? "red" : "cyan",
    contrast: m.eye?.strongContrast ?? 1, letterPx: (m.eye?.letterCm ?? 0) * ppc, targetPx: (m.eye?.targetCm ?? 0) * ppc,
    young: m.age !== null && m.age < 12,
    child: m.profile.kind === "child",
    name: m.profile.displayName,
    canAllowCamera: m.can("consent"),
    holdPd: holdDemand(lastBreak?.value ?? null),
    leak: facts?.leak ? { red: facts.leak.red, cyan: facts.leak.cyan } : null,
    readings: read?.n ?? 0,
  };
}

/* ───────────── saving ───────────── */

export interface SavedRow { key: string; eye: Eye | null; value: number; note: string }
export type ClipSaved =
  | {
    ok: true; outcome: Outcome; say?: string; results: SavedRow[]; detail: Record<string, unknown>;
    /** After a clip that changed the screen: the screen's values as they now stand. */
    screen?: { ppc: number; dist: number; gamma: number; leak: { red: number; cyan: number } | null; ink: number | null };
  }
  | { ok: false; why: Blocked | Refused["why"] | "failed" | "seat" };

const side = (e: Eye | null) => (e === null ? null : e === "L" ? ("left" as const) : ("right" as const));

/** The matches of each lens this screen already has: on its own row, or kept from the other single-lens clip. */
async function lensMatches(m: Member): Promise<{ red?: LensMatch; cyan?: LensMatch }> {
  if (!m.device) return {};
  const onRow = rawOf(m.device.colourRaw).leak;
  if (onRow) return { red: onRow.red as LensMatch, cyan: onRow.cyan as LensMatch };
  /* neither lens is on the row yet: the other lens may have been matched by its own clip since the screen's size was last set */
  const runs = await db.select({ code: R.code, detail: R.detail }).from(R)
    .where(and(eq(R.accountId, m.account.id), eq(R.deviceId, m.device.id), inArray(R.code, ["C08", "C09"]))).orderBy(desc(R.takenAt)).limit(6);
  const of = (code: string) => (runs.find((r) => r.code === code)?.detail as { match?: LensMatch } | null)?.match;
  return { cyan: of("C08"), red: of("C09") };
}

/** Rows under a key of the clips' own. The baseline rule is the check-ups' rule: the first result of a key and eye is the baseline. */
async function insertOwn(m: Member, rows: ClipRow[], deviceId: string | null) {
  if (!rows.length) return;
  const earlier = await db.selectDistinct({ testKey: T.testKey, eye: T.eye }).from(T)
    .where(and(eq(T.profileId, m.profile.id), inArray(T.testKey, rows.map((r) => r.testKey))));
  const seen = new Set(earlier.map((r) => `${r.testKey} ${r.eye}`));
  await db.insert(T).values(rows.map((r) => ({
    profileId: m.profile.id, deviceId, testKey: r.testKey, eye: side(r.eye), value: r.value, unit: clipTest(r.testKey)!.unit,
    note: r.note || null, raw: r.raw, isBaseline: !seen.has(`${r.testKey} ${side(r.eye)}`),
  })));
}

/**
 * The size or the distance of the household's screen was set again. Letter and target sizes are in centimetres at
 * the eye and were worked out for the old screen, so they are worked out again for every profile that has them.
 */
async function resize(m: Member, set: { pxPerCm?: number; distanceCm?: number }) {
  const [device] = await db.update(schema.device).set({ ...set, calibratedAt: new Date() })
    .where(and(eq(schema.device.id, m.device!.id), eq(schema.device.accountId, m.account.id))).returning();
  if (!device) return null;
  const eyes = await db.select().from(schema.eyeProfile)
    .where(and(inArray(schema.eyeProfile.profileId, m.profiles.map((p) => p.id)), eq(schema.eyeProfile.isCurrent, true)));
  for (const profile of m.profiles) {
    const eye = eyes.find((e) => e.profileId === profile.id);
    if (eye) await recomputeFromResults({ ...m, device, profile, eye } as Member);
  }
  return device;
}

/**
 * Saves one finished clip for the active profile. Returns what was stored, in the shape the result screen reads,
 * or why nothing was. A refusal changes nothing.
 */
export async function saveClip(m: Member, code: unknown, data: unknown, setKey: SetKey | null): Promise<ClipSaved> {
  const def = typeof code === "string" ? clipDef(code) : undefined;
  if (!def?.offered) return { ok: false, why: "withheld" };
  if (!m.can("test")) return { ok: false, why: "seat" };
  const blocked = clipState(def, await clipPerson(m));
  if (blocked) return { ok: false, why: blocked };

  const d = m.device;
  const resolved = resolveClip(def, data, {
    screen: d ? { ppc: d.pxPerCm, dist: d.distanceCm, gamma: d.gamma } : null,
    cyanEye: m.eye ? eyeOf(m.eye.cyanEye) : "L",
    lensMatches: def.play.template === "match" ? await lensMatches(m) : {},
  });
  if (!resolved.ok) return resolved;

  let device: Member["device"] | null | undefined = d;
  if (resolved.step) {
    const saved = await saveStep(m, resolved.step);
    /* clips never send a tuning, so "dim" cannot come back from here; it is read as a failure all the same */
    if (!saved.ok) return { ok: false, why: saved.why === "seat" ? "seat" : saved.why === "dim" ? "failed" : saved.why };
    [device] = await db.select().from(schema.device).where(and(eq(schema.device.id, d!.id), eq(schema.device.accountId, m.account.id))).limit(1);
  }
  if (resolved.screen) {
    if (!d || !mayCalibrate(m)) return { ok: false, why: "seat" };
    device = await resize(m, resolved.screen);
    if (!device) return { ok: false, why: "failed" };
  }

  const checkups = resolved.rows.filter((r) => clipTest(r.testKey)?.checkup), own = resolved.rows.filter((r) => !clipTest(r.testKey)?.checkup);
  const deviceId = def.screen || isCalibration(def.code) ? d?.id ?? null : null;
  if (checkups.length && !(await saveResults(m, checkups as NewResult[], { onScreen: def.screen }))) return { ok: false, why: "failed" };
  await insertOwn(m, own, def.screen ? deviceId : null);

  const first = resolved.rows[0];
  await db.insert(R).values({
    accountId: m.account.id, profileId: m.profile.id, deviceId, code: def.code, outcome: resolved.outcome,
    value: first?.value ?? null, unit: first ? clipTest(first.testKey)!.unit : null,
    detail: { ...resolved.detail, ...(resolved.say && { say: resolved.say }) }, setKey,
  });
  /* only the letter and the balance results move the eye settings, as with the check-ups */
  if (checkups.some((r) => r.testKey === "acuity" || r.testKey === "contrast" || r.testKey === "balance")) await recomputeFromResults(m);

  const facts = device && (resolved.step || resolved.screen) ? screenFacts(device) : null;
  return {
    ok: true, outcome: resolved.outcome, say: resolved.say, detail: resolved.detail,
    results: resolved.rows.map((r) => ({ key: r.testKey, eye: r.eye, value: r.value, note: r.note })),
    ...(facts && device && {
      screen: { ppc: device.pxPerCm, dist: device.distanceCm, gamma: device.gamma, leak: facts.leak ? { red: facts.leak.red, cyan: facts.leak.cyan } : null, ink: facts.ink?.value ?? null },
    }),
  };
}

/* ───────────── what was done before ───────────── */

export interface LastRun { code: string; outcome: string; value: number | null; unit: string | null; detail: unknown; at: Date }

/**
 * The latest run of each clip. A clip about the eyes counts for the active profile; a clip about the screen counts
 * for the household, whoever ran it.
 */
export async function lastRuns(m: Member, codes?: readonly string[]): Promise<Map<string, LastRun>> {
  const rows = await db.selectDistinctOn([R.code], { code: R.code, outcome: R.outcome, value: R.value, unit: R.unit, detail: R.detail, at: R.takenAt }).from(R)
    .where(and(
      eq(R.accountId, m.account.id),
      or(eq(R.profileId, m.profile.id), sql`${R.code} like 'C%'`),
      codes ? inArray(R.code, [...codes]) : undefined,
    )).orderBy(R.code, desc(R.takenAt));
  return new Map(rows.map((r) => [r.code, r]));
}

/** The codes finished today, in the member's own calendar: a set goes on from there. */
export async function doneToday(m: Member): Promise<Set<string>> {
  const since = new Date(Date.now() - 36 * 3_600_000), today = todayKey();
  const rows = await db.select({ code: R.code, at: R.takenAt }).from(R)
    .where(and(eq(R.accountId, m.account.id), or(eq(R.profileId, m.profile.id), sql`${R.code} like 'C%'`), sql`${R.takenAt} >= ${since}`));
  return new Set(rows.filter((r) => todayKey(r.at) === today).map((r) => r.code));
}

export type ResultRow = typeof T.$inferSelect;
/** The active profile's results under a clip's keys, newest first. */
export async function clipResults(m: Member, def: ClipDef, limit = 12): Promise<ResultRow[]> {
  if (!def.offered || def.store.to !== "result") return [];
  const play = def.play, eye = "eye" in play && play.eye !== "both" ? side(play.eye) : undefined;
  return db.select().from(T)
    .where(and(eq(T.profileId, m.profile.id), inArray(T.testKey, [...def.store.keys]), eye ? eq(T.eye, eye) : undefined))
    .orderBy(desc(T.takenAt)).limit(limit);
}

/** The runs of one clip, newest first: for a check of the screen, the household's; for the eyes, the active profile's. */
export async function clipRuns(m: Member, def: OfferedClip, limit = 6) {
  return db.select({ outcome: R.outcome, detail: R.detail, at: R.takenAt }).from(R)
    .where(and(eq(R.accountId, m.account.id), eq(R.code, def.code), isCalibration(def.code) ? undefined : eq(R.profileId, m.profile.id)))
    .orderBy(desc(R.takenAt)).limit(limit);
}

/** The keys of the check-ups whose last result is older than their own schedule, oldest first. For a member on no programme. */
export async function checkupsDue(m: Member, tests: readonly { key: string; everyDays: number; built: boolean }[], now = Date.now()): Promise<string[]> {
  const rows = await db.select({ key: T.testKey, last: sql<Date>`max(${T.takenAt})` }).from(T).where(eq(T.profileId, m.profile.id)).groupBy(T.testKey).orderBy(asc(T.testKey));
  const last = new Map(rows.map((r) => [r.key, new Date(r.last).getTime()]));
  return tests.filter((t) => t.built && (last.get(t.key) ?? -Infinity) + t.everyDays * 86_400_000 <= now).map((t) => t.key);
}

/* ───────────── sets ───────────── */

export interface SetView extends SetPlan {
  key: SetKey;
  /** The codes of this set that are finished today: the set goes on after them. */
  done: string[];
  /** For the weekly check: the programme and week the list comes from, or null when it comes from what is due. */
  from: { name: string; week: number } | null;
}

/**
 * The clips one set plays for the active profile on the household's screen, with what is already finished today.
 * The weekly check reads the member's programme plan (the check-ups due this week and not yet taken); a member on
 * no programme gets the check-ups that are due by their own schedule.
 */
export async function setView(m: Member, key: SetKey): Promise<SetView> {
  const [person, finished] = await Promise.all([clipPerson(m), doneToday(m)]);
  let due: string[] = [], from: SetView["from"] = null;
  if (key === "weekly") {
    const view = await programmeView(m);
    if (view.state === "active") {
      due = view.checks.filter((x) => !x.done).map((x) => x.test);
      from = { name: view.programme.name, week: view.week };
    } else due = await checkupsDue(m, tests);
  }
  const plan = planSet(key, { ...person, age: m.age, due });
  return { key, ...plan, done: plan.items.filter((i) => finished.has(i.code)).map((i) => i.code), from };
}
