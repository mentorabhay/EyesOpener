/**
 * Crowding Drill. A tumbling E in the middle with four other Es around it: above, below, left and right.
 * The member says which way the arms of the middle E point. The neighbours close in as the answers stay right.
 * It measures how close the neighbours can come before the middle letter can no longer be read.
 *
 * Ink: done with a patch over the stronger eye and no glasses, so every letter, the words and the marks are
 * both-eyes ink. No other ink is used.
 *
 * Staircase: the gap is measured from the edge of the middle E to the edge of a neighbour, in letter widths.
 * Two right in a row close it (x 0.8); one wrong opens it (/ 0.8). It starts at 3.0, never opens past where it
 * started (the scene has no more room) and never closes past 0.2. `gap_x` is the smallest gap answered right
 * twice in a row, so one lucky guess in four does not count. It is reported the first time that happens.
 *
 * Size: the letters are 1.5 times the member's letter height where the whole cluster fits at a gap of 3.0, and
 * smaller where it does not. They are not made smaller than the member's own letter height, though: a letter
 * the member cannot read measures nothing. On a small screen with large letters the staircase starts at the
 * widest gap that fits around letters of that height instead (never under 1.0). The size stays the same for the
 * whole session: only the gap changes. Nothing flashes: after an answer the mark takes the cluster's place for
 * half a second.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { STEP, WAYS, clamp, hud, pointed, type Way } from "@/games/skills/common";
import { area, foot, letterE, mark, r1, sayFoot } from "./parts";

const t = words.crowdingDrill;
const WIDEST = 3, TIGHT = 1, CLOSER = 0.8, FLOOR = 0.2, SETTLE = 0.3, MARK = 0.5;

/** The gap at a step, in letter widths. Step 0 is the widest this screen has room for. */
export const gapAt = (widest: number, step: number) => clamp(widest * CLOSER ** step, FLOOR, widest);
/** The last step: the first one that reaches the floor. */
export const lastStep = (widest: number) => Math.max(0, Math.ceil(Math.log(FLOOR / widest) / Math.log(CLOSER) - 1e-9));

interface State {
  /** The way the middle E points, and the ways of the four around it (left, right, above, below). */
  way: Way; around: Way[];
  step: number; shown: number; streak: number;
  /** The closest step answered right twice in a row. -1 until that has happened. */
  best: number;
  born: number;
  done: { at: number; right: boolean } | null;
}

export function lay(k: Kit) {
  const f = foot(k, [t.ask]), a = area(k, f.top), room = Math.min(a.h, W - 120);
  /* The cluster is three letters and two gaps across and as much tall: nine letters at a gap of 3.0, five at 1.0. */
  const fits = room / (3 + 2 * WIDEST), readable = Math.min(k.letter, room / (3 + 2 * TIGHT));
  const size = Math.max(10, Math.min(1.5 * k.letter, Math.max(fits, readable)));
  return { f, cx: W / 2, cy: a.cy, size, widest: clamp((room / size - 3) / 2, FLOOR, WIDEST) };
}

const around = (k: Kit) => WAYS.map(() => k.pick(WAYS));

export const crowdingDrill: GameDef<State> = {
  init: (k) => ({ way: k.pick(WAYS), around: around(k), step: 0, shown: 0, streak: 0, best: -1, born: k.t - SETTLE, done: null }),

  update(k, s) {
    if (s.done) {
      if (k.t - s.done.at >= MARK) { s.way = k.pick(WAYS); s.around = around(k); s.shown = s.step; s.born = k.t; s.done = null; }
      return;
    }
    if (k.t - s.born < SETTLE) return;
    const { cx, cy, widest } = lay(k), said = pointed(k, cx, cy);
    if (!said) return;
    const right = said === s.way;
    s.done = { at: k.t, right };
    if (right) {
      k.add();
      k.hit();
      if (++s.streak >= 2) {
        s.streak = 0;
        s.best = Math.max(s.best, s.step);
        k.report("gap_x", r1(gapAt(widest, s.best)));
        if (s.step < lastStep(widest)) s.step++;
      }
    } else {
      k.miss();
      s.streak = 0;
      s.step = Math.max(0, s.step - 1);
    }
  },

  draw(k, s) {
    const L = lay(k), gap = (step: number) => r1(gapAt(L.widest, step)), far = L.size * (1 + gapAt(L.widest, s.shown));
    k.frame();
    if (s.done) mark(k, L.cx, L.cy, Math.max(18, L.size * 0.8), s.done.right);
    else {
      letterE(k, L.cx, L.cy, L.size, s.way);
      WAYS.forEach((side, n) => letterE(k, L.cx + STEP[side][0] * far, L.cy + STEP[side][1] * far, L.size, s.around[n]));
    }
    sayFoot(k, L.f);
    const now = `${t.now} ${gap(s.shown)} ${t.unit}`;
    if (s.best >= 0) hud(k, `${now} · ${t.best} ${gap(s.best)}`, `${t.short} ${gap(s.best)}`);
    else k.hud(now);
  },
};
