// Eyes Opener: E Safari. A practice check of how small a shape a young child can read, one eye at a time (the other eye is.
/**
 * E Safari. A practice check of how small a shape a young child can read, one eye at a time (the other eye is
 * under a patch). The animal track is a tumbling E: three toes that point right, down, left or up. The child
 * points the way the toes face. The session keeps the smallest size step read (`step`), as a figure to compare on the
 * same screen at the same distance. It is not a letter-chart result: that comes from Letter size in Check-ups.
 *
 * Ink: no glasses are worn. The track, the words and the marks after an answer are both-eyes ink. Weaker-eye ink
 * is only a second colour for the four small arrows at the edges that show where to tap. Stronger-eye ink is
 * never used: it is dimmed for some members.
 *
 * Difficulty: a two-down, one-up staircase on the size of the track. Two right in a row shrink it (x 0.8); one
 * wrong enlarges it (/ 0.8). Nothing else changes. The track is never drawn under 10 scene units tall (a stroke
 * of 2 units), because a screen cannot show a thinner stroke truly; at that floor the scene says so.
 * "Smallest tracks read" is the smallest size step answered right twice in a row: one lucky guess does not
 * count. Step 1 is the largest size. The level (k.hit, k.miss) is kept for the record only.
 */
import { games as copy } from "@/copy/games-skills";
import { H, W, type GameDef, type Kit } from "../kit";
import { STEP, WAYS, arrow, clamp, hud, pointed, tick, top, words, wrap, type Way } from "./common";

const t = copy.eSafari;
const FLOOR = 10, SETTLE = 0.3, SHOW = 0.7, BLANK = 0.3;

interface State {
  way: Way;
  /** Size step: 0 is the largest, each step is 0.8 of the one before. `shown` is the step of the track on screen. */
  step: number; shown: number; streak: number;
  /** Smallest step read twice in a row. -1 until that has happened. */
  best: number;
  born: number;
  done: { at: number; right: boolean } | null;
}

function lay(k: Kit) {
  const cy = (top(k) + H - 14) / 2, room = H - 14 - top(k);
  /* The largest track leaves room for the edge arrows. */
  return { cx: W / 2, cy, first: clamp(room - 76, 2 * FLOOR, 120) };
}
export const sizeAt = (k: Kit, step: number) => Math.max(FLOOR, lay(k).first * 0.8 ** step);
const atFloor = (k: Kit, step: number) => lay(k).first * 0.8 ** step <= FLOOR;

/** The tumbling E on a five by five grid: a spine one cell wide and three toes, each one cell thick. */
function track(k: Kit, cx: number, cy: number, size: number, way: Way) {
  const u = size / 5, x = cx - size / 2, y = cy - size / 2;
  if (way === "left" || way === "right") {
    k.box(way === "right" ? x : x + 4 * u, y, u, size, "both");
    for (const row of [0, 2, 4]) k.box(x, y + row * u, size, u, "both");
  } else {
    k.box(x, way === "down" ? y : y + 4 * u, size, u, "both");
    for (const col of [0, 2, 4]) k.box(x + col * u, y, u, size, "both");
  }
}

export const eSafari: GameDef<State> = {
  target: 20,
  init: (k) => ({ way: k.pick(WAYS), step: 0, shown: 0, streak: 0, best: -1, born: k.t - SETTLE, done: null }),

  update(k, s) {
    if (s.done) {
      /* After the mark, the scene is empty for a moment so a new track of the same kind still reads as new. */
      if (k.t - s.done.at >= SHOW + BLANK) { s.way = k.pick(WAYS); s.shown = s.step; s.born = k.t; s.done = null; }
      return;
    }
    if (k.t - s.born < SETTLE) return;
    const { cx, cy } = lay(k), said = pointed(k, cx, cy);
    if (!said) return;
    const right = said === s.way;
    s.done = { at: k.t, right };
    if (right) {
      k.add();
      k.hit();
      if (++s.streak >= 2) {
        s.streak = 0;
        s.best = Math.max(s.best, s.step);
        k.report("step", s.best + 1);
        if (!atFloor(k, s.step)) s.step++;
      }
    } else {
      k.miss();
      s.streak = 0;
      s.step = Math.max(0, s.step - 1);
    }
  },

  draw(k, s) {
    const { cx, cy } = lay(k), size = sizeAt(k, s.shown), floor = atFloor(k, s.shown), g = k.ctx("weak");
    k.frame();
    /* Four quiet arrows at the edges: the places to tap. */
    g.globalAlpha = 0.6;
    arrow(k, 34, cy, 16, "left", "weak");
    arrow(k, W - 34, cy, 16, "right", "weak");
    arrow(k, cx, top(k) + 16, 16, "up", "weak");
    if (!floor) arrow(k, cx, H - 30, 16, "down", "weak");
    g.globalAlpha = 1;
    if (!s.done || k.t - s.done.at < SHOW) track(k, cx, cy, size, s.way);
    /* After an answer: a tick for right; for wrong, a quiet arrow beside the track shows the way the toes pointed. */
    if (s.done && k.t - s.done.at < SHOW) {
      const [vx, vy] = STEP[s.way];
      if (s.done.right) tick(k, cx, cy + size / 2 + 30, 18);
      else arrow(k, cx + vx * (size / 2 + 26), cy + vy * (size / 2 + 26), 18, s.way, "both");
    }
    if (floor) {
      const lines = wrap(k, t.floor, W - 60, k.letter);
      words(k, t.floor, cx, H - 24 - (lines.length - 1) * k.letter * 1.25, W - 60);
    }
    if (s.best >= 0) hud(k, `${t.smallest} ${s.best + 1}`, `${t.short} ${s.best + 1}`);
    else hud(k, t.ask, t.askShort);
  },
};
