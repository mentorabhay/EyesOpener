import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: { insert: () => ({ values: async () => undefined }) }, schema: { auditLog: {} } }));

import { isCadence, jobSecret, jobSecretMatches, runJob, runJobs, type Job } from "./index";

describe("scheduled jobs", () => {
  it("has no secret unless one of 16 characters or more is set", () => {
    expect(jobSecret(undefined)).toBeNull();
    expect(jobSecret("short")).toBeNull();
    expect(jobSecret("  a-long-enough-secret  ")).toBe("a-long-enough-secret");
  });
  it("accepts only the exact secret, and nothing at all when no secret is set", () => {
    expect(jobSecretMatches("a-long-enough-secret", "a-long-enough-secret")).toBe(true);
    expect(jobSecretMatches("a-long-enough-secreT", "a-long-enough-secret")).toBe(false);
    expect(jobSecretMatches("", "a-long-enough-secret")).toBe(false);
    expect(jobSecretMatches(null, "a-long-enough-secret")).toBe(false);
    expect(jobSecretMatches("anything", null)).toBe(false);
  });
  it("knows two cadences", () => {
    expect(isCadence("daily")).toBe(true);
    expect(isCadence("weekly")).toBe(true);
    expect(isCadence("hourly")).toBe(false);
  });
  it("runs the jobs of one cadence in order, and a failing job does not stop the rest", async () => {
    const ran: string[] = [];
    const jobs: Job[] = [
      { name: "a", cadence: "daily", what: "", run: async () => { ran.push("a"); return { ok: true, note: "done", counts: { rows: 2 } }; } },
      { name: "b", cadence: "daily", what: "", run: async () => { ran.push("b"); throw new Error("broke"); } },
      { name: "c", cadence: "weekly", what: "", run: async () => { ran.push("c"); return { ok: true, note: "done" }; } },
      { name: "d", cadence: "daily", what: "", run: async () => { ran.push("d"); return { ok: true, note: "done" }; } },
    ];
    const out = await runJobs("daily", new Date(), jobs);
    expect(ran).toEqual(["a", "b", "d"]);
    expect(out.map((r) => [r.name, r.ok])).toEqual([["a", true], ["b", false], ["d", true]]);
    expect(out[1].note).toBe("broke");
  });
  it("runs one job by name for staff, and answers null for a name that does not exist", async () => {
    const jobs: Job[] = [{ name: "a", cadence: "weekly", what: "", run: async () => ({ ok: true, note: "done" }) }];
    expect((await runJob("a", "00000000-0000-0000-0000-000000000000", new Date(), jobs))?.ok).toBe(true);
    expect(await runJob("nope", "00000000-0000-0000-0000-000000000000", new Date(), jobs)).toBeNull();
  });
});
