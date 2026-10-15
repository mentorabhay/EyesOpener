/**
 * The hero in the game kit: where and how large `k.hero` draws, and that a game which adopts the hero keeps its rules.
 */
import { describe, expect, it, vi } from "vitest";
import { defs } from "./defs";
import { BIG, LOOK, idle, play, type Bot } from "./dgame/bots";
import { lanternRun, lay, SIZE } from "./dgame/lantern-run";
import { HERO_CELLS, defaultHero, newGrid, spriteOf, starter, type Sprite } from "./hero";
import { H, makeKit, sizeKit, type Ink } from "./kit";
import { SIM_PROPS, simulate } from "./sim";

vi.setConfig({ testTimeout: 60_000 });

/** A drawing surface that keeps every corner a path visits, by ink. */
function surfaces() {
  const points: Record<Ink, [number, number][]> = { weak: [], strong: [], both: [] }, fills: Record<Ink, number> = { weak: 0, strong: 0, both: 0 };
  const of = (ink: Ink) => new Proxy({} as Record<string | symbol, unknown>, {
    get: (o, key) => (key in o ? o[key] : key === "moveTo" || key === "lineTo" ? (x: number, y: number) => { points[ink].push([x, y]); } : key === "fill" ? () => { fills[ink]++; } : () => undefined),
    set: (o, key, v) => { o[key] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const made = { weak: of("weak"), strong: of("strong"), both: of("both") };
  return { points, fills, ctxOf: (ink: Ink) => made[ink] };
}
const box = (p: [number, number][]) => ({ x0: Math.min(...p.map((q) => q[0])), x1: Math.max(...p.map((q) => q[0])), y0: Math.min(...p.map((q) => q[1])), y1: Math.max(...p.map((q) => q[1])) });
const kit = (hero?: Sprite | null) => { const s = surfaces(), p = { ...SIM_PROPS, hero }, k = makeKit(p, s.ctxOf, 1); sizeKit(k, p, 20, 640, 2); return { k, ...s }; };

/** A wide hero and a tall, thin one: the two shapes most likely to leave the frame. */
const wide = (() => { const g = newGrid(HERO_CELLS, 12); g.bits.fill(1); for (let x = 4; x < 44; x++) g.bits[5 * HERO_CELLS + x] = 0; return spriteOf(g); })();
const tall = (() => { const g = newGrid(8, HERO_CELLS); g.bits.fill(1); for (let y = 4; y < 44; y++) g.bits[y * 8 + 3] = 0; return spriteOf(g); })();

describe("k.hero", () => {
  it("draws the member's hero standing on the point it is given, fitted into a square of the size asked", () => {
    const { k, points, fills } = kit(starter("cat")), cat = starter("cat");
    const drawn = k.hero(200, 300, 96, "weak");
    expect(k.hasHero).toBe(true);
    expect(drawn.h).toBeCloseTo(96);
    expect(drawn.w).toBeCloseTo((96 * cat.w) / cat.h);
    const b = box(points.weak);
    expect(b.y1).toBeCloseTo(300);
    expect(b.y0).toBeCloseTo(300 - 96);
    expect((b.x0 + b.x1) / 2).toBeCloseTo(200);
    expect(b.x1 - b.x0).toBeCloseTo(drawn.w);
    /* One shape, one ink: a single fill on the weaker eye's layer and nothing anywhere else. */
    expect(fills).toEqual({ weak: 1, strong: 0, both: 0 });
    expect(points.strong.length + points.both.length).toBe(0);
  });

  it("fits a wide hero by its width", () => {
    const { k, points } = kit(wide);
    expect(k.hero(100, 100, 60, "both")).toEqual({ w: 60, h: 15 });
    expect(box(points.both)).toMatchObject({ x0: 70, x1: 130, y0: 85, y1: 100 });
  });

  it("draws the kit's own figure when the member has made no hero, and says so", () => {
    for (const none of [undefined, null]) {
      const { k, points } = kit(none), d = defaultHero();
      expect(k.hasHero).toBe(false);
      expect(k.hero(320, 200, 48, "weak")).toEqual({ w: d.w, h: d.h });
      expect(box(points.weak)).toMatchObject({ y0: 152, y1: 200 });
    }
  });

  it("leans from the feet: the top moves, the bottom stays", () => {
    const { k, points } = kit(tall);
    k.hero(100, 200, 96, "weak", 10);
    const top = points.weak.filter(([, y]) => Math.abs(y - 104) < 0.01).map(([x]) => x), bottom = points.weak.filter(([, y]) => Math.abs(y - 200) < 0.01).map(([x]) => x);
    expect(Math.min(...top)).toBeCloseTo(92 + 10);
    expect(Math.min(...bottom)).toBeCloseTo(92);
  });
});

describe("a game played as the member's hero", () => {
  type S = ReturnType<typeof lanternRun.init>;
  /** Sees coins and obstacles: jumps for a coin, a crate or a stall and stays down for a sign. */
  const runner = (coins: boolean, blocks: boolean): Bot<S> => (k, s) => {
    const l = lay(k), reach = l.pace * s.ease * 0.4 * l.root;
    const o = s.items.find((it) => !it.done && it.x > l.rx - 4 * l.u);
    if (!o || o.kind === "sign" || s.f > 0) return;
    const mid = o.kind === "coin" ? o.x : o.x + (SIZE[o.kind][0] * l.u) / 2;
    if ((o.kind === "coin" ? coins : blocks) && mid - l.rx <= reach) k.input.action = true;
  };

  it("plays by the same rules whatever the hero's shape: the same score, the same level", () => {
    const plain = play(lanternRun, runner(true, true));
    for (const hero of [starter("cat"), wide, tall]) {
      const r = play(lanternRun, runner(true, true), { props: { hero } });
      expect([r.score, r.top]).toEqual([plain.score, plain.top]);
      expect(play(lanternRun, runner(false, true), { props: { hero } }).score).toBe(0);
      expect(play(lanternRun, idle, { props: { hero } }).score).toBe(0);
    }
  });

  it("draws the hero in the weaker eye's ink only, and leaves the other two inks as they were", () => {
    const plain = play(lanternRun, runner(true, true), LOOK), mine = play(lanternRun, runner(true, true), { ...LOOK, props: { hero: wide } });
    expect(mine.seen.strong).toEqual(plain.seen.strong);
    expect(mine.seen.both).toEqual(plain.seen.both);
    /* The wide hero reaches further to the left than the game's own runner does. */
    expect(mine.seen.weak.x0).toBeLessThan(plain.seen.weak.x0);
  });

  it("keeps the hero under the score line and above the ground, on a desk screen and on a phone with large targets", () => {
    for (const hero of [starter("walker"), starter("star"), wide, tall]) for (const run of [LOOK, BIG]) {
      const r = play(lanternRun, runner(true, true), { ...run, props: { ...run.props, hero } });
      expect(r.score).toBeGreaterThan(8);
      expect(r.seen.weak.y0).toBeGreaterThanOrEqual(30 + r.k.letter - 1);
      expect(r.seen.weak.y1).toBeLessThanOrEqual(H - 14);
    }
  });

  it("every game still plays with a hero in its props", () => {
    for (const [slug, def] of Object.entries(defs)) {
      const r = simulate(def, { seconds: 20, seed: 4, props: { hero: starter("robot") } });
      expect(Number.isFinite(r.score), slug).toBe(true);
    }
  });
});
