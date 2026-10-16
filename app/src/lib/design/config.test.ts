// Tests for the design settings: defaults pass the contrast floor, bad values fall back, scene inks stay locked.
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, DESIGN_VARIABLES, contrast, contrastProblems, designAttrs, designCss, parseDesign } from "./config";

const clone = () => structuredClone(DEFAULT_DESIGN);

describe("design settings", () => {
  it("the defaults keep every text at 4.5:1 or better, light and dark", () => {
    expect(contrastProblems(DEFAULT_DESIGN)).toEqual([]);
  });

  it("keeps the gradient on buttons, with stops that keep white text readable (decision D2)", () => {
    for (const c of Object.values(DEFAULT_DESIGN.gradientText)) expect(contrast("#ffffff", c)).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_DESIGN.gradientOn.buttons).toBe(true);
    expect(designCss(DEFAULT_DESIGN)).toContain("--grad-button:linear-gradient(135deg, #8b31f0 0%, #b0478a 52%, #b45309 100%)");
  });

  it("refuses a text gradient whose end would leave white text unreadable", () => {
    const d = clone(); d.gradientText.to = "#f4aa2d";
    expect(contrastProblems(d).map((p) => p.on)).toContain("the text gradient's end");
    expect(parseDesign(d)).toEqual(DEFAULT_DESIGN);
  });

  it("refuses a muted text colour below the floor, in either theme", () => {
    const d = clone(); d.light.ink3 = "#6e747c";
    expect(contrastProblems(d).some((p) => p.theme === "light" && p.text === "muted text")).toBe(true);
  });

  it("falls back to the defaults for anything that is not a design", () => {
    expect(parseDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(parseDesign({ version: 1 })).toEqual(DEFAULT_DESIGN);
    expect(parseDesign({ ...clone(), light: { ...clone().light, ink: "red; background:url(x)" } })).toEqual(DEFAULT_DESIGN);
  });

  it("applies a valid change", () => {
    const d = clone(); d.type.siteBody = 18; d.motion.level = "calm"; d.content.decorativeNumbers = false;
    expect(designCss(d)).toContain("--site-text:18px");
    expect(designAttrs(d)).toMatchObject({ "data-motion": "calm", "data-numbers": "off" });
  });

  it("never sets the therapy scene inks or anything outside its own list", () => {
    const css = designCss(DEFAULT_DESIGN);
    for (const ink of ["--weak", "--strong", "--shared", "--scene"]) expect(css).not.toMatch(new RegExp(`${ink}\\s*:`));
    const names = [...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    for (const n of names) expect(DESIGN_VARIABLES as readonly string[]).toContain(n);
  });

  it("turns shadows off at strength 0 (decision D14 keeps them on by default)", () => {
    expect(designCss(DEFAULT_DESIGN)).toMatch(/--sh-card:0 1px 2px/);
    const d = clone(); d.surfaces.shadow = 0;
    expect(designCss(d)).toContain("--sh-card:none");
  });
});
