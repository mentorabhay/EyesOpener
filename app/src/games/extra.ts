/**
 * Games that are not part of this edition. The public edition has none: the lists below are empty.
 * A fuller build replaces this one file and the game shows up everywhere: the library, the play page, the tests.
 */
import type { GameDef } from "./kit";

/** Canvas games from whole extra packages, by slug. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const kit: Record<string, GameDef<any>> = {};
/** Slugs of the games played over a member's own film. */
export const cinema: string[] = [];
/** One line per extra game that says how to play it. */
export const help: Record<string, string> = {};
