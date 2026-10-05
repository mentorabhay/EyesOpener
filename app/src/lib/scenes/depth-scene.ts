/**
 * First Depth Day: the scene. A plain game-kit scene with nothing to score: it only draws.
 *
 * Ink carries the depth. Everything that sits at a depth is drawn once for each eye through `k.depth`, in that
 * eye's ink, so the kit owns the contrast and which lens gets which picture:
 *  - the hero floats in front of the screen (crossed: the left eye's copy sits to the right);
 *  - the lanterns float half as far out, when that is still a step the member's check-up found;
 *  - the stars sit behind the screen.
 * The frame, the ground and the words are in `both` ink, on the screen itself: they hold the two eyes together
 * and give the depth something to be measured against.
 *
 * The depths come from `sceneDepths`: no gap between two layers is finer than the step the member's own check-up
 * found, and none is finer than one pixel of this screen (`k.pxArcsec`). The scene never asks for more than the
 * check-up showed. Nothing flashes: the lanterns drift and the hero sways, slowly, and both slow further when the
 * member asked for reduced motion.
 */
import { H, W, type GameDef, type Ink, type Kit } from "@/games/kit";
import { sceneDepths } from "@/lib/depth-day";

export interface DepthSceneWords { title: string; date: string }

/** Where the stars are: fixed, so the scene is the same every time. [x, y, radius] */
const STARS: readonly [number, number, number][] = [
  [48, 52, 3], [96, 118, 2.5], [150, 40, 3.5], [204, 96, 2.5], [262, 58, 3], [318, 128, 2.5], [372, 46, 3], [432, 102, 3.5],
  [486, 60, 2.5], [540, 124, 3], [588, 48, 3.5], [70, 190, 2.5], [574, 196, 3], [236, 168, 2.5], [410, 176, 2.5],
];
/** Lanterns: [x, where it starts on its way up, how fast it drifts]. */
const LANTERNS: readonly [number, number, number][] = [[112, 0, 9], [206, 90, 7], [436, 40, 8], [530, 130, 10]];
const GROUND = 304, RISE = 180;

/** Writes one line in the middle, shrunk to fit the scene when it is too long for it. */
export function centred(k: Kit, s: string, y: number, size: number, ink: Ink = "both") {
  const g = k.ctx(ink);
  g.font = `700 ${size}px Verdana, sans-serif`;
  const wide = g.measureText(s)?.width ?? 0, room = W - 60;
  k.text(s, W / 2, y, ink, wide > room ? (size * room) / wide : size, "center");
}

export function depthScene(found: number, words: DepthSceneWords): GameDef<{ t: number }> {
  return {
    init: () => ({ t: 0 }),
    update(k, s) { s.t += k.dt * k.slow; },
    draw(k, s) {
      const d = sceneDepths(found, k.pxArcsec);
      const size = Math.min(k.letter, 34);

      /* behind the screen: the stars */
      for (const [x, y, r] of STARS) k.depth(d.stars, (ink, shift) => k.disc(x + shift, y, r, ink));

      /* on the screen: the frame, the ground, two low hills and the words */
      k.frame();
      k.line(14, GROUND, W - 14, GROUND, "both", 3);
      const hills = k.ctx("both");
      hills.lineWidth = 2.5;
      hills.beginPath();
      hills.moveTo(14, GROUND);
      hills.quadraticCurveTo(120, GROUND - 46, 230, GROUND);
      hills.moveTo(400, GROUND);
      hills.quadraticCurveTo(520, GROUND - 58, W - 14, GROUND);
      hills.stroke();
      centred(k, words.title, 22 + size, size);
      if (words.date) centred(k, words.date, 22 + size * 2.15, size * 0.8);

      /* in between: the lanterns, drifting up */
      for (const [x, from, speed] of LANTERNS) {
        const y = GROUND - 34 - ((from + s.t * speed) % RISE);
        k.depth(d.lantern, (ink, shift) => {
          k.ring(x + shift, y, 13, ink, 3);
          k.box(x + shift - 5, y + 13, 10, 6, ink);
        });
      }

      /* in front of the screen: the hero */
      const sway = Math.sin(s.t * 0.8) * 4;
      k.depth(d.hero, (ink, shift) => { k.hero(W / 2 + shift, GROUND - 6 + sway, Math.min(150, H * 0.42), ink); });
    },
  };
}
