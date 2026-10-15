import { describe, expect, it } from "vitest";
import { gateMark, gatePassed, isOpenPath, lockScope, phraseMatches, safeNext, siteLock } from "./gate";
import { signToken } from "./token";

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
  it("keeps the gate, the health check, the robots file and the scheduler's address open", () => {
    for (const p of ["/gate", "/health", "/robots.txt", "/api/jobs/daily", "/api/jobs/weekly"]) expect(isOpenPath(p)).toBe(true);
    for (const p of ["/", "/today", "/gate/x", "/admin", "/api/jobs", "/api/jobs/hourly", "/api/other"]) expect(isOpenPath(p)).toBe(false);
  });
  it("sends people only to a path on this site after the gate", () => {
    expect(safeNext("/today")).toBe("/today");
    expect(safeNext("/stories/a?b=1")).toBe("/stories/a?b=1");
    for (const bad of [null, undefined, "", "https://evil.example", "//evil.example", "/\\evil", "/gate", "today"]) expect(safeNext(bad)).toBe("/");
  });
  it("refuses a path with a tab, a line break or a space in it, which a browser would read as another site", () => {
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/ /evil.example", "/today\u0000", "/a b"]) expect(safeNext(bad)).toBe("/");
    /* What a browser makes of the first of these, were it let through. */
    expect(new URL("/\t/evil.example", "https://iopener.example").host).toBe("evil.example");
    expect(safeNext("/library?tag=two%20words")).toBe("/library?tag=two%20words");
  });
});

describe("a lock on the demo people only", () => {
  it("covers every page unless told to cover only the demo", () => {
    expect(lockScope(undefined)).toBe("all");
    expect(lockScope("all")).toBe("all");
    expect(lockScope(" demo ")).toBe("demo");
    expect(lockScope("something else")).toBe("all");
  });
  it("is opened by a gate entry made for the phrase in force, and by nothing else", () => {
    const lock = "a phrase long enough";
    expect(gatePassed(undefined, null)).toBe(true);
    expect(gatePassed(undefined, lock)).toBe(false);
    expect(gatePassed(signToken({ gate: gateMark(lock), exp: Date.now() + 60_000 }), lock)).toBe(true);
    expect(gatePassed(signToken({ gate: gateMark("an older phrase"), exp: Date.now() + 60_000 }), lock)).toBe(false);
    expect(gatePassed(signToken({ gate: gateMark(lock), exp: Date.now() - 1 }), lock)).toBe(false);
  });
});
