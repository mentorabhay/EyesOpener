import { describe, expect, it } from "vitest";
import { demoProjectOk } from "./demo-project";

describe("demo sign-in by sign-in project", () => {
  it("is allowed with no project, a staging, development or test project, or an emulator", () => {
    for (const p of [undefined, "", "iopener-staging", "shop-dev", "app-test", "demo-iopener"]) expect(demoProjectOk(p)).toBe(true);
  });
  it("is refused on a live project", () => {
    for (const p of ["shop-prod", "eyesopener", "staging-copy-live", "my-devices"]) expect(demoProjectOk(p)).toBe(false);
  });
});
