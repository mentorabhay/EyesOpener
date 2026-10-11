// Eyes Opener: Unit and regression test suite verifying decide functionality.
import { describe, expect, it } from "vitest";
import { cleanLangStatuses, decide, draftsAllowed, householdLang, offeredLangs, statusOfLang, type Asked } from "./decide";
import { readChoice, writeChoice } from "./runtime";
import { share } from "./progress";

const ask = (over: Partial<Asked>): Asked => ({ cookie: undefined, drafts: undefined, pass: null, statuses: {}, production: true, env: "", ...over });

describe("the language of a request", () => {
  it("is English when nothing is asked for, or something unknown", () => {
    expect(decide(ask({}))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "fr" }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "en", drafts: "on", production: false }))).toEqual({ lang: "en", drafts: false });
  });
  it("is English for a language staff have not switched on: nothing is on by default", () => {
    expect(decide(ask({ cookie: "hi" }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "hi", statuses: { ta: "on" } }))).toEqual({ lang: "en", drafts: false });
  });
  it("is the language once staff switch it on, without drafts", () => {
    expect(decide(ask({ cookie: "hi", statuses: { hi: "on" } }))).toEqual({ lang: "hi", drafts: false });
  });
  it("opens a language in review to staff only", () => {
    expect(decide(ask({ cookie: "ur", statuses: { ur: "review" } }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "ur", statuses: { ur: "review" }, pass: "ur" }))).toEqual({ lang: "ur", drafts: false });
    /* a pass for one language opens no other */
    expect(decide(ask({ cookie: "ur", statuses: { ur: "review" }, pass: "hi" }))).toEqual({ lang: "en", drafts: false });
    /* and a pass never opens a language that is off */
    expect(decide(ask({ cookie: "ur", pass: "ur" }))).toEqual({ lang: "en", drafts: false });
  });
  it("shows machine drafts only through the development switch", () => {
    expect(decide(ask({ cookie: "hi", drafts: "on", production: false }))).toEqual({ lang: "hi", drafts: true });
    expect(decide(ask({ cookie: "hi", production: false, env: "on" }))).toEqual({ lang: "hi", drafts: true });
    expect(decide(ask({ cookie: "hi", drafts: "yes", production: false }))).toEqual({ lang: "en", drafts: false });
  });
  it("refuses the development switch in production, whatever is sent", () => {
    expect(decide(ask({ cookie: "hi", drafts: "on", production: true }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "hi", drafts: "on", production: true, env: "on" }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "hi", drafts: "on", production: true, statuses: { hi: "on" } }))).toEqual({ lang: "hi", drafts: false });
    expect(draftsAllowed(true, "on", "on")).toBe(false);
    expect(draftsAllowed(false, "on", "")).toBe(true);
  });
});

describe("statuses", () => {
  it("English is always on and everything else starts off", () => {
    expect(statusOfLang({}, "en")).toBe("on");
    expect(statusOfLang({}, "hi")).toBe("off");
    expect(offeredLangs({}, false)).toEqual(["en"]);
    expect(offeredLangs({}, true)).toEqual(["en"]);
  });
  it("offers a family what is on, and staff also what is in review", () => {
    const map = { hi: "on", ur: "review", ta: "off" } as const;
    expect(offeredLangs(map, false)).toEqual(["en", "hi"]);
    expect(offeredLangs(map, true)).toEqual(["en", "hi", "ur"]);
  });
  it("never offers a held language to families, even if it is stored as on", () => {
    expect(statusOfLang({ ur: "on" }, "ur")).toBe("review");
    expect(offeredLangs({ ur: "on", hi: "on" }, false)).toEqual(["en", "hi"]);
    expect(offeredLangs({ ur: "on" }, true)).toEqual(["en", "ur"]);
    expect(decide(ask({ cookie: "ur", statuses: { ur: "on" } }))).toEqual({ lang: "en", drafts: false });
    expect(decide(ask({ cookie: "ur", statuses: { ur: "on" }, pass: "ur" }))).toEqual({ lang: "ur", drafts: false });
    expect(householdLang("ur", { ur: "on" }, false)).toBe("en");
  });
  it("cleans a stored value", () => {
    expect(cleanLangStatuses({ hi: "on", ur: "review", ta: "off", en: "off", xx: "on", bn: "maybe" })).toEqual({ hi: "on", ur: "review" });
    expect(cleanLangStatuses(null)).toEqual({});
    expect(cleanLangStatuses(["hi"])).toEqual({});
  });
  it("a household's setting counts only while its language is offered, and is kept meanwhile", () => {
    expect(householdLang("hi", { hi: "on" }, false)).toBe("hi");
    expect(householdLang("hi-IN", { hi: "on" }, false)).toBe("hi");
    expect(householdLang("hi", {}, false)).toBe("en");
    expect(householdLang("ur", { ur: "review" }, false)).toBe("en");
    expect(householdLang("ur", { ur: "review" }, true)).toBe("ur");
    expect(householdLang("", { hi: "on" }, false)).toBe("en");
  });
});

describe("the header a request carries", () => {
  it("is read back as it was written, and anything else is English", () => {
    for (const c of [{ lang: "en", drafts: false }, { lang: "hi", drafts: false }, { lang: "ur", drafts: true }] as const) expect(readChoice(writeChoice(c))).toEqual(c);
    expect(readChoice("xx;drafts")).toEqual({ lang: "en", drafts: false });
    expect(readChoice(null)).toEqual({ lang: "en", drafts: false });
    expect(readChoice("en;drafts")).toEqual({ lang: "en", drafts: false });
  });
});

describe("a share shown as a percent", () => {
  it("never calls a little nothing, or almost all everything", () => {
    expect(share(0, 100)).toBe(0);
    expect(share(1, 8000)).toBe(1);
    expect(share(7999, 8000)).toBe(99);
    expect(share(8000, 8000)).toBe(100);
    expect(share(5, 0)).toBe(0);
  });
});
