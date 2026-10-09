/**
 * The setup of the active person and the household's screen, read from the database (rules: src/lib/setup-rules.ts).
 * Two small reads beside what the session already holds: whether the safety questions were answered, and when the latest
 * balance check-up was taken.
 */
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { screenFacts } from "./screen-rules";
import { readSetupSettings } from "./setup-settings";
import type { Member } from "./session";
import { isReady, missing, nextStep, progress, setupSteps, type SetupPart, type SetupStep } from "./setup-rules";

export interface Setup {
  steps: SetupStep[];
  /** Every required step is done: two-eye items open. */
  ready: boolean;
  /** The required steps of this screen and these glasses are done. */
  screenReady: boolean;
  done: number;
  of: number;
  next: SetupStep | null;
  /** Two-eye items wait for this person: setup is not done, the gate is on (src/lib/setup-settings.ts), and this is not a staff test household. */
  held: boolean;
  /** Staff left the gate on. */
  gate: boolean;
}

type Who = Pick<Member, "profile" | "device" | "eye" | "tester">;

export async function setupOf(m: Who): Promise<Setup> {
  const t = schema.testResult;
  const [[run], [bal], { gate }] = await Promise.all([
    db.select({ id: schema.onboardingRun.id }).from(schema.onboardingRun).where(eq(schema.onboardingRun.profileId, m.profile.id)).limit(1),
    db.select({ at: t.takenAt }).from(t).where(and(eq(t.profileId, m.profile.id), eq(t.testKey, "balance"))).orderBy(desc(t.takenAt)).limit(1),
    readSetupSettings(),
  ]);
  const steps = setupSteps({
    screen: m.device ? { pxPerCm: m.device.pxPerCm, facts: screenFacts(m.device) } : null,
    answered: !!run,
    eye: m.eye && { weakEye: m.eye.weakEye, strongContrast: m.eye.strongContrast },
    lensAt: m.profile.weakInkAt ?? null,
    balanceAt: bal?.at ?? null,
  });
  const ready = isReady(steps), { done, of } = progress(steps);
  return { steps, ready, screenReady: isReady(steps, "screen"), done, of, next: nextStep(steps), held: gate && !ready && !m.tester, gate };
}

/** The person part only, for the phone and TV apps, which measure their own screens. */
export const personHeld = (s: Setup, tester: boolean) => s.gate && !tester && missing(s.steps, "person" satisfies SetupPart).length > 0;
