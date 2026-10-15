import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { extract, type Unit } from "../../scripts/i18n/extract";
import { ALLOWED, GRADE, LONG, allowedBy, check, grade, isCitation, readerOf, sentences, syllables, wordsOf, type Reader } from "./plain-words";

const rules = (text: string, reader: Reader = "family") => check(text, reader).filter((f) => f.hard).map((f) => f.rule);
const soft = (text: string, reader: Reader = "family") => check(text, reader).filter((f) => !f.hard).map((f) => f.rule);

describe("the plain-words rules", () => {
  it("lets ordinary sentences through", () => {
    for (const ok of [
      "Put the glasses on, cyan lens over your left eye, and press Start.",
      "Eyes Opener is not a medical device. It does not diagnose, treat or cure any condition.",
      "The weaker eye sees the fireflies. The stronger eye sees the jar.",
      "Lazy eye programme, week 6 of 12.",
      "Print this card on A4 paper.",
      "{done} of {goal} minutes",
      "For someone an eye doctor has told they have this condition.",
      "An eye doctor diagnoses a squint. This app does not.",
    ]) expect(rules(ok), ok).toEqual([]);
  });
  it("refuses pictures typed as letters, and keeps arrows and marks", () => {
    expect(rules("Well done \u{1F389}")).toContain("emoji");
    expect(rules("Press → to go on. © Eyes Opener ✓")).toEqual([]);
  });
  it("refuses the code's own names, task numbers and notes to self", () => {
    expect(rules("Set by the dgame method")).toContain("code");
    expect(rules("Ended by daily_cap")).toContain("code");
    expect(rules("Read the itemSlug")).toContain("code");
    expect(rules("Open src/lib/session.ts")).toContain("code");
    expect(rules("Waits for task A6")).toContain("code");
    expect(rules("Run clip M17 first")).toContain("code");
    expect(rules("TODO: write this")).toContain("note");
    expect(rules("Works on an iPhone")).toEqual([]);
    expect(rules("Hello {firstName}, {n_done} done")).toEqual([]);
  });
  it("refuses a cure or a promise, unless the sentence says it is not one", () => {
    expect(rules("This game cures lazy eye.")).toContain("cure");
    expect(rules("Guaranteed results in six weeks.")).toContain("cure");
    expect(rules("It will restore your vision.")).toContain("cure");
    expect(rules("No game can cure a lazy eye.")).toEqual([]);
    expect(rules("We never promise a cure. Practice is practice.")).toEqual([]);
  });
  it("refuses telling a member what they have", () => {
    expect(rules("You have amblyopia.")).toContain("diagnosis");
    expect(rules("Your child has a squint.")).toContain("diagnosis");
    expect(rules("This result diagnoses a problem.")).toContain("diagnosis");
    expect(rules("This is not a diagnosis.")).toEqual([]);
  });
  it("keeps one pair of names for the two eyes", () => {
    for (const bad of ["Cover the good eye.", "The bad eye works harder.", "Dim the dominant eye.", "the fellow eye", "Train your lazy eye."]) expect(rules(bad), bad).toContain("eye-names");
    expect(rules("A lazy eye is partly the brain turning the weaker eye down.")).toEqual([]);
  });
  it("refuses trade words for families and the public, and lets professionals and citations read them", () => {
    expect(rules("Dichoptic training for amblyopia")).toContain("jargon");
    expect(rules("Vergence training")).toContain("jargon");
    expect(rules("A depth step of 400 arcseconds")).toContain("jargon");
    expect(rules("Dichoptic training for amblyopia", "professional")).toEqual([]);
    expect(rules("Vergence training", "staff")).toEqual([]);
    expect(check("Binocular treatment of amblyopia using videogames (BRAVO)", "family", true)).toEqual([]);
    expect(rules("A depth step of {arcsec} seconds of arc")).toEqual([]);
  });
  it("asks for the short word", () => {
    for (const bad of ["Utilise the patch.", "Prior to starting, sit down.", "In order to begin, press Start.", "Approximately 5 minutes", "10 minutes per day", "glasses, patch, etc.", "Open it via Settings"]) expect(rules(bad), bad).toContain("hard-word");
    expect(rules("About 5 minutes a day, before you start.")).toEqual([]);
  });
  it("names people and glasses the app's way", () => {
    expect(rules("Patients should sit down.")).toContain("people");
    expect(rules("Each user picks a film.")).toContain("people");
    expect(rules("Put on the 3D glasses.")).toContain("glasses");
    expect(rules("Put on the anaglyph glasses.")).toContain("glasses");
    expect(rules("Each member picks a film through the red-cyan glasses.")).toEqual([]);
  });
  it("catches typing slips", () => {
    for (const bad of ["Press  Start.", "Press Start .", "Press the the button.", "Wait,, then press.", "Stop.. then rest."]) expect(rules(bad), bad).toContain("typo");
    expect(rules("Wait... then press. {n} of {of} done.")).toEqual([]);
  });
  it("counts a long sentence, and refuses a very long one", () => {
    const words = (n: number) => `${Array.from({ length: n }, () => "eye").join(" ")}.`;
    expect(soft(words(LONG))).toEqual([]);
    expect(soft(words(LONG + 1))).toContain("long");
    expect(rules(words(46))).toContain("too-long");
    expect(soft(words(LONG + 1), "staff")).toEqual([]);
  });
  it("grades a sentence roughly as a teacher would", () => {
    expect(syllables("eye")).toBe(1);
    expect(syllables("patching")).toBe(2);
    expect(syllables("examination")).toBeGreaterThanOrEqual(4);
    expect(grade("Put the patch on and look at the dot on the far wall for a count of ten.")).toBeLessThan(6);
    const heavy = "Supervised rehabilitation demonstrated significant improvement in oculomotor coordination following comprehensive individualised intervention.";
    expect(grade(heavy)).toBeGreaterThan(GRADE);
    expect(soft(heavy)).toContain("grade");
  });
  it("splits text into sentences and words, and never ends a sentence on a placeholder", () => {
    expect(sentences("One. Two! Three? {n} of {of} done. Four")).toEqual(["One.", "Two!", "Three?", "X of X done.", "Four"]);
    expect(wordsOf("Sit 60 cm away, it's 1.5 lines.")).toEqual(["Sit", "60", "cm", "away", "it's", "1.5", "lines"]);
  });
  it("knows who reads each file", () => {
    expect(readerOf("copy/admin", "admin.title")).toBe("staff");
    expect(readerOf("copy/counsellor", "x")).toBe("professional");
    expect(readerOf("copy/site", "site.title")).toBe("public");
    expect(readerOf("copy/today", "today.title")).toBe("family");
    expect(isCitation("brock-string.sources.0.label")).toBe(true);
    expect(isCitation("brock-string.steps.0")).toBe(false);
  });
});

describe("every sentence of the app", () => {
  const root = path.resolve(__dirname, "../..");
  let units: Unit[] = [];
  beforeAll(async () => { units = (await extract(root)).units; }, 240_000);

  it("has no hard finding that a person has not read and allowed", () => {
    const ok = allowedBy(ALLOWED);
    const found: string[] = [];
    for (const u of units) for (const f of check(u.english, readerOf(u.file, u.key), isCitation(u.key))) {
      if (f.hard && !ok(f.rule, u.file, u.key)) found.push(`${f.rule} ${u.file}:${u.key} [${f.what}] ${u.english.slice(0, 120)}`);
    }
    expect(found, "run `npx tsx scripts/plain-words.ts` to see every finding").toEqual([]);
    expect(units.length).toBeGreaterThan(5000);
  });

  it("has no more long or hard-to-read sentences than the recorded level", () => {
    const baseline = JSON.parse(readFileSync(path.join(root, "src/lib/plain-words.baseline.json"), "utf8")) as Record<string, Record<Reader, number>>;
    const now: Record<string, Record<Reader, number>> = {};
    for (const u of units) {
      const reader = readerOf(u.file, u.key);
      for (const f of check(u.english, reader, isCitation(u.key))) if (!f.hard) ((now[f.rule] ??= { family: 0, public: 0, professional: 0, staff: 0 })[reader])++;
    }
    for (const [rule, by] of Object.entries(now)) for (const [reader, n] of Object.entries(by)) {
      expect(n, `${rule} sentences for ${reader}: rewrite the new one, or run \`npx tsx scripts/plain-words.ts --soft\` to find it`).toBeLessThanOrEqual(baseline[rule]?.[reader as Reader] ?? 0);
    }
  });

  it("allows nothing that is no longer there", () => {
    const keys = new Set(units.map((u) => `${u.file}:${u.key}`));
    for (const a of ALLOWED) {
      const re = new RegExp(`^${a.at.split(":").slice(1).join(":").split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
      expect([...keys].some((k) => re.test(k)), `nothing matches ${a.at}`).toBe(true);
      expect(a.why.length).toBeGreaterThan(15);
    }
  });
});
