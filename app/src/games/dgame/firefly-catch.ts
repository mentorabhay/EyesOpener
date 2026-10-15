/**
 * Firefly Catch. The reference game: copy its shape for a new one.
 *
 * Cyan fireflies reach only the weaker eye and are the targets. Red moths reach only the stronger eye, at
 * that eye's contrast, and are the distraction. The white frame, the score and the aiming ring reach both
 * eyes and hold them together. To score, the weaker eye has to do the finding while the stronger eye stays open.
 */
import { games as t } from "@/copy/games-dgame";
import { H, W, type GameDef, type Kit } from "../kit";

interface Mover { x: number; y: number; a: number; s: number; p: number }
interface State { flies: Mover[]; moths: Mover[]; ring: { x: number; y: number } | null; missT: number }

const edge = (k: Kit) => Math.min(H / 2 - 1, 14 + 16 * k.k);
/** Creatures stay under the score line. */
const top = (k: Kit) => Math.min(H / 2, edge(k) + k.letter + 14);
const mover = (k: Kit): Mover => ({
  x: edge(k) + k.rand() * (W - 2 * edge(k)), y: top(k) + k.rand() * (H - edge(k) - top(k)),
  a: k.rand() * 6.28, s: 30 + k.rand() * 40, p: k.rand() * 6.28,
});

export const fireflyCatch: GameDef<State> = {
  target: 20,
  init: (k) => ({ flies: Array.from({ length: 6 }, () => mover(k)), moths: Array.from({ length: 6 }, () => mover(k)), ring: null, missT: 0 }),

  update(k, s) {
    const e = edge(k), speed = (0.8 + k.level * 0.12) * k.slow;
    for (const o of [...s.flies, ...s.moths]) {
      o.a += (k.rand() - 0.5) * 15 * k.dt;
      o.x += Math.cos(o.a) * o.s * speed * k.dt;
      o.y += Math.sin(o.a) * o.s * speed * k.dt;
      o.p += 1.8 * k.dt;
      if (o.x < e || o.x > W - e) o.a = Math.PI - o.a;
      if (o.y < top(k) || o.y > H - e) o.a = -o.a;
      o.x = Math.max(e, Math.min(W - e, o.x));
      o.y = Math.max(top(k), Math.min(H - e, o.y));
    }
    /* Keys and a TV remote move an aiming ring; Space or OK catches what is inside it. */
    const i = k.input;
    if (i.dx || i.dy || i.action) s.ring ??= { x: W / 2, y: H / 2 };
    if (s.ring) {
      s.ring.x = Math.max(e, Math.min(W - e, s.ring.x + i.dx * 220 * k.dt));
      s.ring.y = Math.max(e, Math.min(H - e, s.ring.y + i.dy * 220 * k.dt));
    }
    const at = i.tapped ? i : i.action && s.ring ? s.ring : null;
    if (!at) return;
    const reach = 26 * k.k, n = s.flies.findIndex((o) => Math.hypot(o.x - at.x, o.y - at.y) < reach);
    if (n >= 0) {
      s.flies[n] = mover(k);
      k.add();
      k.hit();
    } else if (s.moths.some((o) => Math.hypot(o.x - at.x, o.y - at.y) < reach)) k.miss();
  },

  draw(k, s) {
    k.frame();
    for (const o of s.moths) k.poly([[o.x - 16 * k.k, o.y], [o.x, o.y - 9 * k.k], [o.x + 16 * k.k, o.y], [o.x, o.y + 9 * k.k]], "strong");
    for (const o of s.flies) k.disc(o.x, o.y, (10 + Math.sin(o.p) * 1.5) * k.k, "weak");
    if (s.ring) k.ring(s.ring.x, s.ring.y, 26 * k.k, "both");
    k.hud(`${t.fireflyCatch.caught} ${k.score}`);
  },
};
