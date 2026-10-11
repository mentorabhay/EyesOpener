// Eyes Opener: The still pictures of the "look and answer" clips, by scene name (src/data/clips/looks.ts).
/**
 * The still pictures of the "look and answer" clips, by scene name (src/data/clips/looks.ts).
 * Each draws on a canvas sized in real dots of the screen. `o.k` is the number of real dots to one page dot,
 * `o.gamma` the screen's tone curve, `o.t` the seconds since the scene began (only the two slow moving scenes use it).
 *
 * Nothing here flashes. The fine-line pictures are small patches, never the whole screen.
 */
import { SCENE_FIELD, SHARED_INK, channel, strongInk, weakInk } from "@/engine";

export interface PatternOpts { k: number; gamma: number; t: number }
export type Pattern = (g: CanvasRenderingContext2D, w: number, h: number, o: PatternOpts) => void;

const RED = strongInk(1), CYAN = weakInk(1);
const grey = (light: number, gamma: number) => { const v = channel(light, gamma); return `rgb(${v} ${v} ${v})`; };
const fill = (g: CanvasRenderingContext2D, colour: string, w: number, h: number) => { g.globalCompositeOperation = "source-over"; g.fillStyle = colour; g.fillRect(0, 0, w, h); };
const black = (g: CanvasRenderingContext2D, w: number, h: number) => fill(g, SCENE_FIELD, w, h);
function ring(g: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, colour: string) {
  g.strokeStyle = colour; g.lineWidth = width; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke();
}
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  g.fillStyle = colour; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill();
}
function label(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, colour: string) {
  g.fillStyle = colour; g.font = `700 ${Math.round(size)}px Verdana, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, x, y);
}
/** Lines one real dot wide, one on and one off in turn, inside a box. `on` and `off` are colours. */
function lines(g: CanvasRenderingContext2D, x: number, y: number, s: number, on: string, off: string, upright = false) {
  g.fillStyle = off; g.fillRect(x, y, s, s);
  g.fillStyle = on;
  for (let i = 0; i < s; i += 2) { if (upright) g.fillRect(x + i, y, 1, s); else g.fillRect(x, y + i, s, 1); }
}
/** Three boxes in a row, centred. Returns the side of a box and where each begins. */
function three(w: number, h: number) {
  const s = Math.floor(Math.min(h * 0.72, w * 0.26) / 2) * 2, gap = Math.floor((w - 3 * s) / 4), y = Math.floor((h - s) / 2);
  return { s, y, xs: [gap, 2 * gap + s, 3 * gap + 2 * s] };
}

/** A ghost shape in the wrong ink for the lens: a ring and a bar. */
const ghost = (ink: string): Pattern => (g, w, h) => {
  black(g, w, h);
  const r = Math.min(w, h) * 0.26;
  ring(g, w * 0.36, h / 2, r, Math.max(4, r * 0.18), ink);
  g.fillStyle = ink;
  g.fillRect(w * 0.6, h / 2 - r, r * 0.42, 2 * r);
};

export const PATTERNS: Record<string, Pattern> = {
  /* a line along each edge and an arrow in each corner: the picture must reach the very edge */
  edges: (g, w, h, { k }) => {
    black(g, w, h);
    const t = Math.max(2, Math.round(2 * k)), a = Math.round(Math.min(w, h) * 0.09);
    g.fillStyle = SHARED_INK;
    g.fillRect(0, 0, w, t); g.fillRect(0, h - t, w, t); g.fillRect(0, 0, t, h); g.fillRect(w - t, 0, t, h);
    for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [w, 0, -1, 1], [0, h, 1, -1], [w, h, -1, -1]] as const) {
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sx * a, cy); g.lineTo(cx, cy + sy * a); g.closePath(); g.fill();
    }
    ring(g, w / 2, h / 2, Math.min(w, h) * 0.2, t, SHARED_INK);
  },

  /* one-dot checks, flat lines and upright lines on mid grey: even grey from the seat only when nothing is stretched */
  pixels: (g, w, h, { gamma }) => {
    fill(g, grey(0.5, gamma), w, h);
    const { s, y, xs } = three(w, h);
    g.fillStyle = "#000"; g.fillRect(xs[0], y, s, s);
    g.fillStyle = "#fff";
    for (let j = 0; j < s; j++) for (let i = j % 2; i < s; i += 2) g.fillRect(xs[0] + i, y + j, 1, 1);
    lines(g, xs[1], y, s, "#fff", "#000");
    lines(g, xs[2], y, s, "#fff", "#000", true);
  },

  ghost_red: ghost(CYAN),
  ghost_cyan: ghost(RED),

  /* a cyan circle on the left and a red square on the right */
  lens_eye: (g, w, h) => {
    black(g, w, h);
    const r = Math.min(w * 0.16, h * 0.3);
    disc(g, w * 0.3, h / 2, r, CYAN);
    g.fillStyle = RED; g.fillRect(w * 0.7 - r, h / 2 - r, 2 * r, 2 * r);
  },

  /* a red circle, a cyan square and a white triangle */
  glasses_on: (g, w, h) => {
    black(g, w, h);
    const r = Math.min(w * 0.11, h * 0.28), y = h / 2;
    disc(g, w * 0.2, y, r, RED);
    g.fillStyle = CYAN; g.fillRect(w * 0.5 - r, y - r, 2 * r, 2 * r);
    g.fillStyle = SHARED_INK; g.beginPath(); g.moveTo(w * 0.8, y - r); g.lineTo(w * 0.8 + r * 1.1, y + r); g.lineTo(w * 0.8 - r * 1.1, y + r); g.closePath(); g.fill();
  },

  /* one square in both inks at once, inside a thin frame */
  white_merge: (g, w, h, { k }) => {
    black(g, w, h);
    const s = Math.round(Math.min(w, h) * 0.5), x = Math.round((w - s) / 2), y = Math.round((h - s) / 2);
    g.globalCompositeOperation = "lighter";
    g.fillStyle = RED; g.fillRect(x, y, s, s);
    g.fillStyle = CYAN; g.fillRect(x, y, s, s);
    g.globalCompositeOperation = "source-over";
    g.strokeStyle = "#555"; g.lineWidth = Math.max(1, k); g.strokeRect(x - 6 * k, y - 6 * k, s + 12 * k, s + 12 * k);
  },

  /* four faint squares on black: half, one, two and four percent of full light */
  black_steps: (g, w, h, { gamma }) => {
    black(g, w, h);
    const s = Math.round(Math.min(h * 0.5, w * 0.17)), gap = (w - 4 * s) / 5, y = Math.round((h - s) / 2);
    [0.005, 0.01, 0.02, 0.04].forEach((light, i) => {
      const x = Math.round(gap + i * (s + gap));
      g.fillStyle = grey(light, gamma); g.fillRect(x, y, s, s);
      label(g, String(i + 1), x + s / 2, y + s + Math.max(14, s * 0.22), Math.max(12, s * 0.2), "#666");
    });
  },

  /* six bars of red ink: 100, 50, 30, 15, 10 and 5 percent of full light. A white mark sits over the 15% bar. */
  ladder: (g, w, h, { gamma }) => {
    black(g, w, h);
    const steps = [1, 0.5, 0.3, 0.15, 0.1, 0.05], bw = Math.floor((w * 0.86) / steps.length), x0 = Math.round((w - bw * steps.length) / 2), top = Math.round(h * 0.22), tall = Math.round(h * 0.56);
    steps.forEach((c, i) => {
      g.fillStyle = strongInk(c, gamma); g.fillRect(x0 + i * bw, top, bw - 2, tall);
      if (c === 0.15) { g.fillStyle = SHARED_INK; g.beginPath(); g.moveTo(x0 + i * bw + bw / 2, top - 6); g.lineTo(x0 + i * bw + bw / 2 - 9, top - 20); g.lineTo(x0 + i * bw + bw / 2 + 9, top - 20); g.closePath(); g.fill(); }
    });
  },

  /* one even mid grey, with a small mark in the middle */
  even: (g, w, h, { gamma, k }) => { fill(g, grey(0.35, gamma), w, h); ring(g, w / 2, h / 2, 10 * k, Math.max(1, k), grey(0.2, gamma)); },

  /* a white square on a dark surround */
  warm: (g, w, h) => { fill(g, "#1c1d21", w, h); const s = Math.min(w, h) * 0.62; g.fillStyle = "#fff"; g.fillRect((w - s) / 2, (h - s) / 2, s, s); },

  /* a grey square on a darker surround */
  auto_bright: (g, w, h, { gamma }) => { fill(g, grey(0.04, gamma), w, h); const s = Math.min(w, h) * 0.6; g.fillStyle = grey(0.4, gamma); g.fillRect((w - s) / 2, (h - s) / 2, s, s); },

  /* three rows of blocks, red, green and blue, each from 80% to 100% of the colour in five even steps */
  picture_mode: (g, w, h) => {
    black(g, w, h);
    const levels = [204, 217, 230, 243, 255], bw = Math.floor((w * 0.8) / 5), bh = Math.floor((h * 0.72) / 3), x0 = Math.round((w - 5 * bw) / 2), y0 = Math.round((h - 3 * bh) / 2);
    ["r", "g", "b"].forEach((c, row) => levels.forEach((v, i) => {
      g.fillStyle = c === "r" ? `rgb(${v} 0 0)` : c === "g" ? `rgb(0 ${v} 0)` : `rgb(0 0 ${v})`;
      g.fillRect(x0 + i * bw, y0 + row * bh + 3, bw, bh - 6);
    }));
  },

  /* a white bar that glides across at a steady pace: one crossing in four seconds */
  smoothing: (g, w, h, { t }) => {
    black(g, w, h);
    const bw = Math.max(6, Math.round(w * 0.025)), x = ((t % 4) / 4) * (w + bw) - bw;
    g.fillStyle = SHARED_INK; g.fillRect(Math.round(x), Math.round(h * 0.15), bw, Math.round(h * 0.7));
  },

  /* a ring that grows once after each sound. `t` is the seconds since the last sound, or more than one when there was none. */
  sync: (g, w, h, { t, k }) => {
    black(g, w, h);
    const base = Math.min(w, h) * 0.12, grow = t >= 0 && t < 0.5 ? 1 + 1.6 * Math.sin((t / 0.5) * Math.PI) : 1;
    ring(g, w / 2, h / 2, base * grow, Math.max(3, 3 * k), SHARED_INK);
  },

  /* a thin cross and a thin ring, each drawn in red and in cyan at the same dots */
  zero_offset: (g, w, h, { k }) => {
    black(g, w, h);
    const t = Math.max(1, Math.round(k)), cx = Math.round(w / 2), cy = Math.round(h / 2), reach = Math.round(Math.min(w, h) * 0.38);
    g.globalCompositeOperation = "lighter";
    for (const ink of [RED, CYAN]) {
      g.fillStyle = ink;
      g.fillRect(cx - reach, cy, 2 * reach, t); g.fillRect(cx, cy - reach, t, 2 * reach);
      ring(g, cx + t / 2, cy + t / 2, reach * 0.6, t, ink);
    }
    g.globalCompositeOperation = "source-over";
  },

  /* fine lines one dot wide: red, cyan, and red next to cyan */
  fine_stripes: (g, w, h) => {
    black(g, w, h);
    const { s, y, xs } = three(w, h);
    lines(g, xs[0], y, s, RED, "#000", true);
    lines(g, xs[1], y, s, CYAN, "#000", true);
    lines(g, xs[2], y, s, RED, CYAN, true);
  },

  /* a white dot to aim at through the gap between the hands */
  sighting: (g, w, h) => { fill(g, "#1c1d21", w, h); disc(g, w / 2, h / 2, Math.min(w, h) * 0.05, SHARED_INK); },
};

/** Scenes that are drawn again for every picture, because they move. */
export const MOVING = new Set(["smoothing", "sync"]);
/** Scenes whose lines must reach the screen dot for dot: the canvas must not be smoothed. */
export const SHARP = new Set(["pixels", "fine_stripes", "zero_offset", "edges"]);
