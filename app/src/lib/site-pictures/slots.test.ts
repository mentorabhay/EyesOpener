// Eyes Opener: Tests for the picture slots: sizes, focal points, and words for every slot.
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
      expect(pictures.staff.briefs[s.id].goal.length).toBeGreaterThan(20);
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

describe("picture briefs", () => {
  it("gives every slot a full brief, and a description that names the frame and the house rules", async () => {
    const { promptOf } = await import("./brief");
    const { frameOf } = await import("./slots");
    const st = pictures.staff;
    for (const s of SLOTS) {
      const b = st.briefs[s.id];
      for (const v of Object.values(b)) expect(v.length).toBeGreaterThan(10);
      const p = promptOf(b, st, frameOf(s).shape, s.place);
      expect(p.startsWith(`A landscape photo, ${frameOf(s).shape}.`)).toBe(true);
      expect(p).toContain("Leave out:");
      if (/red-cyan glasses/.test(b.action)) expect(p).toContain(st.glasses);
      expect(p.length).toBeLessThan(2000);
      expect(s.focus.every((n) => n >= 0 && n <= 1)).toBe(true);
    }
  });
});
