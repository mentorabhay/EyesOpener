/**
 * Keeper Graduation: the ceremony. A plain game-kit scene with nothing to score: it only draws.
 *
 * It needs no glasses, so everything that matters is in `both` ink: the frame, the path, the string, the lanterns'
 * rings, the hero and the words. The light inside a lantern that has been passed is in `weak` ink as a second
 * colour. Nothing is in `strong` ink, which is dimmed for some members.
 *
 * One lantern stands for each week of the course. They light one by one as the hero walks past, each once: nothing
 * flashes and nothing counts down. When the member asked for reduced motion there is no walk: the scene shows its
 * last picture at once. Before Play is pressed, and after the walk, it rests on that last picture.
 */
import { W, type GameDef } from "@/games/kit";
import { lanternsFor } from "@/lib/graduation";
import { centred } from "./depth-scene";

export interface CeremonyWords { kept: string; programme: string }

/** How long the walk takes, in seconds. */
export const WALK_SECONDS = 18;
const LEFT = 64, RIGHT = W - 64, GROUND = 312, STRING = 138;

export function ceremonyScene(weeks: number, words: CeremonyWords): GameDef<{ started: boolean }> {
  const n = lanternsFor(weeks);
  const at = (i: number) => {
    const u = n === 1 ? 0.5 : i / (n - 1);
    return { x: LEFT + u * (RIGHT - LEFT), y: STRING + 26 + Math.sin(u * Math.PI) * 16 };
  };
  return {
    init: () => ({ started: false }),
    update(_k, s) { s.started = true; },
    draw(k, s) {
      /* how far along the walk is, 0 to 1. Resting, or with reduced motion, it is over. */
      const p = !s.started || k.slow < 1 ? 1 : Math.min(1, k.t / WALK_SECONDS);
      const heroX = LEFT - 26 + p * (RIGHT - LEFT + 26);
      const size = Math.min(k.letter, 34);

      k.frame();
      k.line(14, GROUND, W - 14, GROUND, "both", 3);
      /* the string the lanterns hang from */
      const g = k.ctx("both");
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(LEFT - 30, STRING);
      g.quadraticCurveTo(W / 2, STRING + 34, RIGHT + 30, STRING);
      g.stroke();

      const r = Math.max(7, Math.min(13, (RIGHT - LEFT) / n / 2.6));
      for (let i = 0; i < n; i++) {
        const { x, y } = at(i), lit = heroX >= x - 2;
        k.line(x, y - r - 9, x, y - r, "both", 2);
        k.ring(x, y, r, "both", 2.5);
        if (lit) k.disc(x, y, r - 3.5, "weak");
      }

      k.hero(heroX, GROUND - 4, 92, "both");

      centred(k, words.programme, 24 + size * 0.8, size * 0.8);
      /* the last line comes once, when the walk is over, and then stays */
      if (p >= 1) centred(k, words.kept, 24 + size * 2.1, size);
    },
  };
}
