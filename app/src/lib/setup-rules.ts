// Eyes Opener: The setup a person needs before a two-eye game: this screen and these glasses (once, for the household), then this.
/**
 * The setup a person needs before a two-eye game: this screen and these glasses (once, for the household), then this
 * person (each profile). Pure rules; the database side is src/lib/setup.ts and the page is /setup.
 *
 * Required: the screen's size, the glasses tuning, the leak check, the safety questions, the eye check, the lens choice
 * (when one eye is weaker) and the balance check-up. Recommended: the brightness curve and the ink balance, which make
 * contrast truer but are not needed for the two pictures to stay apart (decision C of the setup plan, 9 October 2026).
 */
import { LIMITS } from "@/components/measure/limits";
import { profileEffect, type ScreenFacts } from "./screen-rules";

export const SETUP_STEPS = ["size", "gamma", "tune", "leak", "ink", "safety", "eyes", "lens", "balance"] as const;
export type SetupKey = (typeof SETUP_STEPS)[number];
export type SetupPart = "screen" | "person";
/** `done`; `todo`: never done; `again`: done, but something since makes it out of date; `skip`: not needed for this person. */
export type SetupState = "done" | "todo" | "again" | "skip";

export interface SetupStep {
  key: SetupKey;
  part: SetupPart;
  required: boolean;
  state: SetupState;
  /** Why the step is out of date, or a warning on a step that counts as done. */
  why: "stale_tune" | "lens_changed" | "screen_changed" | "at_limit" | null;
  /** Where the step is done. */
  href: string;
}

export interface SetupInput {
  /** The household's screen, as last measured; null when its size was never measured. */
  screen: { pxPerCm: number; facts: ScreenFacts } | null;
  /** The safety questions were answered (an onboarding run exists for this person). */
  answered: boolean;
  /** The person's current eye settings; null when the eye check was never done. */
  eye: { weakEye: string | null; strongContrast: number } | null;
  /** When the lens choice was made or confirmed; null while it never was. */
  lensAt: Date | null;
  /** When the person's latest balance check-up was taken; null when never. */
  balanceAt: Date | null;
}

export const SCREEN_HREF: Record<"size" | "gamma" | "tune" | "leak" | "ink", string> = {
  size: "/setup/eyes", gamma: "/settings/screen?step=gamma", tune: "/settings/screen?step=tune", leak: "/settings/screen?step=leak", ink: "/settings/screen?step=ink",
};

/** A size at either end of the slider is almost never a real screen: someone most likely dragged it all the way. */
export const atLimit = (ppc: number) => ppc <= LIMITS.ppc[0] + 0.5 || ppc >= LIMITS.ppc[1] - 0.5;

export function setupSteps(i: SetupInput): SetupStep[] {
  const f = i.screen?.facts ?? null;
  const step = (key: SetupKey, part: SetupPart, required: boolean, state: SetupState, href: string, why: SetupStep["why"] = null): SetupStep => ({ key, part, required, state, why, href });
  const weak = !!i.eye?.weakEye;
  const effect = f && i.eye ? profileEffect(f, i.eye, i.balanceAt, i.lensAt) : null;
  const lensAfter = !!i.lensAt && !!i.balanceAt && i.lensAt.getTime() > i.balanceAt.getTime();
  return [
    step("size", "screen", true, i.screen ? "done" : "todo", SCREEN_HREF.size, i.screen && atLimit(i.screen.pxPerCm) ? "at_limit" : null),
    step("gamma", "screen", false, f?.gamma.at ? "done" : "todo", SCREEN_HREF.gamma),
    step("tune", "screen", true, f?.tune.greenAt ? "done" : "todo", SCREEN_HREF.tune),
    step("leak", "screen", true, !f?.leak ? "todo" : f.leak.stale ? "again" : "done", SCREEN_HREF.leak, f?.leak?.stale ? "stale_tune" : null),
    step("ink", "screen", false, !f?.ink ? "todo" : f.ink.stale ? "again" : "done", SCREEN_HREF.ink, f?.ink?.stale ? "stale_tune" : null),
    step("safety", "person", true, i.answered ? "done" : "todo", "/setup/eyes"),
    step("eyes", "person", true, i.eye ? "done" : "todo", "/setup/eyes"),
    step("lens", "person", true, !i.eye ? "todo" : !weak ? "skip" : i.lensAt ? "done" : "todo", "/settings/lens"),
    step("balance", "person", true, !i.balanceAt ? "todo" : effect?.balanceAgain ? "again" : "done", "/test/balance/run",
      effect?.balanceAgain ? (lensAfter ? "lens_changed" : "screen_changed") : null),
  ];
}

/** Every required step is done or not needed. */
export const isReady = (steps: SetupStep[], part?: SetupPart) =>
  steps.every((s) => (part && s.part !== part) || !s.required || s.state === "done" || s.state === "skip");

/** The required steps still to do, in order. */
export const missing = (steps: SetupStep[], part?: SetupPart) =>
  steps.filter((s) => (!part || s.part === part) && s.required && (s.state === "todo" || s.state === "again"));

/** How far through: the required steps done or not needed, out of the required steps. */
export function progress(steps: SetupStep[]) {
  const req = steps.filter((s) => s.required);
  return { done: req.filter((s) => s.state === "done" || s.state === "skip").length, of: req.length };
}

/** Minutes each step takes the first time, for "about N minutes left". */
export const MINUTES: Record<SetupKey, number> = { size: 0.5, gamma: 1, tune: 2, leak: 1, ink: 1, safety: 1, eyes: 4, lens: 0.5, balance: 1 };
export const minutesLeft = (steps: SetupStep[]) => Math.ceil(missing(steps).reduce((n, s) => n + MINUTES[s.key], 0));

/** The order a person is sent through: the flow measures the screen's size, then the glasses are tuned and checked, then the person. */
const ORDER: SetupKey[] = ["size", "tune", "leak", "safety", "eyes", "lens", "balance"];
/** The next required step to do, or null when setup is done. */
export const nextStep = (steps: SetupStep[]) => {
  const left = missing(steps);
  return ORDER.map((k) => left.find((s) => s.key === k)).find(Boolean) ?? null;
};
