// Eyes Opener: The Screens and glasses room (/admin/screens): how families' screens and glasses are set up, as counts only.
/**
 * The Screens and glasses room (/admin/screens): how families' screens and glasses are set up, as counts only.
 * No household, profile or screen is named or listed. A count from 1 to 4 is shown as "fewer than 5", and a middle value
 * is shown only when at least 5 screens give it, as the sponsor counts already do. Staff test households are left out.
 * It reads the setup facts (src/lib/setup-rules.ts) in bulk: the screens' rows, the current eye settings, whether the
 * safety questions were answered and when the latest balance check-up was taken. Server only.
 */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { LEAK_FAINT } from "@/engine";
import { screenFacts } from "./screen-rules";
import { isReady, setupSteps } from "./setup-rules";

/** Under this many, a count is not shown as a number. */
export const SMALL = 5;
export type Shown = number | "few";
export const shown = (n: number): Shown => (n > 0 && n < SMALL ? "few" : n);

const KINDS = ["web", "phone", "tv"] as const;
const middle = (xs: number[]): number | null => {
  if (xs.length < SMALL) return null;
  const v = [...xs].sort((a, b) => a - b), h = v.length >> 1;
  return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
};

export interface ScreensRoom {
  profiles: Shown; finished: Shown; swapped: Shown; screens: Shown; tuned: Shown; leakMeasured: Shown; ghost: Shown;
  kinds: { kind: (typeof KINDS)[number]; screens: Shown; tuned: Shown; red: number | null; cyan: number | null }[];
}

export async function screensRoom(): Promise<ScreensRoom> {
  const real = await db.select({ id: s.account.id }).from(s.account).where(isNull(s.account.previewFor));
  const accounts = real.map((a) => a.id);
  if (!accounts.length) return empty();
  const [devices, profiles] = await Promise.all([
    db.select().from(s.device).where(inArray(s.device.accountId, accounts)).orderBy(desc(s.device.calibratedAt)),
    db.select().from(s.profile).where(and(inArray(s.profile.accountId, accounts), isNull(s.profile.archivedAt))),
  ]);
  const ids = profiles.map((p) => p.id);
  const t = s.testResult;
  const [eyes, runs, balances] = ids.length ? await Promise.all([
    db.select().from(s.eyeProfile).where(and(inArray(s.eyeProfile.profileId, ids), eq(s.eyeProfile.isCurrent, true))),
    db.selectDistinct({ profileId: s.onboardingRun.profileId }).from(s.onboardingRun).where(inArray(s.onboardingRun.profileId, ids)),
    db.selectDistinctOn([t.profileId], { profileId: t.profileId, at: t.takenAt }).from(t).where(and(inArray(t.profileId, ids), eq(t.testKey, "balance"))).orderBy(t.profileId, desc(t.takenAt)),
  ]) : [[], [], []];

  /* each household's computer screen, as the member app reads it: the most recently measured web screen */
  const webOf = new Map<string, (typeof devices)[number]>();
  for (const d of devices) if (d.kind === "web" && !webOf.has(d.accountId)) webOf.set(d.accountId, d);
  const answered = new Set(runs.map((r) => r.profileId));
  let finished = 0;
  for (const p of profiles) {
    const dv = webOf.get(p.accountId), eye = eyes.find((e) => e.profileId === p.id);
    const steps = setupSteps({
      screen: dv ? { pxPerCm: dv.pxPerCm, facts: screenFacts(dv) } : null, answered: answered.has(p.id),
      eye: eye ? { weakEye: eye.weakEye, strongContrast: eye.strongContrast } : null,
      lensAt: p.weakInkAt, balanceAt: balances.find((b) => b.profileId === p.id)?.at ?? null,
    });
    if (isReady(steps)) finished++;
  }
  const measured = devices.filter((d) => d.leakAt && d.leakRedLens !== null && d.leakCyanLens !== null);
  return {
    profiles: shown(profiles.length),
    finished: shown(finished),
    swapped: shown(profiles.filter((p) => p.weakInk === "red").length),
    screens: shown(devices.length),
    tuned: shown(devices.filter((d) => d.cyanGreenAt).length),
    leakMeasured: shown(measured.length),
    ghost: shown(measured.filter((d) => Math.max(d.leakRedLens!, d.leakCyanLens!) >= LEAK_FAINT).length),
    kinds: KINDS.map((kind) => {
      const of = devices.filter((d) => d.kind === kind), m = measured.filter((d) => d.kind === kind);
      return { kind, screens: shown(of.length), tuned: shown(of.filter((d) => d.cyanGreenAt).length), red: middle(m.map((d) => d.leakRedLens!)), cyan: middle(m.map((d) => d.leakCyanLens!)) };
    }),
  };
}

function empty(): ScreensRoom {
  return { profiles: 0, finished: 0, swapped: 0, screens: 0, tuned: 0, leakMeasured: 0, ghost: 0, kinds: KINDS.map((kind) => ({ kind, screens: 0, tuned: 0, red: null, cyan: null })) };
}
