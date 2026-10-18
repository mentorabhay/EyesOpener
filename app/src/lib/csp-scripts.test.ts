import { describe, expect, it } from "vitest";
import { newNonce, scriptRule, scriptRuleHeader, scriptRuleMode } from "./csp-scripts";

describe("the rule for scripts", () => {
  it("gives a fresh nonce each time, long enough not to be guessed", () => {
    const a = newNonce(), b = newNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(24);
  });
  it("names the nonce and leaves out eval except while developing", () => {
    expect(scriptRule("abc", false)).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(scriptRule("abc", false)).not.toContain("'unsafe-eval'");
    expect(scriptRule("abc", true)).toContain("'unsafe-eval'");
  });
  it("reports by default, and refuses only when told", () => {
    expect(scriptRuleMode(undefined)).toBe("report");
    expect(scriptRuleMode("enforce")).toBe("enforce");
    expect(scriptRuleMode("off")).toBe("off");
    expect(scriptRuleHeader("report")).toBe("content-security-policy-report-only");
    expect(scriptRuleHeader("enforce")).toBe("content-security-policy");
  });
});
