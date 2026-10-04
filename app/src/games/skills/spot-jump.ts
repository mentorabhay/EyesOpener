/**
 * Spot Jump. Trains quick, accurate eye jumps: the eyes leap from one spot to the next and land on it, the
 * way they must when reading moves from the end of one line to the start of the next.
 *
 * Ink: no glasses are worn. The spot, the mark where it was hit and the score are both-eyes ink. Weaker-eye ink
 * is only a second colour for the quiet centre line that shows which side is which. Stronger-eye ink is never
 * used: it is dimmed for some members.
 *
 * Difficulty: k.level sets how far the eyes must jump. The spot sits close to the centre at level 1 and near
 * the edge at level 10, and its height varies more as the level rises. The spot is always the member's own
 * target size and never gets smaller. A hit is a hit; a tap that lands elsewhere or the wrong side key is a
 * miss. The spot stays until it is hit, and the next one waits at least half a second, with a wait that varies
 * so it cannot be guessed by rhythm.
 */
import { games as copy } from "@/copy/games-skills";
import { H, W, type GameDef, type Kit } from "../kit";
import { clamp, ease, hud, top } from "./common";

const t = copy.spotJump;
const GROW = 0.15, GAP = 0.5, POP = 0.45, WINDOW = 30;

interface State {
  /** -1 left, 1 right; `rise` is -1 (top of the range) to 1 (bottom). */
  side: number; rise: number;
  /** A spot is on screen; when it appeared; when the next one may appear. */
  live: boolean; born: number; nextAt: number;
  /** Times of the hits in the last 30 seconds, and where the last one landed. */
  hits: number[];
  pop: { x: number; y: number; at: number } | null;
}

const radius = (k: Kit) => Math.min(10 * k.k, 60);

/** Where the spot is: further from the centre, and more varied in height, as the level rises. */
export function where(k: Kit, s: Pick<State, "side" | "rise">): [number, number] {
  const r = radius(k), far = Math.max(r + 24, Math.min(W / 2 - 16 - r, 70 + 23 * k.level));
  const mid = (top(k) + H - 14) / 2, range = clamp(26 + 12 * k.level, 0, Math.max(0, (H - 14 - top(k)) / 2 - r - 4));
  return [W / 2 + s.side * far, mid + s.rise * range];
}

export const spotJump: GameDef<State> = {
  target: 20,
  /* The first spot is already there, so the still picture before Start shows the game. */
  init: (k) => ({ side: k.rand() < 0.5 ? -1 : 1, rise: k.rand() * 2 - 1, live: true, born: k.t - GROW, nextAt: 0, hits: [], pop: null }),

  update(k, s) {
    const i = k.input;
    if (!s.live) {
      if (k.t < s.nextAt) return;
      /* The other side two times in three; on the same side the height changes clearly. */
      if (k.rand() < 0.66) { s.side = -s.side; s.rise = k.rand() * 2 - 1; } else s.rise = (s.rise > 0 ? -1 : 1) * (0.5 + 0.5 * k.rand());
      s.live = true;
      s.born = k.t;
      return;
    }
    if (k.t - s.born < GROW) return;
    const [x, y] = where(k, s), left = i.pressed.has("left"), right = i.pressed.has("right");
    let hit: boolean;
    if (i.tapped) hit = Math.hypot(i.x - x, i.y - y) < Math.max(26 * k.k, radius(k));
    else if (left !== right) hit = (s.side < 0) === left;
    else return;
    if (!hit) { k.miss(); return; }
    k.add();
    k.hit();
    s.hits = [...s.hits.filter((at) => at > k.t - WINDOW), k.t];
    s.pop = { x, y, at: k.t };
    s.live = false;
    s.nextAt = k.t + GAP + 0.1 + k.rand() * 0.6;
  },

  draw(k, s) {
    const r = radius(k), g = k.ctx("weak");
    k.frame();
    /* A quiet dashed line down the middle: left of it is Left, right of it is Right. */
    g.globalAlpha = 0.5;
    for (let y = top(k) + 6; y < H - 26; y += 24) k.line(W / 2, y, W / 2, y + 10, "weak", 2);
    g.globalAlpha = 1;
    if (s.live) { const [x, y] = where(k, s); k.disc(x, y, r * (0.5 + 0.5 * ease((k.t - s.born) / GROW)), "both"); }
    /* Where the last spot was hit, a ring opens and fades once. */
    if (s.pop && k.t - s.pop.at < POP) {
      const age = (k.t - s.pop.at) / POP, b = k.ctx("both");
      b.globalAlpha = 1 - age;
      k.ring(s.pop.x, s.pop.y, r * (1 + 0.8 * ease(age)), "both", 3);
      b.globalAlpha = 1;
    }
    /* Hits in the last 30 seconds, said as hits a minute. Early on, the time played so far is used (at least 10 seconds). */
    const recent = s.hits.filter((at) => at > k.t - WINDOW).length, rate = Math.round((recent * 60) / clamp(k.t, 10, WINDOW));
    hud(k, `${t.hits} ${k.score} · ${rate} ${t.aMinute}`, `${t.hits} ${k.score}`);
  },
};
