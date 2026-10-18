import { describe, expect, it } from "vitest";
import { headOf, levelOf } from "./step-map";
import { gameGuideFor } from "@/data/game-guides";
import { games } from "@/data";

describe("the manual's step flow", () => {
  it("reads the level a step starts at", () => {
    expect(levelOf("From level 4 some rounds say Find and a country's name.")).toBe(4);
    expect(levelOf("Put the glasses on and press Start.")).toBeNull();
  });
  it("gives each step a short head of whole words", () => {
    expect(headOf("Put the glasses on, cyan lens over the weaker eye, and press Start.")).toBe("Put the glasses on, cyan lens over the weaker eye");
    const long = "Pick the right name from the four boxes. The right answer gets a tick; a wrong pick gets a cross.";
    expect(headOf(long)).toBe("Pick the right name from the four boxes");
    for (const g of games) for (const step of gameGuideFor(g.slug)?.play ?? []) {
      const h = headOf(step);
      expect(h.length).toBeLessThanOrEqual(65);
      expect(h.length).toBeGreaterThan(3);
    }
  });
});
