/**
 * What a game's page tells the member: what the game is for, what they should see, how to play,
 * when to press, what counts as success, what is measured, and when to stop.
 * One `GameGuide` per game, in plain words a school student can follow.
 */
import type { Source } from "@/data/guides/types";

/**
 * The inks of a cue picture. "weak" is cyan (the eye behind the cyan lens sees it), "strong" is red
 * (the eye behind the red lens sees it), "both" is white (both eyes see it), "dim" is a grey guide line.
 */
export type CueInk = "weak" | "strong" | "both" | "dim";

/** One shape of a cue picture. The picture is 160 wide and 90 tall; (0, 0) is the top left corner. */
export type Shape =
  | { t: "ring"; x: number; y: number; r: number; ink: CueInk; w?: number }
  | { t: "disc"; x: number; y: number; r: number; ink: CueInk }
  | { t: "box"; x: number; y: number; w: number; h: number; ink: CueInk; fill?: boolean }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; ink: CueInk; w?: number }
  | { t: "poly"; pts: [number, number][]; ink: CueInk; fill?: boolean }
  | { t: "text"; x: number; y: number; s: string; ink: CueInk; size?: number; anchor?: "start" | "middle" | "end" }
  /** "Tap here": a marked spot. */
  | { t: "tap"; x: number; y: number }
  /** A key to press, drawn as a key cap: "Space", "OK", an arrow. */
  | { t: "key"; x: number; y: number; s: string };

/**
 * One "when you see this, do this" picture.
 *  - go: this is the moment to act
 *  - wait: nothing to do yet
 *  - stop: something went wrong for the eyes (it doubled, one eye switched off): what to press then
 */
export interface Cue {
  /** What the member sees, in a few words: "One ring with both dots". */
  title: string;
  /** What to do then: "Tap the scene or press Space." */
  then: string;
  tone: "go" | "wait" | "stop";
  shapes: Shape[];
}

/** One number the game keeps. `key` is what the kit records: score, hits, misses, top, conv, div, splits, or a key the game reports itself. */
export interface GameMeasure {
  key: string;
  /** What the number is, as the member reads it: "Rings passed as one". */
  label: string;
  /** "prism dioptres", "of 10", "%". Empty for a plain count. */
  unit: string;
  /** What it counts and how to read it. One or two sentences. */
  how: string;
  better: "higher" | "lower" | "none";
}

export interface GameGuide {
  slug: string;
  /** One or two sentences: what you do in the game. */
  what: string;
  /** What it works on, and what is honestly known about whether that helps. Two or three sentences. No promise of a result. */
  helps: string;
  /** What to have ready: glasses, patch, screen, distance, light. */
  need: string[];
  /** Two to four lines: what the member should see when it is working, and what each eye gets. */
  see: string[];
  /** Three to seven steps, one action each. */
  play: string[];
  /** How to answer, by touch and by keys. A TV remote has four arrows and OK; say what each does. */
  controls: { touch: string; keys: string };
  /** Two to four pictures of "when you see this, do this". None to three for a care companion, which has no scene. */
  cues: Cue[];
  /** Two to four lines: what one point is, what a good session looks like, what the level means. */
  success: string[];
  /** One to five numbers the game keeps. None for a care companion that keeps its own log. */
  measures: GameMeasure[];
  /** Stop and rest when any of these happens. */
  stop: string[];
  /** Two to four common mistakes. */
  mistakes: string[];
  /** True when two pictures must join into one. The page then offers a practice view that shows what joined eyes see. */
  joined?: boolean;
  /** One honest line on what is known about this game itself. */
  evidence: string;
  sources: Source[];
}
