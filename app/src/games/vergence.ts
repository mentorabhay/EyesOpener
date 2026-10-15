/**
 * Shared parts for games that train how the eyes turn in and out (vergence).
 * The demand is in prism dioptres: positive turns the eyes in, negative turns them out.
 * A game cannot see the member's eyes. It relies on what the member reports, so every vergence game
 * shows the "it split in two" control and gives each eye's picture its own mark.
 */
import { H, W, type Ink, type Kit } from "./kit";

/** A demand that moves smoothly. `goal` is where the game wants it; `now` is what is drawn. Starts at 0 every session. */
export interface Demand { now: number; goal: number }
export const newDemand = (): Demand => ({ now: 0, goal: 0 });

const inside = (k: Kit, prism: number) => Math.max(-k.divMax, Math.min(k.convMax, prism));

/** Sets the goal, kept inside what this screen and safety allow. */
export function aim(k: Kit, d: Demand, prism: number) { d.goal = inside(k, prism); }

/** Moves the drawn demand toward the goal. Never faster than 2 prism dioptres a second. Call it once a frame. */
export function ramp(k: Kit, d: Demand, rate = 1) {
  const step = Math.min(2, Math.max(0, rate)) * k.slow * k.dt;
  d.now += Math.max(-step, Math.min(step, d.goal - d.now));
  note(k, d);
}

/** Keeps the furthest demand this session drew, each way, in prism dioptres: `conv` turning in, `div` turning out. */
function note(k: Kit, d: Demand) {
  if (d.now > 0) k.peak("conv", d.now); else if (d.now < 0) k.peak("div", -d.now);
}

/** The largest jump a game may make at this level: 2 prism dioptres at level 1, up to 12 at level 10. */
export const maxJump = (k: Kit) => Math.min(12, 1 + k.level * 1.1);

/** A jump: the demand changes at once to a new place, by no more than `maxJump`. For games that train jumps between two depths. */
export function jumpTo(k: Kit, d: Demand, prism: number) {
  const reach = maxJump(k);
  d.goal = d.now = inside(k, d.now + Math.max(-reach, Math.min(reach, prism - d.now)));
  note(k, d);
}

/** The member said the picture split. The demand eases 2 prism dioptres toward rest and the level eases too. */
export function ease(k: Kit, d: Demand) {
  d.goal -= Math.sign(d.goal) * Math.min(2, Math.abs(d.goal));
  d.now -= Math.sign(d.now) * Math.min(2, Math.abs(d.now));
  k.report("splits", (k.stats.splits ?? 0) + 1);
  k.miss();
}

/** Like `k.fuse`, with a depth step added on top, in arcseconds. Use it for a part of the target that should float in front (positive) or behind. */
export function fuseAt(k: Kit, prism: number, arcsec: number, draw: (ink: Ink, shift: number) => void) {
  const extra = k.arcsecUnits(arcsec) / 2;
  let first = true;
  k.fuse(prism, (ink, shift) => { draw(ink, shift + (first ? extra : -extra)); first = false; });
}

/**
 * The standard fusion target: a ring for each eye at this demand. The left eye's ring carries a dot at the top,
 * the right eye's a dot at the bottom. One ring with both dots means both eyes are on and joined.
 * One dot missing means one eye has switched off. Two rings means the picture has split.
 * Pass `body` to draw your own shape for each eye instead of the ring; the dots are still added.
 */
export function target(k: Kit, x: number, y: number, r: number, prism: number, body?: (ink: Ink, cx: number) => void) {
  let first = true;
  k.fuse(prism, (ink, shift) => {
    const cx = x + shift;
    if (body) body(ink, cx); else k.ring(cx, y, r, ink, Math.max(3, r * 0.16));
    /* A dot is at least half the member's smallest target across, so it is never too small to see. */
    k.disc(cx, first ? y - r * 0.55 : y + r * 0.55, Math.min(r * 0.3, Math.max(2.5, r * 0.13, 5 * k.k)), ink);
    first = false;
  });
}

/** Where the "it split in two" spot sits, in scene units. */
export const spot = (k: Kit) => { const w = Math.min(W * 0.42, k.letter * 7.5), h = k.letter * 1.9; return { x: W - 16 - w, y: H - 16 - h, w, h }; };

/** True on the frame the member says "it split in two": Down on keys or a remote, or a tap on the marked spot. */
export function splitPressed(k: Kit) {
  const i = k.input, s = spot(k);
  return i.pressed.has("down") || (i.tapped && i.x >= s.x && i.y >= s.y);
}

/** True when a tap landed on the split spot, so the game can ignore that tap for anything else. */
export function onSplitSpot(k: Kit) { const s = spot(k); return k.input.x >= s.x && k.input.y >= s.y; }

/** Draws the "it split in two" spot in the bottom right corner, for both eyes. Pass the words from your copy file. */
export function drawSplit(k: Kit, label: string) {
  const s = spot(k);
  k.box(s.x, s.y, s.w, s.h, "both", false, 2);
  k.text(label, s.x + s.w / 2, s.y + s.h / 2 + k.letter * 0.32, "both", Math.min(k.letter * 0.8, (s.w / Math.max(6, label.length)) * 1.5), "center");
}
