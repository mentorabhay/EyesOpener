import { describe, it, expect } from "vitest";
import { signToken, verifyToken, hashPin, checkPin } from "./token";

describe("signed tokens", () => {
  const secret = "a-secret-for-tests-only";
  it("round-trips a payload", () => {
    const t = signToken({ userId: "u1", exp: Date.now() + 1000 }, secret);
    expect(verifyToken<{ userId: string }>(t, secret)?.userId).toBe("u1");
  });
  it("rejects a changed payload, a wrong secret, an expired token and rubbish", () => {
    const t = signToken({ userId: "u1", exp: Date.now() + 1000 }, secret);
    const forged = Buffer.from(JSON.stringify({ userId: "u2", exp: Date.now() + 1000 })).toString("base64url") + "." + t.split(".")[1];
    expect(verifyToken(forged, secret)).toBeNull();
    expect(verifyToken(t, "another-secret-entirely")).toBeNull();
    expect(verifyToken(signToken({ exp: Date.now() - 1 }, secret), secret)).toBeNull();
    for (const bad of ["", "abc", ".", "a.b", null, undefined]) expect(verifyToken(bad, secret)).toBeNull();
  });
});

describe("exit PIN", () => {
  it("accepts the right PIN only", () => {
    const h = hashPin("4827");
    expect(checkPin("4827", h)).toBe(true); expect(checkPin("4828", h)).toBe(false);
    expect(checkPin("4827", null)).toBe(false); expect(checkPin("4827", "broken")).toBe(false);
  });
  it("salts every hash", () => { expect(hashPin("1111")).not.toBe(hashPin("1111")); });
});
