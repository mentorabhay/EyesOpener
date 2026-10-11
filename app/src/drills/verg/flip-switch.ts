// Eyes Opener: Flip Switch. The demand flips between turning the eyes in and letting them out, and the member says.
/**
 * Flip Switch. The demand flips between turning the eyes in and letting them out, and the member says
 * "one ring" after each flip. It measures full cycles a minute (in and out is one cycle) and the pair of demands
 * in use, in prism dioptres. This is the screen form of the flipper test of vergence flexibility.
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, with the left eye's dot at the top
 * and the right eye's at the bottom. The frame, the numbers, the instruction and the split spot are in both ink.
 *
 * What the demand does: it starts at 0 and waits. The first "one ring" starts the clock and sends the demand in.
 * Every "one ring" after that counts one flip and sends the demand to the other side. Turning in is four times
 * turning out, and the two together are never more than one jump at this level (`maxJump`), nor past what the
 * screen and the 4 cm rule allow. A split eases the demand and the flip under way is not counted.
 * The rate is the measure, so the clock runs; nothing else hurries the member and nothing is lost by being slow.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type GameDef, type Kit } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { ease, jumpTo, maxJump, newDemand, splitPressed, target, type Demand } from "@/games/vergence";
import { ask, cue, pd, plan, tenth } from "./parts";

interface State {
  d: Demand;
  /** Which side the demand sits on: 0 before the first flip, 1 turned in, -1 turned out. */
  side: -1 | 0 | 1;
  /** Flips counted. Two make a cycle. */
  flips: number;
  /** When the first flip was made and when the last one was. */
  first: number; last: number;
  /** True after a split: the flip under way does not count. */
  spoiled: boolean;
}

/** The shortest time in which "one ring" after a flip can be real, and the seconds of play before a rate means anything. */
const SOONEST = 0.4, ENOUGH = 20;

/** The pair in use: about four in for one out, together inside one jump at this level, each inside its own limit. */
export function pair(k: Kit) {
  const reach = maxJump(k);
  return { turnIn: pd(Math.min(k.convMax, reach * 0.8)), turnOut: pd(Math.min(k.divMax, reach * 0.2)) };
}

export const flipSwitch: GameDef<State> = {
  init: () => ({ d: newDemand(), side: 0, flips: 0, first: 0, last: 0, spoiled: false }),

  update(k, s) {
    const d = s.d;
    if (splitPressed(k)) {
      ease(k, d);
      if (s.side) s.spoiled = true;
      return;
    }
    /* A press this soon after a flip is a second tap, not an answer. */
    if (single(k) && !(s.side && k.t - s.last < SOONEST)) {
      if (!s.side) s.first = k.t;
      else if (!s.spoiled) {
        s.flips++;
        /* The side just cleared is now measured: the demand the member really joined at. */
        if (pd(d.now) > 0) k.peak(d.now > 0 ? "conv_pd" : "div_pd", pd(d.now));
        if (s.flips % 2 === 0) { k.hit(); k.add(); }
      }
      s.spoiled = false;
      s.side = s.side > 0 ? -1 : 1;
      const { turnIn, turnOut } = pair(k);
      jumpTo(k, d, s.side > 0 ? turnIn : -turnOut);
      s.last = k.t;
    }
    /* Cycles a minute since the first flip, kept up to date as play goes on. Not before a full cycle and 20 seconds. */
    const played = k.t - s.first;
    if (s.side && s.flips >= 2 && played >= ENOUGH) k.report("cycles_per_min", tenth(s.flips / 2 / (played / 60)));
  },

  draw(k, s) {
    k.frame();
    const p = plan(k), { turnIn, turnOut } = pair(k);
    target(k, W / 2, p.mid, p.r, s.d.now);
    k.hud(`${t.flip.cycles} ${Math.floor(s.flips / 2)} · ${t.flip.pair(turnIn, turnOut)}`);
    cue(k, p, t.oneRing);
    ask(k);
  },
};
