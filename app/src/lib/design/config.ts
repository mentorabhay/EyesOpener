// Eyes Opener: the look and feel that staff set in the admin room, as data: colours, gradient, type, surfaces, motion and content switches.
/**
 * The design settings (decision of 17 October 2026: "keep this configurable for admin, so that code changes are not
 * required"). Pure: no database, no React. `readDesign` (./read.ts) loads the stored value; the root layout writes
 * `designCss` into the page as CSS custom properties and `designAttrs` onto <html>.
 *
 * What is NOT here, on purpose (locked, see docs/DESIGN-SETTINGS.md):
 *  - the therapy scene inks (--weak, --strong, --shared, --scene): set per member by the eye profile and calibration;
 *  - sizes measured in true millimetres (letters in games, check-ups, two-eye text): set by the screen's calibration;
 *  - the safety rules (daily cap, minimum age, stop button, no flashing).
 * A stored value that fails the schema or the contrast floor is never applied: the defaults are used instead.
 */
import { z } from "zod";

export const DESIGN_KEY = "design";
export const DESIGN_VERSION = 1;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "a colour like #8b31f0");

const palette = z.object({
  ink: hex, ink2: hex, ink3: hex, ink4: hex,
  paper: hex, card: hex, sunken: hex, line: hex, line2: hex,
  accent: hex, accent2: hex,
  ok: hex, okBg: hex, warn: hex, warnBg: hex, risk: hex, riskBg: hex, danger: hex, dangerBg: hex,
});
export type Palette = z.infer<typeof palette>;

const stops = z.object({ from: hex, mid: hex, to: hex });
export type Stops = z.infer<typeof stops>;

export const designSchema = z.object({
  version: z.literal(DESIGN_VERSION),
  brand: z.object({ name: z.string().trim().min(1).max(40), short: z.string().trim().min(1).max(20) }),
  light: palette,
  dark: palette,
  /** The brand gradient on fills with no text on them: progress, hero card, highlights. */
  gradient: stops,
  /** The same gradient for surfaces that carry white text (buttons, chips): every stop must keep white text readable. */
  gradientText: stops,
  /** Where the gradient is used. Off means the flat accent colour takes its place. */
  gradientOn: z.object({ buttons: z.boolean(), chips: z.boolean(), progress: z.boolean() }),
  type: z.object({
    /** Running text on the public site and in the app, in CSS pixels. Sizes set by the eye profile are not affected. */
    siteBody: z.number().min(15).max(22),
    appBody: z.number().min(14).max(20),
  }),
  surfaces: z.object({
    /** 0 = no shadows, 1 = as designed, 2 = twice as strong. */
    shadow: z.number().min(0).max(2),
    radiusLg: z.number().min(0).max(32), radiusMd: z.number().min(0).max(24), radiusSm: z.number().min(0).max(16),
  }),
  motion: z.object({
    /** full: entrances, draw-ins, parallax; calm: feedback only; off: nothing moves. The person's reduce-motion setting always wins. */
    level: z.enum(["full", "calm", "off"]),
    /** 0 to 1: how far a large picture drifts against the page while it scrolls. */
    parallax: z.number().min(0).max(1),
    /** The how-to steps on top of a page: never play, play once on a person's first visit, or play on every visit. */
    steps: z.enum(["off", "once", "always"]),
  }),
  content: z.object({
    /** The 01 / 02 / 03 numbers on cards and sections. */
    decorativeNumbers: z.boolean(),
    /** Whether the "More" folds start open. */
    foldsOpen: z.boolean(),
    /** A small "Illustration" credit on generated pictures, so no generated face is read as a real member. */
    illustrationCredit: z.boolean(),
  }),
});
export type Design = z.infer<typeof designSchema>;

/* Direction B (Plan/prototypes/2026-09-20-ui-direction-b.html) with the contrast fixes of the 17 October audit. */
export const DEFAULT_DESIGN: Design = {
  version: DESIGN_VERSION,
  brand: { name: "Eyes Opener", short: "Eyes Opener" },
  light: {
    ink: "#111418", ink2: "#4e545c", ink3: "#61676f", ink4: "#8a9099",
    paper: "#f4f4f8", card: "#ffffff", sunken: "#f7f7fb", line: "#eaeaf1", line2: "#dedee8",
    accent: "#8b31f0", accent2: "#f4aa2d",
    ok: "#0f7a59", okBg: "#e4f6ef", warn: "#8a5c05", warnBg: "#fdf1dc", risk: "#a8481a", riskBg: "#fcebe0", danger: "#c5282f", dangerBg: "#fce8e9",
  },
  dark: {
    ink: "#f2f3f5", ink2: "#b4bac2", ink3: "#979da6", ink4: "#7c828b",
    paper: "#0c0d11", card: "#15171c", sunken: "#1a1d23", line: "#23262d", line2: "#2e323a",
    accent: "#8b31f0", accent2: "#f4aa2d",
    ok: "#3fcf9f", okBg: "#0f2e24", warn: "#e5b04a", warnBg: "#2e2411", risk: "#f0925c", riskBg: "#2e1d12", danger: "#f2777c", dangerBg: "#2e1416",
  },
  gradient: { from: "#8b31f0", mid: "#c4569c", to: "#f4aa2d" },
  gradientText: { from: "#8b31f0", mid: "#b0478a", to: "#b45309" },
  gradientOn: { buttons: true, chips: true, progress: true },
  type: { siteBody: 17, appBody: 16 },
  surfaces: { shadow: 1, radiusLg: 22, radiusMd: 14, radiusSm: 10 },
  motion: { level: "full", parallax: 0.35, steps: "once" },
  content: { decorativeNumbers: true, foldsOpen: false, illustrationCredit: true },
};

/* ── contrast (WCAG 2.x relative luminance) ── */
const channel = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export function luminance(h: string): number {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** The text a person reads must stay at 4.5:1 or better (WCAG 2.2 SC 1.4.3, AA), whatever staff choose. */
export const TEXT_FLOOR = 4.5;

export interface ContrastProblem { theme: "light" | "dark" | "both"; text: string; on: string; ratio: number }

/** Every text-on-surface pair the design uses, checked against the floor. An empty list means the design may be saved. */
export function contrastProblems(d: Design): ContrastProblem[] {
  const out: ContrastProblem[] = [];
  const check = (theme: ContrastProblem["theme"], text: string, on: string, a: string, b: string) => {
    const ratio = Math.round(contrast(a, b) * 100) / 100;
    if (ratio < TEXT_FLOOR) out.push({ theme, text, on, ratio });
  };
  for (const theme of ["light", "dark"] as const) {
    const p = d[theme];
    check(theme, "text", "page", p.ink, p.paper);
    check(theme, "text", "card", p.ink, p.card);
    check(theme, "secondary text", "card", p.ink2, p.card);
    check(theme, "muted text", "page", p.ink3, p.paper);
    check(theme, "muted text", "card", p.ink3, p.card);
    check(theme, "muted text", "sunken panel", p.ink3, p.sunken);
    check(theme, "OK chip", "its ground", p.ok, p.okBg);
    check(theme, "warning chip", "its ground", p.warn, p.warnBg);
    check(theme, "risk chip", "its ground", p.risk, p.riskBg);
    check(theme, "danger chip", "its ground", p.danger, p.dangerBg);
    check(theme, "white button text", "the accent", "#ffffff", p.accent);
  }
  const g = d.gradientText;
  for (const [where, c] of [["start", g.from], ["middle", g.mid], ["end", g.to]] as const) check("both", "white text", `the text gradient's ${where}`, "#ffffff", c);
  return out;
}

/** Reads any stored value: a value that fails the schema or the contrast floor gives the defaults. */
export function parseDesign(value: unknown): Design {
  const parsed = designSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_DESIGN;
  return contrastProblems(parsed.data).length ? DEFAULT_DESIGN : parsed.data;
}

/* ── output ── */
const rgba = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.round(a * 1000) / 1000})`; };
const grad = (s: Stops) => `linear-gradient(135deg, ${s.from} 0%, ${s.mid} 52%, ${s.to} 100%)`;

function paletteVars(p: Palette, dark: boolean, shadow: number): string {
  const sh = shadow === 0 ? "none"
    : dark ? `0 1px 2px ${rgba("#000000", Math.min(1, 0.5 * shadow))}`
    : `0 1px 2px ${rgba(p.ink, 0.04 * shadow)}, 0 8px 24px -12px ${rgba(p.ink, 0.1 * shadow)}`;
  return [
    `--ink:${p.ink}`, `--ink-2:${p.ink2}`, `--ink-3:${p.ink3}`, `--ink-4:${p.ink4}`,
    `--paper:${p.paper}`, `--card:${p.card}`, `--sunken:${p.sunken}`, `--line:${p.line}`, `--line-2:${p.line2}`,
    `--g1:${p.accent}`, `--g2:${p.accent2}`,
    `--ok:${p.ok}`, `--ok-bg:${p.okBg}`, `--warn:${p.warn}`, `--warn-bg:${p.warnBg}`,
    `--risk:${p.risk}`, `--risk-bg:${p.riskBg}`, `--danger:${p.danger}`, `--danger-bg:${p.dangerBg}`,
    `--sh-card:${sh}`,
  ].join(";");
}

/** The names this output may set. Scene inks are deliberately absent (a test holds this). */
export const DESIGN_VARIABLES = [
  "--ink", "--ink-2", "--ink-3", "--ink-4", "--paper", "--card", "--sunken", "--line", "--line-2", "--g1", "--g2",
  "--ok", "--ok-bg", "--warn", "--warn-bg", "--risk", "--risk-bg", "--danger", "--danger-bg", "--sh-card",
  "--grad", "--grad-text", "--grad-fill", "--grad-button", "--grad-chip", "--r-lg", "--r-md", "--r-sm",
  "--site-text", "--app-text", "--parallax",
] as const;

/**
 * The design as CSS. Doubled `:root` selectors outrank the defaults in globals.css whatever order the
 * stylesheets load in. Values are validated hex colours and numbers only, so nothing a person typed reaches CSS.
 */
export function designCss(input: Design): string {
  const d = parseDesign(input);
  const common = [
    `--grad:${grad(d.gradient)}`,
    `--grad-text:${grad(d.gradientText)}`,
    `--grad-fill:${d.gradientOn.progress ? grad(d.gradient) : d.light.accent}`,
    `--grad-button:${d.gradientOn.buttons ? grad(d.gradientText) : "var(--g1)"}`,
    `--grad-chip:${d.gradientOn.chips ? grad(d.gradientText) : "var(--g1)"}`,
    `--r-lg:${d.surfaces.radiusLg}px`, `--r-md:${d.surfaces.radiusMd}px`, `--r-sm:${d.surfaces.radiusSm}px`,
    `--site-text:${d.type.siteBody}px`, `--app-text:${d.type.appBody}px`,
    `--parallax:${d.motion.parallax}`,
  ].join(";");
  const light = paletteVars(d.light, false, d.surfaces.shadow);
  const dark = paletteVars(d.dark, true, d.surfaces.shadow);
  return [
    `:root:root{${common};${light}}`,
    `@media (prefers-color-scheme: dark){:root:root:not([data-theme="light"]){color-scheme:dark;${dark}}}`,
    `:root:root[data-theme="dark"]{color-scheme:dark;${dark}}`,
  ].join("\n");
}

/** Switches read by CSS and by components, written onto <html>. */
export function designAttrs(input: Design): Record<`data-${string}`, string> {
  const d = parseDesign(input);
  return {
    "data-motion": d.motion.level,
    "data-steps": d.motion.steps,
    "data-numbers": d.content.decorativeNumbers ? "on" : "off",
    "data-folds": d.content.foldsOpen ? "open" : "closed",
  };
}
