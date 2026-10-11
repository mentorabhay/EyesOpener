// Eyes Opener: Words of the Screens and glasses room (/admin/screens). The counts: src/lib/screens-admin.ts. .
/** Words of the Screens and glasses room (/admin/screens). The counts: src/lib/screens-admin.ts. */
import { texts } from "@/i18n/texts";

const pct = (v: number) => (v > 0 && v < 0.005 ? "under 1%" : `${Math.round(v * 100)}%`);

export const screensAdmin = texts("copy/screens-admin", "screensAdmin", () => ({
  sub: "How families' screens and glasses are set up. Counts only: no household is named, and a count from 1 to 4 shows as \"fewer than 5\".",
  few: "fewer than 5",
  stats: {
    finished: "profiles have finished setup",
    tuned: "screens have tuned inks",
    swapped: "profiles chose the swap",
    ghost: "screens where a ghost shows",
  },
  of: (n: string) => `of ${n}`,
  table: {
    title: "Leak by kind of screen",
    kind: "Kind", screens: "Screens", red: "Middle leak, red lens", cyan: "Middle leak, cyan lens", tuned: "Tuned",
    kinds: { web: "Computer", phone: "Phone", tv: "TV" } as Record<string, string>,
    fewer: "fewer than 5",
    pct,
    ghostNote: "A ghost shows when 2% or more of an ink gets through the wrong lens. Less than that is too faint to matter (Baker and others, 2016).",
    compare: "For comparison, published measurements of red-cyan glasses on LCD screens: 7.7% to 24.3% through the red lens, 0.2% to 7.7% through the cyan lens (Woods and Harris, 2010).",
  },
  gate: {
    title: "Hold two-eye items until setup is done",
    on: "On", off: "Off",
    what: "When on, two-eye games, drills, films and two-eye check-ups wait until a person's required setup steps are done. Staff test households are never held.",
    turnOn: "Turn the hold on", turnOff: "Turn the hold off",
  },
  presets: {
    title: "Mixer starting points",
    what: "The two buttons beside \"As usual\" in the glasses tuning. Each must leave the weaker eye at least half its light.",
    lessBlue: "Less blue", lessGreen: "Less green",
    code: "Cyan code, #00GGBB",
    save: "Save the starting points",
    saved: "Saved.",
    invalid: "Each code must be #00 followed by two pairs of letters or digits, and leave the weaker eye at least half its light.",
  },
  superOnly: "A super admin changes these. Every change is in the audit log.",
  changed: (when: string) => `Last changed on ${when}.`,
}));
