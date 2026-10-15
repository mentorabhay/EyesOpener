import { describe, expect, it } from "vitest";
import { fill, fits, placeholders, templateOf, variantName } from "./template";

describe("a copy function as a template", () => {
  it("turns a plain sentence around its parameters into a template", () => {
    expect(templateOf((name: string) => `Switch to ${name}`, ["name"])).toBe("Switch to {name}");
    expect(templateOf((at: string, of: string) => `${at} of ${of}`, ["at", "of"])).toBe("{at} of {of}");
    expect(templateOf((n: number) => n + " minutes", ["n"])).toBe("{n} minutes");
    expect(templateOf(() => "Nothing to fill", [])).toBe("Nothing to fill");
  });
  it("reads the fields of an object parameter", () => {
    expect(templateOf((p: { name: string; minutes: number }) => `${p.name}: ${p.minutes} min`, ["p"])).toBe("{p.name}: {p.minutes} min");
  });
  it("makes no template when a value is worked on rather than written in", () => {
    expect(templateOf((cm: number) => `${(cm * 10).toFixed(1)} mm`, ["cm"])).toBeNull();
    expect(templateOf((n: number) => `${Math.round(n)} minutes`, ["n"])).toBeNull();
    expect(templateOf((s: string) => `Hello ${s.toUpperCase()}`, ["s"])).toBeNull();
    expect(templateOf((items: string[]) => items.join(", "), ["items"])).toBeNull();
    expect(templateOf((d: Date) => `On ${d.toISOString()}`, ["d"])).toBeNull();
    expect(templateOf((kind: string) => ({ lead: kind }) as unknown as string, ["kind"])).toBeNull();
    expect(templateOf(() => { throw new Error("no"); }, [])).toBeNull();
  });
  it("makes a template for each fixed value when the wording depends on the value", () => {
    const lens = (cyan: "left" | "right") => `Cyan lens over the ${cyan} eye, red lens over the ${cyan === "left" ? "right" : "left"} eye`;
    expect(templateOf(lens, ["cyan"], [[0, "left"]])).toBe("Cyan lens over the left eye, red lens over the right eye");
    expect(templateOf(lens, ["cyan"], [[0, "right"]])).toBe("Cyan lens over the right eye, red lens over the left eye");
    const minutes = (n: number) => (n ? `${n} minutes` : "No training minutes");
    expect(templateOf(minutes, ["n"])).toBe("{n} minutes");
    expect(templateOf(minutes, ["n"], [[0, 0]])).toBe("No training minutes");
  });
  it("cannot see a sum, which is why every use is proved against the English function (runtime.test.ts)", () => {
    const next = (n: number) => `${n + 1} of 5`;
    const wrong = templateOf(next, ["n"]);
    expect(wrong).toBe("{n}1 of 5");
    /* the proof: filled with a real value, the template does not say what the function says */
    expect(fill(wrong!, ["n"], [3])).not.toBe(next(3));
  });
  it("fills a template exactly as a template string would", () => {
    expect(fill("Switch to {name}", ["name"], ["Aarav"])).toBe("Switch to Aarav");
    expect(fill("{n} minutes", ["n"], [5])).toBe("5 minutes");
    expect(fill("{p.name}: {p.minutes} min", ["p"], [{ name: "Aarav", minutes: 20 }])).toBe("Aarav: 20 min");
    expect(fill("age {age}", ["age"], [null])).toBe("age null");
    /* a placeholder that names no parameter belongs to a later step and is left alone */
    expect(fill("Cover the {cyan} eye, {name}", ["name"], ["Aarav"])).toBe("Cover the {cyan} eye, Aarav");
  });
  it("lists placeholders, and names and matches a variant", () => {
    expect(placeholders("{at} of {of}, {p.name}")).toEqual(["at", "of", "p.name"]);
    expect(variantName(["kind", "n"], [[1, 0], [0, "child"]])).toBe("kind=child,n=0");
    expect(fits([[0, "left"]], ["left", 3])).toBe(true);
    expect(fits([[0, "left"]], ["right", 3])).toBe(false);
  });
});
