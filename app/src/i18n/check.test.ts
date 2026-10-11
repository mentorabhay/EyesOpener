// Eyes Opener: Unit and regression test suite verifying check functionality.
import { describe, expect, it } from "vitest";
import { lettersIn, problems, sceneRoom } from "./check";
import { fontSheet, HELD_AT_REVIEW, isHeld, langOf, LANGS, LANGUAGE, LOAD_WEB_FONTS } from "./languages";
import { mark } from "./mark";
import { brokenTerms } from "./terms";
import { measuresOf, UNIT_WORDS } from "./units";

describe("the mark of a text", () => {
  it("is the same for the same text and differs after the smallest change", () => {
    expect(mark("Hold the bead 40 cm from your nose.")).toBe(mark("Hold the bead 40 cm from your nose."));
    expect(mark("Hold the bead 40 cm from your nose.")).not.toBe(mark("Hold the bead 30 cm from your nose."));
    expect(mark("Today")).not.toBe(mark("today"));
    expect(mark("")).toMatch(/^[0-9a-f]{14}$/);
    expect(mark("आज का अभ्यास")).toMatch(/^[0-9a-f]{14}$/);
  });
});

describe("the eleven languages", () => {
  it("are English and the ten of the tech-stack decision, and only Urdu runs right to left", () => {
    expect(LANGS).toEqual(["en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "ur", "pa"]);
    expect(LANGS.filter((l) => LANGUAGE[l].dir === "rtl")).toEqual(["ur"]);
    expect(LANGUAGE.hi.tag).toBe("hi-IN");
  });
  it("reads a stored value, and falls back to English for anything else", () => {
    expect(langOf("hi")).toBe("hi");
    expect(langOf("HI-in")).toBe("hi");
    expect(langOf("fr")).toBe("en");
    expect(langOf(null)).toBe("en");
  });
  it("downloads no typeface for another script: the device's own are used, unless web faces are switched on", () => {
    expect(LOAD_WEB_FONTS).toBe(false);
    for (const l of LANGS) expect(fontSheet(l)).toBeNull();
    /* what would be loaded if the owner switches it on */
    expect(fontSheet("en", true)).toBeNull();
    expect(fontSheet("hi", true)).toContain("Noto+Sans+Devanagari");
    expect(fontSheet("ur", true)).toContain("Noto+Nastaliq+Urdu");
  });
  it("holds Urdu back from families until its right-to-left layout has been checked", () => {
    expect(HELD_AT_REVIEW).toEqual(["ur"]);
    expect(isHeld("ur")).toBe(true);
    expect(isHeld("hi")).toBe(false);
  });
});

describe("what a translation must keep", () => {
  const ok = (en: string, tr: string, lang: "hi" | "ur" | "ta" = "hi") => problems(en, tr, lang);

  it("accepts a faithful translation", () => {
    expect(ok("Today's practice is done. Come back tomorrow.", "आज का अभ्यास पूरा हुआ। कल फिर आइए।")).toEqual([]);
    expect(ok("Switch to {name}", "{name} पर जाएँ")).toEqual([]);
  });
  it("refuses an empty translation", () => {
    expect(ok("Today", "  ")).toEqual(["empty"]);
  });
  it("refuses a missing, an extra or a renamed placeholder", () => {
    expect(ok("Switch to {name}", "प्रोफ़ाइल बदलें")).toContain("placeholders differ");
    expect(ok("Switch to {name}", "{name} {name} पर जाएँ")).toContain("placeholders differ");
    expect(ok("Switch to {name}", "{naam} पर जाएँ")).toContain("placeholders differ");
    /* the app's own placeholders, filled at a later step, count the same way */
    expect(ok("Cover the {cyan} eye.", "आँख ढकें।")).toContain("placeholders differ");
  });
  it("refuses a changed, a dropped or an added number", () => {
    expect(ok("The daily limit of 90 minutes is reached.", "रोज़ की 60 मिनट की सीमा पूरी हो गई है।")).toContain("numbers differ");
    expect(ok("The daily limit of 90 minutes is reached.", "रोज़ की सीमा पूरी हो गई है।")).toContain("numbers differ");
    expect(ok("Take a break.", "20 सेकंड का विराम लें।")).toContain("numbers differ");
    expect(ok("Use the 20-20-20 rule.", "20-20-20 नियम अपनाएँ।")).toEqual([]);
    expect(ok("Sizes from 6/6 to 6/60.", "आकार 6/6 से 6/60 तक।")).toEqual([]);
  });
  it("refuses digits that are not 0 to 9", () => {
    expect(ok("Do it 5 times.", "इसे ५ बार करें।")).toContain("digits are not 0 to 9");
    expect(problems("Do it 5 times.", "یہ ۵ بار کریں۔", "ur")).toContain("digits are not 0 to 9");
  });
  it("refuses a changed unit: minutes may not become seconds or hours", () => {
    expect(ok("Play for 20 minutes.", "20 मिनट खेलें।")).toEqual([]);
    expect(ok("Play for 20 minutes.", "20 सेकंड खेलें।").some((p) => p.includes("20 minute"))).toBe(true);
    expect(ok("Play for 20 minutes.", "20 घंटे खेलें।").some((p) => p.includes("20 minute"))).toBe(true);
    expect(ok("Play for 20 minutes.", "खेलें, 20 बार।").some((p) => p.includes("20 minute"))).toBe(true);
    /* the English word may stay */
    expect(ok("Play for 20 minutes.", "20 minutes खेलें।")).toEqual([]);
  });
  it("keeps a unit written as a sign exactly as it is", () => {
    expect(ok("Hold the bead 40 cm from your nose.", "मनके को नाक से 40 cm दूर रखें।")).toEqual([]);
    expect(ok("Hold the bead 40 cm from your nose.", "मनके को नाक से 40 सेमी दूर रखें।").some((p) => p.includes("40 cm"))).toBe(true);
    expect(ok("Hold the bead 40 cm from your nose.", "मनके को नाक से 40 mm दूर रखें।").some((p) => p.includes("40 cm"))).toBe(true);
    expect(ok("Contrast is 15%.", "कंट्रास्ट 15% है।")).toEqual([]);
    expect(ok("Contrast is 15%.", "कंट्रास्ट 15 है।").some((p) => p.includes("15 %"))).toBe(true);
  });
  it("checks each number with its own unit when a sentence has several", () => {
    const en = "Sit 60 cm away and play for 15 minutes, 5 days a week.";
    expect(ok(en, "60 cm दूर बैठें और 15 मिनट खेलें, सप्ताह में 5 दिन।")).toEqual([]);
    /* the numbers are all there, but two have swapped units */
    expect(ok(en, "60 cm दूर बैठें और 5 मिनट खेलें, सप्ताह में 15 दिन।").length).toBeGreaterThan(0);
  });
  it("finds measures in English, signs and words", () => {
    expect(measuresOf("Hold 40 cm away for 10 seconds, 3 times a day, at 15% contrast.")).toEqual([
      { number: "40", unit: "cm", sign: true }, { number: "15", unit: "%", sign: true },
      { number: "10", unit: "second", sign: false }, { number: "3", unit: "time", sign: false },
    ]);
    expect(measuresOf("5 minutes")).toEqual([{ number: "5", unit: "minute", sign: false }]);
    expect(measuresOf("Level 5 of 10")).toEqual([]);
  });
  it("has words for every unit in every language, and no word serves two units of time", () => {
    for (const lang of LANGS.filter((l) => l !== "en")) {
      const time = ["second", "minute", "hour", "day", "week", "month", "year"].map((u) => UNIT_WORDS[u].in[lang as "hi"]);
      for (const forms of time) expect(forms.length).toBeGreaterThan(0);
      const all = time.flat();
      expect(new Set(all).size, lang).toBe(all.length);
      /* and none is the beginning of another unit's word */
      for (const [i, forms] of time.entries()) for (const f of forms) for (const [j, others] of time.entries()) if (i !== j) for (const o of others) expect(o.startsWith(f), `${lang}: ${f} / ${o}`).toBe(false);
    }
  });
  it("keeps the product's name in English letters", () => {
    expect(ok("IOpener is not a medical device.", "IOpener कोई चिकित्सा उपकरण नहीं है।")).toEqual([]);
    expect(ok("IOpener is not a medical device.", "आईओपनर कोई चिकित्सा उपकरण नहीं है।")).toContain("\"IOpener\" must stay as it is");
  });
  it("keeps links and addresses", () => {
    expect(ok("Write to help@iopener.test or see https://example.org/a.", "help@iopener.test पर लिखें या https://example.org/a देखें।")).toEqual([]);
    expect(ok("See https://example.org/a.", "https://example.com/a देखें।")).toContain("a link or an address differs");
  });
  it("keeps the space around a sentence and its line breaks", () => {
    expect(ok("Cover the eye. ", "आँख ढकें।")).toContain("space at the start or the end differs");
    expect(ok("One.\nTwo.", "एक। दो।")).toContain("line breaks differ");
  });
  it("refuses a word too long for a game scene, and only there", () => {
    expect(sceneRoom("Seeing two?")).toBe(17);
    expect(lettersIn("दो दिख रहे हैं?")).toBe(10);
    expect(problems("Tap", "यहाँ पर अभी तुरंत दबाएँ", "hi", { scene: true })).toContain("too long for a game scene");
    expect(problems("Tap", "यहाँ पर अभी तुरंत दबाएँ", "hi")).toEqual([]);
    expect(problems("Tap", "दबाएँ", "hi", { scene: true })).toEqual([]);
  });
  it("holds a unit to the place where the app writes a number, as firmly as to a figure", () => {
    expect(ok("{n} minutes", "{n} मिनट")).toEqual([]);
    expect(ok("{n} minutes", "{n} घंटे").some((p) => p.includes("{n} minute"))).toBe(true);
    expect(ok("{n} minutes", "{n} सेकंड").some((p) => p.includes("{n} minute"))).toBe(true);
    expect(ok("You sit {cm} cm from this screen.", "आप इस स्क्रीन से {cm} cm दूर बैठे हैं।")).toEqual([]);
    expect(ok("You sit {cm} cm from this screen.", "आप इस स्क्रीन से {cm} mm दूर बैठे हैं।").some((p) => p.includes("{cm} cm"))).toBe(true);
    expect(ok("You sit {cm} cm from this screen.", "आप इस स्क्रीन से {cm} दूर बैठे हैं।").some((p) => p.includes("{cm} cm"))).toBe(true);
    expect(ok("Hold for {p.seconds} seconds.", "{p.seconds} सेकंड तक रोकें।")).toEqual([]);
    expect(ok("Hold for {p.seconds} seconds.", "{p.seconds} मिनट तक रोकें।").length).toBeGreaterThan(0);
  });
  it("lets two numbers that share one unit keep it after either, and still refuses another unit", () => {
    /* "48 of 60 minutes": Hindi says "60 में से 48 मिनट" */
    expect(ok("48 of 60 minutes", "60 में से 48 मिनट")).toEqual([]);
    expect(ok("48 of 60 minutes", "60 मिनट में से 48")).toEqual([]);
    expect(ok("{done} of {goal} minutes", "{goal} में से {done} मिनट")).toEqual([]);
    expect(ok("Play for 10 to 15 minutes.", "10 से 15 मिनट खेलें।")).toEqual([]);
    expect(ok("48 of 60 minutes", "60 में से 48 सेकंड").length).toBeGreaterThan(0);
    expect(ok("48 of 60 minutes", "60 में से 48").length).toBeGreaterThan(0);
    expect(measuresOf("48 of 60 minutes")).toEqual([{ number: "60", unit: "minute", sign: false, with: "48" }]);
    /* two numbers with different units are not a pair */
    expect(measuresOf("5 days of 20 minutes")).toEqual([{ number: "5", unit: "day", sign: false }, { number: "20", unit: "minute", sign: false }]);
  });
  it("takes \"times\" both ways: counted and multiplied", () => {
    expect(ok("Do it 3 times a day.", "दिन में 3 बार करें।")).toEqual([]);
    expect(ok("{times} times the smallest letter", "सबसे छोटे अक्षर का {times} गुना")).toEqual([]);
    expect(ok("Do it 3 times a day.", "दिन में 3 मिनट करें।").length).toBeGreaterThan(0);
  });
  it("refuses a hidden mark that changes the order text is drawn in", () => {
    /* a right-to-left override in front of "90" draws it as "09"; the digits themselves still match */
    expect(ok("The daily limit is 90 minutes.", "रोज़ की सीमा \u202E90\u202C मिनट है।")).toContain("a hidden direction or control mark");
    expect(problems("Sit 40 cm away.", "\u200F40 cm دور بیٹھیں۔", "ur")).toContain("a hidden direction or control mark");
    expect(ok("Take a break.", "विराम\u2066 लें\u2069।")).toContain("a hidden direction or control mark");
    expect(ok("Take a break.", "विराम\u0000 लें।")).toContain("a hidden direction or control mark");
    expect(ok("Take a break.", "\uFEFFविराम लें।")).toContain("a hidden direction or control mark");
    /* the joiners that Indian scripts and Urdu need inside a word are not such marks */
    expect(ok("Take a break.", "विराम लें क्\u200Dष।")).toEqual([]);
    expect(problems("Take a break.", "می\u200Cخواهم", "ur")).toEqual([]);
  });
  it("refuses any numeral that is not 0 to 9: full-width digits, small raised figures, fractions as one sign", () => {
    expect(ok("Play for 20 minutes.", "\uFF12\uFF10 मिनट खेलें।")).toContain("digits are not 0 to 9");
    expect(ok("Play for 20 minutes.", "20 मिनट खेलें\u00B2।")).toContain("digits are not 0 to 9");
    expect(ok("Half of the time.", "\u00BD समय।")).toContain("digits are not 0 to 9");
    expect(problems("Do it 5 times.", "இதை \u0BEB முறை செய்யுங்கள்.", "ta")).toContain("digits are not 0 to 9");
    /* a sign the English itself carries may stay */
    expect(ok("Area in cm\u00B2.", "क्षेत्रफल cm\u00B2 में।")).toEqual([]);
  });
  it("refuses a translation filed under the wrong language", () => {
    expect(problems("Today", "இன்று", "hi")).toContain("letters of another script");
    expect(problems("Today", "आज", "ta")).toContain("letters of another script");
    expect(problems("Today", "آج", "hi")).toContain("letters of another script");
    expect(problems("Today", "Сегодня", "hi")).toContain("letters of another script");
    /* Latin letters are at home everywhere: names, units, "OK" */
    expect(problems("Press OK in Tunnel Glide", "Tunnel Glide में OK दबाएँ", "hi")).toEqual([]);
    expect(problems("Today", "आज", "mr")).toEqual([]);
    /* a letter the English itself has may stay */
    expect(problems("A prism of 4 \u0394", "4 \u0394 का प्रिज़्म", "hi")).toEqual([]);
  });
  it("refuses a long sentence that came back cut off or padded out", () => {
    const en = "Hold the bead at arm's length, look at it with both eyes, and bring it slowly towards your nose until it splits in two.";
    expect(ok(en, "मनके को पकड़ें।")).toContain("much shorter or much longer than the English");
    expect(ok(en, "मनके को हाथ भर दूर पकड़ें, दोनों आँखों से देखें, और धीरे-धीरे नाक की ओर लाएँ जब तक वह दो न दिखे।")).toEqual([]);
    expect(ok("Hold the bead at arm's length and look at it with both eyes, slowly.", `${"बहुत ".repeat(70)}लंबा।`)).toContain("much shorter or much longer than the English");
    /* a short label may be any length */
    expect(ok("Save", "इसे अभी सहेज कर रखें")).toEqual([]);
  });
  it("lets through what only a person can judge, which is why a person reads every sentence", () => {
    /* an instruction turned round, a number written as a word, a softer promise: none of these can be proved wrong by a machine */
    expect(ok("Stop if you see double.", "दोहरा दिखे तो भी जारी रखें।")).toEqual([]);
    expect(ok("Do it twice a day.", "इसे दिन में चार बार करें।")).toEqual([]);
  });
  it("has nothing to say about English", () => {
    expect(problems("Play for 20 minutes.", "anything", "en")).toEqual([]);
  });
});

describe("terms that are always translated the same way", () => {
  it("marks a sentence that names the weaker eye another way", () => {
    expect(brokenTerms("Cover the stronger eye.", "मज़बूत आँख ढकें।", "hi")).toEqual([]);
    expect(brokenTerms("Cover the stronger eye.", "अच्छी आँख ढकें।", "hi")).toEqual(["stronger eye"]);
    expect(brokenTerms("The weaker eye leads.", "कमज़ोर आँख आगे रहती है।", "hi")).toEqual([]);
  });
  it("checks nothing for a language whose reviewer has not agreed words yet", () => {
    expect(brokenTerms("Cover the stronger eye.", "anything", "ta")).toEqual([]);
  });
});
