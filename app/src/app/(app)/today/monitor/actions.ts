"use server";
/**
 * Writes for the workday monitor. Every action reads the member fresh, checks what this person may do for the
 * active profile, and validates what the browser sent (src/lib/monitor.ts, src/lib/monitor-rules.ts).
 * What arrives is numbers: one measured minute, or the time of a break. Never a picture.
 */
import { revalidatePath } from "next/cache";
import { endRun, forgetMonitor, giveCameraConsent, saveBreak, saveMinute, startRun, withdrawCameraConsent, type Refused } from "@/lib/monitor";
import { requireMember } from "@/lib/session";

const PAGE = "/today/monitor";

/** A guardian allows the camera for the active grown-up profile. The box on the form must be ticked. */
export async function consentCamera(formData: FormData) {
  const m = await requireMember();
  if (formData.get("agree") !== "on") return;
  await giveCameraConsent(m);
  revalidatePath(PAGE);
}

export async function withdrawCamera() {
  const m = await requireMember();
  await withdrawCameraConsent(m);
  revalidatePath(PAGE);
}

export type Started = { ok: true; runId: string; now: number } | { ok: false; why: "not_allowed" | "consent" };
export async function monitorStart(): Promise<Started> {
  return startRun(await requireMember());
}

export type Saved = { ok: true } | { ok: false; why: Refused };
/** One measured minute. The page does not ask for a new copy of itself: it shows these numbers already. */
export async function monitorMinute(runId: string, minute: unknown): Promise<Saved> {
  const out = await saveMinute(await requireMember(), runId, minute);
  return out.ok ? { ok: true } : out;
}

export type BreakSaved = { ok: true; counted: boolean; today: number } | { ok: false; why: Refused };
/** A break the monitor saw or timed. When it moves the Rest ring, Today is drawn again. */
export async function monitorBreak(runId: string, taken: unknown): Promise<BreakSaved> {
  const out = await saveBreak(await requireMember(), runId, taken);
  if (!out.ok) return out;
  if (out.counted) revalidatePath("/today");
  return { ok: true, counted: out.counted, today: out.today };
}

export async function monitorStop(runId: string): Promise<void> {
  await endRun(await requireMember(), String(runId));
  revalidatePath(PAGE);
  revalidatePath("/today");
}

export type Forgot = { ok: boolean; samples: number } | null;
/** The member deletes the monitor's numbers for the active profile. */
export async function monitorForget(_: Forgot, formData: FormData): Promise<Forgot> {
  const m = await requireMember();
  if (formData.get("sure") !== "yes") return { ok: false, samples: 0 };
  const out = await forgetMonitor(m);
  revalidatePath(PAGE);
  return out;
}
