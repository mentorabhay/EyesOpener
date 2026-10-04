/**
 * The seven vergence drills, played with no screen.
 * Three things are checked: the demand keeps every safety rule on every frame; each drill reports exactly its
 * own measures and only once they have really been measured; and a scripted member gets the numbers a person
 * would expect (a split at 6 is a break of 6, ten flips in a minute are five cycles a minute).
 */
import { describe, expect, it } from "vitest";
import { help, words } from "@/copy/drills-verg";
import { AUTO_KEYS } from "@/data/guides";
import { H, W, makeKit, sizeKit, type GameProps, type Kit } from "@/games/kit";
import { SIM_PROPS, seeded, simulate } from "@/games/sim";
import { maxJump, spot, splitPressed, type Demand } from "@/games/vergence";
import { drills } from ".";
import { pair } from "./flip-switch";
import { plan } from "./parts";
import { setLines } from "./reading-under-demand";

const SLUGS = ["screen-vergence-ramp", "screen-diverge-ramp", "screen-vergence-steps", "flip-switch", "long-hold", "reading-under-demand", "distance-fusion-hold"];
/** The drills that move the demand with `jumpTo`, and the ones that turn the eyes out. */
const JUMPS = new Set(["screen-vergence-steps", "flip-switch"]), OUT = new Set(["screen-diverge-ramp", "flip-switch"]);
/** What the kit and the vergence helpers record in every session. */
const KIT_KEYS = ["hits", "misses", "level", "top", "conv", "div", "splits"];
/** Measures in prism dioptres. */
const PD_KEYS = ["break_pd", "recover_pd", "step_pd", "conv_pd", "div_pd", "hold_pd", "conv", "div"];

const SCREENS: [string, number, Partial<GameProps>][] = [
  ["a tablet", 640, {}],
  ["a phone with large letters", 340, { ppc: 60, distCm: 35, targetPx: 60, letterPx: 70 }],
  ["a TV at 3 m", 1600, { ppc: 14, distCm: 300, targetPx: 30, letterPx: 40 }],
];

interface Drawn { s: string; x: number; px: number; align: string }

/** A drawing surface that swallows every call, measures a line as 0.7 of its letter size a letter, and notes the words drawn. */
function surface() {
  const texts: Drawn[] = [], o: Record<string | symbol, unknown> = {};
  const px = () => Number(/(\d+(\.\d+)?)px/.exec(String(o.font ?? ""))?.[1] ?? 0);
  o.measureText = (s: string) => ({ width: s.length * px() * 0.7 });
  o.fillText = (s: string, x: number) => { texts.push({ s, x, px: px(), align: String(o.textAlign) }); };
  const g = new Proxy(o, { get: (t, key) => (key in t ? t[key] : () => undefined), set: (t, key, v) => { t[key] = v; return true; } });
  return { g: g as unknown as CanvasRenderingContext2D, texts };
}

type State = { d: Demand } & Record<string, unknown>;
/** Sets the input for one frame. `t` is the time of that frame in seconds. */
type Player = (k: Kit, s: State, frame: number, t: number, rand: () => number) => void;

interface Run { width?: number; props?: Partial<GameProps>; seconds: number; slow?: number; player?: Player; watch?: (k: Kit, s: State, frame: number) => void }

/**
 * Plays a drill at 60 frames a second and checks the demand on every frame: it starts at rest, stays inside the
 * screen's limits, moves no faster than 2 a second (or no further than one allowed jump), eases by exactly 2
 * when the member says it split, and a split never scores. `wrong` lists the first few broken rules.
 */
function play(slug: string, { width = 640, props = {}, seconds, slow = 1, player = () => {}, watch }: Run) {
  const p = { ...SIM_PROPS, ...props }, def = drills[slug], rand = seeded(11), { g, texts } = surface();
  const k = makeKit(p, () => g, slow, seeded(5));
  sizeKit(k, p, def.target ?? 20, width, 2);
  const s = def.init(k) as State;
  def.draw(k, s);
  const firstFrame = texts.map((t) => t.s);
  const wrong: string[] = [], check = (ok: boolean, what: string, f: number) => { if (!ok && wrong.length < 5) wrong.push(`${slug} at frame ${f}: ${what}`); };
  check(s.d.now === 0, "does not start at rest", 0);
  check(Object.keys(k.stats).every((key) => KIT_KEYS.includes(key)), "reports a measure before anything was measured", 0);
  let low = 0, high = 0, jump = 0;
  for (let f = 0; f < seconds * 60; f++) {
    k.dt = 1 / 60;
    k.t += k.dt;
    const i = k.input;
    i.tapped = i.action = false;
    i.pressed.clear();
    i.taps.length = 0;
    player(k, s, f, k.t, rand);
    const split = splitPressed(k), before = s.d.now, scoreBefore = k.score;
    def.update(k, s);
    if (f % 7 === 0) def.draw(k, s);
    const now = s.d.now, moved = Math.abs(now - before);
    check(Number.isFinite(now) && Number.isFinite(s.d.goal), "the demand is not a number", f);
    for (const v of [now, s.d.goal]) check(v <= k.convMax + 1e-9 && v >= -k.divMax - 1e-9, `demand ${v} is outside the screen's limits`, f);
    if (!OUT.has(slug)) check(now >= 0, `demand ${now}: this drill must never turn the eyes out`, f);
    if (slug === "screen-diverge-ramp") check(now <= 0, `demand ${now}: this drill must never turn the eyes in`, f);
    if (split) {
      check(Math.abs(Math.abs(now) - Math.max(0, Math.abs(before) - 2)) < 1e-6, `a split did not ease by 2 (${before} to ${now})`, f);
      check(k.score === scoreBefore, "a split scored", f);
    } else if (JUMPS.has(slug)) { check(moved <= maxJump(k) + 1e-9, `jumped ${moved}, more than the level allows`, f); jump = Math.max(jump, moved); }
    else check(moved <= 2 * slow * k.dt + 1e-9, `a smooth drill moved ${moved} in one frame`, f);
    for (const [key, v] of Object.entries(k.stats)) check(Number.isFinite(v) && v >= 0, `${key} is ${v}`, f);
    watch?.(k, s, f);
    low = Math.min(low, now);
    high = Math.max(high, now);
  }
  return { k, s, low, high, jump, wrong, texts, firstFrame };
}

/** Presses the member's controls for this frame. */
const ok = (k: Kit) => { k.input.action = true; };
const split = (k: Kit) => { k.input.pressed.add("down"); };
const tap = (k: Kit, x: number, y: number) => { const i = k.input; i.x = x; i.y = y; i.tapped = true; i.taps.push({ x, y }); };
/** True on the frame nearest to each of the given times. */
const at = (t: number, ...times: number[]) => times.some((time) => Math.abs(t - time) < 1 / 120);

/** A member who presses anything at any time, the split control included. */
const random: Player = (k, _s, _f, _t, rand) => {
  const i = k.input;
  if (rand() >= 0.5) return;
  i.x = rand() * W; i.y = rand() * H;
  i.tapped = rand() < 0.4; i.action = rand() < 0.4; i.down = rand() < 0.7; i.held = rand() < 0.5;
  if (i.tapped) i.taps.push({ x: i.x, y: i.y });
  if (rand() < 0.05) i.pressed.add("down");
  if (rand() < 0.1) i.pressed.add(rand() < 0.7 ? "up" : "left");
};
/** A member who always says "it is one", always asks for more, and never says it split. */
const eager: Player = (k, _s, f) => {
  const i = k.input;
  i.x = W / 2; i.y = 100;
  i.action = f % 31 === 0; i.tapped = f % 47 === 0;
  if (i.tapped) i.taps.push({ x: i.x, y: i.y });
  if (f % 53 === 0) i.pressed.add("up");
};
/** A member who does nothing but say the picture split. */
const splitter: Player = (k, _s, f) => { if (f % 40 === 0) split(k); };

/** A kit for a screen, to read its limits. */
function kitFor(width: number, props: Partial<GameProps> = {}) {
  const p = { ...SIM_PROPS, ...props }, k = makeKit(p, () => surface().g, 1);
  sizeKit(k, p, 20, width, 2);
  return k;
}
const own = (slug: string, stats: Record<string, number>) => Object.keys(stats).filter((key) => !KIT_KEYS.includes(key));

describe("the vergence drills are listed and explained", () => {
  it("has one drill for each of the seven exercises, and nothing else", () => {
    expect(Object.keys(drills).sort()).toEqual([...SLUGS].sort());
    for (const slug of SLUGS) expect(AUTO_KEYS[slug], slug).toBeTruthy();
  });

  it.each(SLUGS)("%s says how to play and how to report a split, by touch and by keys", (slug) => {
    expect(help[slug]).toContain("It split");
    expect(help[slug]).toContain("Down");
    expect(help[slug]).toMatch(/tap|Tap/);
    expect(help[slug].length).toBeLessThan(260);
  });

  it("has 30 or more reading sentences of four to eight plain words, none twice", () => {
    expect(words.sentences.length).toBeGreaterThanOrEqual(30);
    expect(new Set(words.sentences).size).toBe(words.sentences.length);
    for (const line of words.sentences) {
      const n = line.split(" ").length;
      expect(n, line).toBeGreaterThanOrEqual(4);
      expect(n, line).toBeLessThanOrEqual(8);
      expect(line, line).toMatch(/^[A-Z][A-Za-z ]+\.$/);
      expect(line.length, line).toBeLessThanOrEqual(40);
    }
  });

  it.each(SLUGS)("%s shows the target, the split spot and one line of instruction on its first frame", (slug) => {
    const { firstFrame } = play(slug, { seconds: 0 });
    expect(firstFrame).toContain(words.split);
    expect(firstFrame).toContain(words.ask);
    const cues: string[] = [words.keep, words.oneRing, words.hold.more, words.read.read];
    expect(firstFrame.filter((s) => cues.includes(s)), "one instruction").toHaveLength(1);
    /* The numbers line never shows a measure that does not exist yet. */
    expect(firstFrame.join(" ")).not.toMatch(/NaN|undefined/);
  });
});

describe("random play in the simulator", () => {
  const cases = SLUGS.flatMap((slug) => [360, 640, 1280].flatMap((width) => [3, 8].map((seed) => [slug, width, seed] as const)));

  it.each(cases)("%s at %i wide, seed %i: runs, and reports only its own measures, all sensible", (slug, width, seed) => {
    const limit = kitFor(width);
    for (const skill of [0.02, 0.2]) {
      const r = simulate(drills[slug], { seconds: 120, seed, skill, width });
      expect(r.inks.both, "draws for both eyes").toBeGreaterThan(0);
      expect(r.inks.weak, "draws for the weaker eye").toBeGreaterThan(0);
      expect(r.inks.strong, "draws for the stronger eye").toBeGreaterThan(0);
      for (const key of own(slug, r.stats)) expect(AUTO_KEYS[slug], `${slug} reports ${key}`).toContain(key);
      for (const [key, v] of Object.entries(r.stats)) {
        expect(Number.isFinite(v), `${key} is ${v}`).toBe(true);
        expect(v, key).toBeGreaterThanOrEqual(0);
        /* One or two decimals at most: these are numbers a member reads. */
        expect(Math.abs(v * 100 - Math.round(v * 100)), key).toBeLessThan(1e-6);
        if (PD_KEYS.includes(key)) { expect(v, key).toBeLessThanOrEqual(30); expect(v, key).toBeLessThanOrEqual(limit.convMax + 0.005); }
      }
      const { stats } = r;
      if ("div_pd" in stats) expect(stats.div_pd).toBeLessThanOrEqual(limit.divMax + 0.005);
      if (slug === "screen-diverge-ramp" && "break_pd" in stats) expect(stats.break_pd).toBeLessThanOrEqual(limit.divMax + 0.005);
      if ("recover_pd" in stats) expect(stats.recover_pd, "the two join below where they split").toBeLessThanOrEqual(stats.break_pd);
      if ("hold_s" in stats) { expect(stats.hold_s).toBeGreaterThanOrEqual(1); expect(stats.hold_s).toBeLessThanOrEqual(120); }
      if ("regain_s" in stats) { expect(stats.regain_s).toBeGreaterThan(0); expect(stats.regain_s).toBeLessThanOrEqual(120); }
      if ("steps" in stats) { expect(stats.steps).toBeGreaterThanOrEqual(1); expect(stats.steps).toBeLessThanOrEqual(120); }
      if ("cycles_per_min" in stats) { expect(stats.cycles_per_min).toBeGreaterThan(0); expect(stats.cycles_per_min).toBeLessThanOrEqual(75); }
      if ("lines" in stats) { expect(stats.lines).toBeGreaterThanOrEqual(1); expect(stats.lines).toBeLessThanOrEqual(200); }
      if ("lines_per_min" in stats) { expect(stats.lines_per_min).toBeGreaterThan(0); expect(stats.lines_per_min).toBeLessThanOrEqual(100); }
    }
  }, 30000);
});

describe("the demand keeps its rules on every frame", () => {
  const cases = SLUGS.flatMap((slug) => SCREENS.map(([name, width, props]) => [slug, name, width, props] as const));

  it.each(cases)("%s on %s, with random play, an eager member, a member who only says it split, and nobody", (slug, _name, width, props) => {
    for (const player of [random, eager, splitter, undefined]) {
      const r = play(slug, { width, props, seconds: 150, player });
      expect(r.wrong).toEqual([]);
      for (const key of own(slug, r.k.stats)) expect(AUTO_KEYS[slug], `${slug} reports ${key}`).toContain(key);
    }
  }, 30000);

  it.each(SLUGS)("%s keeps nothing between sessions: the same play gives the same record", (slug) => {
    const a = play(slug, { seconds: 60, player: random }), b = play(slug, { seconds: 60, player: random });
    expect(b.k.stats).toEqual(a.k.stats);
    expect(b.k.score).toBe(a.k.score);
  }, 30000);

  it.each(SLUGS)("%s keeps them with reduced motion too", (slug) => {
    for (const player of [random, eager]) expect(play(slug, { seconds: 90, slow: 0.35, player }).wrong).toEqual([]);
  }, 30000);

  it.each(SLUGS)("%s keeps its words inside the frame on a phone and with large letters", (slug) => {
    for (const [width, props] of [[360, {}], [340, SCREENS[1][2]]] as const) {
      const { texts, k } = play(slug, { width, props, seconds: 60, player: eager });
      const box = spot(k);
      for (const t of texts.filter((d) => d.s !== words.split)) {
        const w = t.s.length * t.px * 0.7, left = t.align === "center" ? t.x - w / 2 : t.align === "right" ? t.x - w : t.x;
        expect(left, `"${t.s}" starts inside the frame`).toBeGreaterThanOrEqual(8);
        expect(left + w, `"${t.s}" ends inside the frame`).toBeLessThanOrEqual(W - 8 + 1e-6);
        expect(t.px, `"${t.s}" has a size`).toBeGreaterThan(0);
      }
      /* The question sits to the left of the split spot, never on it. */
      for (const t of texts.filter((d) => d.s === words.ask)) expect(t.x).toBeLessThan(box.x);
    }
  }, 30000);

  it("leaves room for the ring on every screen", () => {
    for (const [, width, props] of SCREENS) for (const timed of [false, true]) {
      const k = kitFor(width, props), p = plan(k, timed);
      expect(p.r).toBeGreaterThanOrEqual(8);
      expect(p.top).toBeGreaterThan(p.cueY);
      /* The kit keeps a strip of play in the middle even when very large letters make the split spot taller than that. */
      expect(p.bottom).toBeLessThanOrEqual(Math.max(spot(k).y, H / 2 + 30));
      expect(W / 2 + k.prismUnits(k.convMax) / 2 + p.r, "both rings stay inside the frame").toBeLessThanOrEqual(W - 8);
    }
  });
});

describe("screen-vergence-ramp", () => {
  const SLUG = "screen-vergence-ramp";

  it("climbs about 1 a second from rest", () => {
    const r = play(SLUG, { seconds: 5 });
    expect(r.s.d.now).toBeCloseTo(5, 1);
    expect(own(SLUG, r.k.stats)).toEqual([]);
  });

  it("records a split at about 6 as a break of about 6, and the moment the two join as the recovery", () => {
    let said = false, joined = false;
    const r = play(SLUG, { seconds: 9, player: (k, s) => {
      if (!said && s.d.now >= 6) { split(k); said = true; }
      else if (said && !joined && s.d.now <= 3) { ok(k); joined = true; }
    } });
    expect(r.wrong).toEqual([]);
    expect(r.k.stats.break_pd).toBeGreaterThanOrEqual(5.9);
    expect(r.k.stats.break_pd).toBeLessThanOrEqual(6.1);
    expect(r.k.stats.recover_pd).toBeGreaterThanOrEqual(2.9);
    expect(r.k.stats.recover_pd).toBeLessThanOrEqual(3.1);
    expect(r.k.score).toBe(1);
    expect(r.k.stats.hits).toBe(1);
    expect(r.k.stats.splits).toBe(1);
  });

  it("comes down about 1 a second after a split, waits for the member, rests two seconds, then climbs again", () => {
    const course: number[] = [];
    let joinedAt = -1;
    play(SLUG, { seconds: 16, player: (k, s, f, t) => {
      if (at(t, 6)) split(k);
      if (at(t, 12)) { ok(k); joinedAt = f; }
    }, watch: (_k, s) => course.push(s.d.now) });
    /* Split at 6: eased to 4, down to rest by four seconds later, and it stays there until the member answers. */
    expect(course[6 * 60 + 60]).toBeCloseTo(3, 0);
    expect(course[11 * 60]).toBe(0);
    /* Joined only at rest: held for the two-second pause, then up again. */
    expect(course[joinedAt + 110]).toBe(0);
    expect(course[joinedAt + 240]).toBeGreaterThan(1.5);
  });

  it("does not record a split at rest as a break, nor a join at rest as a recovery", () => {
    const r = play(SLUG, { seconds: 8, player: (k, _s, f) => { if (f === 0) split(k); if (f === 200) ok(k); } });
    expect(own(SLUG, r.k.stats)).toEqual([]);
    expect(r.k.score).toBe(0);
  });

  it("at the screen's limit: holds three seconds, records the limit as the break, says so, returns to rest and climbs again", () => {
    const course: number[] = [], breakAt: number[] = [];
    const r = play(SLUG, { seconds: 45, watch: (k, s, f) => { course.push(s.d.now); if ("break_pd" in k.stats && !breakAt.length) breakAt.push(f); } });
    expect(r.wrong).toEqual([]);
    const top = course.findIndex((now) => now >= r.k.convMax - 1e-9);
    expect(top / 60, "reached in about as many seconds as the limit").toBeCloseTo(r.k.convMax, 0);
    expect((breakAt[0] - top) / 60, "held three seconds first").toBeCloseTo(3, 1);
    expect(r.k.stats.break_pd).toBe(Math.floor(r.k.convMax * 10 + 1e-6) / 10);
    expect(r.texts.some((t) => t.s === words.ramp.limit)).toBe(true);
    const after = course.slice(top);
    expect(Math.min(...after)).toBe(0);
    expect(after[after.length - 1], "climbing again").toBeGreaterThan(1);
    expect("recover_pd" in r.k.stats).toBe(false);
  });
});

describe("screen-diverge-ramp", () => {
  const SLUG = "screen-diverge-ramp";

  it("turns the eyes out, and reports the break and the recovery as positive numbers", () => {
    let said = false, joined = false;
    const r = play(SLUG, { seconds: 8, player: (k, s) => {
      if (!said && s.d.now <= -4) { split(k); said = true; }
      else if (said && !joined && s.d.now >= -1) { ok(k); joined = true; }
    } });
    expect(r.wrong).toEqual([]);
    expect(r.high).toBe(0);
    expect(r.k.stats.break_pd).toBeGreaterThanOrEqual(3.9);
    expect(r.k.stats.break_pd).toBeLessThanOrEqual(4.1);
    expect(r.k.stats.recover_pd).toBeGreaterThanOrEqual(0.9);
    expect(r.k.stats.recover_pd).toBeLessThanOrEqual(1.1);
    expect(r.k.stats.div).toBeGreaterThanOrEqual(4);
    expect("conv" in r.k.stats).toBe(false);
  });

  it("stops at the 4 cm limit and records it as the break", () => {
    const r = play(SLUG, { seconds: 30 });
    expect(r.low).toBeCloseTo(-r.k.divMax, 9);
    expect(r.k.stats.break_pd).toBe(Math.floor(r.k.divMax * 10 + 1e-6) / 10);
    expect(r.k.prismUnits(r.k.divMax) / r.k.perCm).toBeLessThanOrEqual(4.0001);
  });
});

describe("screen-vergence-steps", () => {
  const SLUG = "screen-vergence-steps";
  /** Says "one ring" at the start and then exactly `after` seconds after every jump. */
  const steady = (after: number): Player => (k, s, f, t) => { if (f === 0 || (Number(s.open) > 0 && t - Number(s.since) >= after - 1e-9)) ok(k); };

  it("does nothing until the member says one ring", () => {
    const r = play(SLUG, { seconds: 30 });
    expect(r.high).toBe(0);
    expect(own(SLUG, r.k.stats)).toEqual([]);
  });

  it("counts the jumps cleared, the largest of them, and the average time to regain one ring", () => {
    const r = play(SLUG, { seconds: 60, player: steady(1.5) });
    expect(r.wrong).toEqual([]);
    /* Each jump takes 1.5 s to clear and is followed by a one-second hold. */
    expect(r.k.stats.steps).toBeGreaterThanOrEqual(22);
    expect(r.k.stats.steps).toBeLessThanOrEqual(24);
    expect(r.k.stats.regain_s).toBeCloseTo(1.5, 1);
    expect(r.k.stats.step_pd).toBeCloseTo(Math.floor(r.jump * 10 + 1e-6) / 10, 9);
    expect(r.k.stats.step_pd).toBeLessThanOrEqual(12);
    expect(r.k.score).toBe(r.k.stats.steps);
  });

  it("goes up in steps until the limit is near, then comes back toward rest, then up again", () => {
    const course: number[] = [];
    const r = play(SLUG, { seconds: 90, player: steady(1), watch: (_k, s) => course.push(s.d.now) });
    const top = course.indexOf(r.high), after = course.slice(top);
    expect(r.high).toBeGreaterThan(r.k.convMax - 1);
    expect(Math.min(...after)).toBeLessThan(1);
    expect(after.lastIndexOf(Math.max(...after.slice(after.indexOf(Math.min(...after))))), "up again").toBeGreaterThan(after.indexOf(Math.min(...after)));
  });

  it("ignores a second tap straight after a jump", () => {
    /* Pressing on every frame: a jump can be cleared no sooner than 0.4 s after it, plus the one-second hold. */
    const r = play(SLUG, { seconds: 30, player: (k) => ok(k) });
    expect(r.k.stats.steps).toBeLessThanOrEqual(22);
    expect(r.k.stats.regain_s).toBeGreaterThanOrEqual(0.4);
  });

  it("after a split: eases, does not count that jump, and tries a smaller one", () => {
    const sizes: number[] = [];
    let said = false;
    const r = play(SLUG, { seconds: 12, player: (k, s, f, t) => {
      const open = Number(s.open) > 0, since = t - Number(s.since);
      if (f === 0) ok(k);
      else if (open && sizes.length === 1 && !said && since >= 1) { split(k); said = true; }
      else if ((open && since >= 1) || (said && !open && Number(s.next) < 0)) ok(k);
    }, watch: (_k, s) => { const n = Number(s.open); if (n > 0 && sizes[sizes.length - 1] !== n) sizes.push(n); } });
    expect(r.wrong).toEqual([]);
    expect(sizes[0]).toBeCloseTo(2.1, 9);
    expect(sizes[1], "the jump after the split is half the size").toBeCloseTo(1.05, 9);
    expect(sizes[2], "and the size grows back once a jump is cleared").toBeGreaterThan(sizes[1]);
    expect(r.k.stats.splits).toBe(1);
    expect(r.k.stats.steps).toBe(sizes.length - 1 - (Number(r.s.open) > 0 ? 1 : 0));
  });
});

describe("flip-switch", () => {
  const SLUG = "flip-switch";

  it("does nothing until the member says one ring", () => {
    const r = play(SLUG, { seconds: 40 });
    expect(r.high).toBe(0);
    expect(r.low).toBe(0);
    expect(own(SLUG, r.k.stats)).toEqual([]);
  });

  it("ten presses over a minute give about five cycles a minute", () => {
    const r = play(SLUG, { seconds: 60, player: (k, _s, _f, t) => { if (at(t, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60)) ok(k); } });
    expect(r.wrong).toEqual([]);
    expect(r.k.stats.cycles_per_min).toBeGreaterThanOrEqual(4.8);
    expect(r.k.stats.cycles_per_min).toBeLessThanOrEqual(5.2);
    /* The first press starts the drill; the nine after it are flips: four full cycles. */
    expect(r.s.flips).toBe(9);
    expect(r.k.score).toBe(4);
  });

  it("flips between turning in and turning out, about four to one, each flip inside one jump", () => {
    const sides: number[] = [];
    const r = play(SLUG, { seconds: 30, player: (k, _s, f) => { if (f % 90 === 0) ok(k); }, watch: (_k, s) => { if (sides[sides.length - 1] !== Math.sign(s.d.now)) sides.push(Math.sign(s.d.now)); } });
    expect(r.wrong).toEqual([]);
    expect(sides.slice(0, 5)).toEqual([1, -1, 1, -1, 1]);
    /* Both sides were cleared, so both are measured: the pair of the level reached, or of the one before. */
    const { turnIn, turnOut } = pair(r.k);
    expect(r.k.stats.conv_pd).toBeGreaterThan(r.k.stats.div_pd);
    expect(r.k.stats.conv_pd).toBeLessThanOrEqual(turnIn);
    expect(r.k.stats.div_pd).toBeLessThanOrEqual(turnOut);
    expect(r.k.stats.div_pd).toBeGreaterThan(0);
    expect(r.jump).toBeCloseTo(r.k.stats.conv_pd + r.k.stats.div_pd, 0);
    expect(r.jump).toBeLessThanOrEqual(maxJump(r.k));
  });

  it("keeps the pair inside one jump, the screen and the 4 cm rule at every level, on every screen", () => {
    for (const [, width, props] of SCREENS) {
      const k = kitFor(width, props);
      for (let level = 1; level <= 10; level++) {
        k.level = level;
        const { turnIn, turnOut } = pair(k);
        expect(turnIn + turnOut).toBeLessThanOrEqual(maxJump(k) + 1e-9);
        expect(turnIn).toBeLessThanOrEqual(k.convMax);
        expect(turnOut).toBeLessThanOrEqual(k.divMax);
        expect(turnIn).toBeGreaterThan(0);
        expect(turnOut).toBeGreaterThan(0);
        /* About four to one wherever the 4 cm rule does not hold the turning out back. */
        if (turnOut < k.divMax - 0.1 && turnIn < k.convMax - 0.1) { expect(turnIn / turnOut).toBeGreaterThan(3.5); expect(turnIn / turnOut).toBeLessThan(4.5); }
      }
    }
  });

  it("reports no rate before a full cycle and 20 seconds, then keeps it up to date", () => {
    const seen: [number, number][] = [];
    play(SLUG, { seconds: 40, player: (k, _s, f) => { if (f % 60 === 0) ok(k); }, watch: (k, _s, f) => { if ("cycles_per_min" in k.stats) seen.push([f, k.stats.cycles_per_min]); } });
    /* A press a second from frame 0: the first flip is at frame 0, so the rate appears 20 seconds later. */
    expect(seen[0][0]).toBeGreaterThanOrEqual(20 * 60 - 1);
    expect(seen[0][0]).toBeLessThanOrEqual(20 * 60 + 2);
    expect(seen[seen.length - 1][1]).toBeGreaterThan(28);
    expect(seen[seen.length - 1][1]).toBeLessThanOrEqual(30);
    const one = play(SLUG, { seconds: 40, player: (k, _s, f) => { if (f === 0 || f === 60) ok(k); } });
    expect("cycles_per_min" in one.k.stats, "one flip is not a cycle").toBe(false);
  });

  it("does not count the flip under way when the picture split", () => {
    const r = play(SLUG, { seconds: 12, player: (k, _s, _f, t) => { if (at(t, 1, 2, 4, 5)) ok(k); if (at(t, 3)) split(k); } });
    expect(r.wrong).toEqual([]);
    /* Start, flip, split, a press that moves on without counting, flip. */
    expect(r.s.flips).toBe(2);
    expect(r.k.score).toBe(1);
    expect(r.k.stats.splits).toBe(1);
  });
});

describe("long-hold", () => {
  const SLUG = "long-hold";

  it("records nothing while the demand is at rest", () => {
    const r = play(SLUG, { seconds: 40 });
    expect(own(SLUG, r.k.stats)).toEqual([]);
    expect(r.high).toBe(0);
  });

  it("Up asks for 1 more, Left for 1 less, and the clock runs once the demand is there", () => {
    const r = play(SLUG, { seconds: 34, player: (k, _s, f) => { if (f < 60 && f % 10 === 0) k.input.pressed.add("up"); if (f === 70 || f === 80) k.input.pressed.add("left"); } });
    expect(r.wrong).toEqual([]);
    expect(r.s.d.goal).toBe(4);
    expect(r.s.d.now).toBeCloseTo(4, 9);
    /* Asked for 4 by 1.4 s, there by about 4 s: 30 seconds of hold, less the ramp. */
    expect(r.k.stats.hold_s).toBeGreaterThanOrEqual(28);
    expect(r.k.stats.hold_s).toBeLessThanOrEqual(31);
    expect(r.k.stats.hold_pd).toBe(4);
  });

  it("is playable by touch: a tap in the top half asks for more, in the bottom left for less", () => {
    const r = play(SLUG, { seconds: 10, player: (k, _s, f) => { if (f === 0 || f === 10 || f === 20) tap(k, 300, 60); if (f === 30) tap(k, 60, 300); } });
    expect(r.s.d.goal).toBe(2);
    const b = play(SLUG, { seconds: 10, player: (k, _s, f) => { if (f === 0 || f === 10 || f === 20) tap(k, 300, 60); if (f === 30) tap(k, W - 30, H - 30); } });
    expect(b.k.stats.splits, "a tap on the spot is a split, not a step down").toBe(1);
  });

  it("a split eases and starts the clock again; the longest hold and its demand are kept", () => {
    const r = play(SLUG, { seconds: 50, player: (k, _s, f, t) => { if (f < 60 && f % 10 === 0) k.input.pressed.add("up"); if (at(t, 30)) split(k); } });
    expect(r.wrong).toEqual([]);
    expect(r.s.d.goal).toBe(4);
    /* About 24 s at 6 before the split, then about 20 s at 4. */
    expect(r.k.stats.hold_s).toBeGreaterThanOrEqual(22);
    expect(r.k.stats.hold_s).toBeLessThanOrEqual(25);
    expect(r.k.stats.hold_pd).toBe(6);
    expect(Number(r.s.clock)).toBeLessThan(21);
  });

  it("at two minutes: one hit, one point, the words, and the demand goes back to rest", () => {
    const r = play(SLUG, { seconds: 135, player: (k, _s, f) => { if (f === 0 || f === 10) k.input.pressed.add("up"); } });
    expect(r.wrong).toEqual([]);
    expect(r.k.stats.hold_s).toBe(120);
    expect(r.k.stats.hold_pd).toBe(2);
    expect(r.k.score).toBe(1);
    expect(r.k.stats.hits).toBe(1);
    expect(r.s.d.now).toBe(0);
    expect(r.texts.some((t) => t.s === words.hold.done)).toBe(true);
  });

  it("never asks for more than the screen can show", () => {
    const r = play(SLUG, { seconds: 60, width: 360, player: (k, _s, f) => { if (f % 5 === 0) k.input.pressed.add("up"); } });
    expect(r.wrong).toEqual([]);
    expect(r.s.d.goal).toBe(Math.floor(r.k.convMax));
  });
});

describe("reading-under-demand", () => {
  const SLUG = "reading-under-demand";

  it("creeps to a goal of about 3 at level 1 and holds it", () => {
    const r = play(SLUG, { seconds: 15 });
    expect(r.s.d.now).toBeCloseTo(3, 9);
    expect(own(SLUG, r.k.stats)).toEqual([]);
  });

  it("a line every three seconds for a minute is 20 lines and about 20 lines a minute", () => {
    const r = play(SLUG, { seconds: 60, player: (k, _s, f) => { if ((f + 1) % 180 === 0) ok(k); } });
    expect(r.wrong).toEqual([]);
    expect(r.k.stats.lines).toBe(20);
    expect(r.k.stats.lines_per_min).toBeGreaterThanOrEqual(19.5);
    expect(r.k.stats.lines_per_min).toBeLessThanOrEqual(20.5);
    expect(r.k.score).toBe(20);
    expect(r.k.stats.hits, "a hit every third line").toBe(6);
    /* The goal rises with the level, and never past 70% of what the screen can show. */
    expect(r.k.stats.hold_pd).toBeGreaterThanOrEqual(3);
    expect(r.k.stats.hold_pd).toBeLessThanOrEqual(r.k.convMax * 0.7);
    expect(r.high).toBeLessThanOrEqual(r.k.convMax * 0.7 + 1e-9);
  });

  it("reports no rate in the first 20 seconds, and no demand held before a line is finished", () => {
    const r = play(SLUG, { seconds: 19, player: (k, _s, f) => { if (f === 300) ok(k); } });
    expect(r.k.stats.lines).toBe(1);
    expect("lines_per_min" in r.k.stats).toBe(false);
    expect(r.k.stats.hold_pd).toBeCloseTo(3, 1);
  });

  it("shows a new sentence for each line, and does not count a second tap", () => {
    const shown = new Set<string>();
    const r = play(SLUG, { seconds: 20, player: (k, _s, f) => { if (f % 120 < 10) ok(k); }, watch: (_k, s) => shown.add(words.sentences[Number(s.at)]) });
    /* Ten bursts of ten presses. The first comes before anyone could have read the sentence; each other counts once. */
    expect(r.k.stats.lines).toBe(9);
    expect(shown.size).toBe(10);
  });

  it("after a split: eases, waits three seconds, and climbs back to just under where it split", () => {
    const course: number[] = [];
    const r = play(SLUG, { seconds: 30, player: (k, _s, _f, t) => { if (at(t, 10)) split(k); }, watch: (_k, s) => course.push(s.d.now) });
    expect(r.wrong).toEqual([]);
    expect(course[10 * 60 + 60]).toBeCloseTo(1, 9);
    expect(course[13 * 60 - 10]).toBeCloseTo(1, 9);
    expect(r.s.d.now).toBeCloseTo(1.5, 9);
  });

  it("draws each eye's sentence with its own dot, and sets a long sentence in two lines that fit", () => {
    const k = kitFor(360), g = surface();
    const kk = makeKit(SIM_PROPS, () => g.g, 1);
    sizeKit(kk, SIM_PROPS, 20, 360, 2);
    const set = setLines(kk, "The children played until it got dark.", kk.letter, 400, 80);
    expect(set.lines).toHaveLength(2);
    expect(set.lines.join(" ")).toBe("The children played until it got dark.");
    for (const line of set.lines) expect(line.length * set.px * 0.7).toBeLessThanOrEqual(400 + 1e-6);
    expect(set.px * 2 * 1.3).toBeLessThanOrEqual(80 + 1e-6);
    /* With room to spare the sentence stays in one line at the member's letter size. */
    expect(setLines(kk, "The moon is bright tonight.", 20, 600, 200)).toEqual({ lines: ["The moon is bright tonight."], px: 20 });
    expect(k.letter).toBe(kk.letter);
  });
});

describe("distance-fusion-hold", () => {
  const SLUG = "distance-fusion-hold", [, width, props] = SCREENS[2];

  it("rises by 1 after every 20 seconds held, and counts the seconds held as one", () => {
    const r = play(SLUG, { width, props, seconds: 75 });
    expect(r.wrong).toEqual([]);
    expect(r.k.stats.hold_s).toBeGreaterThanOrEqual(74);
    expect(r.k.stats.hold_s).toBeLessThanOrEqual(75);
    /* 20 s at rest, 2 s to rise, 20 s at 1, 2 s to rise, 20 s at 2, then on the way to 3. */
    expect(r.s.d.goal).toBe(3);
    expect(r.k.stats.hold_pd, "2 was held ten seconds; 3 not yet").toBe(2);
    expect(r.k.score).toBe(3);
  });

  it("reports no demand as held before ten seconds at it", () => {
    const r = play(SLUG, { width, props, seconds: 31 });
    expect(r.s.d.now).toBeCloseTo(1, 9);
    expect("hold_pd" in r.k.stats).toBe(false);
    expect(r.k.stats.hold_s).toBeGreaterThanOrEqual(30);
  });

  it("a split eases, and the clocks wait five seconds", () => {
    const r = play(SLUG, { width, props, seconds: 60, player: (k, _s, _f, t) => { if (at(t, 50)) split(k); } });
    expect(r.wrong).toEqual([]);
    expect(r.s.d.now).toBe(0);
    expect(r.k.stats.hold_s).toBeGreaterThanOrEqual(54);
    expect(r.k.stats.hold_s).toBeLessThanOrEqual(55);
    expect(r.k.stats.splits).toBe(1);
  });

  it("stops rising at 80% of what the screen can show", () => {
    const r = play(SLUG, { seconds: 400 });
    expect(r.wrong).toEqual([]);
    expect(r.high).toBe(Math.floor(r.k.convMax * 0.8));
    expect(r.k.stats.hold_pd).toBe(Math.floor(r.k.convMax * 0.8));
    expect(r.k.score, "one point for each rise").toBe(Math.floor(r.k.convMax * 0.8));
  });
});
