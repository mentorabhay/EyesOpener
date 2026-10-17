// Eyes Opener: The game kit. A game labels what it draws as weaker-eye, stronger-eye or both-eyes ink and describes.
/**
 * The game kit. A game labels what it draws as weaker-eye, stronger-eye or both-eyes ink and describes
 * its rules; the kit does the rest: the member's contrast and target size, real-world units, input from
 * touch, keys and a TV remote, adaptive level, score, reduced motion.
 *
 * Everything is drawn in a 640 x 360 scene and scaled to the screen. It uses plain Canvas 2D so the same
 * games run in a browser, in the phone's WebView and in a TV's WebView.
 *
 * A game never sets contrast and never ends a session. The Stage around it owns the dose clock and the stop rule.
 */
import { channel, currentTune, trainRed, weakInk } from "@/engine";
import { defaultHero, type Sprite } from "./hero";

export type Ink = "weak" | "strong" | "both";
export const W = 640, H = 360;

/** What every game receives. Values come from the member's eye profile and device, set on the server. */
export interface GameProps {
  /** False before the session starts and after it ends: the game draws one still frame. */
  running: boolean;
  /** Stronger-eye contrast, 0.05 to 1, and the screen's gamma. */
  contrast: number;
  gamma: number;
  /** Smallest target this member should be given, in CSS pixels on this device. 0 when not measured. */
  targetPx: number;
  /** Height of two-eye letters for this member, in CSS pixels. 0 when not measured. */
  letterPx: number;
  /** CSS pixels per centimetre and viewing distance. 0 when the screen was never measured. */
  ppc: number;
  distCm: number;
  /** The eye behind the cyan lens. It sees the cyan ink: the weaker eye's, unless `weakInk` is "red". */
  cyanEye: "L" | "R";
  /** Which ink the weaker eye sees (engine/profile.ts, `WeakInk`). "cyan" when unset: the usual way. */
  weakInk?: "cyan" | "red";
  onScore: (score: number) => void;
  /**
   * The practice view for someone with no glasses at hand: the two eyes' pictures are drawn in one place, the way
   * joined eyes see them. Nothing is trained in this view; it only shows what "one picture" looks like.
   * `joined` is the page's switch; `view` is the same switch as an object the running game can read each frame.
   */
  joined?: boolean;
  view?: { joined: boolean };
  /**
   * Called once when a running game starts, with the live record of what the session measures (see `Kit.stats`).
   * The Stage keeps it and saves a copy when the session ends.
   */
  onStats?: (stats: Stats) => void;
  /**
   * The hero this member made in Draw Your Hero: a small grid of cells, already checked on the server.
   * Left out or null when the member has made none.
   */
  hero?: Sprite | null;
}

/**
 * What a session measured, as plain numbers by key. The kit fills `hits`, `misses`, `level` (where the member
 * ended) and `top` (the highest level reached). A game or drill adds its own with `k.report` and `k.peak`.
 */
export type Stats = Record<string, number>;

export interface Input {
  /** Pointer position in scene units. */
  x: number; y: number;
  down: boolean;
  /** True for the one frame in which a tap or click landed. */
  tapped: boolean;
  /** Direction from arrow keys, WASD or a remote: -1, 0 or 1 on each axis. */
  dx: number; dy: number;
  /** True for the one frame in which Space, Enter or OK was pressed. */
  action: boolean;
  /** True for as long as Space, Enter or OK is held down. */
  held: boolean;
  /** Every tap that landed in this frame, in scene units. Two people touching at once each get their own entry. */
  taps: { x: number; y: number }[];
  /** True for the one frame in which each direction key went down: "left", "right", "up", "down". */
  pressed: Set<string>;
}

export interface Kit {
  /** Seconds since the game started, and seconds since the last frame (at most 0.05). */
  t: number; dt: number;
  /** 0.35 when the member asked for reduced motion, else 1. Multiply speeds by it. */
  slow: number;
  /** Size factor, 1 or more. Multiply sketch sizes by it so targets are never smaller than the member can see. */
  k: number;
  /** Scene units in one centimetre on this screen, and the viewing distance in centimetres. */
  perCm: number; distCm: number;
  /** Letter height for this member in scene units (never under 14). */
  letter: number;
  /** Level 1 to 10. Three hits in a row raise it; two misses in a row lower it. */
  level: number;
  hit(): void;
  miss(): void;
  score: number;
  add(n?: number): void;
  /** The screen's gamma, for a scene that works out its own greys in real light. Inks already use it. */
  gamma: number;
  /** What this session has measured so far. Read it for the score line; write it with `report` and `peak`. */
  stats: Stats;
  /** Records a number under a key, replacing the one before: "flips a minute", "seconds held". */
  report(key: string, value: number): void;
  /** Records a number under a key only when it beats the one already there: "the furthest demand held". */
  peak(key: string, value: number): void;
  input: Input;
  /** The drawing context for an ink, with fill and stroke already set to that ink. */
  ctx(ink: Ink): CanvasRenderingContext2D;
  disc(x: number, y: number, r: number, ink: Ink): void;
  ring(x: number, y: number, r: number, ink: Ink, width?: number): void;
  box(x: number, y: number, w: number, h: number, ink: Ink, filled?: boolean, width?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, ink: Ink, width?: number): void;
  poly(points: [number, number][], ink: Ink, filled?: boolean, width?: number): void;
  text(s: string, x: number, y: number, ink: Ink, size?: number, align?: CanvasTextAlign): void;
  /** The white frame both eyes see. Draw it in every scene: it holds the two eyes together. */
  frame(): void;
  /** True when the member has made a hero. A game with a character of its own may keep that character when this is false. */
  hasHero: boolean;
  /**
   * Draws the member's hero in one ink, or the kit's own figure when the member has made none.
   * The hero is fitted into a square `size` units a side that stands on (x, y): x is its middle, y is under its feet.
   * `lean` tips it over: the top moves that many units sideways and the feet stay where they are.
   * Returns the width and height that were drawn. The hero is ink like any other shape: where it is what the
   * weaker eye must find, draw it in weaker-eye ink.
   */
  hero(x: number, y: number, size: number, ink: Ink, lean?: number): { w: number; h: number };
  /**
   * Draw one shape for each eye, pulled apart by a vergence demand in prism dioptres.
   * Positive turns the eyes in (convergence); negative turns them out (divergence).
   * `draw` is called twice with the ink for that eye and the sideways shift to add to x.
   */
  fuse(prism: number, draw: (ink: Ink, shift: number) => void): void;
  /**
   * Draw one shape for each eye with a depth step in arcseconds. Positive floats the shape in front of
   * the screen, negative sinks it behind. Steps under `pxArcsec` are finer than this screen can show.
   */
  depth(arcsec: number, draw: (ink: Ink, shift: number) => void): void;
  /** Scene units of separation for a demand in prism dioptres: 1 prism dioptre is 1 cm at 1 m. */
  prismUnits(prism: number): number;
  /** Scene units for an angle in arcseconds at this viewing distance. */
  arcsecUnits(arcsec: number): number;
  /**
   * The largest demand `fuse` will draw, in prism dioptres. Turning in is limited by the width of the screen.
   * Turning out is limited to 4 cm of separation, safely under the distance between a child's eyes,
   * so the eyes are never asked to point outward past straight ahead. `fuse` clamps to these.
   */
  convMax: number; divMax: number;
  /** The angle of one screen pixel in arcseconds: the finest depth step this screen can show. */
  pxArcsec: number;
  /** Writes one line for both eyes in the top left corner, at the member's letter size. Use it for the score. */
  hud(s: string): void;
  rand(): number;
  pick<T>(list: readonly T[]): T;
}

export interface GameDef<S> {
  /** Sketch size of the main target in scene units (default 20). The kit enlarges the scene from this. */
  target?: number;
  /** True when the game is drawn on top of a film: the field stays clear instead of black. */
  overlay?: boolean;
  init(k: Kit): S;
  update(k: Kit, s: S): void;
  draw(k: Kit, s: S): void;
}

const KEYS: Record<string, [number, number, string]> = {
  ArrowLeft: [-1, 0, "left"], ArrowRight: [1, 0, "right"], ArrowUp: [0, -1, "up"], ArrowDown: [0, 1, "down"],
  a: [-1, 0, "left"], d: [1, 0, "right"], w: [0, -1, "up"], s: [0, 1, "down"],
};

type Ctx = CanvasRenderingContext2D;

/** The inside edge of the white frame: nothing a game draws shows outside it. */
export const INSIDE = { x0: 6, y0: 6, x1: W - 6, y1: H - 6 } as const;
/** Text keeps this far from the edge of the scene, inside the frame's line. */
const TEXT_EDGE = 10;

/**
 * Fits one line of text inside the frame. The room is what is left between the anchor point and the frame for
 * this alignment. A line too wide is made smaller, but never under `least` (the member's letter size, or the size
 * asked for when that is smaller); still too wide, it is broken into two or three lines at spaces (centred on the
 * anchor line). Only a line that fits in none of these ways goes smaller still. A single long word near an edge is
 * moved inward instead, so it ends at the frame. A line that already fits is never touched.
 */
export function fitText(s: string, x: number, size: number, align: CanvasTextAlign, width: (size: number, text: string) => number, least = size * 0.6) {
  const lo = TEXT_EDGE, hi = W - TEXT_EDGE;
  const roomAt = (ax: number) => (align === "center" ? 2 * Math.min(ax - lo, hi - ax) : align === "right" || align === "end" ? ax - lo : hi - ax);
  const room = roomAt(x);
  /* No letter of the kit's face is wider than its size, so a short line is known to fit without measuring it. */
  if (!(room > 0) || s.length * size <= room || width(size, s) <= room) return { size, lines: [s], x };
  const floor = Math.min(size, Math.max(10, least)), wide = width(size, s), shrunk = Math.max(floor, (size * room) / wide);
  if (width(shrunk, s) <= room) return { size: shrunk, lines: [s], x };
  const words = s.split(" ");
  if (words.length < 2) {
    /* one word: keep the smaller size and move it inward so it ends at the frame */
    const w = width(shrunk, s);
    const nx = align === "center" ? W / 2 : align === "right" || align === "end" ? Math.max(x, lo + w) : Math.min(x, hi - w);
    return { size: Math.max(10, Math.min(shrunk, (shrunk * (hi - lo)) / w)), lines: [s], x: nx };
  }
  const split = (n: number) => {
    /* n lines of about equal width, cut at spaces */
    const total = width(size, s), lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && lines.length < n - 1 && width(size, next) > total / n) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    return lines;
  };
  let best = { size: 10, lines: [s] };
  for (const n of [2, 3]) {
    const lines = split(n), longest = Math.max(...lines.map((t) => width(size, t)));
    const fitSize = Math.min(size, (size * room) / longest);
    if (fitSize >= floor) return { size: fitSize, lines, x };
    if (fitSize > best.size) best = { size: fitSize, lines };
  }
  return { size: Math.max(10, best.size), lines: best.lines, x };
}

/** Builds the kit a game talks to. `ctxOf` gives the drawing surface for each ink. */
export function makeKit(p: GameProps, ctxOf: (ink: Ink) => Ctx, slow: number, rand: () => number = Math.random): Kit {
  /* the inks of this screen's tuning for its glasses (engine/tune.ts): less green in the cyan, a ceiling on the red */
  const tune = currentTune(), swapped = p.weakInk === "red";
  /* The usual way: the weaker eye's cyan at full, the stronger eye's red at its contrast under the ceiling.
     Swapped: the weaker eye's red at full (the ceiling is only ever for the stronger eye), the stronger eye's cyan at its contrast. */
  const colour: Record<Ink, string> = swapped
    ? { weak: `rgb(${channel(1, p.gamma)} 0 0)`, strong: weakInk(p.contrast, p.gamma, tune), both: "#fff" }
    : { weak: weakInk(1, p.gamma, tune), strong: `rgb(${channel(trainRed(p.contrast, tune), p.gamma)} 0 0)`, both: "#fff" };
  const input: Input = { x: W / 2, y: H / 2, down: false, tapped: false, dx: 0, dy: 0, action: false, held: false, taps: [], pressed: new Set() };
  /* the weaker eye is behind the cyan lens, or behind the red lens when the inks are swapped */
  const weakIsLeft = swapped ? p.cyanEye === "R" : p.cyanEye === "L";
  const left: Ink = weakIsLeft ? "weak" : "strong", right: Ink = weakIsLeft ? "strong" : "weak";
  let streak = 0, misses = 0;
  const stats: Stats = { hits: 0, misses: 0, level: 1, top: 1 };
  const own = p.hero && Array.isArray(p.hero.rows) && p.hero.rows.length ? p.hero : null;
  const lvl = (n: number) => { k.level = n; stats.level = n; stats.top = Math.max(stats.top, n); };
  const num = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
  /* Crossed images make the eyes turn in: the left eye's picture sits to the right, the right eye's to the left. */
  const split = (sep: number, draw: (ink: Ink, shift: number) => void) => {
    const gap = (p.view?.joined ?? p.joined) ? 0 : sep;
    draw(left, gap / 2);
    draw(right, -gap / 2);
  };
  const k: Kit = {
    t: 0, dt: 0, slow, k: 1, perCm: 37.8, distCm: p.distCm || 50, letter: 22, level: 1, score: 0, input,
    convMax: 20, divMax: 8, pxArcsec: 100, stats, gamma: p.gamma > 0 ? p.gamma : 2.2,
    hit() { stats.hits++; misses = 0; if (++streak >= 3) { streak = 0; lvl(Math.min(10, k.level + 1)); } },
    miss() { stats.misses++; streak = 0; if (++misses >= 2) { misses = 0; lvl(Math.max(1, k.level - 1)); } },
    add(n = 1) { k.score += n; p.onScore(k.score); },
    report(key, value) { stats[key] = num(value); },
    peak(key, value) { const v = num(value); if (!(key in stats) || v > stats[key]) stats[key] = v; },
    ctx(ink) { const g = ctxOf(ink); g.fillStyle = g.strokeStyle = colour[ink]; return g; },
    disc(x, y, r, ink) { const g = k.ctx(ink); g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); g.fill(); },
    ring(x, y, r, ink, width = 3) { const g = k.ctx(ink); g.lineWidth = width; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); g.stroke(); },
    box(x, y, w, h, ink, filled = true, width = 3) { const g = k.ctx(ink); if (filled) g.fillRect(x, y, w, h); else { g.lineWidth = width; g.strokeRect(x, y, w, h); } },
    line(x1, y1, x2, y2, ink, width = 3) { const g = k.ctx(ink); g.lineWidth = width; g.lineCap = "round"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); },
    poly(points, ink, filled = true, width = 3) {
      const g = k.ctx(ink); g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      if (filled) g.fill(); else { g.lineWidth = width; g.lineJoin = "round"; g.stroke(); }
    },
    text(s, x, y, ink, size = 20, align = "left") {
      const g = k.ctx(ink), font = (n: number) => `700 ${n}px Verdana, sans-serif`;
      g.font = font(size); g.textAlign = align; g.textBaseline = "alphabetic";
      /* A line never runs past the frame: it is made smaller first, then broken in two (fitText). */
      const fit = fitText(s, x, size, align, (n, t) => { g.font = font(n); return g.measureText(t)?.width ?? 0; }, k.letter);
      if (fit.size !== size) g.font = font(fit.size);
      /* Broken lines sit around the line asked for, moved up or down as a block so none leaves the frame. */
      const gap = fit.size * 1.1, n = fit.lines.length;
      let first = y - ((n - 1) / 2) * gap;
      if (n > 1) first = Math.max(INSIDE.y0 + 4 + fit.size, Math.min(first, INSIDE.y1 - 6 - (n - 1) * gap));
      fit.lines.forEach((t, i) => g.fillText(t, fit.x, first + i * gap));
    },
    frame() { k.box(8, 8, W - 16, H - 16, "both", false, 3); },
    hasHero: !!own,
    hero(x, y, size, ink, lean = 0) {
      const sp = own ?? defaultHero(), g = k.ctx(ink), c = size / Math.max(sp.w, sp.h), left = x - (sp.w * c) / 2, top = y - sp.h * c;
      /* One path for the whole shape, so its cells join with no seams and a dimmed hero is dimmed evenly. */
      g.beginPath();
      sp.rows.forEach((row, r) => {
        const y0 = top + r * c, s0 = lean * (1 - r / sp.h), s1 = lean * (1 - (r + 1) / sp.h);
        for (let i = 0; i < row.length; i += 2) {
          const x0 = left + row[i] * c, x1 = x0 + row[i + 1] * c;
          g.moveTo(x0 + s0, y0); g.lineTo(x1 + s0, y0); g.lineTo(x1 + s1, y0 + c); g.lineTo(x0 + s1, y0 + c); g.closePath();
        }
      });
      g.fill();
      return { w: sp.w * c, h: sp.h * c };
    },
    hud(s) {
      /* A long line at a large letter size is shrunk to fit the scene rather than run off it. */
      const g = k.ctx("both");
      g.font = `700 ${k.letter}px Verdana, sans-serif`;
      const wide = g.measureText(s)?.width ?? 0;
      k.text(s, 22, 18 + k.letter, "both", wide > W - 44 ? (k.letter * (W - 44)) / wide : k.letter);
    },
    fuse(prism, draw) { split(k.prismUnits(Math.max(-k.divMax, Math.min(k.convMax, prism))), draw); },
    depth(arcsec, draw) { split(k.arcsecUnits(arcsec), draw); },
    prismUnits: (prism) => ((prism * k.distCm) / 100) * k.perCm,
    arcsecUnits: (arcsec) => k.distCm * Math.tan((arcsec / 3600) * (Math.PI / 180)) * k.perCm,
    rand,
    pick: (list) => list[Math.floor(rand() * list.length)],
  };
  return k;
}

/** Sets everything that depends on how wide the scene is on screen. `width` is in CSS pixels, `dpr` device pixels per CSS pixel. */
export function sizeKit(k: Kit, p: GameProps, target: number, width: number, dpr: number) {
  k.k = Math.max(1, (p.targetPx * W) / width / target);
  k.perCm = ((p.ppc || 37.8) * W) / width;
  k.letter = Math.max(14, (p.letterPx * W) / width);
  /* Turning in: the two pictures may sit at most 40% of the scene apart, and never past 30 prism dioptres. */
  k.convMax = Math.min(30, ((0.4 * W) / k.perCm / k.distCm) * 100);
  k.divMax = Math.min(k.convMax, (4 / k.distCm) * 100);
  k.pxArcsec = Math.atan(1 / ((p.ppc || 37.8) * dpr) / k.distCm) * (180 / Math.PI) * 3600;
}

/** Runs a game on a canvas. Returns a function that stops it and removes its listeners. */
export function mount<S>(cv: HTMLCanvasElement, def: GameDef<S>, p: GameProps): () => void {
  const main = cv.getContext("2d")!;
  const layers = { weak: document.createElement("canvas"), strong: document.createElement("canvas"), both: document.createElement("canvas") };
  const ctxs = { weak: layers.weak.getContext("2d")!, strong: layers.strong.getContext("2d")!, both: layers.both.getContext("2d")! };
  const held = new Set<string>();
  const k = makeKit(p, (ink) => ctxs[ink], matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.35 : 1);
  const input = k.input;
  let raf = 0, last = performance.now();

  const fit = () => {
    const width = cv.getBoundingClientRect().width || W;
    cv.width = Math.round(width * devicePixelRatio);
    cv.height = Math.round((cv.width * H) / W);
    for (const l of Object.values(layers)) { l.width = cv.width; l.height = cv.height; }
    sizeKit(k, p, def.target ?? 20, width, devicePixelRatio);
  };
  const paint = (state: S) => {
    const sx = cv.width / W, sy = cv.height / H;
    for (const g of Object.values(ctxs)) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(sx, 0, 0, sy, 0, 0);
      /* Everything a game draws stays inside the white frame: scenery, sparks and words never spill past it. */
      g.save(); g.beginPath(); g.rect(INSIDE.x0, INSIDE.y0, INSIDE.x1 - INSIDE.x0, INSIDE.y1 - INSIDE.y0); g.clip();
    }
    def.draw(k, state);
    for (const g of Object.values(ctxs)) g.restore();
    /* Each ink is drawn on its own layer, so two shapes of one ink never add up past that ink's contrast.
       The layers are then added together: where red and cyan overlap, both eyes see light. */
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.globalCompositeOperation = "source-over";
    if (def.overlay) main.clearRect(0, 0, cv.width, cv.height);
    else { main.fillStyle = "#000"; main.fillRect(0, 0, cv.width, cv.height); }
    main.globalCompositeOperation = "lighter";
    main.drawImage(layers.strong, 0, 0);
    main.drawImage(layers.weak, 0, 0);
    main.drawImage(layers.both, 0, 0);
  };

  fit();
  const state = def.init(k);
  paint(state);
  if (p.running) p.onStats?.(k.stats);

  const fingers = new Set<number>();
  const at = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); input.x = ((e.clientX - r.left) * W) / r.width; input.y = ((e.clientY - r.top) * H) / r.height; };
  const down = (e: PointerEvent) => {
    at(e);
    fingers.add(e.pointerId);
    input.down = input.tapped = true;
    input.taps.push({ x: input.x, y: input.y });
    cv.focus({ preventScroll: true });
  };
  /* With two fingers down, the position follows the newest touch; "down" stays true until the last finger lifts. */
  const move = (e: PointerEvent) => { if (!fingers.size || fingers.has(e.pointerId)) at(e); };
  const up = (e: PointerEvent) => { fingers.delete(e.pointerId); input.down = fingers.size > 0; };
  const axes = () => { input.dx = (held.has("right") ? 1 : 0) - (held.has("left") ? 1 : 0); input.dy = (held.has("down") ? 1 : 0) - (held.has("up") ? 1 : 0); };
  const keydown = (e: KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (dir) { if (!held.has(dir[2])) input.pressed.add(dir[2]); held.add(dir[2]); axes(); e.preventDefault(); }
    else if (e.key === " " || e.key === "Enter") { if (!e.repeat) input.action = true; input.held = true; e.preventDefault(); }
    /* The game keeps the arrows while it has the focus. Esc (Back on a TV remote) hands the focus to the Stop button. */
    else if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack") {
      const stop = document.querySelector<HTMLElement>("[data-stop]");
      if (stop) { stop.focus(); e.preventDefault(); }
    }
  };
  const keyup = (e: KeyboardEvent) => {
    const dir = KEYS[e.key];
    if (dir) { held.delete(dir[2]); axes(); }
    else if (e.key === " " || e.key === "Enter") input.held = false;
  };
  /* Keys held when the focus leaves would otherwise stay "down" for ever. */
  const blur = () => { held.clear(); axes(); input.held = false; };
  const loop = (now: number) => {
    k.dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    k.t += k.dt;
    def.update(k, state);
    paint(state);
    input.tapped = input.action = false;
    input.taps.length = 0;
    input.pressed.clear();
    raf = requestAnimationFrame(loop);
  };
  const resize = new ResizeObserver(() => { fit(); paint(state); });
  resize.observe(cv);

  if (p.running) {
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    cv.addEventListener("keydown", keydown);
    cv.addEventListener("keyup", keyup);
    cv.addEventListener("blur", blur);
    cv.focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  }
  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    cv.removeEventListener("pointerdown", down);
    cv.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    cv.removeEventListener("keydown", keydown);
    cv.removeEventListener("keyup", keyup);
    cv.removeEventListener("blur", blur);
  };
}
