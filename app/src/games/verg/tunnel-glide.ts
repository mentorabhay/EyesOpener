// Eyes Opener: Tunnel Glide. Smooth turning-in, one small step at a time.
/**
 * Tunnel Glide. Smooth turning-in, one small step at a time.
 *
 * The ring is the fusion target: one ring for each eye, in that eye's ink, pulled apart sideways by the demand.
 * The left eye's ring has a dot at the top, the right eye's a dot at the bottom, so "one ring with both dots"
 * can only be seen with both eyes on and joined. The tunnel, the frame, the score and the split spot are in
 * both ink: they are the same for the two eyes and hold them together. The tunnel bends slowly, so the ring
 * drifts a little on its way to the mouth; the bend moves both eyes' pictures together and is no part of the demand.
 *
 * What the demand does: it starts at 0. Each ring passed raises the goal by a little under 1 to a little under 2
 * (by level), and the drawn demand creeps up to it while the ring comes closer, never faster than about 1 a second,
 * so the eyes are led in smoothly and never jerked. At the edge of what this screen can show the tunnel opens
 * out: the demand glides back to under half and the climb starts again, which gives the eyes a rest and makes
 * the game work on a small phone too. "It split" eases the demand at once and pushes the ring back.
 */
import { games as t } from "@/copy/games-verg";
import { W, type GameDef, type Kit } from "../kit";
import { aim, drawSplit, ease, newDemand, ramp, splitPressed, target, type Demand } from "../vergence";
import { band, faint, settled, single, size } from "./parts";

interface State {
  d: Demand;
  /** How far the ring has come: 0 at the far end, 1 at the tunnel mouth. */
  z: number;
  /** The highest demand at which a ring was passed as single. */
  best: number;
  /** Tunnel ribs flowing past, and the short rush after a ring is passed. */
  flow: number; rush: number;
  /** The ring just passed, opening out: 0 to 1. */
  past: number;
  /** The slow bend of the tunnel: the far end sways, so the glide curves. */
  turn: number;
}

/** Tunnel ribs on screen, and the size of the far end: the middle is left dark so nothing for both eyes sits inside a far ring. */
const RIBS = 4, FAR = 0.2;
/** Prism dioptres a second: 0.55 at level 1, 1 at level 10. */
const rate = (k: Kit) => 0.5 + 0.05 * k.level;
/** How much more the next ring asks. */
const step = (k: Kit) => 0.7 + 0.1 * k.level;
const atMouth = (s: State) => s.z >= 1 && settled(s.d);

export const tunnelGlide: GameDef<State> = {
  init(k) {
    const d = newDemand();
    aim(k, d, step(k));
    return { d, z: 0.45, best: 0, flow: 0, rush: 0, past: 1, turn: 0 };
  },

  update(k, s) {
    const d = s.d;
    s.rush = Math.max(0, s.rush - k.dt * 1.2);
    s.flow = (s.flow + (0.2 + s.rush) * k.slow * k.dt) % 1;
    s.past = Math.min(1, s.past + k.dt * k.slow * 2.2);
    s.turn += 0.25 * k.slow * k.dt;
    if (splitPressed(k)) {
      ease(k, d);
      s.z = Math.max(0, s.z - 0.4);
      return;
    }
    ramp(k, d, rate(k));
    /* The ring comes no faster than the demand: it reaches the mouth when the demand reaches its goal. */
    const speed = (0.2 + 0.02 * k.level) * k.slow, left = Math.abs(d.goal - d.now) / (rate(k) * k.slow);
    s.z = Math.min(1, s.z + (k.dt * (1 - s.z)) / Math.max((1 - s.z) / speed, left, k.dt));
    if (!atMouth(s) || !single(k)) return;
    k.add();
    k.hit();
    s.best = Math.max(s.best, d.now);
    s.rush = 0.7;
    s.past = 0;
    /* At the edge of the screen's range the next ring is a rest: back to under half, then up again. */
    aim(k, d, d.goal >= k.convMax - 0.01 ? k.convMax * 0.4 : d.goal + step(k));
    s.z = 0;
  },

  draw(k, s) {
    k.frame();
    const b = band(k), cx = W / 2, cy = b.mid, hw = W / 2 - 24, hh = b.tall / 2, R = size(k, 54, hh - 6);
    /* The far end sways inside the room a far ring needs, so both of its pictures always stay in the tunnel. */
    const fx = Math.sin(s.turn) * Math.max(0, Math.min(60, hw - k.prismUnits(k.convMax) / 2 - R * 0.3));
    const fy = Math.sin(s.turn * 0.7 + 1) * Math.max(0, hh - R * 0.3 - 4) * 0.5;
    /* Everything in the tunnel sits on the line from the far end (0) to the mouth (1). */
    const along = (u: number): [number, number] => [cx + fx * (1 - u), cy + fy * (1 - u)];
    const rib = (u: number, width: number) => {
      const c = FAR + (1 - FAR) * u * u, [x, y] = along(u * u);
      k.box(x - hw * c, y - hh * c, 2 * hw * c, 2 * hh * c, "both", false, width);
    };
    faint(k, 0.35, () => {
      for (let n = 0; n < RIBS; n++) rib((n + s.flow) / RIBS, 2);
      const [x, y] = along(0);
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.line(x + sx * hw * FAR, y + sy * hh * FAR, cx + sx * hw, cy + sy * hh, "both", 2);
      if (!atMouth(s)) rib(1, 2);
    });
    /* The tunnel mouth is drawn strongly once the ring has arrived: that is the moment to answer. */
    if (atMouth(s)) rib(1, 4);
    if (s.past < 1) k.fuse(s.d.now, (ink, shift) => {
      const g = k.ctx(ink);
      g.globalAlpha = 1 - s.past;
      k.ring(cx + shift, cy, R * (1 + 0.6 * s.past), ink, 3);
      g.globalAlpha = 1;
    });
    const [x, y] = along(s.z);
    target(k, x, y, R * (0.3 + 0.7 * s.z), s.d.now);
    k.hud(`${t.tunnelGlide.rings} ${k.score} · ${t.tunnelGlide.reach} ${Math.round(s.best)}`);
    drawSplit(k, t.split);
  },
};
