// Eyes Opener: Plays a scene frame by frame with a script: `press(k, t, state)` may set the input for the frame.
import { describe, expect, it } from "vitest";
import { FUSION_REPEATS } from "@/engine";
import { H, W, makeKit, sizeKit, type GameDef, type Kit } from "@/games/kit";
import { SIM_PROPS, seeded, simulate } from "@/games/sim";
import { spot } from "@/games/vergence";
import { holdClip } from "./hold";
import { rampClip, rampLimit } from "./ramp";
import { RECOVER_MAX, recoverClip } from "./recover";
import { trackClip } from "./track";

const blank = () => new Proxy({} as Record<string | symbol, unknown>, {
  get: (o, key) => (key in o ? o[key] : key === "measureText" ? () => ({ width: 40 }) : () => undefined),
  set: (o, key, v) => { o[key] = v; return true; },
}) as unknown as CanvasRenderingContext2D;

/**
 * Plays a scene frame by frame with a script: `press(k, t, state)` may set the input for the frame.
 * It also watches every `fuse` call, so a test can check the demand that was really drawn.
 */
function play<S>(def: GameDef<S>, seconds: number, press: (k: Kit, t: number, s: S) => void, width = 640, slow = 1) {
  const surface = blank(), p = { ...SIM_PROPS, onScore: () => undefined };
  const k = makeKit(p, () => surface, slow, seeded(3));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const drawn: number[] = [], fuse = k.fuse;
  k.fuse = (prism, draw) => { drawn.push(prism); fuse(prism, draw); };
  const state = def.init(k);
  for (let f = 0; f < seconds * 60; f++) {
    k.dt = 1 / 60; k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = false; i.taps.length = 0; i.pressed.clear();
    press(k, k.t, state);
    def.update(k, state);
    def.draw(k, state);
    if (k.stats.done) break;
  }
  return { k, state, drawn };
}
const ok = (k: Kit) => { k.input.action = true; };
const split = (k: Kit) => { k.input.pressed.add("down"); };
/** The largest change of the drawn demand between two frames, in prism dioptres a second. */
const fastest = (drawn: number[]) => Math.max(...drawn.slice(1).map((v, i) => Math.abs(v - drawn[i]))) * 60;

describe("the fusion-range scene", () => {
  it("starts every repeat at zero and waits for the member", () => {
    const { drawn, k } = play(rampClip(1, 1), 5, () => undefined);
    expect(drawn.every((v) => v === 0)).toBe(true);
    expect(k.stats.done).toBeUndefined();
  });

  for (const [way, rate] of [[1, 0.5], [1, 1], [1, 2], [-1, 0.5], [-1, 1], [-1, 2]] as const) {
    it(`never moves faster than its speed (${rate} a second, ${way > 0 ? "in" : "out"}), and never faster than 2`, () => {
      /* ready at 1 s; "it split" 4 s into each climb; "one again" 1.5 s later */
      let phaseAt = 0, last = "";
      const { drawn, k } = play(rampClip(way, rate), 120, (kit, t, s) => {
        if (s.phase !== last) { last = s.phase; phaseAt = t; }
        if ((s.phase === "ready" || s.phase === "rest") && t - phaseAt > 1) ok(kit);
        if (s.phase === "climb" && t - phaseAt > 4) split(kit);
        if (s.phase === "back" && t - phaseAt > 1.5) ok(kit);
      });
      expect(k.stats.done).toBe(1);
      expect(fastest(drawn)).toBeLessThanOrEqual(2 + 1e-6);
      const limit = rampLimit(k, way);
      for (const v of drawn) { expect(v * way).toBeGreaterThanOrEqual(-1e-9); expect(Math.abs(v)).toBeLessThanOrEqual(limit + 1e-9); }
      for (let n = 1; n <= FUSION_REPEATS; n++) {
        const b = k.stats[`b${n}`], r = k.stats[`r${n}`];
        expect(b).toBeGreaterThan(0);
        expect(b).toBeLessThanOrEqual(limit);
        expect(r).toBeLessThanOrEqual(b);
        /* a split 4 s into a climb is at 4 x the speed, unless the screen's limit came first */
        if (!k.stats[`l${n}`]) expect(b).toBeCloseTo(Math.min(limit, 4 * rate), 0);
      }
      expect(k.stats.rate).toBe(rate);
    });
  }

  it("never asks the eyes to turn out past 4 cm of separation, at any screen size or distance", () => {
    for (const width of [360, 640, 1280]) {
      const { k, drawn } = play(rampClip(-1, 2), 60, (kit, t, s) => { if (s.phase === "ready" || s.phase === "rest") ok(kit); }, width);
      expect(k.divMax).toBeCloseTo(Math.min(k.convMax, (4 / k.distCm) * 100), 6);
      for (const v of drawn) expect(-v).toBeLessThanOrEqual(k.divMax + 1e-9);
      expect(k.stats.limit).toBeLessThanOrEqual(k.divMax);
    }
  });

  it("records the screen's limit, flagged, when the picture never splits", () => {
    const { k } = play(rampClip(-1, 2), 90, (kit, t, s) => { if (s.phase === "ready" || s.phase === "rest") ok(kit); });
    expect(k.stats.done).toBe(1);
    for (let n = 1; n <= FUSION_REPEATS; n++) { expect(k.stats[`l${n}`]).toBe(1); expect(k.stats[`b${n}`]).toBe(k.stats.limit); expect(k.stats[`r${n}`]).toBe(k.stats.limit); }
  });

  it("records a recovery of zero when the member never says it is one again", () => {
    let phaseAt = 0, last = "";
    const { k } = play(rampClip(1, 2), 90, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if ((s.phase === "ready" || s.phase === "rest") && t - phaseAt > 1) ok(kit);
      if (s.phase === "climb" && t - phaseAt > 3) split(kit);
    });
    expect(k.stats.done).toBe(1);
    expect(k.stats.r1).toBe(0);
    expect(k.stats.b1).toBeGreaterThan(0);
  });

  it("measures nothing when one eye's picture is not seen at rest", () => {
    const { k } = play(rampClip(1, 1), 10, (kit, t) => { if (t > 1) split(kit); });
    expect(k.stats).toMatchObject({ cannot: 1, done: 1 });
    expect(k.stats.b1).toBeUndefined();
  });

  it("moves slower, and says so, for a member who asked for reduced motion", () => {
    const { k, drawn } = play(rampClip(1, 2), 20, (kit, t, s) => { if (s.phase === "ready") ok(kit); }, 640, 0.35);
    expect(k.stats.rate).toBeCloseTo(0.7, 5);
    expect(fastest(drawn)).toBeLessThanOrEqual(0.7 + 1e-6);
  });

  it("takes a tap on the split spot as well as the Down key", () => {
    let phaseAt = 0, last = "";
    const { k } = play(rampClip(1, 1), 30, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if (s.phase === "ready" && t - phaseAt > 1) ok(kit);
      if (s.phase === "climb" && t - phaseAt > 3) { const sp = spot(kit); kit.input.x = sp.x + 4; kit.input.y = sp.y + 4; kit.input.tapped = true; }
    });
    expect(k.stats.b1).toBeGreaterThan(2);
  });
});

describe("the recovery-time scene", () => {
  it("times from the split to one picture again, three times", () => {
    let phaseAt = 0, last = "";
    const { k, drawn } = play(recoverClip, 120, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if ((s.phase === "ready" || s.phase === "rest") && t - phaseAt > 1) ok(kit);
      if (s.phase === "climb" && t - phaseAt > 5) split(kit);
      if (s.phase === "wait" && t - phaseAt > 2.5) ok(kit);
    });
    expect(k.stats.done).toBe(1);
    for (let n = 1; n <= FUSION_REPEATS; n++) expect(k.stats[`t${n}`]).toBeCloseTo(2.5, 0);
    /* the only sudden change is the kit's own easing of 2 prism dioptres at a split */
    const jumps = drawn.slice(1).map((v, i) => Math.abs(v - drawn[i])).filter((d) => d > 2 / 60 + 1e-6);
    expect(jumps.every((d) => d <= 2 + 1e-6)).toBe(true);
    expect(jumps.length).toBe(FUSION_REPEATS);
  });

  it("stops the clock at thirty seconds", () => {
    let phaseAt = 0, last = "";
    const { k } = play(recoverClip, 60, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if (s.phase === "ready" && t - phaseAt > 1) ok(kit);
      if (s.phase === "climb" && t - phaseAt > 5) split(kit);
    });
    expect(k.stats.t1).toBe(RECOVER_MAX);
  });

  it("has nothing to time when the picture never splits", () => {
    const { k } = play(recoverClip, 200, (kit, t, s) => { if (s.phase === "ready" || s.phase === "rest") ok(kit); });
    expect(k.stats.done).toBe(1);
    expect(k.stats.v1).toBe(1);
    expect(k.stats.t1).toBeUndefined();
  });
});

describe("the hold scene", () => {
  it("climbs to the set pull at one a second and counts the seconds held", () => {
    let phaseAt = 0, last = "";
    const { k, drawn } = play(holdClip(6, 60), 120, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if (s.phase === "ready" && t - phaseAt > 1) ok(kit);
      if (s.phase === "hold" && t - phaseAt > 20.5) split(kit);
    });
    expect(k.stats).toMatchObject({ done: 1, demand: 6, held: 20 });
    expect(Math.max(...drawn)).toBeLessThanOrEqual(6 + 1e-9);
  });

  it("ends at the full time, and glides home", () => {
    const { k, drawn } = play(holdClip(4, 60), 120, (kit, t, s) => { if (s.phase === "ready") ok(kit); });
    expect(k.stats).toMatchObject({ done: 1, held: 60 });
    expect(drawn.at(-1)).toBeCloseTo(0, 6);
  });

  it("never sets more than the screen has room for", () => {
    const { k, drawn } = play(holdClip(15, 60), 30, (kit, t, s) => { if (s.phase === "ready") ok(kit); }, 360);
    expect(Math.max(...drawn)).toBeLessThanOrEqual(k.convMax + 1e-9);
    expect(k.stats.demand).toBeLessThanOrEqual(k.convMax);
  });

  it("counts nothing for a split on the way there", () => {
    let phaseAt = 0, last = "";
    const { k } = play(holdClip(10, 60), 60, (kit, t, s) => {
      if (s.phase !== last) { last = s.phase; phaseAt = t; }
      if (s.phase === "ready" && t - phaseAt > 1) ok(kit);
      if (s.phase === "climb" && t - phaseAt > 2) split(kit);
    });
    expect(k.stats).toMatchObject({ done: 1, held: 0 });
  });
});

describe("the tracking scene", () => {
  it("gives a full score to a pointer that stays on the ring and none to one that never touches it", () => {
    /* a pointer that follows the ring: read the ring's place from the scene's own drawing */
    const def = trackClip(60);
    const surface = blank(), p = { ...SIM_PROPS, onScore: () => undefined };
    const k = makeKit(p, () => surface, 1, seeded(1));
    sizeKit(k, p, 20, 640, 2);
    let ring = { x: W / 2, y: H / 2 };
    const real = k.ring;
    k.ring = (x, y, r, ink, width) => { ring = { x, y }; real(x, y, r, ink, width); };
    const s = def.init(k);
    for (let f = 0; f < 70 * 60 && !k.stats.done; f++) {
      k.dt = 1 / 60; k.t += k.dt;
      k.input.x = ring.x; k.input.y = ring.y;
      def.update(k, s); def.draw(k, s);
    }
    expect(k.stats).toMatchObject({ done: 1, secs: 60 });
    expect(k.stats.on).toBeGreaterThanOrEqual(95);

    const idle = simulate(trackClip(60), { seconds: 30, skill: 0 });
    expect(idle.stats.done).toBeUndefined();
    expect(idle.stats.on ?? 0).toBe(0);
  });

  it("can be played with the arrow keys alone, and draws in both-eyes ink only", () => {
    for (const width of [360, 640, 1280]) {
      const r = simulate(trackClip(20), { seconds: 90, skill: 0.6, width, seed: width });
      expect(r.inks.weak + r.inks.strong).toBe(0);
      expect(r.inks.both).toBeGreaterThan(0);
      for (const v of Object.values(r.stats)) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
      if (r.stats.on !== undefined) expect(r.stats.on).toBeLessThanOrEqual(100);
    }
  });
});

describe("every clip scene", () => {
  const scenes: [string, GameDef<never>][] = [
    ["ramp in", rampClip(1, 1) as GameDef<never>], ["ramp out", rampClip(-1, 2) as GameDef<never>], ["recover", recoverClip as GameDef<never>],
    ["hold", holdClip(6, 60) as GameDef<never>], ["track", trackClip(60) as GameDef<never>],
  ];
  for (const [name, def] of scenes) {
    it(`${name} runs at three screen sizes with random input and reports only numbers that make sense`, () => {
      for (const width of [360, 640, 1280]) {
        for (const skill of [0, 0.05, 0.3]) {
          const r = simulate(def, { seconds: 90, seed: 5 + width, skill, width });
          for (const [key, v] of Object.entries(r.stats)) { expect(Number.isFinite(v), `${name} ${key}`).toBe(true); expect(v, `${name} ${key}`).toBeGreaterThanOrEqual(0); }
          expect(r.inks.both, name).toBeGreaterThan(0);
        }
      }
    });
  }
});
