// Eyes Opener: Line-Up Drill. One short upright line sits above the middle; a second one below it is set off to one side.
/**
 * Line-Up Drill. One short upright line sits above the middle; a second one below it is set off to one side.
 * The member nudges the lower line until it sits exactly under the upper one and confirms. It measures how far
 * off the two lines still are: the weaker eye's sense of fine position.
 *
 * Ink: done with a patch over the stronger eye and no glasses, so the two lines, the words and the OK spot are
 * both-eyes ink. Weaker-eye ink is only a second colour: the two quiet arrows at the edges that show where to
 * tap, and the thin guide that shows the true place for a second after OK. Stronger-eye ink is never used.
 *
 * Moving: a press of Left or Right, or a tap on that half, moves the lower line by one pixel of this screen.
 * A key or a finger held down slides it, slowly at first. Space, Enter, OK on a remote or a tap on the OK spot
 * confirms. Nothing is timed.
 *
 * The miss is the sideways distance left, as an angle at the member's eye in seconds of arc:
 * scene units / k.perCm = centimetres; atan(centimetres / k.distCm) in degrees x 3600. A miss is never counted
 * finer than half a pixel of this screen (k.pxArcsec / 2): the screen cannot show less. `error_arcsec` is the
 * average miss over the last 8 pairs, as a whole number, reported from the third pair on.
 *
 * The upper line is at a new place for every pair, so nothing else in the scene (the frame, the OK spot) can be
 * used to line up by.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { arrow, clamp, top, widthOf } from "@/games/skills/common";
import { dim, fitSize, foot, sayFoot, sided } from "./parts";

const t = words.lineUpDrill;
/** The lower line starts between 2% and 6% of the scene width to one side, and cannot be pushed past 12%. */
const NEAR = 0.02 * W, FAR = 0.06 * W, LIMIT = 0.12 * W;
const KEEP = 8, FROM = 3, SHOW = 1, SETTLE = 0.5, HOLD = 0.25, GAP = 6;

interface State {
  /** Where the upper line is, and how far to the side of it the lower line is, in scene units. */
  ref: number; off: number;
  /** The way a held key or finger is pushing, and for how long. */
  dir: number; held: number;
  /** The misses of the last pairs, in seconds of arc, and how many pairs were confirmed. */
  misses: number[]; trials: number;
  born: number;
  done: { at: number; miss: number; floored: boolean } | null;
}

const pair = (k: Kit) => ({ ref: W / 2 + (k.rand() - 0.5) * 80, off: (k.rand() < 0.5 ? -1 : 1) * (NEAR + k.rand() * (FAR - NEAR)) });

/** Seconds of arc at the member's eye for a sideways distance in scene units. */
export const arcsecOf = (k: Kit, units: number) => Math.atan(Math.abs(units) / k.perCm / k.distCm) * (180 / Math.PI) * 3600;
/** One pixel of this screen, in scene units: the smallest step the lower line can take. */
export const pixel = (k: Kit) => k.arcsecUnits(k.pxArcsec);

export function lay(k: Kit) {
  const f = foot(k, [t.ask]), z = k.letter;
  const bh = z * 1.5, bw = widthOf(k, t.ok, z) + z * 1.4, by = f.top - 10 - bh / 2;
  const y0 = top(k) + 8, y1 = Math.max(y0 + 40, by - bh / 2 - 12);
  const len = clamp((y1 - y0 - GAP) / 2, 16, 80), cy = (y0 + y1) / 2;
  return { f, z, bw, bh, by, len, cy, wide: clamp(2 * k.k, 2, 6) };
}

/** True when the pointer is on the OK spot. Its reach is never under 26 * k.k. */
function onOk(k: Kit, L: ReturnType<typeof lay>) {
  const i = k.input;
  return Math.abs(i.x - W / 2) <= Math.max(L.bw / 2, 26 * k.k) && Math.abs(i.y - L.by) <= Math.max(L.bh / 2, 26 * k.k);
}

export const lineUpDrill: GameDef<State> = {
  init: (k) => ({ ...pair(k), dir: 0, held: 0, misses: [], trials: 0, born: k.t - SETTLE, done: null }),

  update(k, s) {
    if (s.done) {
      if (k.t - s.done.at >= SHOW) Object.assign(s, pair(k), { dir: 0, held: 0, born: k.t, done: null });
      return;
    }
    const i = k.input, L = lay(k), ok = onOk(k, L);
    if (i.action || (i.tapped && ok)) {
      /* A second press straight after a new pair is a slip of the finger, not an answer. */
      if (k.t - s.born < SETTLE) return;
      const seen = arcsecOf(k, s.off), least = k.pxArcsec / 2, miss = Math.max(seen, least);
      s.misses.push(miss);
      if (s.misses.length > KEEP) s.misses.shift();
      s.trials++;
      k.add();
      if (s.trials >= FROM) k.report("error_arcsec", Math.round(s.misses.reduce((a, v) => a + v, 0) / s.misses.length));
      s.done = { at: k.t, miss, floored: seen < least };
      return;
    }
    /* One press or one tap: one pixel. */
    if (!(i.tapped && ok)) s.off += sided(k) * pixel(k);
    /* Held down: a slide that starts slowly, so the last small part can still be done by eye. */
    const push = i.dx || (i.down && !i.tapped && !ok && Math.abs(i.x - W / 2) >= 8 ? (i.x < W / 2 ? -1 : 1) : 0);
    if (push && push === s.dir) s.held += k.dt; else { s.held = 0; s.dir = push; }
    if (push && s.held > HOLD) s.off += push * (5 + 25 * Math.min(1, (s.held - HOLD) / 1.2)) * k.dt;
    s.off = clamp(s.off, -LIMIT, LIMIT);
  },

  draw(k, s) {
    const L = lay(k), upper = L.cy - GAP / 2 - L.len, lower = L.cy + GAP / 2;
    k.frame();
    k.box(s.ref - L.wide / 2, upper, L.wide, L.len, "both");
    k.box(s.ref + s.off - L.wide / 2, lower, L.wide, L.len, "both");
    dim(k, "weak", 0.6, () => {
      arrow(k, 34, L.cy, 16, "left", "weak");
      arrow(k, W - 34, L.cy, 16, "right", "weak");
      /* After OK: a thin guide straight down from the upper line shows where the lower one belonged. */
      if (s.done) k.box(s.ref - 0.5, lower, 1, L.len, "weak");
    });
    if (s.done) {
      const said = `${s.done.floored ? t.within : t.off} ${Math.round(s.done.miss)} ${t.unit}`;
      k.text(said, W / 2, L.by + L.z * 0.35, "both", fitSize(k, said), "center");
    } else {
      k.box(W / 2 - L.bw / 2, L.by - L.bh / 2, L.bw, L.bh, "both", false, 2);
      k.text(t.ok, W / 2, L.by + L.z * 0.35, "both", L.z, "center");
    }
    sayFoot(k, L.f);
    /* The kit shrinks a long status line to fit, so the unit is always written out in plain words. */
    k.hud(s.trials >= FROM ? `${t.avg} ${k.stats.error_arcsec} ${t.unit}` : `${t.pairs} ${s.trials}`);
  },
};
