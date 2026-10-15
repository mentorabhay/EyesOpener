import { describe, expect, it } from "vitest";
import { catalogue, exercises, games, programmes, tests } from "@/data";
import {
  ENQUIRY_DAILY_LIMIT, ENQUIRY_MAX, EVIDENCE_KEYS, HONEYPOT_FIELD, PRIVATE_PATHS, SITE_PAGES,
  evidenceCounts, evidenceIn, exercisesIn, filterLibrary, forWhom, gamesIn, groupForTag, levelCounts, libraryHref, looseGroups, mechanismUse,
  nextEnquiryStatuses, overEnquiryLimit, readEnquiry, readLibraryFilter, siteUrl, testsFor,
} from "./site";

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe("counts on the public pages", () => {
  it("counts every game and exercise under exactly one evidence label", () => {
    const rows = evidenceCounts();
    expect(rows.map((r) => r.key)).toEqual(EVIDENCE_KEYS);
    expect(sum(rows.map((r) => r.games))).toBe(games.length);
    expect(sum(rows.map((r) => r.exercises))).toBe(exercises.length);
    for (const r of rows) expect(r.total).toBe(r.games + r.exercises);
  });

  it("lists every mechanism once, strongest evidence first", () => {
    const rows = mechanismUse();
    expect(rows).toHaveLength(catalogue.mechanisms.length);
    expect(sum(rows.map((r) => r.games))).toBe(games.length);
    expect(sum(rows.map((r) => r.exercises))).toBe(exercises.length);
    const order = rows.map((r) => EVIDENCE_KEYS.indexOf(r.evidence));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("puts every game at one access level", () => {
    expect(sum(levelCounts().map((l) => l.games))).toBe(games.length);
    expect(sum(levelCounts().map((l) => l.programmes))).toBe(programmes.length);
  });
});

describe("programmes", () => {
  it("gives every open programme at least one game, and every programme a check-up that exists", () => {
    for (const p of programmes) {
      /* A counsellor-led programme may have no game in an edition that leaves its games out. Its page says so. */
      if (p.level < 2) expect(gamesIn(p).length, p.slug).toBeGreaterThan(0);
      const tracked = testsFor(p);
      expect(tracked.length, p.slug).toBeGreaterThan(0);
      for (const t of tracked) expect(tests).toContain(t);
      expect(new Set(tracked).size).toBe(tracked.length);
    }
  });

  it("takes exercises from the programme's own group only", () => {
    for (const p of programmes) for (const e of exercisesIn(p)) expect(e.group).toBe(p.group);
    expect(exercisesIn(programmes.find((p) => p.group === null)!)).toEqual([]);
  });

  it("names the evidence labels a programme holds, each once", () => {
    for (const p of programmes) {
      const keys = evidenceIn(p);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBeGreaterThan(0);
    }
  });

  it("drops the level code from who a game is for", () => {
    for (const item of [...games, ...exercises]) expect(forWhom(item)).not.toMatch(/level/);
    expect(forWhom({ ...games[0], for: "Lazy eye · ages 6+ · level 2, counsellor plan" })).toBe("Lazy eye · ages 6+");
    expect(forWhom({ ...games[0], for: "Ages 3 to 9" })).toBe("Ages 3 to 9");
  });

  it("knows the exercise groups no programme owns", () => {
    for (const g of looseGroups()) expect(programmes.some((p) => p.group === g)).toBe(false);
  });
});

describe("the library filter", () => {
  it("shows everything with no filter", () => {
    const f = readLibraryFilter({});
    expect(f).toEqual({ tag: "any", evidence: "all", kind: "all" });
    const all = filterLibrary(f);
    expect(all.games).toHaveLength(games.length);
    expect(all.exercises).toHaveLength(exercises.length);
    expect(libraryHref(f)).toBe("/library");
  });

  it("ignores values it does not know", () => {
    expect(readLibraryFilter({ tag: "nope", evidence: "great", kind: "films" })).toEqual({ tag: "any", evidence: "all", kind: "all" });
    expect(readLibraryFilter({ tag: ["lazy", "conv"], evidence: "strong" })).toEqual({ tag: "lazy", evidence: "strong", kind: "all" });
  });

  it("filters games by tag and exercises by the matching group", () => {
    const { games: g, exercises: e } = filterLibrary({ tag: "conv", evidence: "all", kind: "all" });
    expect(g.length).toBeGreaterThan(0);
    for (const x of g) expect(x.tags).toContain("conv");
    expect(groupForTag("conv")).toBe("Convergence");
    for (const x of e) expect(x.group).toBe("Convergence");
    expect(filterLibrary({ tag: "coop", evidence: "all", kind: "all" }).exercises).toEqual([]);
  });

  it("filters by evidence and by kind", () => {
    const strong = filterLibrary({ tag: "any", evidence: "strong", kind: "all" });
    const row = evidenceCounts().find((r) => r.key === "strong")!;
    expect(strong.games).toHaveLength(row.games);
    expect(strong.exercises).toHaveLength(row.exercises);
    expect(filterLibrary({ tag: "any", evidence: "all", kind: "games" }).exercises).toEqual([]);
    expect(filterLibrary({ tag: "any", evidence: "all", kind: "exercises" }).games).toEqual([]);
  });

  it("writes an address that reads back to the same filter", () => {
    const f = { tag: "lazy", evidence: "moderate", kind: "games" } as const;
    const q = Object.fromEntries(new URL(libraryHref(f), "http://x").searchParams);
    expect(readLibraryFilter(q)).toEqual(f);
  });
});

describe("the site map", () => {
  it("never lists a private area as a public page", () => {
    for (const page of SITE_PAGES as readonly string[]) for (const hidden of PRIVATE_PATHS as readonly string[]) expect(page === hidden || page.startsWith(hidden + "/")).toBe(false);
  });
  it("reads the site address without a trailing slash", () => {
    expect(siteUrl("https://iopener.example/")).toBe("https://iopener.example");
    expect(siteUrl(undefined)).toMatch(/^http/);
    expect(siteUrl("  ")).toMatch(/^http/);
  });
});

describe("the enquiry form", () => {
  const good = { name: " Dr Rao ", organisation: "City Eye Clinic", email: " Rao@Clinic.Example ", kind: "counsellor", message: "I would like to take part.", adult: "on", [HONEYPOT_FIELD]: "" };

  it("accepts a full form and tidies it", () => {
    const r = readEnquiry(good);
    expect(r).toEqual({ ok: true, robot: false, data: { name: "Dr Rao", organisation: "City Eye Clinic", email: "rao@clinic.example", kind: "counsellor", message: "I would like to take part.", adult: "on" } });
  });

  it("lets the organisation be empty", () => {
    const r = readEnquiry({ ...good, organisation: "" });
    expect(r.ok && !r.robot && r.data.organisation).toBe("");
  });

  it("names the fields that are wrong", () => {
    const r = readEnquiry({ ...good, name: "  ", email: "not-an-email", kind: "investor", message: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect([...r.fields].sort()).toEqual(["email", "kind", "message", "name"]);
  });

  it("refuses anyone who does not tick the adult box", () => {
    const { adult: _adult, ...rest } = good;
    void _adult;
    const r = readEnquiry(rest);
    expect(r).toEqual({ ok: false, fields: ["adult"] });
  });

  it("refuses text that is too long", () => {
    const r = readEnquiry({ ...good, message: "a".repeat(ENQUIRY_MAX.message + 1), name: "b".repeat(ENQUIRY_MAX.name + 1) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect([...r.fields].sort()).toEqual(["message", "name"]);
  });

  it("treats a filled honeypot as a robot and carries no data", () => {
    expect(readEnquiry({ ...good, [HONEYPOT_FIELD]: "http://spam.example" })).toEqual({ ok: true, robot: true });
    expect(readEnquiry({ [HONEYPOT_FIELD]: "x" })).toEqual({ ok: true, robot: true });
  });

  it("stops an address at the daily limit", () => {
    expect(overEnquiryLimit(ENQUIRY_DAILY_LIMIT - 1)).toBe(false);
    expect(overEnquiryLimit(ENQUIRY_DAILY_LIMIT)).toBe(true);
    expect(overEnquiryLimit(ENQUIRY_DAILY_LIMIT + 4)).toBe(true);
  });

  it("only moves an enquiry forward", () => {
    expect(nextEnquiryStatuses("new")).toEqual(["answered", "closed"]);
    expect(nextEnquiryStatuses("answered")).toEqual(["closed"]);
    expect(nextEnquiryStatuses("closed")).toEqual([]);
    expect(nextEnquiryStatuses("anything")).toEqual([]);
  });
});
