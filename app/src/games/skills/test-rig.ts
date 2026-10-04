/**
 * A test rig for the games of this family: one game on a silent drawing surface, stepped a frame at a time
 * with the input a test chooses. Used by the test files only; the app never imports it.
 */
import { makeKit, sizeKit, type GameDef, type GameProps, type Ink } from "../kit";
import { SIM_PROPS, seeded } from "../sim";
import type { Way } from "./common";

export interface Act { tap?: [number, number]; press?: Way; action?: boolean; down?: [number, number] }

/** One game on a silent surface, stepped a frame at a time with the input a test chooses. */
export function rig<S>(def: GameDef<S>, over: Partial<GameProps> = {}, width = 640) {
  const used: Record<Ink, number> = { weak: 0, strong: 0, both: 0 };
  const store: Record<string | symbol, unknown> = {};
  const surface = new Proxy(store, {
    get: (o, key) => (key in o ? o[key] : key === "measureText" ? () => ({ width: 40 }) : () => undefined),
    set: (o, key, v) => { o[key] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const p = { ...SIM_PROPS, ...over };
  const k = makeKit(p, (ink) => { used[ink]++; return surface; }, 1, seeded(11));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const s = def.init(k);
  const step = (frames = 1, act: Act = {}) => {
    for (let f = 0; f < frames; f++) {
      k.dt = 1 / 60;
      k.t += k.dt;
      const i = k.input;
      i.tapped = i.action = false;
      i.pressed.clear();
      i.down = !!act.down;
      if (act.down) [i.x, i.y] = act.down;
      if (f === 0) {
        if (act.tap) { [i.x, i.y] = act.tap; i.tapped = true; }
        if (act.press) i.pressed.add(act.press);
        if (act.action) i.action = true;
      }
      def.update(k, s);
      def.draw(k, s);
    }
  };
  return { k, s, step, used };
}

/** The opposite way: a sure wrong answer. */
export const OTHER: Record<Way, Way> = { left: "right", right: "left", up: "down", down: "up" };
