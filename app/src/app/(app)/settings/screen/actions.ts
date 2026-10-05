"use server";
import { revalidatePath } from "next/cache";
import { gammaFromMatches, type LeakLevel } from "@/engine";
import { forgetStep, profileLines, saveStep, type SaveError } from "@/lib/screen";
import { stepInput } from "@/lib/screen-rules";
import { requireMember } from "@/lib/session";

export type StepSaved =
  | { ok: true; step: "gamma"; gamma: number; spread: number }
  /** `worst` is the strongest effect of the leak on anyone in the household; null when nobody has eye settings yet. */
  | { ok: true; step: "leak"; red: number; cyan: number; worst: LeakLevel | null }
  | { ok: true; step: "ink"; ink: number; turned: boolean }
  | { ok: false; why: SaveError | "failed"; lens?: "red" | "cyan" };

const RANK: Record<LeakLevel, number> = { clean: 0, ghost: 1, high: 2 };

/**
 * Saves one finished colour check for the household's own screen. The browser sends the matches only; the value is
 * worked out on the server (src/lib/screen-rules.ts). A guardian or co-guardian may do this; nobody else, and not in child mode.
 */
export async function saveScreenStep(input: unknown): Promise<StepSaved> {
  const m = await requireMember();
  const saved = await saveStep(m, input).catch(() => null);
  if (!saved) return { ok: false, why: "failed" };
  if (!saved.ok) return saved;
  /* the red ink of every scene is set from gamma in the app layout, so every screen is drawn again */
  revalidatePath("/", "layout");
  const sent = stepInput.parse(input), f = saved.facts;
  if (sent.step === "gamma") {
    const g = gammaFromMatches(sent.greys);
    return { ok: true, step: "gamma", gamma: f.gamma.value, spread: g.ok ? g.spread : 0 };
  }
  if (sent.step === "leak" && f.leak) {
    const levels = (await profileLines(m, f)).flatMap((p) => (p.leak ? [p.leak.level] : []));
    return { ok: true, step: "leak", red: f.leak.red, cyan: f.leak.cyan, worst: levels.sort((a, b) => RANK[b] - RANK[a])[0] ?? null };
  }
  if (sent.step === "ink" && f.ink) return { ok: true, step: "ink", ink: f.ink.value, turned: f.ink.turned };
  return { ok: false, why: "failed" };
}

/** Puts one check back to "not measured". The step comes from a form; anything else is refused in the rules. */
export async function forgetScreenStep(formData: FormData) {
  const m = await requireMember();
  const done = await forgetStep(m, formData.get("step"));
  if (done.ok) revalidatePath("/", "layout");
}
