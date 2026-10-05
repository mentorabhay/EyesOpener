/**
 * Contrast Ladder. A round patch of stripes on a mid-grey field leans left or right; the member says which way.
 * The stripes get fainter as the answers stay right. It measures the faintest stripes the weaker eye still reads.
 *
 * Ink: done with a patch over the stronger eye and no glasses, so everything that matters is both-eyes ink.
 * The field and the stripes are greys set on the both-eyes layer (the contract allows this for a drill with no
 * glasses). Weaker-eye ink is only a second colour for the two small pictures at the edges that show where to tap.
 * Stronger-eye ink is never used: it is dimmed for some members.
 *
 * Greys: contrast is set in real light, not in colour values. A stripe's light is half of full light times
 * (1 + contrast x a sine wave), turned into a grey value with the screen's gamma (2.2 until the screen is measured). The wave is as often above the
 * field as below it, so the patch gives out the same light as the field and only the stripes tell it apart.
 * An 8-bit screen shows nothing fainter than about 1%, which is the floor.
 *
 * Staircase: two right in a row make the stripes a quarter fainter (x 0.75); one wrong makes them clearer
 * (/ 0.75). It starts at 60% and stops at 1%. `contrast_pct` is the faintest contrast answered right twice in a
 * row, so one lucky guess does not count. It is reported the first time that happens, never before.
 *
 * Size: 3.5 stripe pairs across the patch, about one pair to a degree at the member's distance where the screen
 * has room for it. Nothing flashes: a patch eases in and out, and the shortest time between two patches is 0.9 s.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { clamp, ease, hud } from "@/games/skills/common";
import { area, dim, foot, mark, r1, sayFoot, sided, type Side } from "./parts";

const t = words.contrastLadder;
const START = 0.6, DOWN = 0.75, FLOOR = 0.01;
const TILT = (20 * Math.PI) / 180, PAIRS = 3.5, SETTLE = 0.4, MARK = 0.5, TURN = 6.2832;

/** The last step of the ladder: the first one that reaches the floor. */
export const LAST = Math.ceil(Math.log(FLOOR / START) / Math.log(DOWN));
/** Contrast of the stripes at a step, 0 to 1. Step 0 is the clearest. */
export const contrastAt = (step: number) => Math.max(FLOOR, START * DOWN ** step);
const pct = (step: number) => r1(contrastAt(step) * 100);

/** The grey that shows this share of full light on the screen. Half of full light is the field's own grey. */
export const greyOf = (light: number, gamma = 2.2) => Math.round(255 * clamp(light, 0, 1) ** (1 / gamma));
const css = (v: number) => `rgb(${v} ${v} ${v})`;

interface State {
  /** Which way the stripes lean: -1 the top leans left, 1 the top leans right. */
  lean: Side;
  /** The step the staircase is on, and the step of the patch on screen. */
  step: number; shown: number;
  streak: number;
  /** The faintest step answered right twice in a row. -1 until that has happened. */
  best: number;
  born: number;
  done: { at: number; right: boolean } | null;
}

function lay(k: Kit) {
  const f = foot(k, [t.ask]), a = area(k, f.top), room = Math.max(20, a.h / 2 - 24);
  /* One stripe pair to a degree gives a patch 3.5 degrees across; the screen and the member's target size bound it. */
  const r = clamp((PAIRS / 2) * k.arcsecUnits(3600), Math.min(40 * k.k, room), room);
  return { f, x0: 72, y0: a.y0, w: W - 144, h: a.h, cx: W / 2, cy: a.cy - 6, r, markY: a.y1 - 13 };
}

/** The patch: thin slices of grey across the stripes, cut to a circle, with an edge that melts into the field. */
function stripes(k: Kit, cx: number, cy: number, r: number, lean: Side, contrast: number) {
  const g = k.ctx("both"), period = (2 * r) / PAIRS, wide = period / 16, n = Math.ceil((2 * r) / wide);
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, TURN);
  g.clip();
  g.translate(cx, cy);
  /* Turning clockwise tips the top of an upright stripe to the right. */
  g.rotate(lean * TILT);
  for (let j = 0; j < n; j++) {
    const x = -r + j * wide;
    g.fillStyle = css(greyOf(0.5 * (1 + contrast * Math.sin(((x + wide / 2) / period) * TURN)), k.gamma));
    /* Each slice runs a little under the next, so no seam shows between them. */
    g.fillRect(x, -r, wide + 0.5, 2 * r);
  }
  g.restore();
  /* The soft edge: the field's grey, clear over the middle of the patch and solid at its rim. */
  const edge = g.createRadialGradient(cx, cy, r * 0.62, cx, cy, r) as CanvasGradient | undefined;
  if (!edge) return;
  const field = greyOf(0.5, k.gamma);
  edge.addColorStop(0, `rgb(${field} ${field} ${field} / 0)`);
  edge.addColorStop(1, css(field));
  g.fillStyle = edge;
  g.beginPath();
  g.arc(cx, cy, r + 1, 0, TURN);
  g.fill();
}

/** Three short bars that lean one way: the picture of an answer, at the edge to tap. */
function leaning(k: Kit, x: number, y: number, lean: Side) {
  const h = 15, d = h * Math.tan(TILT) * lean;
  for (const off of [-10, 0, 10]) k.line(x + off + d, y - h, x + off - d, y + h, "weak", 4);
}

export const contrastLadder: GameDef<State> = {
  init: (k) => ({ lean: k.rand() < 0.5 ? -1 : 1, step: 0, shown: 0, streak: 0, best: -1, born: k.t - SETTLE, done: null }),

  update(k, s) {
    if (s.done) {
      if (k.t - s.done.at >= MARK) { s.lean = k.rand() < 0.5 ? -1 : 1; s.shown = s.step; s.born = k.t; s.done = null; }
      return;
    }
    /* A new patch has to be fully there before an answer counts. */
    if (k.t - s.born < SETTLE) return;
    const said = sided(k);
    if (!said) return;
    const right = said === s.lean;
    s.done = { at: k.t, right };
    if (right) {
      k.add();
      k.hit();
      if (++s.streak >= 2) {
        s.streak = 0;
        s.best = Math.max(s.best, s.step);
        k.report("contrast_pct", pct(s.best));
        if (s.step < LAST) s.step++;
      }
    } else {
      k.miss();
      s.streak = 0;
      s.step = Math.max(0, s.step - 1);
    }
  },

  draw(k, s) {
    const L = lay(k);
    k.frame();
    const g = k.ctx("both");
    g.fillStyle = css(greyOf(0.5, k.gamma));
    g.fillRect(L.x0, L.y0, L.w, L.h);
    /* The patch eases in, and eases out again under the mark that follows an answer. */
    const there = s.done ? 1 - ease((k.t - s.done.at) / MARK) : ease((k.t - s.born) / SETTLE);
    stripes(k, L.cx, L.cy, L.r, s.lean, contrastAt(s.shown) * there);
    if (s.done) mark(k, L.cx, L.markY, 14, s.done.right);
    dim(k, "weak", 0.6, () => { leaning(k, 38, L.cy, -1); leaning(k, W - 38, L.cy, 1); });
    sayFoot(k, L.f);
    const now = `${t.now} ${pct(s.shown)}%`;
    if (s.best >= 0) hud(k, `${now} · ${t.best} ${pct(s.best)}%`, `${t.short} ${pct(s.best)}%`);
    else k.hud(now);
  },
};
