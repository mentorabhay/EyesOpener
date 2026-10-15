import { describe, expect, it } from "vitest";
import { hasOwnButtons, minutesUsed, overlayFor, type OverlayInput } from "./overlay";

const base: OverlayInput = { status: "ready", rest: false, usedUp: false, stopped: false, playing: false, mayPlay: true, active: false, started: false };
const at = (change: Partial<OverlayInput>) => overlayFor({ ...base, ...change });

describe("overlayFor", () => {
  it("asks for a film when none is chosen", () => {
    expect(at({ status: null })).toBe("empty");
  });

  it("says so when the browser cannot play the film, even in the middle of a session", () => {
    expect(at({ status: "cannot", active: true, started: true })).toBe("cannot");
    expect(at({ status: "cannot", rest: true })).toBe("cannot");
  });

  it("asks for the file when only the title is kept", () => {
    for (const status of ["file", "gone", "ask"] as const) expect(at({ status })).toBe("file");
  });

  it("invites the member to play a film that is ready", () => {
    expect(at({})).toBe("ready");
  });

  it("shows the film and nothing over it while it plays", () => {
    expect(at({ playing: true, active: true, started: true })).toBeNull();
  });

  it("marks a pause in the middle of a session", () => {
    expect(at({ active: true, started: true })).toBe("paused");
  });

  it("offers the start again for another film put on screen in the middle of a session", () => {
    expect(at({ active: true, started: false })).toBe("ready");
  });

  it("shows the eye break over everything a session can show", () => {
    expect(at({ rest: true, active: true, started: true, mayPlay: false })).toBe("rest");
    expect(at({ rest: true, active: true, usedUp: true, stopped: true })).toBe("rest");
  });

  it("says clearly when today's minutes are used, and offers no play", () => {
    expect(at({ usedUp: true, mayPlay: false })).toBe("used");
    expect(at({ usedUp: true, mayPlay: true })).toBe("used");
  });

  it("says that today's minutes are used before it asks for a film or its file", () => {
    expect(at({ usedUp: true, status: null })).toBe("used");
    expect(at({ usedUp: true, status: "file" })).toBe("used");
    expect(at({ usedUp: true, status: "cannot" })).toBe("used");
  });

  it("stays stopped after the stop button", () => {
    expect(at({ stopped: true, mayPlay: false })).toBe("stopped");
  });

  it("shows the bare film when training is closed for another reason: the note under it says why", () => {
    expect(at({ mayPlay: false })).toBeNull();
  });
});

describe("hasOwnButtons", () => {
  it("is true for the break and the start, and for choosing a film where that is allowed", () => {
    expect(hasOwnButtons("rest", true)).toBe(true);
    expect(hasOwnButtons("ready", false)).toBe(true);
    expect(hasOwnButtons("empty", true)).toBe(true);
    expect(hasOwnButtons("file", true)).toBe(true);
    expect(hasOwnButtons("empty", false)).toBe(false);
    expect(hasOwnButtons("file", false)).toBe(false);
  });

  it("is false where the picture itself is the button", () => {
    for (const card of ["paused", "used", "stopped", "cannot", null] as const) expect(hasOwnButtons(card, true)).toBe(false);
  });
});

describe("minutesUsed", () => {
  const idle = { doseReason: null, endReason: null, watchedSeconds: 0, allowedSeconds: 0, tester: false };

  it("is true when the server says the day is done", () => {
    expect(minutesUsed({ ...idle, doseReason: "programme_done" })).toBe(true);
    expect(minutesUsed({ ...idle, doseReason: "daily_cap" })).toBe(true);
    expect(minutesUsed({ ...idle, doseReason: "daily_cap", tester: true })).toBe(true);
  });

  it("is false while minutes are left, and for other reasons training is closed", () => {
    expect(minutesUsed(idle)).toBe(false);
    for (const doseReason of ["doctor_first", "under_age", "needs_consent", "guardian_only", "not_offered"]) expect(minutesUsed({ ...idle, doseReason })).toBe(false);
  });

  it("is true at once when the session clock has run out", () => {
    expect(minutesUsed({ ...idle, endReason: "done", watchedSeconds: 720, allowedSeconds: 720 })).toBe(true);
    expect(minutesUsed({ ...idle, endReason: "daily_cap", watchedSeconds: 719, allowedSeconds: 720 })).toBe(true);
  });

  it("is false when the session ended early, by hand, by the stop button or at the end of the film", () => {
    expect(minutesUsed({ ...idle, endReason: "done", watchedSeconds: 90, allowedSeconds: 720 })).toBe(false);
    expect(minutesUsed({ ...idle, endReason: "left", watchedSeconds: 720, allowedSeconds: 720 })).toBe(false);
    expect(minutesUsed({ ...idle, endReason: "stop_rule", watchedSeconds: 720, allowedSeconds: 720 })).toBe(false);
  });

  it("is false for a staff test household whose clock ran out: it has no daily limit", () => {
    expect(minutesUsed({ ...idle, endReason: "done", watchedSeconds: 5400, allowedSeconds: 5400, tester: true })).toBe(false);
  });
});
