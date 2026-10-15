import { describe, expect, it } from "vitest";
import { charsOf, hashOf, sentence, speakable, spokenList, spokenParts, spokenSection, spokenSteps, tidy } from "./speak";

describe("speakable: the app's words made ready for a voice", () => {
  it("says units in full, singular for exactly one", () => {
    expect(speakable("Hold it 40 cm away, then 1 cm closer.")).toBe("Hold it 40 centimetres away, then 1 centimetre closer.");
    expect(speakable("Sit 3 m back for 20 s, or 0.5 cm, or 2mm.")).toBe("Sit 3 metres back for 20 seconds, or 0.5 centimetres, or 2 millimetres.");
    expect(speakable("Rest for 5 min.")).toBe("Rest for 5 minutes.");
  });
  it("leaves words that only look like units alone", () => {
    expect(speakable("At 6 pm, 2 minutes, 3 metres, 5 seconds, 4 steps.")).toBe("At 6 pm, 2 minutes, 3 metres, 5 seconds, 4 steps.");
    expect(speakable("A 3-year-old sits 1 metre away.")).toBe("A 3-year-old sits 1 metre away.");
  });
  it("says percent and degrees", () => {
    expect(speakable("Contrast 15%, tilt 10°.")).toBe("Contrast 15 percent, tilt 10 degrees.");
  });
  it("reads numbers joined by hyphens one by one, and two of them as a range", () => {
    expect(speakable("Follow the 20-20-20 rule.")).toBe("Follow the 20, 20, 20 rule.");
    expect(speakable("Do 5-10 rounds.")).toBe("Do 5 to 10 rounds.");
  });
  it("reads a slash between numbers as 'over' and between words as 'or'", () => {
    expect(speakable("A 6/6 letter on the left/right side, then a 6/12 one.")).toBe("A 6 over 6 letter on the left or right side, then a 6 over 12 one.");
    expect(speakable("one is 1/3600 of a degree")).toBe("one is 1 over 3600 of a degree");
  });
  it("lowers capitals used for emphasis and keeps names said as letters", () => {
    expect(speakable("You see ONE ring. Press OK on the TV remote.")).toBe("You see one ring. Press OK on the TV remote.");
    expect(speakable("The letter E, an X, an MP4 film.")).toBe("The letter E, an X, an MP4 film.");
  });
  it("drops quotation marks and turns brackets into commas", () => {
    expect(speakable("Press \"It split\" (or Down) at once.")).toBe("Press It split, or Down, at once.");
    expect(speakable("The left one (cyan lens).")).toBe("The left one, cyan lens.");
    expect(speakable("Tap “Stop” – then rest.")).toBe("Tap Stop, then rest.");
  });
  it("says the product's name and the Escape key", () => {
    expect(speakable("Eyes Opener never sets this. Press Esc.")).toBe("Eyes Opener never sets this. Press Escape.");
    expect(speakable("IOpener never sets this.")).toBe("Eyes Opener never sets this.");
  });
  it("says the common signs", () => {
    expect(speakable("Salt & pepper, 2 + 2 = 4, 3 × 3.")).toBe("Salt and pepper, 2 plus 2 equals 4, 3 times 3.");
  });
  it("leaves no bracket, quotation mark or doubled space behind", () => {
    const out = speakable("  Look   (both eyes)  at the \"dot\" ,  then  rest . ");
    expect(out).toBe("Look, both eyes, at the dot, then rest.");
    expect(out).not.toMatch(/[()"]| {2}| [,.]/);
  });
  it("gives the same answer when run on its own answer", () => {
    for (const t of ["Hold it 40 cm away (arm's length).", "The 20-20-20 rule: every 20 min look 6 m away for 20 s.", "See ONE ring with \"both\" dots."]) {
      expect(speakable(speakable(t))).toBe(speakable(t));
    }
  });
});

describe("sentences, lists and steps", () => {
  it("ends every piece with a full stop, once", () => {
    expect(sentence("A headache")).toBe("A headache.");
    expect(sentence("Stop here.")).toBe("Stop here.");
    expect(sentence("Is it one ring?")).toBe("Is it one ring?");
    expect(sentence("Hold it, ")).toBe("Hold it.");
    expect(sentence("  ")).toBe("");
  });
  it("reads a list one sentence to a line", () => {
    expect(spokenList(["A headache", "Eye pain", ""])).toBe("A headache.\nEye pain.");
  });
  it("numbers steps so a listener keeps their place", () => {
    expect(spokenSteps(["Sit 40 cm away", "Press Start."])).toBe("Step 1. Sit 40 centimetres away.\nStep 2. Press Start.");
  });
  it("says a heading before its list, and nothing for an empty list", () => {
    expect(spokenSection("Stop and rest if", spokenList(["A headache"]))).toBe("Stop and rest if:\nA headache.");
    expect(spokenSection("You need.", "")).toBe("");
  });
  it("puts an empty line between parts and skips empty parts", () => {
    expect(spokenParts("One.", "", "Two.")).toBe("One.\n\nTwo.");
  });
});

describe("tidy: for text in any language", () => {
  it("evens out white space and typed punctuation, and rewords nothing", () => {
    expect(tidy("  कदम 1.   धागा पकड़ें। \r\n\n\n\nकदम 2. देखें।  ")).toBe("कदम 1. धागा पकड़ें।\n\nकदम 2. देखें।");
    expect(tidy("40 cm (about)")).toBe("40 cm (about)");
  });
});

describe("the mark of a text", () => {
  it("is 16 hex digits, the same for the same text and different for a changed one", () => {
    expect(hashOf("Step 1. Sit down.")).toMatch(/^[0-9a-f]{16}$/);
    expect(hashOf("Step 1. Sit down.")).toBe(hashOf("Step 1. Sit down."));
    expect(hashOf("Step 1. Sit down.")).not.toBe(hashOf("Step 1. Sit down"));
    /* fixed for good: audio is filed under this value */
    expect(hashOf("Step 1. Sit down.")).toBe("4f16548eeb8f8167");
  });
  it("counts characters the way a speech service bills them: every glyph once, spaces and line breaks included", () => {
    expect(charsOf("a b\nc")).toBe(5);
    expect(charsOf("हिन्दी")).toBe(6);
    expect(charsOf("😀")).toBe(1);
  });
});
