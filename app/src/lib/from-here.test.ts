import { describe, expect, it } from "vitest";
import { fromHere, isAction } from "./from-here";

const req = (h: Record<string, string>) => new Request("https://example.test/try", { headers: h });

describe("an address that does something", () => {
  it("acts only on a person's own move to it", () => {
    expect(fromHere(req({ "sec-fetch-site": "same-origin", "sec-fetch-mode": "navigate" }))).toBe(true);
    expect(fromHere(req({ "sec-fetch-site": "none", "sec-fetch-mode": "navigate" }))).toBe(true);
    expect(fromHere(req({}))).toBe(true);
    expect(fromHere(req({ "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate" }))).toBe(false);
    expect(fromHere(req({ "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors" }))).toBe(false);
    expect(fromHere(req({ "sec-fetch-site": "same-origin", "next-router-prefetch": "1" }))).toBe(false);
    expect(fromHere(req({ purpose: "prefetch" }))).toBe(false);
  });
  it("is opened by a full load in the menus", () => {
    expect(isAction("/tryout")).toBe(true);
    expect(isAction("/tryout/leave")).toBe(true);
    expect(isAction("/train")).toBe(false);
  });
});
