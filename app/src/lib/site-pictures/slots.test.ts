// Tests for the picture slots: sizes, focal points, and words for every slot.
import { describe, expect, it } from "vitest";
import { pictures } from "@/copy/pictures";
import { SLOTS, SLOT_IDS, focal, picAddress, slotOf, widthsFor } from "./slots";

describe("picture slots", () => {
  it("lists every slot once, each with a page, a shape and words for staff", () => {
    expect(new Set(SLOTS.map((s) => s.id))).toEqual(new Set(SLOT_IDS));
    expect(SLOTS.length).toBe(SLOT_IDS.length);
    for (const s of SLOTS) {
      expect(s.page.startsWith("/")).toBe(true);
      expect(s.aspect).toBeGreaterThan(0.5);
      expect(pictures.slots[s.id].name.length).toBeGreaterThan(3);
      expect(pictures.slots[s.id].scene.length).toBeGreaterThan(20);
    }
    expect(slotOf("nope")).toBeUndefined();
  });

  it("makes every standard size a picture reaches, and never makes one larger", () => {
    expect(widthsFor(3000)).toEqual([640, 1280, 1920]);
    expect(widthsFor(1500)).toEqual([640, 1280]);
    expect(widthsFor(500)).toEqual([500]);
  });

  it("keeps a focal point inside the picture", () => {
    expect(focal(-1)).toBe(0); expect(focal(2)).toBe(1); expect(focal(0.3)).toBe(0.3);
    expect(focal("x")).toBe(0.5); expect(focal(Number.NaN)).toBe(0.5);
  });

  it("gives each size an address of its own", () => {
    expect(picAddress("a", 640)).toBe("/pic/a/640.webp");
  });
});
