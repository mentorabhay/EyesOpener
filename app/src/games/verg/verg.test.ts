/**
 * Tunnel Glide's demand, checked frame by frame with the probe: it starts at rest, stays inside what the screen
 * allows, never moves faster than 2 a second, always eases when the member says the picture split, and nothing
 * scores without the member.
 */
import { describe, expect, it } from "vitest";
import { help } from "@/copy/games-verg";
import { games } from ".";
import { SCREENS, eager, play, random, splitter, type Player } from "./probe";
import { slugs } from "./slugs";

const SLUG = "tunnel-glide";
/** Plays the game and fails on any broken demand rule. */
const safe = (width: number, props: Parameters<typeof play>[2], seconds: number, player: Player, slow = 1) => {
  const r = play(SLUG, width, props, seconds, player, { slow });
  expect(r.wrong).toEqual([]);
  return r;
};

describe("tunnel-glide keeps its demand safe", () => {
  it("is listed, and says how to play and how to report a split", () => {
    expect(games[SLUG]).toBeTruthy();
    expect(slugs).toContain(SLUG);
    expect(help[SLUG]).toContain("It split");
    expect(help[SLUG]).toContain("Down");
  });

  it.each(SCREENS)("with random play on %s", (_, width, props) => {
    safe(width, props, 120, random);
  }, 20000);

  it.each(SCREENS)("with a member who never reports a split on %s", (_, width, props) => {
    const { k, high } = safe(width, props, 150, eager);
    expect(k.score, "an eager member does score").toBeGreaterThan(0);
    expect(high, "the game does ask the eyes to turn in").toBeGreaterThan(Math.min(2, k.convMax * 0.5));
  }, 20000);

  it("scores nothing when the member does nothing, or only says it split", () => {
    expect(safe(640, {}, 90, () => {}).k.score).toBe(0);
    expect(safe(640, {}, 90, splitter).k.score).toBe(0);
  }, 20000);

  it("is slower, never faster, with reduced motion", () => {
    const quick = safe(640, {}, 60, eager).high, slow = safe(640, {}, 60, eager, 0.35).high;
    expect(slow).toBeLessThan(quick);
  }, 20000);

  it("rests at the edge of the screen's range, then climbs again", () => {
    /* A phone has a small range. An eager member reaches the top of it; the demand must then come back down by itself. */
    const [, width, props] = SCREENS[1], course: number[] = [];
    const r = play(SLUG, width, props, 150, eager, { watch: (now) => course.push(now) });
    expect(r.wrong).toEqual([]);
    const top = course.findIndex((now) => now >= r.k.convMax - 1e-6), after = course.slice(top);
    expect(top, "the top of the range is reached").toBeGreaterThan(0);
    expect(Math.min(...after), "then the demand rests at under half").toBeLessThan(r.k.convMax * 0.5);
    expect(after.lastIndexOf(r.high), "and climbs to the top again").toBeGreaterThan(after.indexOf(Math.min(...after)));
  }, 20000);
});
