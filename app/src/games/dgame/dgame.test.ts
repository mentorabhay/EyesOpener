// Eyes Opener: Plays each two-eye game the way a member would, to check what random input cannot: that a member who.
/**
 * Plays each two-eye game the way a member would, to check what random input cannot: that a member who
 * uses both eyes scores, that a member who acts only on what the stronger eye sees does not, and that
 * the picture stays inside the frame for a member who needs large targets.
 */
import { describe, expect, it, vi } from "vitest";
import { H } from "../kit";
import { BIG, LOOK, idle, outside, play, type Bot } from "./bots";
import { lanternRun, lay as runLay, SIZE as RUN_SIZE } from "./lantern-run";
import { lay as mazeLay, mazeOfTwoLights, open, steps } from "./maze-of-two-lights";

/* Each test plays whole sessions, some of them several times over. */
vi.setConfig({ testTimeout: 60_000 });

describe("lantern run", () => {
  type S = ReturnType<typeof lanternRun.init>;
  /** Jumps so the top of the jump is over the middle of the next coin, crate or stall, and stays down for signs. `coins` and `blocks` say what the bot can see. */
  const runner = (coins: boolean, blocks: boolean): Bot<S> => (k, s) => {
    const l = runLay(k), reach = l.pace * s.ease * 0.4 * l.root;
    const o = s.items.find((it) => !it.done && it.x > l.rx - 4 * l.u);
    if (!o || o.kind === "sign" || s.f > 0) return;
    const mid = o.kind === "coin" ? o.x : o.x + (RUN_SIZE[o.kind][0] * l.u) / 2;
    if ((o.kind === "coin" ? coins : blocks) && mid - l.rx <= reach) k.input.action = true;
  };
  /** Jumps again the moment it lands, looking at nothing. */
  const masher: Bot<S> = (k) => { k.input.action = true; };
  const total = (bot: Bot<S>) => [1, 2, 3, 4].reduce((sum, seed) => sum + play(lanternRun, bot, { seed }).score, 0);

  it("pays a member who uses both eyes, and raises the level", () => {
    const r = play(lanternRun, runner(true, true));
    expect(r.score).toBeGreaterThan(14);
    expect(r.top).toBeGreaterThan(4);
  });
  it("pays nothing for jumping only at what the stronger eye sees, or for standing still", () => {
    expect(play(lanternRun, runner(false, true)).score).toBe(0);
    expect(play(lanternRun, idle).score).toBe(0);
  });
  it("needs the stronger eye too: watching only the coins, or jumping all the time, leaves the lantern out and the level low", () => {
    const both = total(runner(true, true));
    expect(total(runner(true, false))).toBeLessThan(both / 2);
    expect(total(masher)).toBeLessThan(both / 2);
    expect(play(lanternRun, masher).top).toBeLessThanOrEqual(3);
    expect(play(lanternRun, runner(true, false)).top).toBeLessThanOrEqual(2);
  });
  it("fits under the score line for large targets, and a big-target member can still score", () => {
    for (const run of [LOOK, BIG]) {
      const r = play(lanternRun, runner(true, true), run);
      expect(r.score).toBeGreaterThan(8);
      for (const ink of ["weak", "strong"] as const) expect(r.seen[ink].y0, ink).toBeGreaterThanOrEqual(30 + r.k.letter - 1);
      expect(Math.max(r.seen.weak.y1, r.seen.strong.y1)).toBeLessThanOrEqual(H - 14);
    }
  });
});

describe("maze of two lights", () => {
  type S = ReturnType<typeof mazeOfTwoLights.init>;
  const DIRS = [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]] as const;
  const idleBall = (s: S, frame: number) => s.go >= 1 && s.won < 0 && frame % 6 === 0;
  /** Sees the ball, the walls and the exit: always takes the step that leads to the exit. */
  const solver: Bot<S> = (k, s, frame) => {
    if (!idleBall(s, frame)) return;
    const far = steps(s.maze, s.ex, s.ey), here = far[s.by * s.maze.cols + s.bx];
    const way = DIRS.find(([, dx, dy]) => open(s.maze, s.bx, s.by, dx, dy) && far[(s.by + dy) * s.maze.cols + s.bx + dx] < here);
    if (way) k.input.pressed.add(way[0]);
  };
  /** Sees the walls and the exit but not the ball: can only press arrows without knowing where the ball is. */
  const blind: Bot<S> = (k, s, frame) => { if (idleBall(s, frame)) k.input.pressed.add(k.pick(DIRS)[0]); };
  /** Sees the ball and the exit but not the walls: heads straight for the exit. */
  const wallBlind: Bot<S> = (k, s, frame) => {
    if (!idleBall(s, frame)) return;
    const dx = Math.sign(s.ex - s.bx), dy = Math.sign(s.ey - s.by);
    k.input.pressed.add(dx && (!dy || k.rand() < 0.5) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  };
  /** Touch: holds a finger on the far side of the ball from the solver's next step. */
  const finger: Bot<S> = (k, s) => {
    const far = steps(s.maze, s.ex, s.ey), here = far[s.by * s.maze.cols + s.bx], l = mazeLay(k, s.maze);
    const way = DIRS.find(([, dx, dy]) => open(s.maze, s.bx, s.by, dx, dy) && far[(s.by + dy) * s.maze.cols + s.bx + dx] < here);
    if (!way || s.won >= 0) return;
    k.input.down = true;
    k.input.x = l.x0 + (s.bx + 0.5 + way[1] * 1.2) * l.cell;
    k.input.y = l.y0 + (s.by + 0.5 + way[2] * 1.2) * l.cell;
  };

  it("makes a maze in which every cell can be reached and the exit is a real walk away", () => {
    for (const seed of [1, 2, 3, 4]) {
      const { s } = play(mazeOfTwoLights, idle, { seed, seconds: 1 });
      const far = steps(s.maze, s.bx, s.by);
      expect(far.every((d) => d >= 0)).toBe(true);
      expect(far[s.ey * s.maze.cols + s.ex]).toBeGreaterThanOrEqual(Math.max(...far) * 0.7);
    }
  });
  it("pays a member who sees ball and walls, by keys and by touch, and gives bigger mazes as the level rises", () => {
    const keys = play(mazeOfTwoLights, solver), touch = play(mazeOfTwoLights, finger);
    expect(keys.score).toBeGreaterThan(10);
    expect(touch.score).toBeGreaterThan(10);
    expect(keys.top).toBeGreaterThan(3);
    expect(keys.s.maze.rows).toBeGreaterThan(4);
  });
  it("pays far less without the ball in sight, and stays easy without the walls in sight", () => {
    const both = play(mazeOfTwoLights, solver), noBall = play(mazeOfTwoLights, blind), noWalls = play(mazeOfTwoLights, wallBlind);
    expect(noBall.score).toBeLessThan(both.score / 4);
    expect(noBall.top).toBe(1);
    expect(noWalls.score).toBeLessThan(both.score / 3);
    expect(noWalls.top).toBe(1);
  });
  it("keeps corridors wide and the picture inside the frame for a member who needs a large ball", () => {
    const r = play(mazeOfTwoLights, solver, BIG);
    const l = mazeLay(r.k, r.s.maze);
    expect(l.cell).toBeGreaterThanOrEqual(26 * r.k.k - 0.01);
    expect(l.ball * 2).toBeLessThan(l.cell * 0.75);
    expect(l.ball * 2).toBeGreaterThanOrEqual(Math.min(20 * r.k.k, l.cell * 0.7));
    expect(r.score).toBeGreaterThan(10);
    expect(outside(r)).toEqual([]);
    expect(outside(play(mazeOfTwoLights, solver, LOOK))).toEqual([]);
  });
});
