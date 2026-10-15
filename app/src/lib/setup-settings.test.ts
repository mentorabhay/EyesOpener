import { describe, expect, it } from "vitest";
import { DEFAULT_PRESETS, presetsSchema } from "./setup-settings";

describe("the mixer's starting points", () => {
  it("keeps the defaults above the floor", () => { expect(presetsSchema.safeParse(DEFAULT_PRESETS).success).toBe(true); });
  it("refuses a starting point that leaves the weaker eye under half its light", () => {
    expect(presetsSchema.safeParse({ lessBlue: { green: 0.1, blue: 0.1 }, lessGreen: DEFAULT_PRESETS.lessGreen }).success).toBe(false);
  });
});
