/**
 * Test helpers for the two-eye games: plays a game the way a member would, with a bot that is told what
 * it can see, and measures how far each ink reached. Not part of the app: only the test files import it.
 */
import { H, W, makeKit, sizeKit, type GameDef, type GameProps, type Ink, type Kit } from "../kit";
import { SIM_PROPS, seeded } from "../sim";

export interface Box { x0: number; y0: number; x1: number; y1: number }
export type Seen = Record<Ink, Box>;
const empty = (): Box => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });

/** A drawing surface that remembers how far each ink reached. Words are left out: the kit places the score. */
function recorder(box: Box) {
  const grow = (x: number, y: number) => { box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x); box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y); };
  const calls: Record<string, (...a: number[]) => void> = {
    arc: (x, y, r) => { grow(x - r, y - r); grow(x + r, y + r); },
    ellipse: (x, y, rx, ry) => { grow(x - rx, y - ry); grow(x + rx, y + ry); },
    fillRect: (x, y, w, h) => { grow(x, y); grow(x + w, y + h); },
    strokeRect: (x, y, w, h) => { grow(x, y); grow(x + w, y + h); },
    moveTo: grow, lineTo: grow,
    quadraticCurveTo: (_cx, _cy, x, y) => grow(x, y),
  };
  return new Proxy({} as Record<string | symbol, unknown>, {
    get: (o, key) => (key in o ? o[key] : calls[key as string] ?? (() => undefined)),
    set: (o, key, v) => { o[key] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

export type Bot<S> = (k: Kit, s: S, frame: number) => void;
/** `look` draws every frame and measures it; without it only the rules are played, which is much quicker. */
export interface Run { seconds?: number; width?: number; seed?: number; props?: Partial<GameProps>; look?: boolean }

export function play<S>(def: GameDef<S>, bot: Bot<S>, { seconds = 90, width = 640, seed = 1, props = {}, look = false }: Run = {}) {
  const seen: Seen = { weak: empty(), strong: empty(), both: empty() };
  const surfaces = { weak: recorder(seen.weak), strong: recorder(seen.strong), both: recorder(seen.both) };
  const p = { ...SIM_PROPS, ...props };
  const k = makeKit(p, (ink) => surfaces[ink], 1, seeded(seed));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const s = def.init(k);
  def.draw(k, s);
  let top = 1;
  for (let f = 0; f < seconds * 60; f++) {
    k.dt = 1 / 60;
    k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = i.down = false;
    i.dx = i.dy = 0;
    i.pressed.clear();
    bot(k, s, f);
    def.update(k, s);
    if (look) def.draw(k, s);
    top = Math.max(top, k.level);
  }
  return { score: k.score, level: k.level, top, seen, k, s };
}

/** A phone held by a member who needs targets three times the sketch size. */
export const BIG: Run = { width: 380, props: { targetPx: 36, letterPx: 26 }, look: true };
export const LOOK: Run = { look: true };
export const idle = () => undefined;

/** What a game drew in an eye's ink above the score line or too near an edge. An empty list means it all fits. */
export function outside(r: { seen: Seen; k: Kit }, inks: Ink[] = ["weak", "strong"]) {
  const top = Math.min(H * 0.4, 30 + r.k.letter) - 1, found: string[] = [];
  for (const ink of inks) {
    const b = r.seen[ink];
    if (b.y0 < top) found.push(`${ink} top ${b.y0.toFixed(1)}`);
    if (b.y1 > H - 14) found.push(`${ink} bottom ${b.y1.toFixed(1)}`);
    if (b.x0 < 14) found.push(`${ink} left ${b.x0.toFixed(1)}`);
    if (b.x1 > W - 14) found.push(`${ink} right ${b.x1.toFixed(1)}`);
  }
  return found;
}
