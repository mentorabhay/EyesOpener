/** Every exercise guide, by slug. The group files hold the words; this file only joins them. */
import { guides as afterConcussion } from "./after-concussion";
import { guides as afterStroke } from "./after-stroke";
import { guides as childMyopia } from "./child-myopia";
import { guides as convergence } from "./convergence";
import { guides as focus } from "./focus";
import { guides as lazyEye } from "./lazy-eye";
import { guides as monitoring } from "./monitoring";
import { guides as screenStrain } from "./screen-strain";
import { guides as squint } from "./squint";
import type { Guide } from "./types";

export type { Guide, Measure, PrintKey, Source, Tool } from "./types";

export const guides: Guide[] = [...convergence, ...focus, ...lazyEye, ...squint, ...screenStrain, ...childMyopia, ...afterStroke, ...monitoring, ...afterConcussion];
const bySlug = new Map(guides.map((g) => [g.slug, g]));

export const guideFor = (slug: string): Guide | undefined => bySlug.get(slug);

/** The measures the on-screen tool of each drill fills in. A drill reports exactly these keys; its guide lists them as "auto". */
export const AUTO_KEYS: Readonly<Record<string, readonly string[]>> = {
  "screen-vergence-ramp": ["break_pd", "recover_pd"],
  "screen-diverge-ramp": ["break_pd", "recover_pd"],
  "screen-vergence-steps": ["steps", "step_pd", "regain_s"],
  "flip-switch": ["cycles_per_min", "conv_pd", "div_pd"],
  "long-hold": ["hold_s", "hold_pd"],
  "reading-under-demand": ["lines", "lines_per_min", "hold_pd"],
  "distance-fusion-hold": ["hold_s", "hold_pd"],
  "see-both-lights": ["both_pct", "checks"],
  "contrast-ladder": ["contrast_pct"],
  "crowding-drill": ["gap_x"],
  "line-up-drill": ["error_arcsec"],
  "stereogram-pairs": ["cross_cm", "relax_cm"],
  "blind-side-sweeps": ["find_s_blind", "find_s_seeing", "found"],
  "guided-line-reading": ["words_per_min", "lines"],
  "weekly-grid-check": ["right_marks", "left_marks"],
};
/** Which tool each of those exercises uses. */
export const TOOL_KIND: Readonly<Record<string, "drill" | "reading" | "grid">> = {
  ...Object.fromEntries(Object.keys(AUTO_KEYS).map((s) => [s, "drill" as const])),
  "guided-line-reading": "reading", "weekly-grid-check": "grid",
};
