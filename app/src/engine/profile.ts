// Eyes Opener: The eye profile: what onboarding measures and what the engine derives from it.
/**
 * The eye profile: what onboarding measures and what the engine derives from it.
 * Pure functions. The same file runs in the browser, on the server, in the phone WebView and on the TV.
 */

export type Eye = "L" | "R";
export const other = (e: Eye): Eye => (e === "L" ? "R" : "L");
export const EYE_NAME: Record<Eye, string> = { L: "Left", R: "Right" };

/** One eye's results from onboarding. */
export interface EyeResult {
  /** Acuity in logMAR. 0 is 6/6; larger is worse. */
  va: number;
  /** Contrast sensitivity in logCS. 1.65 is the faintest step an ordinary screen can show. */
  cs: number;
  /** Answers to the four yes/no questions: own glasses, lazy before, eye turn, sudden change. */
  q: [boolean, boolean, boolean, boolean];
  /** "floor" = read the smallest letter this screen can show; "worse" = could not read the largest. */
  note: "" | "floor" | "worse";
}

export interface Screen {
  /** CSS pixels per centimetre, from the bank-card step. */
  ppc: number;
  /** Viewing distance in centimetres. */
  dist: number;
  gamma?: number;
  /**
   * How much brighter the cyan ink looks through its lens than the red ink through its lens on this screen, as log10
   * (calibrate.ts). Unset or 0 until a grown-up has measured it: the balance test is then read exactly as before.
   */
  inkBalance?: number | null;
}

export interface BalanceResult {
  /** log10 of red over cyan contrast at the balance point. Negative means red was dimmed. */
  x: number;
  /** Which eye wore the cyan lens during the test. */
  cyanEye: Eye;
}

/**
 * Which ink the weaker eye sees. "cyan" is the usual way: the weaker eye behind the cyan lens sees the cyan ink at full
 * and the stronger eye's red ink is dimmed. "red" is the swap, for glasses whose red lens leaks far more than their cyan
 * lens: the weaker eye goes behind the red lens and sees the red ink at full, and the stronger eye's cyan ink is dimmed.
 * Both ways are in use (one cleared device puts the blue lens over the weaker eye; vision therapists also put the red
 * lens there); no trial compares them. What matters is that each eye sees only its own picture, and the balance.
 */
export type WeakInk = "cyan" | "red";

export interface Measured extends Screen {
  tested: boolean;
  eyes: Record<Eye, EyeResult>;
  bal: BalanceResult | null;
  /** The profile's choice of ink for the weaker eye; "cyan" when unset. */
  weakInk?: WeakInk;
}

export interface Derived {
  /** The weaker eye, or null when the two eyes tested equal. */
  weak: Eye | null;
  /** Which eye the cyan lens goes over: the weaker eye, or the stronger eye when the weaker eye sees red. */
  cyanEye: Eye;
  /** The ink the weaker eye sees (see `WeakInk`). */
  weakInk: WeakInk;
  /** Stronger-eye contrast, 0.05 to 1: the red ink's, or the cyan ink's when the weaker eye sees red. */
  con: number;
  conSource: "balance" | "balance_equal" | "starting_level" | "equal" | "default";
  /** Letter height for two-eye text, in centimetres. */
  letterCm: number;
  /** Smallest game target, in centimetres. */
  targetCm: number;
  /** App text size in CSS pixels. */
  appPx: number;
  /** True when faint text should be shown at raised contrast. */
  faint: boolean;
  flags: { ownGlasses: boolean; lazyBefore: boolean; eyeTurn: boolean; stop: boolean };
  /** What opens after onboarding. */
  opens: "doctor_first" | "counsellor" | "lazy_eye" | "eye_fitness";
}

/** Two chart lines: the usual clinical gap for calling one eye weaker. */
export const WEAKER_EYE_GAP = 0.195;
/** Stronger-eye contrast used until the balance test is done (the Luminopia trial's starting level). */
export const STARTING_CONTRAST = 0.15;
export const MIN_CONTRAST = 0.05;
/** Two-eye letters are this many times the smallest letter the weaker eye read. */
export const LETTER_MULTIPLE = 2.5;
/** Game targets are never smaller than this many times that letter. */
export const TARGET_MULTIPLE = 3;

const ARCMIN = Math.PI / 180 / 60;

/** Height in cm of a letter at the acuity threshold: 5 arcminutes at logMAR 0. */
export const thresholdCm = (distCm: number, logMar: number) => distCm * Math.tan(5 * ARCMIN * Math.pow(10, logMar));

export const blankEye = (): EyeResult => ({ va: 0, cs: 1.65, q: [false, false, false, false], note: "" });

export const standardMeasured = (): Measured => ({
  tested: false, ppc: 37.8, dist: 60, eyes: { L: blankEye(), R: blankEye() }, bal: null,
});

export function derive(m: Measured): Derived {
  const { L, R } = m.eyes;
  const weakInk: WeakInk = m.weakInk === "red" ? "red" : "cyan";
  const gap = L.va - R.va;
  let weak: Eye | null = Math.abs(gap) >= WEAKER_EYE_GAP ? (gap > 0 ? "L" : "R") : null;
  let con = 1;
  let conSource: Derived["conSource"] = "equal";

  if (m.bal) {
    /* The balance point holds two things added together: how the member's two eyes differ, and how much brighter one
       ink is than the other through these glasses on this screen. `ink` is the second part (0 until it is measured),
       so `x` is the member's own share, and the weaker eye is decided on that. The contrast is the balance point for
       this screen with the cyan lens on the weaker eye, and never above full. With `ink` at 0 this is the rule as it
       was before calibration: 10 to the power of minus the balance value.
       When the weaker eye sees red, the stronger eye's cyan ink is the one dimmed. The weaker eye's red then gives
       10^-ink of the light the cyan would have given, so the cyan must come down by that much more: 10^(-ink - |x|).
       With `ink` at 0 the two ways give the same number. */
    const ink = Number.isFinite(m.inkBalance) ? (m.inkBalance as number) : 0;
    const x = m.bal.x - ink;
    if (Math.abs(x) < 0.1) { con = 1; conSource = "balance_equal"; }
    else {
      weak = x < 0 ? m.bal.cyanEye : other(m.bal.cyanEye);
      con = Math.min(1, Math.max(MIN_CONTRAST, Math.pow(10, (weakInk === "red" ? -ink : ink) - Math.abs(x))));
      conSource = "balance";
    }
  } else if (weak) { con = STARTING_CONTRAST; conSource = "starting_level"; }
  if (!m.tested) conSource = "default";

  /* A result at the screen's limit says the eye is at least that good, so sizes fall back to the standard. */
  const eff = (e: EyeResult) => (e.note === "floor" ? Math.min(e.va, 0) : e.va);
  const worst = Math.max(eff(L), eff(R));
  const best = Math.min(eff(L), eff(R));
  const q = (i: 0 | 1 | 2 | 3) => L.q[i] || R.q[i];
  const flags = { ownGlasses: q(0), lazyBefore: q(1), eyeTurn: q(2), stop: q(3) };

  return {
    weak,
    /* the cyan lens goes over the eye that sees the cyan ink */
    cyanEye: weak ? (weakInk === "red" ? other(weak) : weak) : m.bal?.cyanEye ?? "L",
    weakInk,
    con,
    conSource,
    letterCm: LETTER_MULTIPLE * thresholdCm(m.dist, worst),
    targetCm: TARGET_MULTIPLE * thresholdCm(m.dist, worst),
    appPx: Math.max(15, Math.round((LETTER_MULTIPLE * thresholdCm(m.dist, best) * m.ppc) / 0.5)),
    faint: Math.max(L.cs, R.cs) < 1.5,
    flags,
    opens: flags.stop ? "doctor_first" : flags.eyeTurn ? "counsellor" : weak ? "lazy_eye" : "eye_fitness",
  };
}

/** 6/x notation for a logMAR value. */
export function snellen(logMar: number): string {
  const n = 6 * Math.pow(10, logMar);
  return "6/" + (n < 10 ? String(Math.round(n * 10) / 10) : String(Math.round(n)));
}

export const acuityText = (e: EyeResult) =>
  e.note === "floor" ? `${snellen(e.va)} or better` : e.note === "worse" ? `below ${snellen(e.va - 0.1)}` : snellen(e.va);

export const contrastText = (e: EyeResult) => `${(100 * Math.pow(10, -e.cs)).toFixed(1)}% contrast`;

/** How much the app enlarges its own screens for this member: 1 to 1.6. */
export const pageZoom = (appTextPx: number | null | undefined) => Math.max(1, Math.min(1.6, (appTextPx ?? 16) / 16));

export const percent = (c: number) => Math.round(c * 100) + "%";
