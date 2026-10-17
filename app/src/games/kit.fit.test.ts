import { describe, expect, it } from "vitest";
import { fitText, H, INSIDE, W } from "./kit";

/* A width rule that grows with size and length, like a real font: 0.6 of the size for each letter. */
const width = (size: number, s: string) => s.length * size * 0.6;

describe("fitText keeps words inside the frame", () => {
  it("leaves a line that fits as it is", () => {
    expect(fitText("Hits 3", 22, 22, "left", width)).toEqual({ size: 22, lines: ["Hits 3"], x: 22 });
  });

  it("makes a long centred line smaller until it fits", () => {
    const s = "One picture with both holes? Tap or press OK";
    const fit = fitText(s, W / 2, 30, "center", width);
    expect(fit.lines).toEqual([s]);
    expect(fit.size).toBeLessThan(30);
    expect(width(fit.size, s)).toBeLessThanOrEqual(W - 20 + 0.001);
  });

  it("breaks a line when making it smaller is not enough, and every line fits", () => {
    const s = "Nothing to read yet. Paste your own text on the page Read your own text, or ask staff to publish articles.";
    const fit = fitText(s, W / 2, 30, "center", width);
    expect(fit.lines.length).toBeGreaterThan(1);
    expect(fit.size).toBeGreaterThanOrEqual(10);
    expect(fit.lines.join(" ")).toBe(s);
    for (const line of fit.lines) expect(width(fit.size, line)).toBeLessThanOrEqual(W - 20 + 0.001);
  });

  it("moves a single word near the right edge inward so it ends at the frame", () => {
    const fit = fitText("Lamp", W - 40, 30, "left", width);
    expect(fit.size).toBe(18);
    expect(fit.x + width(fit.size, "Lamp")).toBeLessThanOrEqual(W - 10 + 0.001);
  });

  it("never makes words smaller than the member's letters while breaking the line can still make them fit", () => {
    const s = "One picture with both holes? Tap or press OK";
    const fit = fitText(s, W / 2, 30, "center", width, 30);
    expect(fit.size).toBe(30);
    expect(fit.lines.length).toBe(2);
  });

  it("a long sentence at a large letter size still fits, in three lines at most", () => {
    const s = "Look at the four pictures. One of them floats out towards you. Tap it. Tap or press OK to start";
    const fit = fitText(s, W / 2, 46, "center", width);
    expect(fit.lines.length).toBeLessThanOrEqual(3);
    for (const line of fit.lines) expect(width(fit.size, line)).toBeLessThanOrEqual(W - 20 + 0.001);
  });

  it("the frame's inside edge is the same box games are drawn in", () => {
    expect(INSIDE).toEqual({ x0: 6, y0: 6, x1: W - 6, y1: H - 6 });
  });
});
