import { describe, expect, it } from "vitest";
import { memberCan } from "./roles";
import { HERO_KEEP, isHeroVia, keepBlock, mayAllowCamera, mayDropHero, mayPickHero, type KeepInput } from "./hero-rules";

const ok: KeepInput = { guardianHere: true, child: true, parental: true, via: "photo", cameraAllowed: false, shapeOk: true, kept: 0 };

describe("keeping a hero", () => {
  it("is open to a guardian with a good shape", () => {
    expect(keepBlock(ok)).toBeNull();
    expect(keepBlock({ ...ok, child: false, parental: false })).toBeNull();
    for (const via of ["photo", "screen", "starter"] as const) expect(keepBlock({ ...ok, via })).toBeNull();
  });

  it("needs a guardian at the device: not a cheer seat, not child mode", () => {
    expect(keepBlock({ ...ok, guardianHere: memberCan("guardian", "share", true) })).toBe("guardian");
    expect(keepBlock({ ...ok, guardianHere: memberCan("circle", "share") })).toBe("guardian");
    expect(keepBlock({ ...ok, guardianHere: memberCan("co_guardian", "share") })).toBeNull();
  });

  it("needs the parental consent to stand for a child", () => {
    expect(keepBlock({ ...ok, parental: false })).toBe("consent");
  });

  it("needs the camera consent for the camera, and only for the camera", () => {
    expect(keepBlock({ ...ok, via: "camera" })).toBe("camera");
    expect(keepBlock({ ...ok, via: "camera", cameraAllowed: true })).toBeNull();
    expect(keepBlock({ ...ok, via: "photo", cameraAllowed: false })).toBeNull();
  });

  it("refuses a shape that did not pass the check, and a thirteenth hero", () => {
    expect(keepBlock({ ...ok, shapeOk: false })).toBe("shape");
    expect(keepBlock({ ...ok, kept: HERO_KEEP - 1 })).toBeNull();
    expect(keepBlock({ ...ok, kept: HERO_KEEP })).toBe("full");
  });

  it("says the first thing in the way: the guardian before the consent before the camera", () => {
    expect(keepBlock({ ...ok, guardianHere: false, parental: false, via: "camera", shapeOk: false, kept: 99 })).toBe("guardian");
    expect(keepBlock({ ...ok, parental: false, via: "camera", shapeOk: false })).toBe("consent");
    expect(keepBlock({ ...ok, via: "camera", shapeOk: false })).toBe("camera");
  });

  it("knows the four ways a hero is made", () => {
    for (const v of ["camera", "photo", "screen", "starter"]) expect(isHeroVia(v)).toBe(true);
    for (const v of ["upload", "", null, 3, undefined]) expect(isHeroVia(v)).toBe(false);
  });
});

describe("using a hero", () => {
  it("lets a child in child mode choose which hero plays, but not delete one or allow the camera", () => {
    expect(mayPickHero(memberCan("guardian", "train", true))).toBe(true);
    expect(mayDropHero(memberCan("guardian", "share", true))).toBe(false);
    expect(mayAllowCamera(memberCan("guardian", "consent", true))).toBe(false);
  });
  it("gives a cheer seat nothing to change", () => {
    expect(mayPickHero(memberCan("circle", "train"))).toBe(false);
    expect(mayDropHero(memberCan("circle", "share"))).toBe(false);
    expect(mayAllowCamera(memberCan("circle", "consent"))).toBe(false);
  });
  it("lets a guardian do all three", () => {
    expect(mayPickHero(memberCan("guardian", "train"))).toBe(true);
    expect(mayDropHero(memberCan("co_guardian", "share"))).toBe(true);
    expect(mayAllowCamera(memberCan("guardian", "consent"))).toBe(true);
  });
});
