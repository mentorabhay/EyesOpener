// Eyes Opener: What a clip is, as data.
/**
 * What a clip is, as data.
 *
 * The catalogue (src/data) lists 100 clips by code: 30 that check the screen, the seat and the glasses (C01 to C30)
 * and 70 that measure something about the eyes (M01 to M70). A clip is one short guided step. This folder says, for
 * every code, how it is played: which template plays it and with which settings, what it stores and where, what the
 * member needs, where the screen must stand, and the published work the method is modelled on.
 *
 * A clip that cannot be done truthfully in a web browser on the member's own screen is written down as "not offered
 * here" with the plain reason. Nothing is faked to make the list look complete.
 *
 * Data only: no React, no database. The rules that read it are in src/lib/clip-rules.ts.
 */
import type { Source } from "../guides/types";

export type Eye = "L" | "R";
/** Which eye a clip tests. "both" means both eyes open together. */
export type Which = Eye | "both";

/**
 * The templates: what the member does. Each is one reusable interaction with settings.
 * The screen parts are in src/components/clips; `TEMPLATES` is checked against them by the compiler.
 */
export const TEMPLATES = [
  "look", "count", "match", "measure", "camera", "auto", "choose", "spots", "pick",
  "split", "hold", "align", "grid", "find", "read", "survey",
] as const;
export type Template = (typeof TEMPLATES)[number];

/** What to have ready. Words for each: src/copy/clips.ts. */
export type Gear = "glasses" | "tape" | "card" | "camera" | "helper" | "ruler" | "sound" | "dim" | "keys";

/**
 * Where the screen must stand for the clip to mean what it says.
 * "near": within arm's reach (up to 100 cm). "far": across the room (200 cm or more). "any": wherever it is set up.
 * The distance is the one measured for this screen; a clip never guesses it.
 */
export type Place = "any" | "near" | "far";

/**
 * Who may run it. "guardian": it changes how the household's screen is drawn for everyone, so a guardian or
 * co-guardian runs it, never in child mode. "adult": for a grown-up's profile only (a camera reading of habits).
 */
export type Who = "anyone" | "guardian" | "adult";

/** How each template is set for one clip. */
export type Play =
  | { template: "look"; scene: string }
  | { template: "count" }
  | { template: "match"; kind: "gamma" | "leak_cyan" | "leak_red" | "leak_both" | "ink" }
  | { template: "measure"; kind: "card" | "ruler" | "seat" | "near_point" }
  | { template: "camera"; kind: "scale" | "distance" | "working" | "blinks"; seconds: number }
  | { template: "auto"; kind: "frames" | "depth_step" }
  | {
    template: "choose";
    /** letter: the tumbling E. crowded: the E with bars close around it. shapes: match one of four letters. faint: grey E. stripes: which way the stripes run. dots: which way the dots drift. pairs, animals: which of two looks stronger. */
    kind: "letter" | "crowded" | "shapes" | "faint" | "stripes" | "dots" | "pairs" | "animals";
    eye: Which;
    /** Stripe pairs to one degree at the eye, for "stripes". */
    cpd?: number;
  }
  | { template: "spots"; kind: "field" | "map"; eye: Which }
  | {
    template: "pick";
    kind: "rings" | "hidden" | "wobble";
    eye: Which;
    /** Depth steps of this clip, in arc seconds, largest then finest. Left out: from 1600 down to one dot of the screen. */
    band?: readonly [number, number];
    behind?: boolean;
    moving?: boolean;
  }
  | { template: "split"; way: "in" | "out"; rate: 0.5 | 1 | 2; mode: "range" | "recover" }
  | { template: "hold"; kind: "hold" | "adapt" | "flips"; seconds: number }
  | { template: "align"; axis: "h" | "v"; lock: boolean }
  | { template: "grid"; eye: Eye }
  | { template: "find"; kind: "search" | "track"; seconds: number }
  | { template: "read" }
  | { template: "survey"; kind: "near_work" | "screen" | "dry" };

/** Where a finished clip's result goes. */
export type Store =
  /** Rows of `test_result`, one for each key (and eye, for a one-eye clip). The keys are in keys.ts. */
  | { to: "result"; keys: readonly string[] }
  /** A value of the household's screen (`device`). */
  | { to: "screen"; field: "size" | "distance" | "gamma" | "leak" | "ink" }
  /** Kept in this browser only: the scale of this camera. Nothing is sent. */
  | { to: "browser" }
  /** A note of how the check came out. Nothing about an eye is measured. */
  | { to: "note" };

interface Common {
  /** The catalogue code: C01 to C30, M01 to M70. */
  code: string;
  /** One or two plain sentences: the method, and what it is modelled on. Shown on the clip's page. */
  basis: string;
  sources: readonly Source[];
}

export interface OfferedClip extends Common {
  offered: true;
  play: Play;
  store: Store;
  gear: readonly Gear[];
  place: Place;
  who: Who;
  /** True when the clip draws at true size or in real units, so it needs a measured screen. */
  screen: boolean;
}

export interface WithheldClip extends Common {
  offered: false;
  /** The plain reason it is not offered in a browser. */
  why: string;
}

export type ClipDef = OfferedClip | WithheldClip;
