// Eyes Opener: Unit and regression test suite verifying kit-swap functionality.
import { describe, expect, it } from "vitest";
import { makeKit, type GameProps } from "./kit";
import { SIM_PROPS } from "./sim";

/* a drawing surface that only remembers its colours */
const surface = () => ({ fillStyle: "", strokeStyle: "" }) as unknown as CanvasRenderingContext2D;
const inks = (p: Partial<GameProps>) => {
  const k = makeKit({ ...SIM_PROPS, ...p }, () => surface(), 1);
  return { weak: k.ctx("weak").fillStyle, strong: k.ctx("strong").fillStyle };
};

describe("the kit with the inks swapped", () => {
  it("draws the weaker eye's pictures in cyan and dims the red the usual way", () => {
    expect(inks({ contrast: 0.15, gamma: 2.2 })).toEqual({ weak: "rgb(0 255 255)", strong: "rgb(108 0 0)" });
  });
  it("draws the weaker eye's pictures in full red and dims the cyan when the weaker eye sees red", () => {
    expect(inks({ contrast: 0.15, gamma: 2.2, weakInk: "red" })).toEqual({ weak: "rgb(255 0 0)", strong: "rgb(0 108 108)" });
  });
  it("still splits the two eyes' pictures by eye: the weaker eye keeps its side when the lenses swap", () => {
    /* a pull to the left eye's side: the weaker left eye is behind cyan the usual way, behind red when swapped */
    const drawn: string[] = [];
    const run = (p: Partial<GameProps>) => {
      drawn.length = 0;
      const k = makeKit({ ...SIM_PROPS, ...p }, () => surface(), 1);
      k.fuse(4, (ink, shift) => drawn.push(`${ink}:${Math.sign(shift)}`));
      return [...drawn];
    };
    expect(run({ cyanEye: "L" })).toEqual(run({ cyanEye: "R", weakInk: "red" }));
  });
});
