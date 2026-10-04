/**
 * Plays a game with no screen, for tests: scripted random taps and key presses, a drawing surface that
 * swallows every call. It finds crashes, runaway numbers and games that cannot be scored.
 */
import { H, W, makeKit, sizeKit, type GameDef, type GameProps, type Ink, type Stats } from "./kit";

/** A small repeatable random number generator, so a failing run can be played again. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blank = () => new Proxy({} as Record<string | symbol, unknown>, {
  get: (o, key) => (key in o ? o[key] : key === "measureText" ? () => ({ width: 40 }) : () => undefined),
  set: (o, key, v) => { o[key] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

export const SIM_PROPS: GameProps = { running: true, contrast: 0.15, gamma: 2.2, targetPx: 18, letterPx: 24, ppc: 40, distCm: 50, cyanEye: "L", onScore: () => {} };

export interface SimResult { frames: number; score: number; level: number; maxLevel: number; inks: Record<Ink, number>; stats: Stats }

/** Runs `seconds` of play at 60 frames a second. `skill` is the share of frames with an input (0 to 1). */
export function simulate<S>(def: GameDef<S>, { seconds = 60, seed = 1, skill = 0.2, props = {} as Partial<GameProps>, width = 640 } = {}): SimResult {
  const rand = seeded(seed), inks: Record<Ink, number> = { weak: 0, strong: 0, both: 0 }, surface = blank();
  let score = 0;
  const p = { ...SIM_PROPS, ...props, onScore: (n: number) => { score = n; } };
  const k = makeKit(p, (ink) => { inks[ink]++; return surface; }, 1, seeded(seed + 7));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const state = def.init(k);
  const frames = Math.round(seconds * 60), dirs = ["left", "right", "up", "down"] as const;
  let maxLevel = 1;
  for (let f = 0; f < frames; f++) {
    k.dt = 1 / 60;
    k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = false;
    i.taps.length = 0;
    i.pressed.clear();
    if (rand() < skill) {
      i.x = rand() * W; i.y = rand() * H;
      i.tapped = rand() < 0.5; i.action = rand() < 0.3; i.down = rand() < 0.5; i.held = rand() < 0.5;
      if (i.tapped) i.taps.push({ x: i.x, y: i.y });
      const d = dirs[Math.floor(rand() * 4)];
      if (rand() < 0.5) i.pressed.add(d);
      i.dx = Math.floor(rand() * 3) - 1; i.dy = Math.floor(rand() * 3) - 1;
    }
    def.update(k, state);
    def.draw(k, state);
    maxLevel = Math.max(maxLevel, k.level);
  }
  return { frames, score, level: k.level, maxLevel, inks, stats: { ...k.stats } };
}
