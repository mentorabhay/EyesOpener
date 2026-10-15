/**
 * Blind-Side Sweeps. For a member who lost half of the field of view after a stroke. A white dot appears
 * somewhere in the scene, more often on the side that is hard to see. The member sweeps the eyes across to find
 * it and says which side it is on. It measures how many dots were found and how long a find takes on each side.
 *
 * Ink: no glasses are worn, so the dot, the small cross in the middle, the words and the marks are all
 * both-eyes ink. No other ink is used.
 *
 * It is counsellor-led, so it is slow and plain: one dot at a time, nothing moves, nothing is timed out.
 * The first screen asks which side is hard to see (Left or Right, or a tap on that half). After that, 7 dots in
 * 10 appear on that side. Left or Right for the half the dot is in, or a tap on the dot, is a find. A wrong
 * side or a tap elsewhere is quiet: the dot stays where it is. The next dot comes 1 to 2 seconds after a find.
 *
 * `found` is the number of dots found. `find_s_blind` and `find_s_seeing` are the average seconds from a dot
 * appearing to its being found, on the hard side and on the other side, to one decimal. Each is reported only
 * once 3 dots have been found on that side. A find that took over a minute is counted as found but left out of
 * the averages: that was a pause, not a search.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { hud, tick } from "@/games/skills/common";
import { area, choiceSize, choices, dim, fitSize, foot, r1, sayFoot, sided, type Side } from "./parts";

const t = words.blindSideSweeps;
/** Share of dots on the hard side; finds needed before an average is reported; the longest search that counts. */
const SHARE = 0.7, FROM = 3, LONGEST = 60;
/** No answer counts in the first quarter second of a dot: nobody finds one that fast. */
const EARLIEST = 0.25, TICK = 0.6;

interface Tally { n: number; sum: number }
interface State {
  /** The side that is hard to see: -1 left, 1 right, 0 until the member has said. */
  side: Side | 0;
  dot: { x: number; y: number; born: number } | null;
  next: number;
  found: number; blind: Tally; seeing: Tally;
  got: { x: number; y: number; at: number } | null;
}

export function lay(k: Kit) {
  const f = foot(k, [t.ask]), a = area(k, f.top), r = Math.max(6, Math.min(12 * k.k, 30, a.h / 4));
  return { f, a, r, reach: Math.max(30 * k.k, r + 10) };
}

/** A place for the next dot: clear of the edges, of the score line, of the words and of the middle line. */
function place(k: Kit, side: Side) {
  const { a, r } = lay(k), half: Side = k.rand() < SHARE ? side : side < 0 ? 1 : -1;
  const near = 34 + r, far = W / 2 - 20 - r, from = Math.min(near, far);
  const x = W / 2 + half * (from + k.rand() * (far - from)), lo = a.y0 + r, hi = Math.max(lo, a.y1 - r);
  return { x, y: lo + k.rand() * (hi - lo), born: k.t };
}

const mean = (v: Tally) => r1(v.sum / v.n);

export const blindSideSweeps: GameDef<State> = {
  init: () => ({ side: 0, dot: null, next: 0, found: 0, blind: { n: 0, sum: 0 }, seeing: { n: 0, sum: 0 }, got: null }),

  update(k, s) {
    if (!s.side) {
      const side = sided(k);
      if (side) { s.side = side; s.next = k.t + 1.5; }
      return;
    }
    if (!s.dot) {
      if (k.t >= s.next) s.dot = place(k, s.side);
      return;
    }
    const took = k.t - s.dot.born;
    if (took < EARLIEST) return;
    const i = k.input, l = i.pressed.has("left"), r = i.pressed.has("right"), on: Side = s.dot.x < W / 2 ? -1 : 1;
    let right: boolean;
    if (l !== r) right = (l ? -1 : 1) === on;
    else if (i.tapped) right = Math.hypot(i.x - s.dot.x, i.y - s.dot.y) <= lay(k).reach;
    else return;
    if (!right) { k.miss(); return; }
    k.add();
    k.hit();
    k.report("found", ++s.found);
    if (took <= LONGEST) {
      const hard = on === s.side, v = hard ? s.blind : s.seeing;
      v.n++;
      v.sum += took;
      if (v.n >= FROM) k.report(hard ? "find_s_blind" : "find_s_seeing", mean(v));
    }
    s.got = { x: s.dot.x, y: s.dot.y, at: k.t };
    s.dot = null;
    s.next = k.t + 1 + k.rand();
  },

  draw(k, s) {
    const L = lay(k);
    k.frame();
    if (!s.side) {
      /* The first screen: the question, with the two answers large at the two sides. */
      const zq = fitSize(k, t.which), zc = choiceSize(k, t.left, t.right, "", k.letter * 1.3);
      k.text(t.which, W / 2, L.a.y0 + L.a.h * 0.3 + zq * 0.5, "both", zq, "center");
      choices(k, L.a.y0 + L.a.h * 0.72 + zc * 0.5, zc, t.left, t.right);
      k.hud(`${t.found} 0`);
      return;
    }
    /* A small cross marks the middle: the place to start each sweep from, and the line between the two sides. */
    const c = Math.min(6 * k.k, 14);
    dim(k, "both", 0.6, () => { k.line(W / 2 - c, L.a.cy, W / 2 + c, L.a.cy, "both", 2); k.line(W / 2, L.a.cy - c, W / 2, L.a.cy + c, "both", 2); });
    if (s.dot) k.disc(s.dot.x, s.dot.y, L.r, "both");
    if (s.got && k.t - s.got.at < TICK) tick(k, s.got.x, s.got.y, Math.max(18, L.r * 1.4));
    sayFoot(k, L.f);
    const more = (s.blind.n >= FROM ? ` · ${t.hard} ${mean(s.blind)} ${t.s}` : "") + (s.seeing.n >= FROM ? ` · ${t.other} ${mean(s.seeing)} ${t.s}` : "");
    hud(k, `${t.found} ${s.found}${more}`, `${t.found} ${s.found}`);
  },
};
