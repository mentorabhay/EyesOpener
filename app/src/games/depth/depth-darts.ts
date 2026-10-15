/**
 * Depth Darts. Throw at the target that floats nearest.
 *
 * Ink: every target is drawn twice through `k.depth`, once in each eye's ink (cyan for the weaker eye, red
 * for the stronger eye at its contrast). The flat targets get the two copies in the same place; the near
 * one gets them a small step apart, crossed, so it floats in front of the screen. That step is the only
 * thing that tells the targets apart, and it only exists when the two eyes' pictures are joined: one eye
 * alone sees a row of identical targets.
 *
 * Kept honest:
 *  - all targets use the same two inks (a flat target in white would look brighter to the stronger eye);
 *  - every target is nudged sideways by more than the step each round, so uneven spacing tells nothing;
 *  - the marker for keys sits on the fixed slot, not on the target, so it cannot be used as a ruler;
 *  - the step is a whole number of screen pixels and never under one pixel (`depthStep`), and the corner
 *    shows the step that was drawn.
 * The frame, the score, the step, the marker, the dart and the answer ring are in both-eyes ink.
 */
import { games as copy } from "@/copy/games-depth";
import { H, W, type GameDef, type Ink, type Kit } from "../kit";
import { depthStep, label } from "./parts";

const t = copy.depthDarts;

interface Round { n: number; near: number; step: number; xs: number[]; slots: number[]; y: number; r: number }
/** `mark` is the slot the keys point at (-1 until a key is used); `at` the target thrown at; `fly` runs 0 to 1; `show` is seconds of answer left. */
interface State { round: Round; mark: number; at: number; fly: number; show: number; ok: boolean }

function deal(k: Kit): Round {
  const step = depthStep(k), half = k.arcsecUnits(step) / 2;
  /* Sideways nudge, four times what one eye sees of the step. The near target's nudge is kept inside by that much. */
  const sway = Math.max(8, half * 4);
  const top = 36 + k.letter, bottom = H - 38 - 2 * k.letter - 12;
  const room = (n: number) => (W - 44) / n / 2 - sway - half - 6;
  const want = 38 * k.k;
  const n = k.level >= 4 && room(4) >= want ? 4 : 3;
  const r = Math.max(10, Math.min(want, room(n), (bottom - top) / 2));
  const near = Math.floor(k.rand() * n), slots = Array.from({ length: n }, (_, i) => 22 + ((W - 44) / n) * (i + 0.5));
  const xs = slots.map((x, i) => x + (k.rand() * 2 - 1) * (i === near ? sway - half : sway));
  return { n, near, step, xs, slots, r, y: Math.max(top + r, Math.min(H / 2, (top + bottom) / 2)) };
}

function board(k: Kit, x: number, y: number, r: number, ink: Ink) {
  const w = Math.max(2.5, r * 0.11);
  k.ring(x, y, r - w / 2, ink, w);
  k.ring(x, y, r * 0.58, ink, w);
  k.disc(x, y, r * 0.22, ink);
}

export const depthDarts: GameDef<State> = {
  init: (k) => ({ round: deal(k), mark: -1, at: -1, fly: 0, show: 0, ok: false }),

  update(k, s) {
    const i = k.input, o = s.round;
    if (s.show > 0) {
      s.show -= k.dt;
      if (s.show <= 0) { s.round = deal(k); s.at = -1; s.fly = 0; if (s.mark >= 0) s.mark = Math.min(s.mark, s.round.n - 1); }
      return;
    }
    if (s.at >= 0) {
      s.fly += (k.dt * k.slow) / 0.45;
      if (s.fly < 1) return;
      s.ok = s.at === o.near;
      if (s.ok) { k.add(); k.hit(); } else k.miss();
      s.show = 1.5;
      return;
    }
    /* Keys and a remote: the first press only shows the marker, so nobody throws by accident. */
    const key = i.action || i.pressed.has("left") || i.pressed.has("right");
    if (key && s.mark < 0) s.mark = Math.floor(o.n / 2);
    else if (i.pressed.has("left")) s.mark = Math.max(0, s.mark - 1);
    else if (i.pressed.has("right")) s.mark = Math.min(o.n - 1, s.mark + 1);
    else if (i.action) s.at = s.mark;
    if (i.tapped && s.at < 0) {
      const reach = Math.max(o.r, 26 * k.k) + 4;
      let best = -1;
      o.xs.forEach((x, n) => { if (Math.hypot(i.x - x, i.y - o.y) <= reach && (best < 0 || Math.abs(i.x - x) < Math.abs(i.x - o.xs[best]))) best = n; });
      s.at = best;
    }
  },

  draw(k, s) {
    const o = s.round, u = Math.min(k.k, 2.2);
    k.frame();
    o.xs.forEach((x, n) => k.depth(n === o.near ? o.step : 0, (ink, shift) => board(k, x + shift, o.y, o.r, ink)));

    const under = o.y + o.r + 9;
    if (s.show > 0) {
      /* The answer, for both eyes: a ring round the target that was nearest, and the dart where it landed. */
      k.ring(o.xs[o.near], o.y, o.r + 5, "both", 2.5);
      label(k, s.ok ? t.hit : t.nearest, o.slots[o.near], under + k.letter);
      const x = o.xs[s.at], y = o.y;
      k.line(x, y, x + 9 * u, y + 13 * u, "both", 4);
      k.disc(x, y, 4.5 * u, "both");
    } else if (s.at >= 0) {
      const e = 1 - (1 - Math.min(1, s.fly)) ** 2, fx = W / 2, fy = H - 30, tx = o.xs[s.at];
      const x = fx + (tx - fx) * e, y = fy + (o.y - fy) * e, far = Math.hypot(tx - fx, o.y - fy) || 1, len = 30 * u * (1 - 0.55 * e);
      k.line(x, y, x - ((tx - fx) / far) * len, y - ((o.y - fy) / far) * len, "both", 4);
      k.disc(x, y, 5 * u * (1 - 0.3 * e), "both");
    } else if (s.mark >= 0) {
      const x = o.slots[s.mark], h = Math.min(14 * u, k.letter);
      k.poly([[x, under], [x - h * 0.8, under + h], [x + h * 0.8, under + h]], "both");
    }

    k.hud(`${t.hits} ${k.score}`);
    label(k, `${t.step} ${Math.round(o.step)} ${t.unit}`, 22, H - 22, "left");
  },
};
