// Eyes Opener: Unit and regression test suite verifying voice functionality.
import { describe, expect, it } from "vitest";
import { voice as v } from "./voice";

describe("the words of the Listen button", () => {
  it("says how long the audio is in seconds, or minutes and seconds", () => {
    expect(v.length(0.2)).toBe("1 s");
    expect(v.length(10.46)).toBe("10 s");
    expect(v.length(59.4)).toBe("59 s");
    expect(v.length(59.6)).toBe("1 min");
    expect(v.length(65)).toBe("1 min 5 s");
    expect(v.length(120)).toBe("2 min");
  });
  it("shows the place in the audio as a clock", () => {
    expect(v.clock(0)).toBe("0:00");
    expect(v.clock(2.4)).toBe("0:02");
    expect(v.clock(65)).toBe("1:05");
    expect(v.clock(-3)).toBe("0:00");
    expect(v.progress(v.clock(12), v.clock(65))).toBe("0:12 of 1:05");
  });
  it("names what is read, for a screen reader", () => {
    expect(v.about(v.parts.steps)).toBe("Listen: Steps");
  });
});
