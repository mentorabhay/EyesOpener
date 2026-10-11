// Eyes Opener: A test helper: plays one vergence game with no screen and watches its demand on every frame.
/**
 * A test helper: plays one vergence game with no screen and watches its demand on every frame.
 * The demand is the treatment and the safety, so the rules are checked frame by frame: it starts at rest, stays
 * inside what the screen allows, never moves faster than 2 a second in a smooth game, never jumps further than the
 * level allows in a jump game, always eases when the member says the picture split, and a split never scores.
 */
import { H, W, makeKit, sizeKit, type GameProps, type Kit } from "../kit";
import { SIM_PROPS, seeded } from "../sim";
import { maxJump, splitPressed, type Demand } from "../vergence";
import { games } from ".";

const surface = new Proxy({} as Record<string | symbol, unknown>, {
  get: (o, key) => (key in o ? o[key] : () => undefined),
  set: (o, key, v) => { o[key] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

export const SCREENS: [string, number, Partial<GameProps>][] = [
  ["a tablet", 640, {}],
  ["a phone", 340, { ppc: 60, distCm: 35, targetPx: 60, letterPx: 70 }],
  ["a TV", 1600, { ppc: 14, distCm: 250, targetPx: 30, letterPx: 40 }],
];

/** Sets the input for one frame. */
export type Player = (k: Kit, rand: () => number, frame: number) => void;

export interface Rules {
  /** 0.35 for a member who asked for reduced motion. */
  slow?: number;
  /** True for a game that moves its demand with `jumpTo`: a frame may then move it by up to `maxJump`. */
  jumps?: boolean;
  /** True for a game that says it turns the eyes out. Every other game must keep its demand at 0 or above. */
  turnsOut?: boolean;
  /** Called after every frame with the drawn demand, for a test that needs its course over time. */
  watch?: (now: number, frame: number) => void;
}

/** Plays `seconds` of a game at 60 frames a second. `wrong` lists the first few broken rules: a test expects it to be empty. */
export function play(slug: string, width: number, props: Partial<GameProps>, seconds: number, player: Player, { slow = 1, jumps = false, turnsOut = false, watch }: Rules = {}) {
  const p = { ...SIM_PROPS, ...props }, def = games[slug], rand = seeded(11);
  const k = makeKit(p, () => surface, slow, seeded(5));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const s = def.init(k) as { d: Demand };
  /* Broken rules are collected, not asserted one by one: this loop runs for thousands of frames. */
  const wrong: string[] = [], check = (ok: boolean, what: string, f: number) => { if (!ok && wrong.length < 5) wrong.push(`${slug} at frame ${f}: ${what}`); };
  check(s.d.now === 0, "does not start at rest", 0);
  let low = 0, high = 0;
  for (let f = 0; f < seconds * 60; f++) {
    k.dt = 1 / 60;
    k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = false;
    i.pressed.clear();
    i.taps.length = 0;
    player(k, rand, f);
    const split = splitPressed(k), before = s.d.now, scoreBefore = k.score;
    def.update(k, s);
    if (f % 7 === 0) def.draw(k, s);
    const now = s.d.now, moved = Math.abs(now - before);
    check(Number.isFinite(now) && Number.isFinite(s.d.goal), "the demand is not a number", f);
    for (const v of [now, s.d.goal]) check(v <= k.convMax + 1e-9 && v >= -k.divMax - 1e-9, `demand ${v} is outside the screen's limits`, f);
    if (!turnsOut) check(now >= 0, `demand ${now}: this game must never turn the eyes out`, f);
    if (split) {
      check(Math.abs(Math.abs(now) - Math.max(0, Math.abs(before) - 2)) < 1e-6, `a split did not ease by 2 (${before} to ${now})`, f);
      check(k.score === scoreBefore, "a split scored", f);
    } else if (jumps) check(moved <= maxJump(k) + 1e-9, `jumped ${moved}, more than the level allows`, f);
    else check(moved <= 2 * slow * k.dt + 1e-9, `a smooth game moved ${moved} in one frame`, f);
    watch?.(now, f);
    low = Math.min(low, now);
    high = Math.max(high, now);
  }
  return { k, low, high, wrong };
}

/** A member who presses anything at any time, the split control included. */
export const random: Player = (k, rand) => {
  const i = k.input;
  if (rand() >= 0.5) return;
  i.x = rand() * W; i.y = rand() * H;
  i.tapped = rand() < 0.4; i.action = rand() < 0.4; i.down = rand() < 0.7; i.held = rand() < 0.5;
  if (i.tapped) i.taps.push({ x: i.x, y: i.y });
  if (rand() < 0.05) i.pressed.add("down");
  i.dy = rand() < 0.6 ? -1 : 0;
};

/** A member who always says "it is one" and never says it split: the demand must still stay inside the limits. */
export const eager: Player = (k, _, f) => {
  const i = k.input;
  i.x = W / 2; i.y = 100;
  i.down = true; i.dy = -1;
  i.action = f % 31 === 0; i.tapped = f % 47 === 0;
};

/** A member who does nothing but say the picture split. */
export const splitter: Player = (k, _, f) => { if (f % 40 === 0) k.input.pressed.add("down"); };
