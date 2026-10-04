/**
 * Stereogram Pairs. Two rings side by side, each with a small dot inside it. The member joins the two rings
 * into a third ring in the middle, by crossing the eyes or by relaxing them, and says whether the dot in that
 * middle ring floats nearer or farther than the ring. The rings move apart as the answers stay right.
 * It measures the widest gap the member can join, each way.
 *
 * Ink: no glasses are worn, so everything is both-eyes ink. No other ink is used.
 *
 * Which answer is right. The dot in the left picture sits `a` to the right of its ring's centre and the dot in
 * the right picture sits `a` to the left of its ring's centre. `a` above zero means the two dots lean toward
 * each other ("inward"); below zero, away from each other.
 *   - A thing nearer than the ring is seen further right by the left eye and further left by the right eye than
 *     the ring is. So: nearer when (dot's offset in the left eye) minus (dot's offset in the right eye) is above zero.
 *   - Crossing: the left eye looks at the right picture and the right eye at the left picture.
 *     Left eye's offset is -a, right eye's is +a; the difference is -2a. Inward dots (a > 0) float farther.
 *   - Relaxing: each eye looks at the picture on its own side. Left eye's offset is +a, right eye's is -a;
 *     the difference is +2a. Inward dots float nearer.
 *   So the dot is nearer exactly when (relaxing) equals (inward). This is the usual rule for a pair viewed with
 *   relaxed eyes (parts drawn closer together come forward), turned round for crossed eyes.
 * The two dots are about 700 seconds of arc apart in depth from the ring, and never under 4 scene units.
 *
 * Steps and limits. The gap between the ring centres starts at 2 cm each way. A right answer widens it by
 * 0.5 cm, a wrong one narrows it by 0.5 cm, and so does "Cannot join" (Down, or a tap on its box), which is
 * never counted as right: a member who cannot join the rings is not left to guess. The way of joining changes
 * every 6 answers. Crossing goes up to the smallest of 12 cm, 40% of the scene width and the kit's own limit for
 * turning in. Relaxing goes up to the smallest of 5.5 cm, 40% of the scene width and the kit's limit for turning
 * out (4 cm of separation, safely under the distance between a child's eyes): the eyes are never asked to point
 * outward past straight ahead. The rings slide to a new gap no faster than 2 prism dioptres a second.
 * `cross_cm` and `relax_cm` are the widest gap answered right each way, to one decimal, kept with k.peak.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { clamp, hud, top } from "@/games/skills/common";
import { BASE, choiceSize, choices, fitSize, mark, onMid, r1, sided } from "./parts";

const t = words.stereogramPairs;
export type Mode = "cross" | "relax";
const START = 2, STEP = 0.5, RUN = 6, SETTLE = 0.5, AFTER_TURN = 1, MARK = 0.5;
/** The widest gaps the plan allows, in centimetres, before the screen and the kit's own limits are applied. */
const CROSS_MOST = 12, RELAX_MOST = 5.5;
/** 2 prism dioptres a second is 0.02 cm a second for every centimetre of viewing distance. */
const RATE = 0.02;

interface State {
  mode: Mode;
  /** The gap between the ring centres for each way of joining, and the gap drawn now, in centimetres. */
  gap: Record<Mode, number>; shown: number;
  /** True when the two dots lean toward each other. */
  inward: boolean;
  /** Answers given in this run of six. */
  count: number;
  born: number;
  /** The last answer: right, wrong, or null for "cannot join". */
  done: { at: number; right: boolean | null } | null;
}

export function lay(k: Kit) {
  const zc = choiceSize(k, t.near, t.far, t.none), yc = BASE;
  const zq = fitSize(k, t.ask), yq = yc - zc * 1.05 - 6 - zq * 0.3;
  /* Each way of joining is written as large as it fits, on one baseline, so the scene does not shift when the way changes. */
  const zm = { cross: fitSize(k, t.cross), relax: fitSize(k, t.relax) }, tall = Math.max(zm.cross, zm.relax), ym = top(k) + 4 + tall;
  const y0 = ym + tall * 0.3 + 8, y1 = Math.max(y0 + 44, yq - zq - 8), room = y1 - y0 - 24;
  /* A ring is 1.2 cm across, larger for a member who needs large targets, and never over 1.6 cm. */
  const r = Math.min(0.8 * k.perCm, Math.max(0.6 * k.perCm, 10 * k.k), room / 2);
  const cy = y0 + room / 2;
  return { zc, yc, zq, yq, zm, ym, r, cy, markY: cy + r + 13 };
}

/** The narrowest and widest gaps on this screen, in centimetres. */
export function limits(k: Kit, r = lay(k).r) {
  const floor = Math.min(START, (2 * r) / k.perCm + 0.3), scene = (0.4 * W) / k.perCm;
  return {
    floor,
    cross: Math.max(floor, Math.min(CROSS_MOST, scene, (k.convMax * k.distCm) / 100)),
    relax: Math.max(floor, Math.min(RELAX_MOST, scene, (k.divMax * k.distCm) / 100)),
  };
}

/** Whether the dot in the middle ring floats nearer than the ring. See the header for how this is worked out. */
export const nearer = (mode: Mode, inward: boolean) => (mode === "relax") === inward;

/** How far each dot sits from its ring's centre, in scene units. */
const lean = (k: Kit, r: number) => clamp(k.arcsecUnits(700) / 2, 2, Math.max(2, r * 0.3));

export const stereogramPairs: GameDef<State> = {
  init: (k) => ({ mode: "cross", gap: { cross: START, relax: START }, shown: START, inward: k.rand() < 0.5, count: 0, born: k.t - SETTLE, done: null }),

  update(k, s) {
    const L = lay(k), lim = limits(k, L.r), goal = clamp(s.gap[s.mode], lim.floor, lim[s.mode]);
    const most = RATE * k.distCm * k.slow * k.dt;
    s.shown += clamp(goal - s.shown, -most, most);
    if (s.done) {
      if (k.t - s.done.at < MARK) return;
      s.gap[s.mode] = clamp(goal + (s.done.right ? STEP : -STEP), lim.floor, lim[s.mode]);
      s.born = k.t;
      if (++s.count >= RUN) {
        /* A new way of joining is a new start: the rings are placed, not slid, and the member gets a longer moment. */
        s.count = 0;
        s.mode = s.mode === "cross" ? "relax" : "cross";
        s.shown = clamp(s.gap[s.mode], lim.floor, lim[s.mode]);
        s.born = k.t + AFTER_TURN - SETTLE;
      }
      s.inward = k.rand() < 0.5;
      s.done = null;
      return;
    }
    /* No answer counts while the rings are still sliding, or in the first half second after they stop. */
    if (Math.abs(goal - s.shown) > 1e-6) { s.born = Math.max(s.born, k.t); return; }
    if (k.t - s.born < SETTLE) return;
    if (k.input.pressed.has("down") || onMid(k, L.yc, L.zc, t.near, t.far, t.none)) {
      k.miss();
      s.done = { at: k.t, right: null };
      return;
    }
    const said = sided(k);
    if (!said) return;
    const right = (said < 0) === nearer(s.mode, s.inward);
    if (right) {
      k.add();
      k.hit();
      k.peak(s.mode === "cross" ? "cross_cm" : "relax_cm", r1(goal));
    } else k.miss();
    s.done = { at: k.t, right };
  },

  draw(k, s) {
    const L = lay(k), half = (s.shown * k.perCm) / 2, a = lean(k, L.r) * (s.inward ? 1 : -1);
    k.frame();
    k.text(t[s.mode], W / 2, L.ym, "both", L.zm[s.mode], "center");
    for (const side of [-1, 1]) {
      const x = W / 2 + side * half;
      k.ring(x, L.cy, L.r, "both", Math.max(2, L.r * 0.09));
      /* The left picture's dot is moved right by `a`, the right picture's dot left by `a`. */
      k.disc(x - side * a, L.cy, Math.max(2.5, L.r * 0.2), "both");
    }
    if (s.done && s.done.right !== null) mark(k, W / 2, L.markY, 14, s.done.right);
    k.text(t.ask, W / 2, L.yq, "both", L.zq, "center");
    choices(k, L.yc, L.zc, t.near, t.far, t.none);
    const has = (key: string) => key in k.stats;
    if (!has("cross_cm") && !has("relax_cm")) { k.hud(`${t.rings} ${r1(s.shown)} ${t.apart}`); return; }
    const show = (key: string) => (has(key) ? `${k.stats[key]} ${t.cm}` : t.notYet);
    hud(k, `${t.crossed} ${show("cross_cm")} · ${t.relaxed} ${show("relax_cm")}`, `${t.crossShort} ${show("cross_cm")} · ${t.relaxShort} ${show("relax_cm")}`);
  },
};
