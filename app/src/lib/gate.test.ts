import { describe, expect, it } from "vitest";
import { gateMark, isOpenPath, phraseMatches, safeNext, siteLock } from "./gate";

describe("site lock", () => {
  it("does not exist without a phrase, and ignores one too short to be a lock", () => {
    expect(siteLock(undefined)).toBeNull();
    expect(siteLock("")).toBeNull();
    expect(siteLock("short")).toBeNull();
    expect(siteLock("  a longer phrase  ")).toBe("a longer phrase");
  });
  it("accepts only the exact phrase", () => {
    expect(phraseMatches("open sesame 42", "open sesame 42")).toBe(true);
    expect(phraseMatches(" open sesame 42 ", "open sesame 42")).toBe(true);
    expect(phraseMatches("open sesame 43", "open sesame 42")).toBe(false);
    expect(phraseMatches("", "open sesame 42")).toBe(false);
  });
  it("marks the cookie without holding the phrase, and a new phrase gives a new mark", () => {
    expect(gateMark("open sesame 42")).not.toContain("sesame");
    expect(gateMark("open sesame 42")).toBe(gateMark("open sesame 42"));
    expect(gateMark("open sesame 42")).not.toBe(gateMark("open sesame 43"));
  });
  it("keeps the gate, the health check and the robots file open", () => {
    for (const p of ["/gate", "/healthz", "/robots.txt"]) expect(isOpenPath(p)).toBe(true);
    for (const p of ["/", "/today", "/gate/x", "/admin"]) expect(isOpenPath(p)).toBe(false);
  });
  it("sends people only to a path on this site after the gate", () => {
    expect(safeNext("/today")).toBe("/today");
    expect(safeNext("/stories/a?b=1")).toBe("/stories/a?b=1");
    for (const bad of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil", "/gate", "today"]) expect(safeNext(bad)).toBe("/");
  });
});
