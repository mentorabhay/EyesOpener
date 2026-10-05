import { describe, expect, it } from "vitest";
import { addDays, canCancel, canDeleteProfile, canDownload, COPY_DAYS, isLive, splitPeople, stateOf, stepFor, WAIT_DAYS, type RequestFacts } from "./state";

const now = new Date("2026-10-05T06:00:00Z");
const before = addDays(now, -1), after = addDays(now, 1);
const copy = (more: Partial<RequestFacts> = {}): RequestFacts => ({ kind: "export", status: "ready", scope: "household", readyAt: before, expiresAt: after, downloadedAt: null, deleteAfter: null, ...more });
const del = (more: Partial<RequestFacts> = {}): RequestFacts => ({ kind: "delete", status: "open", scope: "household", readyAt: null, expiresAt: null, downloadedAt: null, deleteAfter: after, ...more });

describe("the waiting times", () => {
  it("are a week each, and the privacy page says the same", () => {
    expect(COPY_DAYS).toBe(7);
    expect(WAIT_DAYS).toBe(7);
    expect(addDays(now, WAIT_DAYS).toISOString()).toBe("2026-10-12T06:00:00.000Z");
  });
});

describe("a copy", () => {
  it("is ready until its last day, and shows when it was downloaded", () => {
    expect(stateOf(copy(), now)).toBe("ready");
    expect(stateOf(copy({ downloadedAt: now }), now)).toBe("downloaded");
    expect(canDownload(copy(), now)).toBe(true);
    expect(canDownload(copy({ downloadedAt: before }), now)).toBe(true);
  });
  it("cannot be downloaded once its days ran out, at the very moment they end", () => {
    expect(stateOf(copy({ expiresAt: now }), now)).toBe("expired");
    expect(canDownload(copy({ expiresAt: now }), now)).toBe(false);
    expect(canDownload(copy({ expiresAt: before }), now)).toBe(false);
    expect(canDownload(copy({ expiresAt: null }), now)).toBe(false);
    expect(canDownload(copy({ status: "done" }), now)).toBe(false);
  });
  it("cannot be downloaded while it is only asked for", () => {
    expect(stateOf(copy({ status: "open", readyAt: null, expiresAt: null }), now)).toBe("asked");
    expect(canDownload(copy({ status: "open", readyAt: null, expiresAt: null }), now)).toBe(false);
  });
  it("is never something to cancel", () => {
    expect(canCancel(copy(), now)).toBe(false);
  });
});

describe("a deletion", () => {
  it("waits, then is due, and can be cancelled the whole time", () => {
    expect(stateOf(del(), now)).toBe("waiting");
    expect(stateOf(del({ deleteAfter: now }), now)).toBe("due");
    expect(stateOf(del({ deleteAfter: null }), now)).toBe("asked");
    for (const r of [del(), del({ deleteAfter: now }), del({ deleteAfter: null })]) expect(canCancel(r, now)).toBe(true);
  });
  it("cannot be cancelled once it is cancelled or done, and is never a download", () => {
    expect(stateOf(del({ status: "cancelled" }), now)).toBe("cancelled");
    expect(stateOf(del({ status: "done", scope: "profile" }), now)).toBe("deleted");
    expect(canCancel(del({ status: "cancelled" }), now)).toBe(false);
    expect(canCancel(del({ status: "done" }), now)).toBe(false);
    expect(canDownload(del(), now)).toBe(false);
  });
  it("counts as running only until it is settled", () => {
    expect(isLive(del(), now)).toBe(true);
    expect(isLive(del({ status: "cancelled" }), now)).toBe(false);
    expect(isLive(copy({ expiresAt: before }), now)).toBe(false);
  });
});

describe("what the daily job does with a request", () => {
  it("makes an asked copy ready and closes one whose days ran out", () => {
    expect(stepFor(copy({ status: "open" }), now)).toBe("make_ready");
    expect(stepFor(copy({ expiresAt: before }), now)).toBe("close");
    expect(stepFor(copy({ expiresAt: null }), now)).toBe("close");
    expect(stepFor(copy(), now)).toBeNull();
    expect(stepFor(copy({ status: "done", expiresAt: before }), now)).toBeNull();
  });
  it("deletes only when the waiting time is over, never before and never after a cancel", () => {
    expect(stepFor(del(), now)).toBeNull();
    expect(stepFor(del({ deleteAfter: addDays(now, WAIT_DAYS) }), now)).toBeNull();
    expect(stepFor(del({ deleteAfter: now }), now)).toBe("delete");
    expect(stepFor(del({ deleteAfter: before }), now)).toBe("delete");
    expect(stepFor(del({ status: "cancelled", deleteAfter: before }), now)).toBeNull();
    expect(stepFor(del({ status: "done", deleteAfter: before }), now)).toBeNull();
  });
  it("gives a date to a deletion that has none, instead of deleting it", () => {
    expect(stepFor(del({ deleteAfter: null }), now)).toBe("set_date");
  });
});

describe("the grown-ups of a deleted household", () => {
  const p = (id: string, more: Partial<{ staff: boolean; counsellor: boolean; sponsor: boolean }> = {}) => ({ id, staff: false, counsellor: false, sponsor: false, ...more });
  it("go with it when they sign in only for the household", () => {
    expect(splitPeople([p("a"), p("b")])).toEqual({ keep: [], gone: [p("a"), p("b")] });
  });
  it("keep their sign-in when they are also staff, a counsellor or with a sponsor", () => {
    const out = splitPeople([p("a"), p("s", { staff: true }), p("c", { counsellor: true }), p("o", { sponsor: true })]);
    expect(out.keep.map((x) => x.id)).toEqual(["s", "c", "o"]);
    expect(out.gone.map((x) => x.id)).toEqual(["a"]);
  });
});

describe("deleting one profile", () => {
  it("is allowed while another profile stays", () => {
    expect(canDeleteProfile(["a", "b"], [], "a")).toBe("ok");
    expect(canDeleteProfile(["a", "b", "c"], ["b"], "a")).toBe("ok");
  });
  it("is refused for a profile of another household, and for one already waiting", () => {
    expect(canDeleteProfile(["a", "b"], [], "z")).toBe("not_yours");
    expect(canDeleteProfile(["a", "b"], ["a"], "a")).toBe("already");
  });
  it("is refused when it would leave the household with no profile", () => {
    expect(canDeleteProfile(["a"], [], "a")).toBe("last_one");
    expect(canDeleteProfile(["a", "b"], ["b"], "a")).toBe("last_one");
  });
});
