/**
 * Draw Your Hero: who may do what. Pure rules, unit-tested; src/lib/hero.ts asks them before every write.
 *
 * - A hero belongs to one profile and is seen only inside that profile's household. It is never shared with the
 *   community, a counsellor, a sponsor or staff, so nobody moderates it: there is nothing to read in it (a grid of
 *   squares, no words) and nobody outside the family to show it to.
 * - Making or deleting a hero needs a guardian at the device, the same rule the other Together features use for
 *   writing: the seat may share and the device is not in child mode. A child's profile also needs the household's
 *   parental consent to stand.
 * - In child mode a child may look at the heroes and choose which one plays.
 * - The live camera needs the household's camera consent for that profile. A photo the family picks and a drawing
 *   made on the screen do not use the camera.
 */
import { heroGamesExtra } from "@/copy/hero-games.extra";

/** How a hero was made. Only "camera" needs the camera consent. */
export const HERO_VIAS = ["camera", "photo", "screen", "starter"] as const;
export type HeroVia = (typeof HERO_VIAS)[number];
export const isHeroVia = (v: unknown): v is HeroVia => (HERO_VIAS as readonly unknown[]).includes(v);

/** Heroes kept for one profile. Earlier ones stay until the family deletes them. */
export const HERO_KEEP = 12;

/**
 * The games in this edition whose character is the member's hero, by catalogue slug: the ones built here, then
 * the ones a fuller build adds through its own file.
 */
export const HERO_GAMES: readonly string[] = ["lantern-run", ...heroGamesExtra.map((g) => g.slug)];

export type HeroBlock = "guardian" | "consent" | "camera" | "shape" | "full";

export interface KeepInput {
  /** The signed-in seat may share, and the device is not in child mode. */
  guardianHere: boolean;
  /** The active profile is a child, and whether the household's parental consent for it stands. */
  child: boolean; parental: boolean;
  via: HeroVia;
  /** A camera consent for the active profile stands. */
  cameraAllowed: boolean;
  /** The shape passed the check (see `cleanSprite`). */
  shapeOk: boolean;
  /** Heroes this profile already keeps. */
  kept: number;
}

/** Why this hero may not be kept, or null when it may. */
export function keepBlock(i: KeepInput): HeroBlock | null {
  if (!i.guardianHere) return "guardian";
  if (i.child && !i.parental) return "consent";
  if (i.via === "camera" && !i.cameraAllowed) return "camera";
  if (!i.shapeOk) return "shape";
  if (i.kept >= HERO_KEEP) return "full";
  return null;
}

/** Choosing which hero plays is part of playing: anyone who may train may do it, a child in child mode included. */
export const mayPickHero = (canTrain: boolean) => canTrain;
/** Deleting needs a guardian at the device. */
export const mayDropHero = (guardianHere: boolean) => guardianHere;
/** Only a guardian seat, out of child mode, gives or withdraws the camera consent. */
export const mayAllowCamera = (canConsent: boolean) => canConsent;
