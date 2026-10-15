/**
 * Screen Vergence Steps. The demand changes in sudden steps and the member gets one ring back after each.
 * It measures how many jumps were cleared, the largest jump cleared (prism dioptres) and the average time from
 * a jump to "one ring" (seconds).
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, with the left eye's dot at the top
 * and the right eye's at the bottom. The frame, the numbers, the instruction and the split spot are in both ink.
 *
 * What the demand does: it starts at 0 and waits for the member. Each "one ring" is followed, a second later,
 * by one jump (`jumpTo`, so never further than the level allows). The jumps go up until the limit of this
 * screen is near, then come back toward zero, then up again. The size of a jump follows the level; a split
 * eases the demand, halves the next jump, and the size grows back as jumps are cleared.
 * The drill is paced by the member: nothing moves until they answer, so the only clock is the one being measured.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type GameDef, type Kit } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { ease, jumpTo, maxJump, newDemand, splitPressed, target, type Demand } from "@/games/vergence";
import { ask, cue, pd, plan, tenth } from "./parts";

interface State {
  d: Demand;
  /** 1 while the jumps go up, -1 while they come back toward zero. */
  way: 1 | -1;
  /** The size of the jump waiting to be cleared; 0 when none is. */
  open: number;
  /** When that jump was made. */
  since: number;
  /** Seconds until the next jump once the member has said "one ring"; under 0 while the drill waits for the member. */
  next: number;
  /** The share of the level's jump in use: halved by a split, grown back by each jump cleared. */
  trim: number;
  /** Jumps cleared, and the seconds they took in all. */
  cleared: number; took: number;
}

/** The hold between "one ring" and the next jump, and the shortest time in which an answer can be real. */
const HOLD = 1, SOONEST = 0.4;

/** Makes the next jump: on in the same direction while there is room, else to the end of the range, else it turns round. */
function jump(k: Kit, s: State) {
  const d = s.d, step = maxJump(k) * s.trim, from = d.now;
  let to = from + s.way * step;
  if (s.way > 0 && to > k.convMax) {
    if (k.convMax - from >= 1) to = k.convMax; else { s.way = -1; to = from - step; }
  }
  if (s.way < 0 && to < 0) {
    if (from >= 1) to = 0; else { s.way = 1; to = Math.min(k.convMax, from + step); }
  }
  jumpTo(k, d, to);
  s.open = Math.abs(d.now - from);
  s.since = k.t;
  s.next = -1;
}

export const screenVergenceSteps: GameDef<State> = {
  init: () => ({ d: newDemand(), way: 1, open: 0, since: 0, next: -1, trim: 1, cleared: 0, took: 0 }),

  update(k, s) {
    if (splitPressed(k)) {
      /* The jump was too much: it is not cleared, the demand eases, and the next jump is half the size. */
      ease(k, s.d);
      s.open = 0;
      s.next = -1;
      s.trim = Math.max(0.25, s.trim / 2);
      return;
    }
    if (s.next >= 0) {
      s.next -= k.dt;
      if (s.next <= 0) jump(k, s);
      return;
    }
    if (!single(k)) return;
    if (s.open > 0) {
      /* A press this soon after a jump is a second tap, not an answer: eyes need longer than that to move. */
      if (k.t - s.since < SOONEST) return;
      s.cleared++;
      s.took += k.t - s.since;
      k.report("steps", s.cleared);
      k.peak("step_pd", pd(s.open));
      k.report("regain_s", tenth(s.took / s.cleared));
      k.hit();
      k.add();
      s.trim = Math.min(1, s.trim * 1.5);
      s.open = 0;
    }
    s.next = HOLD;
  },

  draw(k, s) {
    k.frame();
    const p = plan(k);
    target(k, W / 2, p.mid, p.r, s.d.now);
    const each = s.cleared ? ` · ${k.stats.regain_s} ${t.steps.each}` : "";
    k.hud(`${t.steps.steps} ${s.cleared} · ${t.turnedIn} ${Math.round(s.d.now)}${each}`);
    cue(k, p, s.next >= 0 ? t.steps.hold : t.oneRing);
    ask(k);
  },
};
