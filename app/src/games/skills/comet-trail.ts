// Eyes Opener: Comet Trail. Trains smooth tracking: keeping the eyes on something that moves steadily, without jumping ahead.
/**
 * Comet Trail. Trains smooth tracking: keeping the eyes on something that moves steadily, without jumping ahead
 * of it or falling behind.
 *
 * Ink: no glasses are worn. The comet, its tail, the stars and the score are both-eyes ink. The member's ring
 * is weaker-eye ink, used only as a second colour so the ring and the comet are easy to tell apart. Stronger-eye
 * ink is never used: it is dimmed for some members.
 *
 * Difficulty: the comet's speed follows k.level, from a slow drift at level 1 to a brisk glide at level 10. Its
 * path is a smooth wander with no sudden turns, and its speed along the path is held steady. Every two whole
 * seconds with the ring on the comet count as a hit; a second and a half off it counts as a miss, so the comet
 * slows down for a member who keeps losing it. The score is whole seconds on target.
 */
import { games as copy } from "@/copy/games-skills";
import { H, W, type GameDef, type Kit } from "../kit";
import { clamp, top } from "./common";

const t = copy.cometTrail;
const TAIL = 9;

interface State {
  /** Where the comet is along its path, and the four phases that make this session's path its own. */
  p: number; ph: number[];
  ring: { x: number; y: number };
  /** Seconds on the comet not yet counted, seconds off it, whole seconds since the last hit, and whether it is on now. */
  on: number; off: number; run: number; held: boolean;
  stars: { x: number; y: number; r: number }[];
}

const reach = (k: Kit) => Math.min(26 * k.k, 90);
const speed = (k: Kit) => (40 + 16 * k.level) * k.slow;

/** Scene units the comet travels for one unit of path position, never taken as less than 60 so it cannot dart. */
function stride(k: Kit, s: State) {
  const [x0, y0] = place(k, s, s.p), [x1, y1] = place(k, s, s.p + 0.01);
  return Math.max(60, Math.hypot(x1 - x0, y1 - y0) / 0.01);
}

/** The comet's place at path position p: two slow waves across and two up and down, always inside the play area. */
export function place(k: Kit, s: Pick<State, "ph">, p: number): [number, number] {
  const pad = Math.min(reach(k), 40), yTop = top(k) + pad, yBot = H - 14 - pad;
  const ax = Math.max(40, W / 2 - 14 - pad), ay = Math.max(20, (yBot - yTop) / 2), cy = Math.min(H - 34 - ay, (yTop + yBot) / 2);
  return [
    W / 2 + ax * (0.62 * Math.sin(p + s.ph[0]) + 0.38 * Math.sin(2.3 * p + s.ph[1])),
    cy + ay * (0.62 * Math.sin(1.4 * p + s.ph[2]) + 0.38 * Math.sin(0.6 * p + s.ph[3])),
  ];
}

export const cometTrail: GameDef<State> = {
  target: 20,
  init: (k) => ({
    p: 0, ph: Array.from({ length: 4 }, () => k.rand() * 6.28),
    ring: { x: W / 2, y: (top(k) + H) / 2 },
    on: 0, off: 0, run: 0, held: false,
    stars: Array.from({ length: 14 }, () => ({ x: 20 + k.rand() * (W - 40), y: Math.min(H - 20, top(k) + k.rand() * (H - 20 - top(k))), r: 1 + k.rand() * 1.2 })),
  }),

  update(k, s) {
    /* Move along the path by distance, not by angle, so the comet never darts through a tight bend. */
    s.p += (speed(k) * k.dt) / stride(k, s);
    /* A finger carries the ring. Keys or a remote steer it at a steady pace, a little faster than the comet. */
    const i = k.input, r = reach(k), pace = (speed(k) * 1.5 + 50 * k.slow) * k.dt;
    if (i.down) { s.ring.x = i.x; s.ring.y = i.y; } else { s.ring.x += i.dx * pace; s.ring.y += i.dy * pace; }
    s.ring.x = clamp(s.ring.x, 14, W - 14);
    s.ring.y = clamp(s.ring.y, 14, H - 14);
    const [cx, cy] = place(k, s, s.p);
    s.held = Math.hypot(cx - s.ring.x, cy - s.ring.y) < r;
    if (s.held) {
      s.off = 0;
      s.on += k.dt;
      if (s.on >= 1) { s.on -= 1; k.add(); if (++s.run >= 2) { s.run = 0; k.hit(); } }
    } else {
      s.off += k.dt;
      if (s.off >= 1.5) { s.off = 0; s.run = 0; k.miss(); }
    }
  },

  draw(k, s) {
    const [cx, cy] = place(k, s, s.p), head = Math.min(9 * k.k, 30), gap = (0.62 * head) / stride(k, s), g = k.ctx("both");
    k.frame();
    g.globalAlpha = 0.45;
    for (const o of s.stars) k.disc(o.x, o.y, o.r, "both");
    /* The tail: discs set back along the path, each smaller and fainter. They slide with the comet; nothing blinks. */
    for (let n = TAIL; n >= 1; n--) {
      const [x, y] = place(k, s, s.p - n * gap);
      g.globalAlpha = 0.5 * (1 - n / (TAIL + 1));
      k.disc(x, y, head * (1 - n / (TAIL + 2)), "both");
    }
    g.globalAlpha = 1;
    k.disc(cx, cy, head, "both");
    k.ring(s.ring.x, s.ring.y, reach(k), "weak", s.held ? 6 : 3);
    k.hud(`${t.on} ${k.score} ${t.seconds}`);
  },
};
