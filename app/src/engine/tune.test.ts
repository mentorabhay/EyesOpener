import { afterEach, describe, expect, it } from "vitest";
import { USUAL_TUNE, currentTune, leakFor, setInkTune, strongInk, trainRed, tuneOf, validTune, videoMatrix, weakInk, weakLight } from "@/engine";

afterEach(() => setInkTune(USUAL_TUNE));

describe("inks tuned for a pair of glasses", () => {
  it("draws exactly the usual inks when nothing is tuned", () => {
    expect(weakInk(1)).toBe("rgb(0 255 255)");
    expect(strongInk(1)).toBe("rgb(255 0 0)");
    expect(videoMatrix(0.5)).toEqual(videoMatrix(0.5, USUAL_TUNE));
    expect(tuneOf(null)).toEqual(USUAL_TUNE);
  });
  it("takes green out of the cyan ink only, and keeps blue as the contrast sets it", () => {
    expect(weakInk(1, 2.2, { green: 0.5, redTop: 1 })).toBe("rgb(0 186 255)");
    expect(weakInk(0.5, 2.2, { green: 0.5, redTop: 1 })).toBe("rgb(0 136 186)");
  });
  it("follows the setting the browser holds for the page", () => {
    setInkTune({ green: 0.5, redTop: 0.4 });
    expect(weakInk(1)).toBe("rgb(0 186 255)");
    expect(currentTune()).toEqual({ green: 0.5, redTop: 0.4 });
    const m = videoMatrix(1);
    expect(Math.max(m[0] + m[1] + m[2] + m[4])).toBeCloseTo(0.4);
    expect(m[5] + m[6] + m[7]).toBeCloseTo(0.5);
    expect(m[10] + m[11] + m[12]).toBeCloseTo(1);
  });
  it("never lets the ceiling raise the red ink", () => {
    for (const top of [0.1, 0.4, 1]) for (const c of [0.05, 0.3, 1]) expect(trainRed(c, { green: 1, redTop: top })).toBeLessThanOrEqual(c);
  });
  it("says how much light the weaker eye keeps", () => {
    expect(weakLight(1)).toBe(1);
    expect(weakLight(0.5)).toBeCloseTo(0.546, 3);
    expect(weakLight(0)).toBeCloseTo(weakLight(0.2));
  });
  it("makes any setting safe", () => {
    expect(validTune({ green: 0, redTop: 2 })).toEqual({ green: 0.2, redTop: 1 });
    expect(validTune({ green: Number.NaN })).toEqual(USUAL_TUNE);
  });
  it("judges the leak with the ceiling and the dimmer cyan", () => {
    const leak = { red: 0.05, cyan: 0.03 };
    expect(leakFor(leak, 0.5).inStrong).toBeCloseTo(0.1);
    expect(leakFor(leak, 0.5, { green: 1, redTop: 0.25 }).inStrong).toBeCloseTo(0.2);
    expect(leakFor(leak, 0.5, { green: 0.5, redTop: 1 }).inWeak).toBeCloseTo(0.015 / weakLight(0.5));
  });
});
