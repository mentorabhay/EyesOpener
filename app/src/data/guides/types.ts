// Eyes Opener: What an exercise page tells the member: what the routine is, how to set up, what to do step by step,.
/**
 * What an exercise page tells the member: what the routine is, how to set up, what to do step by step,
 * what to measure and how, when to stop, and where the numbers come from.
 * One `Guide` per exercise in the catalogue, written in plain words a school student can follow.
 */

/** A published source. `label` names the authors, the year and the journal or body in plain words. */
export interface Source { label: string; url: string }

/** One number the routine asks for. It is saved with the session under `key`. */
export interface Measure {
  /** Short key, lower case with underscores: "break_cm", "cycles_per_min". */
  key: string;
  /** What the number is, as the member reads it: "Nearest distance held single". */
  label: string;
  /** "cm", "a minute", "seconds", "of 3", "prism dioptres", "%". Empty for a plain count. */
  unit: string;
  /** Exactly how to get the number. One or two sentences. */
  how: string;
  /** "auto": the on-screen tool measures it. "typed": the member types it in after the routine. */
  from: "auto" | "typed";
  /** Limits of a sensible answer, and the step of the number box. */
  min: number; max: number; step: number;
  /** Which way is better. "none" when the number is only a record. */
  better: "higher" | "lower" | "none";
  /** What is usual, and which source says so (index into `sources`). Leave out when no published figure exists. */
  usual?: { text: string; source: number };
}

export type Tool =
  /** A stopwatch: time on the routine, then the typed measures. */
  | { kind: "timer" }
  /** A countdown with one large button to tap for each cycle. Fills `measure` with taps a minute (`per: "minute"`) or with the taps (`per: "total"`). */
  | { kind: "count"; seconds: number; measure: string; per: "minute" | "total"; tap: string }
  /** No clock: the member types today's numbers and saves. For a routine that runs through the day (hours of glasses wear). */
  | { kind: "log" }
  /** A list to tick off. Fills `measure` with how many were ticked. */
  | { kind: "checklist"; items: string[]; measure: string }
  /** An on-screen drill built on the game kit, registered in src/drills under the exercise's slug. */
  | { kind: "drill" }
  /** The two screen tools that are not canvas drills. */
  | { kind: "reading" } | { kind: "grid" }
  /** The routine is done in the two-eye cinema. */
  | { kind: "cinema" }
  /** The routine is logged in a care companion. Shown as a link only when that companion is in this edition; the stopwatch is used otherwise. */
  | { kind: "companion"; game: string };

/** Printable cards, drawn to real size (src/drills/print). */
export type PrintKey = "barrel" | "dots" | "lifesaver" | "letters" | "letter" | "grid" | "pairs";

export interface Guide {
  slug: string;
  /** One or two sentences: what the routine is and what it works on. */
  what: string;
  /** What to have ready: gear, space, light. */
  need: string[];
  /** Two to four things to do before starting. */
  setup: string[];
  /** Four to eight steps, one action each. */
  steps: string[];
  /** Two to four signs that it is being done right. */
  right: string[];
  /** One to three numbers to record. None only when the tool is the cinema or a companion, where the time itself is the record. */
  measures: Measure[];
  /** Stop and rest when any of these happens. */
  stop: string[];
  /** Two to four common mistakes. */
  mistakes: string[];
  tool: Tool;
  print?: PrintKey;
  /** One honest line on what is known about this routine itself: "No trial tested this drill on its own." */
  evidence: string;
  sources: Source[];
}
