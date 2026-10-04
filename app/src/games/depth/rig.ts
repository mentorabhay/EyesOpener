/**
 * A test bench for the games in this package: plays a game with no screen, counts what each ink drew in the
 * last frame, and notes every depth step asked for and every word written. Used by the tests only.
 */
import { makeKit, sizeKit, type GameDef, type GameProps, type Ink, type Kit } from "../kit";
import { SIM_PROPS, seeded } from "../sim";

/** Three screens a member may play on: name, width in CSS pixels, device pixels per CSS pixel, and what the server knows. */
export const SCREENS: [string, number, number, Partial<GameProps>][] = [
  ["tablet", 990, 1, { ppc: 37.8, distCm: 50, targetPx: 28, letterPx: 26 }],
  ["tv", 1600, 1, { ppc: 14, distCm: 250, targetPx: 30, letterPx: 40 }],
  ["phone", 368, 2, { ppc: 60, distCm: 35, targetPx: 40, letterPx: 24 }],
];

export interface Rig {
  k: Kit;
  /** The game's own state. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s: any;
  /** Plays one frame. `input` sets what the member did in it. */
  step: (input?: (k: Kit) => void) => void;
  /** Plays this many seconds. `input` is given to the first frame only. */
  run: (seconds: number, input?: (k: Kit) => void) => void;
  inks: Record<Ink, number>;
  /** Every depth step asked for in the last frame, with the sideways shift each eye got. */
  depths: [number, number][];
  /** Every piece of writing in the last frame: where it starts and ends, its baseline and its letter size. */
  texts: { s: string; x0: number; x1: number; y: number; size: number }[];
}

/** Verdana bold is a wide face: the rig takes 0.7 of the letter size for each character, a little more than the real average. */
const CHAR = 0.7;

export function rig<S>(def: GameDef<S>, screen = 0, seed = 3): Rig {
  const [, width, dpr, props] = SCREENS[screen], p = { ...SIM_PROPS, ...props };
  const inks: Record<Ink, number> = { weak: 0, strong: 0, both: 0 }, depths: [number, number][] = [];
  const texts: Rig["texts"] = [], pen: Record<string | symbol, unknown> = { font: "700 20px Verdana", textAlign: "left" };
  const size = () => parseFloat(String(pen.font).split(" ")[1]);
  pen.measureText = (q: string) => ({ width: q.length * size() * CHAR });
  pen.fillText = (q: string, x: number, y: number) => {
    const w = q.length * size() * CHAR, x0 = pen.textAlign === "center" ? x - w / 2 : pen.textAlign === "right" ? x - w : x;
    texts.push({ s: q, x0, x1: x0 + w, y, size: size() });
  };
  const surface = new Proxy(pen, { get: (o, key) => (key in o ? o[key] : () => undefined), set: (o, key, v) => { o[key] = v; return true; } }) as unknown as CanvasRenderingContext2D;
  const k = makeKit(p, (ink) => { inks[ink]++; return surface; }, 1, seeded(seed));
  sizeKit(k, p, def.target ?? 20, width, dpr);
  const depth = k.depth;
  k.depth = (arcsec, draw) => depth(arcsec, (ink, shift) => { depths.push([arcsec, shift]); draw(ink, shift); });
  const s = def.init(k);
  const step = (input?: (k: Kit) => void) => {
    k.dt = 1 / 60; k.t += k.dt;
    const i = k.input; i.tapped = i.action = false; i.pressed.clear();
    input?.(k);
    def.update(k, s);
    inks.weak = inks.strong = inks.both = 0; depths.length = texts.length = 0;
    def.draw(k, s);
  };
  return { k, s, step, inks, depths, texts, run: (seconds, input) => { for (let f = 0; f < seconds * 60; f++) step(f === 0 ? input : undefined); } };
}

/** A press of Space, Enter or OK in this frame. */
export const ok = (k: Kit) => { k.input.action = true; };
