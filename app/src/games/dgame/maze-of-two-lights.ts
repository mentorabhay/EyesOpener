/**
 * Maze of Two Lights. A ball of light rolls, cell by cell, through a maze to a second light: the way out.
 *
 * Weaker-eye ink: the ball. It starts each maze in a place the member has not seen it go to, so the only
 * way to know where it is, and which way to send it, is to see it with the weaker eye.
 * Stronger-eye ink, at that eye's contrast: the walls. Without them the member rolls into walls and dead
 * ends; a maze solved with few bumps raises the level, one solved by bumping around lowers it.
 * Both eyes: the frame, the exit light and the score. The exit is the anchor both eyes agree on, and the
 * route to it only exists when the ball from one eye is laid over the walls from the other.
 */
import { games as t } from "@/copy/games-dgame";
import { H, W, type GameDef, type Kit } from "../kit";
import { clamp, tick, topOf } from "./shared";

/** `east[c]` is the wall on the right of cell c, `south[c]` the wall under it. Cells are numbered row by row. */
export interface Maze { cols: number; rows: number; east: boolean[]; south: boolean[] }
interface State {
  maze: Maze;
  /** The ball's cell, the cell it is rolling from, and how far along it is (0 to 1). */
  bx: number; by: number; fx: number; fy: number; go: number;
  ex: number; ey: number;
  /** A short lean into a wall the member rolled at. */
  bump: { dx: number; dy: number; age: number } | null;
  bumps: number;
  /** A key pressed while the ball was still rolling. */
  queued: readonly [number, number] | null;
  /** Seconds since the exit was reached (-1 while playing), and seconds since this maze appeared. */
  won: number; fresh: number;
}

const DIRS = [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]] as const;

export function open(m: Maze, x: number, y: number, dx: number, dy: number) {
  const c = y * m.cols + x;
  if (dx > 0) return x < m.cols - 1 && !m.east[c];
  if (dx < 0) return x > 0 && !m.east[c - 1];
  if (dy > 0) return y < m.rows - 1 && !m.south[c];
  return y > 0 && !m.south[c - m.cols];
}

/** Steps from one cell to every other cell. */
export function steps(m: Maze, x: number, y: number) {
  const far = Array<number>(m.cols * m.rows).fill(-1), line = [y * m.cols + x];
  far[line[0]] = 0;
  for (let n = 0; n < line.length; n++) {
    const c = line[n], cx = c % m.cols, cy = (c - cx) / m.cols;
    for (const [, dx, dy] of DIRS) {
      const d = c + dx + dy * m.cols;
      if (open(m, cx, cy, dx, dy) && far[d] < 0) { far[d] = far[c] + 1; line.push(d); }
    }
  }
  return far;
}

/** Recursive backtracker: walk to an unvisited neighbour, knocking the wall through; back up when stuck. */
function carve(k: Kit, cols: number, rows: number): Maze {
  const n = cols * rows, m: Maze = { cols, rows, east: Array<boolean>(n).fill(true), south: Array<boolean>(n).fill(true) };
  const seen = Array<boolean>(n).fill(false), trail = [Math.floor(k.rand() * n)];
  seen[trail[0]] = true;
  while (trail.length) {
    const c = trail[trail.length - 1], x = c % cols, y = (c - x) / cols;
    const ways = DIRS.filter(([, dx, dy]) => x + dx >= 0 && x + dx < cols && y + dy >= 0 && y + dy < rows && !seen[c + dx + dy * cols]);
    if (!ways.length) { trail.pop(); continue; }
    const [, dx, dy] = k.pick(ways), d = c + dx + dy * cols;
    if (dx > 0) m.east[c] = false; else if (dx < 0) m.east[d] = false; else if (dy > 0) m.south[c] = false; else m.south[d] = false;
    seen[d] = true;
    trail.push(d);
  }
  return m;
}

const room = (k: Kit) => { const top = topOf(k) + 8; return { top, w: W - 44, h: H - 22 - top }; };

/** More cells as the level rises, fewer when the member needs a large ball: a corridor is never under 26 units times the size factor. */
function fresh(k: Kit) {
  const r = room(k), most = Math.max(3, Math.floor(r.h / (26 * k.k)));
  const rows = clamp(3 + Math.ceil(k.level / 2), 3, most), cols = clamp(Math.floor(r.w / (r.h / rows)), 3, 18);
  const maze = carve(k, cols, rows), bx = Math.floor(k.rand() * cols), by = Math.floor(k.rand() * rows);
  /* The exit is one of the cells furthest from the ball, so every maze is a real walk. */
  const far = steps(maze, bx, by), longest = Math.max(...far);
  const exit = k.pick(far.flatMap((d, c) => (d >= longest * 0.7 && d > 0 ? [c] : [])));
  return { maze, bx, by, fx: bx, fy: by, go: 1, ex: exit % cols, ey: Math.floor(exit / cols), bump: null, bumps: 0, queued: null, won: -1, fresh: 0 };
}

export function lay(k: Kit, m: Maze) {
  const r = room(k), cell = Math.min(r.w / m.cols, r.h / m.rows);
  return { cell, x0: (W - m.cols * cell) / 2, y0: r.top + (r.h - m.rows * cell) / 2, ball: Math.min(cell * 0.36, Math.max(10 * k.k, cell * 0.26)) };
}

export const mazeOfTwoLights: GameDef<State> = {
  target: 20,
  /* The still picture shows a maze that has already appeared. */
  init: (k) => ({ ...fresh(k), fresh: 1 }),

  update(k, s) {
    const dt = tick(k), i = k.input, m = s.maze, l = lay(k, m);
    s.fresh += dt;
    if (s.won >= 0) {
      if ((s.won += dt) > 0.9) Object.assign(s, fresh(k));
      return;
    }
    if (s.bump && (s.bump.age += dt) > 0.24) s.bump = null;
    const key = DIRS.find(([name]) => i.pressed.has(name));

    if (s.go < 1) {
      if (key) s.queued = [key[1], key[2]];
      s.go = Math.min(1, s.go + dt / (0.15 * Math.sqrt(l.cell / 40)));
      if (s.go < 1 || s.bx !== s.ex || s.by !== s.ey) return;
      s.won = 0;
      k.add();
      if (s.bumps <= 2) k.hit(); else if (s.bumps > 8) k.miss();
      return;
    }

    /* What the member is asking for, most deliberate first: [dx, dy, was it a fresh press]. */
    const wants: [number, number, boolean][] = [];
    if (key) wants.push([key[1], key[2], true]);
    if (s.queued) wants.push([s.queued[0], s.queued[1], true]);
    if (i.down || i.tapped) {
      /* A touch pulls the ball toward that side: the longer of across and up-down first, then the other. */
      const vx = i.x - (l.x0 + (s.bx + 0.5) * l.cell), vy = i.y - (l.y0 + (s.by + 0.5) * l.cell);
      const across: [number, number, boolean] = [Math.sign(vx), 0, i.tapped], updown: [number, number, boolean] = [0, Math.sign(vy), i.tapped];
      if (Math.hypot(vx, vy) > l.ball * 0.8) {
        const [first, second] = Math.abs(vx) >= Math.abs(vy) ? [across, updown] : [updown, across];
        wants.push(first);
        if (Math.abs(second[0] ? vx : vy) > l.cell * 0.3) wants.push([second[0], second[1], false]);
      }
    }
    if (i.dx) wants.push([i.dx, 0, false]);
    if (i.dy) wants.push([0, i.dy, false]);
    s.queued = null;

    const way = wants.find(([dx, dy]) => (dx || dy) && open(m, s.bx, s.by, dx, dy));
    if (way) {
      s.fx = s.bx; s.fy = s.by; s.go = 0;
      s.bx += way[0]; s.by += way[1];
      s.bump = null;
    } else if (wants.length && wants[0][2] && !s.bump && (wants[0][0] || wants[0][1])) {
      s.bump = { dx: wants[0][0], dy: wants[0][1], age: 0 };
      s.bumps++;
    }
  },

  draw(k, s) {
    const m = s.maze, l = lay(k, m), { cell, x0, y0 } = l;
    const appear = clamp(s.fresh / 0.4, 0, 1), leave = s.won < 0 ? 1 : clamp(1 - (s.won - 0.45) / 0.4, 0, 1);
    k.frame();

    /* All the walls are one path, so they fade in and out as one shape. */
    const g = k.ctx("strong");
    g.globalAlpha = Math.min(appear, leave);
    g.lineWidth = clamp(cell * 0.09, 3.5, 9);
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    g.rect(x0, y0, m.cols * cell, m.rows * cell);
    for (let c = 0; c < m.cols * m.rows; c++) {
      const x = x0 + (c % m.cols) * cell, y = y0 + Math.floor(c / m.cols) * cell;
      if (m.east[c] && c % m.cols < m.cols - 1) { g.moveTo(x + cell, y); g.lineTo(x + cell, y + cell); }
      if (m.south[c] && c < m.cols * (m.rows - 1)) { g.moveTo(x, y + cell); g.lineTo(x + cell, y + cell); }
    }
    g.stroke();
    g.globalAlpha = 1;

    /* The exit light breathes slowly, and opens wide for a moment when the ball arrives. */
    const ex = x0 + (s.ex + 0.5) * cell, ey = y0 + (s.ey + 0.5) * cell, glow = s.won < 0 ? 0 : Math.sin(Math.min(1, s.won / 0.6) * Math.PI);
    const both = k.ctx("both");
    both.globalAlpha = Math.min(appear, leave);
    k.disc(ex, ey, l.ball * 0.5, "both");
    k.ring(ex, ey, l.ball * (0.95 + 0.08 * Math.sin(k.t * k.slow * 2.2) + 0.5 * glow), "both", Math.max(2, l.ball * 0.14));
    both.globalAlpha = 1;

    const ease = s.go * s.go * (3 - 2 * s.go), lean = s.bump ? Math.sin((s.bump.age / 0.24) * Math.PI) * cell * 0.14 : 0;
    const bx = x0 + (s.fx + (s.bx - s.fx) * ease + 0.5) * cell + (s.bump?.dx ?? 0) * lean;
    const by = y0 + (s.fy + (s.by - s.fy) * ease + 0.5) * cell + (s.bump?.dy ?? 0) * lean;
    k.disc(bx, by, l.ball * Math.min(appear, leave), "weak");

    k.hud(`${t.mazeOfTwoLights.mazes} ${k.score}`);
  },
};
