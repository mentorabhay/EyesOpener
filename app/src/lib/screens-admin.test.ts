// Eyes Opener: Unit and regression test suite verifying screens-admin functionality.
import { describe, expect, it } from "vitest";
import { SMALL, shown } from "./screens-admin";

describe("the screens room's counts", () => {
  it("never shows a count from 1 to 4 as a number", () => {
    expect([0, 1, 4, 5, 12].map(shown)).toEqual([0, "few", "few", 5, 12]);
    expect(SMALL).toBe(5);
  });
});
