// Eyes Opener: Words of the lens choice (Settings, "Which colour the weaker eye sees"): which ink a person's weaker eye sees, and.
/**
 * Words of the lens choice (Settings, "Which colour the weaker eye sees"): which ink a person's weaker eye sees, and
 * the note on game pages when the inks are swapped. The rule: engine/profile.ts (`WeakInk`) and src/lib/lens-choice.ts.
 */
import type { Eye } from "@/engine";
import { texts } from "@/i18n/texts";

const side = (e: Eye) => (e === "L" ? "left" : "right");
const pct = (share: number) => (share > 0 && share < 0.005 ? "under 1%" : `${Math.round(share * 100)}%`);

export const lens = texts("copy/lens", "lens", () => ({
  title: (name: string) => `Which colour ${name}'s weaker eye sees`,
  crumb: "Settings",
  crumbSetup: "Setup",
  confirm: "Setup asks for this choice once. Keep the usual way, or swap, then take the balance check-up.",
  keep: "Keep this",
  kept: "Kept. Nothing else changes, and the balance check-up still holds.",
  sub: "Each eye sees only its own colour through the glasses. The stronger eye must not see the weaker eye's pictures, so it goes behind the lens that leaks least on this screen.",
  noWeak: "No weaker eye has been found yet, so this does not change anything for now. It matters once the eye check finds one eye weaker.",
  weakIs: (e: Eye) => `The weaker eye is the ${side(e)} one.`,
  leakTitle: "From the leak check on this screen",
  leakRed: (share: number) => `Red lens lets through ${pct(share)} of the cyan`,
  leakCyan: (share: number) => `Cyan lens lets through ${pct(share)} of the red`,
  suggest: {
    red_leaks_more: "Suggested here: the weaker eye sees red, so the stronger eye sits behind the cyan lens, which leaks less.",
    cyan_leaks_more: "Suggested here: the usual way, because the cyan lens leaks more than the red one.",
    close: "The two lenses leak about the same, so the usual way is kept.",
    not_measured: "The leak has not been measured on this screen. Do the leak check first, then come back here.",
    stale: "The leak was matched before the inks were tuned. Do the leak check again first.",
  } as Record<string, string>,
  options: {
    cyan: {
      title: "Weaker eye sees cyan",
      tag: "The usual way",
      sees: "Bright cyan pictures: about four fifths of white's light.",
      ghost: "What the red lens lets through reaches the stronger eye.",
    },
    red: {
      title: "Weaker eye sees red",
      tag: "Swapped",
      sees: "Red pictures, about a fifth of white's light, so they look dimmer.",
      ghost: "What the cyan lens lets through reaches the stronger eye.",
    },
  },
  wear: (cyanEye: Eye, upsideDown: boolean) => `Cyan lens over the ${side(cyanEye)} eye, red over the ${side(cyanEye === "L" ? "R" : "L")} eye.${upsideDown ? " Most glasses have red on the left, so turn them upside down." : " Most glasses are worn the usual way up for this."}`,
  picture: (cyanEye: Eye) => `The glasses with the cyan lens over the ${side(cyanEye)} eye`,
  current: "In use now",
  suggested: "Suggested",
  save: "Use this",
  saved: "Saved. Take the balance check-up again before the next game, so the stronger eye's picture is dimmed the right amount.",
  balanceLink: "Balance check-up",
  lookOnly: "A guardian makes this choice, and not in child mode.",
  whatChanges: {
    title: "What changes",
    items: [
      "Every game, film and two-eye check-up draws this person's pictures in the chosen colours.",
      "Every line that says how to wear the glasses names the right lens for the right eye.",
      "The balance check-up is needed again.",
      "A linked counsellor sees the choice and its date.",
    ],
  },
  evidence: {
    title: "Is this a usual way to train?",
    body: "Both ways are in use. One cleared device puts the blue lens over the weaker eye, and vision therapists also put the red lens there. No trial compares the two. What matters is that each eye sees only its own picture, and that the two pictures are balanced.",
  },
  /** On game, film and exercise pages when the inks are swapped: the guides are written for the usual way. */
  swappedNote: "Your colours are swapped: your weaker eye sees red. Wherever the guide says cyan, read red, and the other way round.",
  settingsRow: "Weaker eye sees",
  settingsValue: { cyan: "Cyan, the usual way", red: "Red, swapped" } as Record<string, string>,
  settingsLink: "Change",
  counsellorLine: (since: string | null) => (since ? `Weaker eye sees red (swapped on ${since})` : "Weaker eye sees red (swapped)"),
}));
