// Eyes Opener: Lantern Run. A runner carries a lantern through a night market that scrolls past.
/**
 * Lantern Run. A runner carries a lantern through a night market that scrolls past.
 *
 * Weaker-eye ink: the runner and the coins. Every coin hangs just too high to be run into, so it is only
 * collected by a jump timed from where the coin and the runner are, and coins are the only thing that
 * scores. With the stronger eye alone there is no runner and no coin to time a jump from.
 * A member who has made a hero in Draw Your Hero runs as that hero: the same place, the same height, the
 * same weaker-eye ink, with the lantern carried in front. The rules do not change with the shape.
 * Stronger-eye ink, at that eye's contrast: what is in the way. Crates and stalls stand on the ground
 * and have to be jumped; signs hang overhead and have to be run under. Hitting one is a quiet stumble:
 * the pace eases and the lantern goes out until the next one is passed cleanly, and only a lit lantern
 * takes coins. So jumping all the time pays little, and so does watching the coins alone: the stronger
 * eye has to say when to jump and when to stay down.
 * Both eyes: the frame, the ground with its cobbles, the string of lanterns overhead and the score. They
 * give the two eyes the same street to stand on.
 */
import { games as t } from "@/copy/games-dgame";
import { H, W, type GameDef, type Kit } from "../kit";
import { inside, tick, topOf } from "./shared";

type Kind = "coin" | "crate" | "stall" | "sign";
/** `h` is in runner units: how high a coin hangs, how tall a crate or stall is, or how far above the ground a sign ends. */
interface Item { kind: Kind; x: number; h: number; done: boolean }
interface Spark { x: number; y: number; age: number }
interface State {
  items: Item[]; sparks: Spark[];
  /** Height of the feet above the ground, and upward speed. */
  f: number; vy: number;
  /** A jump asked for just before landing still counts. */
  buffer: number;
  /** 1 at full pace; drops after a stumble and climbs back. */
  ease: number; stumble: number;
  /** True after a stumble: the lantern is out until the next obstacle is passed cleanly. */
  dark: boolean;
  step: number; scroll: number;
  /** Obstacles in a row, so coins never stay away for long. */
  row: number;
}

const GROUND = H - 34, GRAVITY = 575;
/** Width and height of each obstacle in runner units. A sign's bottom edge hangs 42 units up: the runner fits under it, a jump does not. */
export const SIZE = { crate: [20, 18], stall: [26, 24], sign: [24, 14] } as const;
const COIN = 10, BODY = 34, UNDER = 42;

/**
 * Everything is drawn in runner units `u`: never under the member's target size, large enough to fill the
 * street on a big screen, and clamped so a full jump still fits under the score line.
 */
export function lay(k: Kit) {
  const top = topOf(k), u = Math.min(Math.max(k.k, 2), (GROUND - top) / 86), root = Math.sqrt(u);
  return { top, u, root, rx: 44 + 24 * u, pace: (112 + 7 * k.level) * root };
}
type Lay = ReturnType<typeof lay>;

/** Far enough apart that one jump is over before the next thing arrives; closer as the level rises. */
const gap = (k: Kit, l: Lay) => l.pace * (0.96 * l.root + 1.5 - 0.11 * k.level + k.rand() * 0.6);

function add(k: Kit, s: State, x: number, kind?: Kind) {
  const what: Kind = kind ?? (s.row >= 2 || k.rand() < 0.5 ? "coin" : k.pick(["crate", "stall", "sign", "sign"] as const));
  s.row = what === "coin" ? 0 : s.row + 1;
  s.items.push({ kind: what, x, h: what === "coin" ? 58 + k.rand() * (2 + k.level * 1.2) : what === "sign" ? UNDER : SIZE[what][1], done: false });
}

function fill(k: Kit, s: State, l: Lay) {
  for (let n = 0; n < 12; n++) {
    const last = s.items.length ? s.items[s.items.length - 1].x : l.rx;
    if (last > W + 40 * l.u) return;
    add(k, s, last + gap(k, l));
  }
}

export const lanternRun: GameDef<State> = {
  target: 20,

  init(k) {
    const l = lay(k);
    const s: State = { items: [], sparks: [], f: 0, vy: 0, buffer: 0, ease: 1, stumble: 0, dark: false, step: 0, scroll: 0, row: 0 };
    /* The still picture shows the three things the run is made of: a coin to jump for, a crate to jump over, a sign to stay under. */
    add(k, s, l.rx + (W - l.rx) * 0.24, "coin");
    add(k, s, l.rx + (W - l.rx) * 0.55, "crate");
    add(k, s, l.rx + (W - l.rx) * 0.86, "sign");
    fill(k, s, l);
    return s;
  },

  update(k, s) {
    const l = lay(k), u = l.u, dt = tick(k), i = k.input;
    s.ease = Math.min(1, s.ease + 0.22 * dt);
    s.stumble = Math.max(0, s.stumble - dt);
    const move = l.pace * s.ease * dt;

    s.buffer = i.tapped || i.action || i.pressed.has("up") ? 0.16 : Math.max(0, s.buffer - k.dt);
    if (s.buffer > 0 && s.f <= 0) { s.vy = 230 * l.root; s.buffer = 0; }
    s.vy -= GRAVITY * dt;
    s.f += s.vy * dt;
    if (s.f <= 0) { s.f = 0; s.vy = 0; }

    for (const o of s.items) {
      o.x -= move;
      if (o.done) continue;
      if (o.kind === "coin") {
        const c = o.h * u;
        if (!s.dark && Math.abs(o.x - l.rx) < (8 + COIN) * u && c > s.f - COIN * u && c < s.f + (BODY + COIN) * u) {
          o.done = true;
          s.sparks.push({ x: o.x, y: GROUND - c, age: 0 });
          k.add();
          k.hit();
        }
        continue;
      }
      /* A crate or stall is hit by feet that are too low; a sign by a head that is too high. Both are judged kindly. */
      const [w, h] = SIZE[o.kind], reach = o.x + 3 * u < l.rx + 6 * u && o.x + (w - 3) * u > l.rx - 6 * u;
      if (reach && (o.kind === "sign" ? s.f + (BODY + 2) * u > (UNDER + 4) * u : s.f < (h - 3) * u)) {
        o.done = true;
        s.ease = 0.5;
        s.stumble = 0.7;
        s.dark = true;
        k.miss();
      } else if (o.x + w * u < l.rx - 6 * u) {
        o.done = true;
        s.dark = false;
      }
    }
    s.items = s.items.filter((o) => o.x > -40 * u && !(o.kind === "coin" && o.done));
    fill(k, s, l);

    for (const p of s.sparks) p.age += dt;
    s.sparks = s.sparks.filter((p) => p.age < 0.5);
    s.step += (move / (60 * u)) * 6.2832;
    s.scroll += move;
  },

  draw(k, s) {
    const l = lay(k), u = l.u;
    k.frame();
    const done = inside(k);

    /* The street both eyes share: ground, cobbles, and a string of lanterns drifting by more slowly. */
    k.line(14, GROUND, W - 14, GROUND, "both", 3);
    for (let x = W - 14 - (s.scroll % 48); x > 26; x -= 48) k.line(x, GROUND + 8, x - 9, GROUND + 15, "both", 2);
    const g = k.ctx("both"), span = 170, y0 = l.top + 4, off = (s.scroll * 0.25) % span;
    g.globalAlpha = 0.4;
    g.lineWidth = 1.5;
    for (let x = -off; x < W; x += span) {
      g.beginPath();
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + span / 2, y0 + 26, x + span, y0);
      g.stroke();
      for (const p of [0.25, 0.5, 0.75]) {
        const lx = x + span * p, ly = y0 + 26 * 2 * p * (1 - p) + 5;
        g.beginPath();
        g.arc(lx, ly, 3.5, 0, 6.2832);
        g.fill();
      }
    }
    g.globalAlpha = 1;

    for (const o of s.items) {
      if (o.x > W + 30 * u) continue;
      if (o.kind === "crate") {
        const [w, h] = SIZE.crate;
        k.box(o.x, GROUND - h * u, w * u, h * u, "strong", false, 2.5 * u);
        k.box(o.x + 5 * u, GROUND - (h - 5) * u, (w - 10) * u, (h - 10) * u, "strong");
      } else if (o.kind === "stall") {
        const [w, h] = SIZE.stall, x = o.x, y = GROUND - h * u;
        k.poly([[x - 3 * u, y + 8 * u], [x + 3 * u, y], [x + (w - 3) * u, y], [x + (w + 3) * u, y + 8 * u]], "strong");
        k.line(x + 3 * u, y + 8 * u, x + 3 * u, GROUND - 10 * u, "strong", 2.5 * u);
        k.line(x + (w - 3) * u, y + 8 * u, x + (w - 3) * u, GROUND - 10 * u, "strong", 2.5 * u);
        k.box(x, GROUND - 10 * u, w * u, 10 * u, "strong");
      } else if (o.kind === "sign") {
        /* A shop sign on two cords from the lantern string: low enough to catch a jump, high enough to run under. */
        const [w, h] = SIZE.sign, y = GROUND - (UNDER + h) * u;
        k.line(o.x + 5 * u, l.top + 6, o.x + 5 * u, y, "strong", 1.8 * u);
        k.line(o.x + (w - 5) * u, l.top + 6, o.x + (w - 5) * u, y, "strong", 1.8 * u);
        k.box(o.x, y, w * u, h * u, "strong");
      } else {
        /* A coin turns slowly in the air. */
        const c = k.ctx("weak");
        c.beginPath();
        c.ellipse(o.x, GROUND - o.h * u, COIN * u * (0.8 + 0.2 * Math.cos(k.t * k.slow * 2 + o.h)), COIN * u, 0, 0, 6.2832);
        c.fill();
      }
    }
    for (const p of s.sparks) {
      const c = k.ctx("weak");
      c.globalAlpha = 1 - p.age / 0.5;
      k.ring(p.x, p.y, (COIN + p.age * 14) * u, "weak", 2 * u);
      c.globalAlpha = 1;
    }

    /* The runner, tipped forward for a moment after a stumble, and dimmed while the lantern is out. Points are placed by hand: no canvas transform. */
    const me = k.ctx("weak");
    me.globalAlpha = s.dark ? 0.5 : 1;
    const a = 0.08 + 0.6 * Math.sin((s.stumble / 0.7) * Math.PI), cos = Math.cos(a), sin = Math.sin(a), fy = GROUND - s.f;
    if (k.hasHero) {
      /* The member's own hero is the runner: as tall as the runner, feet on the same spot, with a small step in its walk. */
      const tall = (BODY + 1) * u, hop = s.f > 0 ? 0 : Math.abs(Math.sin(s.step)) * 1.2 * u, lean = tall * sin;
      const { w, h } = k.hero(l.rx, fy - hop, tall, "weak", lean);
      /* The lantern hangs from a short arm in front, lit or out, as it does for the runner. */
      const hx = l.rx + w / 2 + lean * 0.6, hy = fy - hop - h * 0.62, lx = hx + 6 * u, ly = hy + 8 * u;
      k.line(hx - 3 * u, hy, lx, hy, "weak", 1.8 * u);
      k.line(lx, hy, lx, ly - 4 * u, "weak", 1.5 * u);
      k.ring(lx, ly, 4 * u, "weak", 1.5 * u);
      if (!s.dark) k.disc(lx, ly, 2.2 * u, "weak");
      me.globalAlpha = 1;
      done();
      k.hud(`${t.lanternRun.coins} ${k.score}`);
      return;
    }
    const at = (x: number, y: number): [number, number] => [l.rx + (x * cos - y * sin) * u, fy + (x * sin + y * cos) * u];
    const limb = (p: [number, number], q: [number, number], w: number) => k.line(p[0], p[1], q[0], q[1], "weak", w * u);
    const swing = Math.sin(s.step), hip = at(0, -13);
    if (s.f > 0) { limb(hip, at(-7, -5), 4); limb(hip, at(6, -6), 4); }
    else { limb(hip, at(7 * swing, 0), 4); limb(hip, at(-7 * swing, -2 * Math.abs(swing)), 4); }
    limb(hip, at(1, -24), 7.5);
    const head = at(2, -29.5), hand = at(10, -21), lamp = at(11.5, -13);
    k.disc(head[0], head[1], 5.5 * u, "weak");
    limb(at(1, -23), hand, 3);
    k.line(hand[0], hand[1], lamp[0], lamp[1] - 4 * u, "weak", 1.5 * u);
    k.ring(lamp[0], lamp[1], 4 * u, "weak", 1.5 * u);
    if (!s.dark) k.disc(lamp[0], lamp[1], 2.2 * u, "weak");
    me.globalAlpha = 1;

    done();
    k.hud(`${t.lanternRun.coins} ${k.score}`);
  },
};
