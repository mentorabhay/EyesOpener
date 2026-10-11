// Eyes Opener: Unit and regression test suite verifying assist functionality.
import { describe, expect, it } from "vitest";
import type { Member } from "@/lib/session";
import { assist } from "./extra";
import { HAZARD_REASONS, IDEA_REFUSALS, REVIEW_RULES, readAiFlag, type ExamFacts } from "./types";
import { assistCopy } from "@/copy/assist";

const m = {} as Member;
const facts: ExamFacts = { results: [], notTaken: [], practice: { programme: null, minutes: 0, days: 0, windowDays: 28 }, stops: [] };

/* In a fuller build this file is replaced, and these answers are that build's to test. */
describe.skipIf(assist.available)("an edition with no assistant", () => {
  it("says so, and answers 'none' or nothing to every question without sending anything anywhere", async () => {
    expect(assist.available).toBe(false);
    expect(await assist.ready("idea")).toBe(false);
    expect(await assist.ready("exam")).toBe(false);
    expect(await assist.suggestIdea(m, "We read outdoors for 20 minutes a day.")).toEqual({ ok: false, why: "none" });
    expect(await assist.similarToText(m, "We read outdoors.")).toEqual([]);
    expect(await assist.similarToIdea("00000000-0000-0000-0000-000000000000")).toEqual([]);
    expect(await assist.hazardOpinion(m, "Look at a lamp.")).toBeNull();
    expect(await assist.noteItem("00000000-0000-0000-0000-000000000000")).toBeUndefined();
    expect(await assist.noteOpenItems(10)).toEqual({ written: 0, left: 0, closed: "none" });
    expect(await assist.ideasChanged()).toBeUndefined();
    expect(await assist.examParagraph(m, facts)).toEqual({ ok: false, why: "none" });
    expect(await assist.extraPassages()).toEqual([]);
    expect(await assist.searchLibrary(m, "patching", ["trial:citt"])).toBeNull();
  });
});

describe("what an assistant may leave on a moderation item", () => {
  const note = { what: "An idea to read outdoors.", concerns: [{ rule: "cure_claim", why: "It promises a result.", quote: "cures" }], at: "2026-10-05T10:00:00.000Z" };

  it("is read when it has the known shape", () => {
    const flag = readAiFlag({ v: 1, note, hazard: { flags: [{ reason: "sun", quote: "watch the sunrise" }], at: note.at }, suggested: true });
    expect(flag?.note?.concerns[0].rule).toBe("cure_claim");
    expect(flag?.hazard?.flags[0].reason).toBe("sun");
    expect(flag?.suggested).toBe(true);
  });

  it("is not read as a note in any other shape: the page then shows it as plain lines", () => {
    expect(readAiFlag(null)).toBeNull();
    expect(readAiFlag("looks fine")).toBeNull();
    expect(readAiFlag({ v: 2, note })).toBeNull();
    expect(readAiFlag({ v: 1, note: { ...note, concerns: [{ rule: "vibes", why: "x", quote: "" }] } })).toBeNull();
    expect(readAiFlag({ v: 1, hazard: { flags: [{ reason: "approved", quote: "" }], at: note.at } })).toBeNull();
  });

  it("has no field that approves or removes anything", () => {
    const flag = readAiFlag({ v: 1, note, approved: true, status: "approved", decision: "remove" });
    expect(Object.keys(flag!).sort()).toEqual(["note", "v"]);
  });
});

describe("the words for what an assistant says", () => {
  it("has a line for every hazard reason, every house rule and every refusal", () => {
    for (const r of HAZARD_REASONS) expect(assistCopy.hazard[r].length, r).toBeGreaterThan(5);
    for (const r of REVIEW_RULES) expect(assistCopy.rule[r].length, r).toBeGreaterThan(5);
    for (const r of IDEA_REFUSALS) expect(assistCopy.share.refused[r].length, r).toBeGreaterThan(20);
  });
  it("says that AI wrote it wherever a member reads AI's words", () => {
    expect(assistCopy.share.done).toMatch(/suggested by AI/);
    expect(assistCopy.exam.label).toMatch(/Written by AI/);
    expect(assistCopy.idea.similarWhat).toMatch(/Found by AI/);
    expect(assistCopy.review.caution).toMatch(/never approves or removes/);
  });
});
