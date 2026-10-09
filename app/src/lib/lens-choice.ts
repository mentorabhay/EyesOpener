/**
 * The lens choice: which ink a person's weaker eye sees (engine/profile.ts, `WeakInk`). Pure rules, tested.
 *
 * The suggestion comes from the screen's leak check (engine/calibrate.ts): the stronger eye should sit behind the lens
 * that lets less of the other ink through, because a ghost of the weaker eye's pictures in the stronger eye is what
 * spoils two-eye training. The usual way puts the stronger eye behind the red lens; the swap puts it behind the cyan
 * lens. A difference under `LEAK_FAINT` either way is too small to choose by, and so is a leak that was matched before
 * the inks were last tuned: then the usual way is kept.
 */
import { LEAK_FAINT, type Eye, type Leak, type WeakInk } from "@/engine";

export type Suggestion = { ink: WeakInk; why: "red_leaks_more" | "cyan_leaks_more" | "close" | "not_measured" | "stale" };

export function suggestInk(leak: (Leak & { stale?: boolean }) | null): Suggestion {
  if (!leak) return { ink: "cyan", why: "not_measured" };
  if (leak.stale) return { ink: "cyan", why: "stale" };
  if (leak.red - leak.cyan >= LEAK_FAINT) return { ink: "red", why: "red_leaks_more" };
  if (leak.cyan - leak.red >= LEAK_FAINT) return { ink: "cyan", why: "cyan_leaks_more" };
  return { ink: "cyan", why: "close" };
}

/** The eye the cyan lens goes over for a weaker eye and a choice of ink. */
export const cyanEyeFor = (weak: Eye, ink: WeakInk): Eye => (ink === "red" ? (weak === "L" ? "R" : "L") : weak);

/** Most red-cyan glasses have the red lens on the left. Worn the usual way up, the cyan lens is over the right eye. */
export const upsideDown = (cyanEye: Eye) => cyanEye === "L";
