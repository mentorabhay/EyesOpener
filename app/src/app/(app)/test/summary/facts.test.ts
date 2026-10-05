import { describe, expect, it } from "vitest";
import { tests } from "@/data";
import type { Member } from "@/lib/session";
import type { Result } from "../results";
import { examFacts, firstOf, lineName, type SummaryData, type SummaryLine } from "./facts";

const t = (key: string) => tests.find((x) => x.key === key)!;
const result = (id: string, value: number, day: string, extra: Partial<Result> = {}): Result =>
  ({ id, profileId: "p", testKey: "x", eye: null, value, note: null, raw: null, isBaseline: false, takenAt: new Date(`${day}T10:00:00+05:30`), ...extra }) as unknown as Result;

const acuityLeft: SummaryLine = { t: t("acuity"), changed: false, line: { eye: "left", rows: [result("a", 0.4, "2026-09-05"), result("b", 0.3, "2026-10-03")], first: result("a", 0.4, "2026-09-05"), last: result("b", 0.3, "2026-10-03") } };
const nearPoint: SummaryLine = { t: t("near_point"), changed: true, line: { eye: null, rows: [result("c", 12, "2026-10-04")], first: result("c", 12, "2026-10-04"), last: result("c", 12, "2026-10-04") } };
const depth: SummaryLine = { t: t("stereo"), changed: false, line: { eye: null, rows: [], first: undefined, last: undefined } };

const data = (lines: SummaryLine[]): SummaryData => ({
  now: new Date("2026-10-05T12:00:00+05:30"), lines, minutes: 320, practisedDays: 12,
  programme: { slug: "lazy-eye", name: "Lazy eye", level: 1, tag: "lazy", group: "Lazy eye", dailyMinutes: 60, daysPerWeek: 6, doseBasis: "" },
  recent: [{ symptom: "headache", at: new Date("2026-10-02T10:00:00+05:30") }],
});
const member = { profile: { displayName: "Aarav" }, age: 6, enrolment: { programme: "lazy-eye", week: 3, dailyMinutes: 60, daysPerWeek: 6 } } as unknown as Member;

describe("the numbers a plain-words paragraph may use", () => {
  const f = examFacts(member, data([acuityLeft, nearPoint, depth]));

  it("are the page's own strings: each result as the table prints it, with its day", () => {
    expect(f.results).toEqual([
      { name: "Letter size, left eye", latest: expect.stringMatching(/^6\//), latestDay: "3 Oct 2026", first: expect.stringMatching(/^6\//), firstDay: "5 Sept 2026", count: 2, changed: false },
      { name: "Near point", latest: "12 cm", latestDay: "4 Oct 2026", first: null, firstDay: null, count: 1, changed: true },
    ]);
  });

  it("list a check-up with no result as not taken, and never invent one", () => {
    expect(f.notTaken).toEqual(["Depth"]);
  });

  it("carry the practice and the stopped sessions as the page writes them", () => {
    expect(f.practice).toEqual({ programme: "Lazy eye, week 3: 60 minutes a day, 6 days a week", minutes: 320, days: 12, windowDays: 28 });
    expect(f.stops).toEqual([{ symptom: "Headache", day: "2 Oct" }]);
  });

  it("carry no name and no age", () => {
    expect(JSON.stringify(f)).not.toMatch(/Aarav|years old/);
  });

  it("say when a profile is on no programme", () => {
    expect(examFacts({ ...member, enrolment: null } as unknown as Member, { ...data([nearPoint]), programme: null }).practice.programme).toBeNull();
  });
});

describe("how the table names and pairs its lines", () => {
  it("names the eye for a check-up taken one eye at a time", () => {
    expect(lineName(acuityLeft)).toBe("Letter size, left eye");
    expect(lineName(nearPoint)).toBe("Near point");
  });
  it("gives an earlier result only when it is not the latest one", () => {
    expect(firstOf(acuityLeft)?.id).toBe("a");
    expect(firstOf(nearPoint)).toBeUndefined();
  });
});
