// Eyes Opener: Unit and regression test suite verifying arrows functionality.
import { describe, expect, it } from "vitest";
import { directionOf, pickInDirection, pickStop, type Box, type Stop } from "./arrows";

const box = (left: number, top: number, width: number, height: number): Box => ({ left, top, right: left + width, bottom: top + height });

/* A player as it is laid out: the picture, the seek bar under it, a row of buttons, then a list beside or below. */
const picture = box(0, 0, 640, 360);
const seek = box(60, 372, 520, 20);
const play = box(0, 404, 90, 40), back = box(100, 404, 44, 40), forward = box(154, 404, 44, 40), sound = box(480, 404, 44, 40), full = box(596, 404, 44, 40);
const stop = box(0, 456, 160, 40), finish = box(170, 456, 110, 40);
const all = [picture, seek, play, back, forward, sound, full, stop, finish];
const go = (from: Box, dir: Parameters<typeof pickInDirection>[2]) => { const i = pickInDirection(from, all.filter((b) => b !== from), dir); return i < 0 ? null : all.filter((b) => b !== from)[i]; };

describe("directionOf", () => {
  it("reads the four arrows and nothing else", () => {
    expect(directionOf("ArrowUp")).toBe("up");
    expect(directionOf("ArrowDown")).toBe("down");
    expect(directionOf("ArrowLeft")).toBe("left");
    expect(directionOf("ArrowRight")).toBe("right");
    expect(directionOf("Enter")).toBeNull();
    expect(directionOf(" ")).toBeNull();
  });
});

describe("pickInDirection", () => {
  it("goes down from the picture to the seek bar, then to the row of buttons", () => {
    expect(go(picture, "down")).toBe(seek);
    expect(go(seek, "down")).not.toBeNull();
    expect([play, back, forward, sound]).toContain(go(seek, "down"));
  });

  it("walks along a row of buttons one at a time, both ways", () => {
    expect(go(play, "right")).toBe(back);
    expect(go(back, "right")).toBe(forward);
    expect(go(forward, "right")).toBe(sound);
    expect(go(sound, "right")).toBe(full);
    expect(go(full, "left")).toBe(sound);
    expect(go(back, "left")).toBe(play);
  });

  it("stops at the end of a row rather than jumping somewhere else", () => {
    expect(go(full, "right")).toBeNull();
    expect(go(play, "left")).toBeNull();
    expect(go(picture, "up")).toBeNull();
  });

  it("reaches the stop button from the play button with one press of down", () => {
    expect(go(play, "down")).toBe(stop);
    expect(go(stop, "right")).toBe(finish);
    expect(go(stop, "up")).toBe(play);
  });

  it("goes back up the same way", () => {
    expect(go(play, "up")).toBe(seek);
    expect(go(seek, "up")).toBe(picture);
  });

  it("prefers a box in the same column to a nearer one off to the side", () => {
    const from = box(300, 0, 40, 40), below = box(300, 200, 40, 40), aside = box(400, 60, 40, 40);
    expect(pickInDirection(from, [aside, below], "down")).toBe(1);
  });

  it("takes a near neighbour just off the line rather than a far box on it", () => {
    /* A list: each row has Up, Down and Remove side by side. Up is switched off in the first row, so it is not a place. */
    const upOfSecond = box(300, 300, 50, 36), downOfFirst = box(360, 170, 60, 36), addFilms = box(0, 40, 330, 40);
    expect(pickInDirection(upOfSecond, [addFilms, downOfFirst], "up")).toBe(1);
  });

  it("takes a box off to the side when nothing is in line", () => {
    const from = box(300, 0, 40, 40), aside = box(400, 60, 40, 40);
    expect(pickInDirection(from, [aside], "down")).toBe(0);
  });

  it("never picks a box that lies the other way, or one it is inside", () => {
    const inner = box(200, 150, 100, 40);
    expect(pickInDirection(inner, [picture], "down")).toBe(-1);
    expect(pickInDirection(inner, [picture], "up")).toBe(-1);
    expect(pickInDirection(stop, [picture, seek], "down")).toBe(-1);
    expect(pickInDirection(picture, [], "down")).toBe(-1);
  });

  it("leaves a card inside the picture for the controls below it", () => {
    const carryOn = box(200, 250, 160, 40), endHere = box(370, 250, 160, 40);
    expect(pickInDirection(carryOn, [endHere, seek, play], "right")).toBe(0);
    expect(pickInDirection(carryOn, [endHere, seek, play], "down")).toBe(1);
    expect(pickInDirection(seek, [carryOn, endHere], "up")).toBeGreaterThanOrEqual(0);
  });
});

describe("pickStop", () => {
  /* Above the picture a row of pills at the left; over the picture a card with two buttons in its middle. */
  const pill = box(0, -50, 110, 36);
  const card = { id: "card", box: picture };
  const carryOn: Stop = { box: box(200, 250, 160, 40), group: card }, endHere: Stop = { box: box(370, 250, 160, 40), group: card };
  const outside: Stop[] = [{ box: pill }, { box: seek }, { box: play }, { box: stop }];
  const stops = [outside[0], carryOn, endHere, ...outside.slice(1)];

  it("lands on a card's first button on the way down, instead of skipping over the card", () => {
    const others = stops.filter((s) => s.box !== pill);
    expect(others[pickStop({ box: pill }, others, "down")]).toBe(carryOn);
  });

  it("lands on the card on the way up from the controls below it", () => {
    const others = stops.filter((s) => s.box !== seek);
    expect(others[pickStop({ box: seek }, others, "up")]).toBe(carryOn);
  });

  it("walks between a card's own buttons, and leaves the card for what lies beyond it", () => {
    const others = stops.filter((s) => s !== carryOn);
    expect(others[pickStop(carryOn, others, "right")]).toBe(endHere);
    expect(others[pickStop(carryOn, others, "down")].box).toBe(seek);
    expect(others[pickStop(carryOn, others, "up")].box).toBe(pill);
  });

  it("is the plain rule when nothing is grouped", () => {
    const plain = outside.filter((s) => s.box !== seek);
    expect(plain[pickStop({ box: seek }, plain, "down")].box).toBe(play);
    expect(pickStop({ box: pill }, [], "down")).toBe(-1);
  });
});
