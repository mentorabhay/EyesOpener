import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, schema: {} }));

import { isRunKey, needsScreen } from "@/app/(app)/test/results";
import { experiments } from "@/copy/experiments";
import { tests } from "@/data";
import { ruleOf } from "./experiment-data";

describe("experiments and the check-ups", () => {
  it("agrees with the check-up runner on which check-ups are drawn on a measured screen", () => {
    for (const t of tests) if (isRunKey(t.key)) expect([t.key, ruleOf(t).onScreen]).toEqual([t.key, needsScreen(t.key)]);
    /* the recovery value is saved by the fusion range run, which is drawn on the screen */
    expect(ruleOf(tests.find((t) => t.key === "fusion_recovery")!).onScreen).toBe(true);
  });
  it("carries each check-up's own rules into the experiment", () => {
    const acuity = ruleOf(tests.find((t) => t.key === "acuity")!), survey = ruleOf(tests.find((t) => t.key === "symptoms")!);
    expect(acuity).toEqual({ unit: "logMAR", perEye: true, lowerIsBetter: true, onScreen: true });
    expect(survey).toEqual({ unit: "score", perEye: false, lowerIsBetter: true, onScreen: false });
  });
  it("has words for the unit of every check-up an idea can name", () => {
    for (const t of tests) expect([t.key, typeof experiments.pooled.units[t.unit]]).toEqual([t.key, "string"]);
  });
});
