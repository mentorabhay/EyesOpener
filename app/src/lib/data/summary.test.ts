import { describe, expect, it } from "vitest";
import { data as copy } from "@/copy/data";
import type { FamilyFile, Row } from "./export";
import { summarise } from "./summary";
import { PARTS, type PartKey } from "./tables";

/** A file as the download holds it after it was read back from JSON: every time is a string. */
function fileWith(rows: Partial<Record<PartKey, Row[]>>): FamilyFile {
  const data = Object.fromEntries(PARTS.map((p) => [p, rows[p] ?? []])) as Record<PartKey, Row[]>;
  const parts = Object.fromEntries(PARTS.map((p) => [p, { ...copy.file.parts[p], rows: data[p].length }])) as FamilyFile["README"]["parts"];
  return {
    README: { what: "", madeAt: "2026-10-05T04:30:00.000Z", read: [], leftOut: ["PINs."], notMedical: "", parts },
    format: "eyesopener-family-data", version: 1, madeAt: "2026-10-05T04:30:00.000Z",
    names: { items: {}, programmes: { "lazy-eye": "Lazy eye" }, checkUps: { acuity: { name: "Letter size", unit: "logMAR", what: "" } } },
    data,
  };
}

const file = fileWith({
  household: [{ id: "h", displayName: "Rao family", locale: "en", createdAt: "2026-01-02T00:00:00.000Z", exitPinSet: true }],
  people: [{ id: "u1", displayName: "Meena", email: "meena@eyesopener.test", seat: "guardian", createdAt: "2026-01-02T00:00:00.000Z" }, { id: "u2", displayName: "Nana", seat: "circle", createdAt: "2026-02-02T00:00:00.000Z" }],
  profiles: [{ id: "p1", displayName: "Isha", kind: "child", birthYear: 2019, archivedAt: null }, { id: "p2", displayName: "Meena", kind: "adult", birthYear: null, archivedAt: "2026-05-01T00:00:00.000Z" }],
  screens: [{ id: "d1" }],
  programmes: [{ profileId: "p1", programme: "lazy-eye", status: "active", week: 3 }, { profileId: "p2", programme: "not-in-this-edition", status: "finished", week: 1 }],
  eyeSettings: [{ profileId: "p1", isCurrent: false, weakEye: "right", strongContrast: 0.3, createdAt: "2026-01-03T00:00:00.000Z" }, { profileId: "p1", isCurrent: true, weakEye: "left", strongContrast: 0.15, createdAt: "2026-03-03T00:00:00.000Z" }],
  checkUps: [
    { profileId: "p1", testKey: "acuity", takenAt: "2026-01-05T00:00:00.000Z" }, { profileId: "p1", testKey: "acuity", takenAt: "2026-03-05T00:00:00.000Z" },
    { profileId: "p1", testKey: "home-made", takenAt: "2026-02-01T00:00:00.000Z" }, { profileId: "p2", testKey: "acuity", takenAt: "2026-02-05T00:00:00.000Z" },
  ],
  sessions: [
    { profileId: "p1", minutes: 12.4, endReason: "done" }, { profileId: "p1", minutes: 3.2, endReason: "stop_rule" }, { profileId: "p1", minutes: "bad", endReason: "left" },
    { profileId: "p2", minutes: 5, endReason: "done" },
  ],
  days: [{ profileId: "p1", day: "2026-03-01" }, { profileId: "p1", day: "2026-03-02" }],
  consent: [{ profileId: "p1", revokedAt: "2026-02-01T00:00:00.000Z" }, { profileId: "p1", revokedAt: null }],
  counsellorLinks: [{ id: "l1", profileId: "p1", counsellorName: "Dr Rao (counsellor)", status: "active" }, { id: "l2", profileId: "p2", counsellorName: "Dr Iyer (counsellor)", status: "ended" }],
  counsellorNotes: [{ linkId: "l1", body: "Doing well.", createdAt: "2026-03-10T00:00:00.000Z" }, { linkId: "l2", body: "For the adult.", createdAt: "2026-03-11T00:00:00.000Z" }],
  mail: [{ toProfileId: "p1", fromProfileId: "p2" }, { toProfileId: "p2", fromProfileId: "p1" }],
  lights: [{ fromProfileId: "p1", toProfileName: "Zoya" }, { toProfileId: "p1", fromProfileName: "Zoya" }, { fromProfileId: "p2", toProfileName: "Zoya" }],
  stories: [{ profileId: "p1" }], ideas: [{ profileId: "p1" }, { profileId: "p1" }], weekNotes: [{ profileId: "p2" }],
});

describe("the summary of a family's file", () => {
  const sum = summarise(file);
  const isha = sum.profiles.find((p) => p.name === "Isha")!, meena = sum.profiles.find((p) => p.name === "Meena")!;

  it("gives the household, and each grown-up with an email only where the file has one", () => {
    expect(sum.household).toMatchObject({ name: "Rao family", locale: "en", exitPinSet: true, screens: 1, groups: 0, invites: 0 });
    expect(sum.household.since?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(sum.people.map((p) => [p.name, p.email, p.seat])).toEqual([["Meena", "meena@eyesopener.test", "guardian"], ["Nana", "", "circle"]]);
    expect(sum.madeAt.toISOString()).toBe("2026-10-05T04:30:00.000Z");
  });

  it("counts each profile's own rows and nobody else's", () => {
    expect(isha).toMatchObject({ kind: "child", birthYear: 2019, archived: false, sessions: 3, stopped: 1, days: 2, stories: 1, ideas: 2, weekNotes: 0, mail: 1, lights: 2, consent: { n: 2, live: 1 } });
    expect(meena).toMatchObject({ kind: "adult", birthYear: null, archived: true, sessions: 1, minutes: 5, days: 0, stories: 0, weekNotes: 1, mail: 1, lights: 1 });
  });

  it("adds up minutes and ignores anything that is not a number", () => {
    expect(isha.minutes).toBe(16);
  });

  it("shows the eye settings in use, not an older set", () => {
    expect(isha.eye).toMatchObject({ weakEye: "left", strongContrast: 0.15 });
    expect(meena.eye).toBeNull();
  });

  it("lists each check-up with how many results there are and the first and last day, by its name when the file knows it", () => {
    expect(isha.checkUps.map((c) => [c.name, c.n, c.first?.toISOString().slice(0, 10), c.last?.toISOString().slice(0, 10)])).toEqual([
      ["Letter size", 2, "2026-01-05", "2026-03-05"], ["home-made", 1, "2026-02-01", "2026-02-01"],
    ]);
  });

  it("names a programme, and falls back to its code when this edition does not know it", () => {
    expect(isha.programmes).toEqual([{ name: "Lazy eye", status: "active", week: 3 }]);
    expect(meena.programmes).toEqual([{ name: "not-in-this-edition", status: "finished", week: 1 }]);
  });

  it("puts each counsellor's note under the profile it is about", () => {
    expect(isha.counsellors).toEqual([{ name: "Dr Rao (counsellor)", status: "active" }]);
    expect(isha.notes.map((n) => [n.by, n.body])).toEqual([["Dr Rao (counsellor)", "Doing well."]]);
    expect(meena.notes.map((n) => n.body)).toEqual(["For the adult."]);
  });

  it("lists every part of the file with its number of rows, and the total", () => {
    expect(sum.parts.map((p) => p.key)).toEqual([...PARTS]);
    expect(sum.parts.find((p) => p.key === "sessions")).toMatchObject({ title: "Sessions", rows: 4 });
    expect(sum.total).toBe(PARTS.reduce((n, p) => n + file.data[p].length, 0));
    expect(sum.leftOut).toEqual(["PINs."]);
  });

  it("does not fall over on an empty household", () => {
    const empty = summarise(fileWith({}));
    expect(empty.household).toMatchObject({ name: "", exitPinSet: false, screens: 0 });
    expect(empty.profiles).toEqual([]);
    expect(empty.total).toBe(0);
  });
});
