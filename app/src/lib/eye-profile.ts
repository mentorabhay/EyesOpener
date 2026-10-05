/**
 * Writing the eye profile. The browser sends only what it measured; every setting is derived here, on the server.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { LIMITS } from "@/components/measure/limits";
import { onboarding } from "@/copy/onboarding";
import { testByKey } from "@/data";
import { db, schema } from "@/db";
import { balanceCyanEye, blankEye, canStart, derive, type Derived, type Eye, type EyeResult, type Measured } from "@/engine";
import type { Member } from "@/lib/session";
import { inEnglish } from "@/i18n/runtime";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Side = "left" | "right";
const EYES: Eye[] = ["L", "R"];
const side = (e: Eye): Side => (e === "L" ? "left" : "right");
export const eyeOf = (s: Side): Eye => (s === "left" ? "L" : "R");

/** A number inside one of the measurement ranges. */
export const within = ([lo, hi]: readonly [number, number]) => z.number().min(lo).max(hi);
export const noteSchema = z.enum(["", "floor", "worse"]);
export const eyeSchema = z.enum(["L", "R"]);

const eyeResult = z.object({
  va: within(LIMITS.va),
  cs: within(LIMITS.cs),
  q: z.tuple([z.boolean(), z.boolean(), z.boolean(), z.boolean()]),
  note: noteSchema,
});
const measuredSchema = z.object({
  tested: z.literal(true),
  ppc: within(LIMITS.ppc),
  dist: within(LIMITS.dist).int(),
  eyes: z.object({ L: eyeResult, R: eyeResult }),
  bal: z.object({ x: within(LIMITS.bal), cyanEye: eyeSchema }).nullable(),
  /** How long each eye took, for the onboarding record. */
  seconds: z.object({ L: z.number().int().min(0).max(3600), R: z.number().int().min(0).max(3600) }).optional(),
});

/**
 * Why this person may not run a test for the active profile, or null when they may.
 * A cheer seat only looks and encourages. No screen sessions under age 4: onboarding and check-ups are screen sessions too.
 */
export const testBlock = (member: Member): "seat" | "under_age" | null =>
  !member.can("test") ? "seat"
    : canStart({ kind: "test", age: member.age, minutesToday: 0, dailyMinutes: 0, stopFlag: false }).ok ? null : "under_age";

export type TestKey = "acuity" | "contrast" | "balance" | "stereo" | "fusion_break" | "fusion_recovery" | "near_point" | "suppression" | "symptoms";
/** One row for `test_result`. `raw` holds what the test recorded on the way to `value`. */
export interface NewResult { testKey: TestKey; eye: Eye | null; value: number; note?: EyeResult["note"]; raw?: Record<string, unknown> }

/** A result is the baseline when the profile has no earlier result for that test and eye. */
async function insertResults(x: Tx | typeof db, profileId: string, deviceId: string | null, results: NewResult[]) {
  const earlier = await x.selectDistinct({ testKey: schema.testResult.testKey, eye: schema.testResult.eye }).from(schema.testResult)
    .where(and(eq(schema.testResult.profileId, profileId), inArray(schema.testResult.testKey, results.map((r) => r.testKey))));
  const seen = new Set(earlier.map((r) => `${r.testKey} ${r.eye}`));
  await x.insert(schema.testResult).values(results.map((r) => {
    const eye = r.eye && side(r.eye);
    return { profileId, deviceId, testKey: r.testKey, eye, value: r.value, unit: testByKey(r.testKey)!.unit, note: r.note || null, raw: r.raw, isBaseline: !seen.has(`${r.testKey} ${eye}`) };
  }));
}

/** Derives the settings and makes them the profile's current eye profile. */
async function writeProfile(tx: Tx, profileId: string, deviceId: string, measured: Measured, source: "onboarding" | "weekly_check") {
  /* The balance test is read with this screen's ink balance when a grown-up has measured it (src/lib/screen.ts). Null leaves the reading as it was. */
  const [screen] = await tx.select({ inkBalance: schema.device.inkBalance }).from(schema.device).where(eq(schema.device.id, deviceId)).limit(1);
  const d = derive({ ...measured, inkBalance: screen?.inkBalance });
  await tx.update(schema.eyeProfile).set({ isCurrent: false }).where(and(eq(schema.eyeProfile.profileId, profileId), eq(schema.eyeProfile.isCurrent, true)));
  await tx.insert(schema.eyeProfile).values({
    profileId, deviceId, weakEye: d.weak && side(d.weak), cyanEye: side(d.cyanEye), strongContrast: d.con, balanceLogRatio: measured.bal?.x ?? null,
    letterCm: d.letterCm, targetCm: d.targetCm, appTextPx: d.appPx, faintText: d.faint, flags: d.flags, source,
  });
  return d;
}

/**
 * Saves one onboarding: the screen, the run, each result and the settings derived from them, all or nothing.
 * Returns the derived settings, or null when the input is not a valid measurement or this person may not run a test.
 */
export async function saveMeasured(member: Member, input: unknown): Promise<Derived | null> {
  const parsed = measuredSchema.safeParse(input);
  if (!parsed.success || testBlock(member)) return null;
  const { seconds, ...measured } = parsed.data;
  const profileId = member.profile.id;
  return db.transaction(async (tx) => {
    const screen = { pxPerCm: measured.ppc, distanceCm: measured.dist, calibratedAt: new Date() };
    const [device] = member.device
      ? await tx.update(schema.device).set(screen).where(eq(schema.device.id, member.device.id)).returning()
      : await tx.insert(schema.device).values({ ...screen, accountId: member.account.id, kind: "web", label: inEnglish(() => onboarding.deviceLabel) }).returning();
    await tx.insert(schema.onboardingRun).values({
      profileId, deviceId: device.id, answers: { left: measured.eyes.L.q, right: measured.eyes.R.q },
      leftSeconds: seconds?.L, rightSeconds: seconds?.R, finishedAt: new Date(),
    });
    await insertResults(tx, profileId, device.id, [
      ...EYES.flatMap((e): NewResult[] => [
        { testKey: "acuity", eye: e, value: measured.eyes[e].va, note: measured.eyes[e].note },
        { testKey: "contrast", eye: e, value: measured.eyes[e].cs },
      ]),
      ...(measured.bal ? [{ testKey: "balance", eye: null, value: measured.bal.x, raw: { cyanEye: measured.bal.cyanEye } } satisfies NewResult] : []),
    ]);
    return writeProfile(tx, profileId, device.id, measured, "onboarding");
  });
}

/**
 * Saves the rows of one check-up, all or none. False when this person may not run a test, or when the check-up is drawn
 * on the screen and there is no measured screen. A check-up done away from the screen (`onScreen: false`) names no screen.
 */
export async function saveResults(member: Member, results: NewResult[], { onScreen = true } = {}) {
  if (testBlock(member) || (onScreen && !member.device)) return false;
  await insertResults(db, member.profile.id, onScreen ? member.device!.id : null, results);
  return true;
}

/**
 * Rebuilds the measurement from the profile's latest letter, faint-letter and balance results and the screen,
 * then writes a new current eye profile. Null when there is no screen or an eye has no letter result yet:
 * sizes are never made up.
 */
export async function recomputeFromResults(member: Member): Promise<Derived | null> {
  const { device, profile } = member;
  if (!device) return null;
  const t = schema.testResult;
  const latest = await db.selectDistinctOn([t.testKey, t.eye]).from(t)
    .where(and(eq(t.profileId, profile.id), inArray(t.testKey, ["acuity", "contrast", "balance"])))
    .orderBy(t.testKey, t.eye, desc(t.takenAt));
  const find = (testKey: string, eye: Eye | null) => latest.find((r) => r.testKey === testKey && r.eye === (eye && side(eye)));
  const [run] = await db.select().from(schema.onboardingRun).where(eq(schema.onboardingRun.profileId, profile.id)).orderBy(desc(schema.onboardingRun.startedAt)).limit(1);
  const answers = (run?.answers ?? {}) as Partial<Record<Side, EyeResult["q"]>>;

  const eyes = EYES.map((e): EyeResult | undefined => {
    const va = find("acuity", e);
    return va && {
      va: va.value, cs: find("contrast", e)?.value ?? blankEye().cs, q: answers[side(e)] ?? blankEye().q,
      note: noteSchema.catch("").parse(va.note ?? ""),
    };
  });
  const [L, R] = eyes;
  if (!L || !R) return null;
  const bal = find("balance", null);
  /* older balance rows do not say which eye wore the cyan lens: it was the eye the profile gives the cyan lens to */
  const cyanEye = eyeSchema.safeParse((bal?.raw as { cyanEye?: unknown } | null)?.cyanEye).data
    ?? (member.eye ? eyeOf(member.eye.cyanEye) : balanceCyanEye(L.va, R.va));
  const measured: Measured = { tested: true, ppc: device.pxPerCm, dist: device.distanceCm, eyes: { L, R }, bal: bal ? { x: bal.value, cyanEye } : null };
  return db.transaction((tx) => writeProfile(tx, profile.id, device.id, measured, "weekly_check"));
}

/** A stored eye profile, read back in the shape the engine derives. */
export function settingsOf(row: NonNullable<Member["eye"]>): Derived {
  const weak = row.weakEye && eyeOf(row.weakEye);
  const flags = { ownGlasses: false, lazyBefore: false, eyeTurn: false, stop: false, ...(row.flags as Partial<Derived["flags"]>) };
  const x = row.balanceLogRatio;
  return {
    weak, cyanEye: eyeOf(row.cyanEye), con: row.strongContrast,
    conSource: x === null ? (weak ? "starting_level" : "equal") : Math.abs(x) < 0.1 ? "balance_equal" : "balance",
    letterCm: row.letterCm, targetCm: row.targetCm, appPx: row.appTextPx, faint: row.faintText, flags,
    opens: flags.stop ? "doctor_first" : flags.eyeTurn ? "counsellor" : weak ? "lazy_eye" : "eye_fitness",
  };
}
