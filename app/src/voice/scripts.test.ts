// Eyes Opener: Unit and regression test suite verifying scripts functionality.
import { describe, expect, it } from "vitest";
import { stepsOf } from "@/clips/steps";
import { clips as clipWords } from "@/copy/clips";
import { train } from "@/copy/train";
import { CLIP_DEFS, LOOKS, type OfferedClip } from "@/data/clips";
import { gameGuides } from "@/data/game-guides";
import { guides } from "@/data/guides";
import { isScriptId } from "./manifest";
import { SCRIPT_PARTS, allScripts, clipNamesAnEye, clipScriptId, clipScripts, exerciseScriptId, exerciseScripts, gameScriptId, gameScripts, scriptById, selectScripts } from "./scripts";
import { SAID_AS_LETTERS, charsOf, hashOf } from "./speak";

const all = allScripts();
const offered = CLIP_DEFS.filter((d): d is OfferedClip => d.offered);

describe("the scripts built from the app's words", () => {
  it("has the five parts of every exercise guide", () => {
    for (const g of guides) {
      for (const part of SCRIPT_PARTS.exercise) expect(scriptById(exerciseScriptId(g.slug, part)), `${g.slug} ${part}`).toBeDefined();
    }
  });
  it("has what, see, play and stop for every game guide, and cues where the guide draws any", () => {
    for (const g of gameGuides) {
      for (const part of ["what", "see", "play", "stop"] as const) expect(scriptById(gameScriptId(g.slug, part)), `${g.slug} ${part}`).toBeDefined();
      expect(!!scriptById(gameScriptId(g.slug, "cues")), g.slug).toBe(g.cues.length > 0);
    }
  });
  it("has one script for every clip that is offered, or two where the words name an eye", () => {
    for (const d of offered) expect(clipScripts(d).length, d.code).toBe(clipNamesAnEye(d) ? 2 : 1);
    expect(offered.some(clipNamesAnEye)).toBe(true);
    expect(all.filter((s) => s.kind === "clip").length).toBe(offered.reduce((n, d) => n + (clipNamesAnEye(d) ? 2 : 1), 0));
  });
  it("names every script once, in the one shape an id has", () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
    for (const s of all) {
      expect(isScriptId(s.id), s.id).toBe(true);
      expect(s.id).toBe(`${s.kind}/${s.item}/${s.part}`);
    }
  });
  it("carries the mark and the character count of exactly its own text", () => {
    for (const s of all) {
      expect(s.hash).toBe(hashOf(s.text));
      expect(s.chars).toBe(charsOf(s.text));
    }
  });
  it("is fit to be spoken: whole sentences, nothing a voice cannot say, nothing about a member", () => {
    for (const s of all) {
      expect(s.text, s.id).not.toMatch(/[{}()"<>\[\]]/);
      expect(s.text, s.id).not.toMatch(/\d ?(cm|mm)\b|%| {2}|\t/);
      expect(s.text, s.id).toMatch(/[.!?]$/);
      expect(s.text, s.id).not.toMatch(/\bIOpener\b/);
      expect(s.text.trim(), s.id).toBe(s.text);
      /* short enough to be one request to a speech service, with room for a longer translation */
      expect(s.chars, s.id).toBeGreaterThan(20);
      expect(s.chars, s.id).toBeLessThan(2500);
    }
  });
  it("is the same every time it is built", () => {
    for (const g of guides.slice(0, 5)) expect(exerciseScripts(g)).toEqual(exerciseScripts(g));
    expect(allScripts()).toBe(all);
  });
});

describe("words written in capitals", () => {
  /* Capitals on the page are either emphasis ("ONE ring"), which a voice says as a plain word, or a name said letter by letter ("TV"). */
  const EMPHASIS = new Set(["ONE", "BOTH", "CLEAR", "OUT", "WHOLE"]);
  it("are each known as emphasis or as a name said in letters, so none is spoken the wrong way", () => {
    const written = [
      ...guides.flatMap((g) => [g.what, ...g.need, ...g.setup, ...g.steps, ...g.right, ...g.mistakes, ...g.stop]),
      ...gameGuides.flatMap((g) => [g.what, ...g.see, ...g.play, ...g.cues.flatMap((c) => [c.title, c.then]), ...g.stop]),
      ...offered.flatMap((d) => [clipWords.what(d.code), ...(d.play.template === "look" ? LOOKS[d.play.scene]?.steps ?? [] : stepsOf(d))]),
      train.exercise.stopNote, train.game.guide.stopNote,
    ];
    const unknown = new Set(written.flatMap((line) => line.match(/\b[A-Z]{2,}\b/g) ?? []).filter((w) => !SAID_AS_LETTERS.has(w) && !EMPHASIS.has(w)));
    /* A new word here needs a decision: add it to SAID_AS_LETTERS in speak.ts (spelled out) or to EMPHASIS above (said as a word). */
    expect([...unknown]).toEqual([]);
  });
});

describe("an exercise's scripts", () => {
  const g = guides.find((x) => x.slug === "brock-string")!;
  const by = Object.fromEntries(exerciseScripts(g).map((s) => [s.part, s]));
  it("reads the steps as numbered steps, one to a line", () => {
    const lines = by.steps.text.split("\n");
    expect(lines).toHaveLength(g.steps.length);
    lines.forEach((line, i) => expect(line.startsWith(`Step ${i + 1}. `)).toBe(true));
  });
  it("reads what to have ready before the set-up, and the signs before the mistakes", () => {
    expect(by.setup.text.startsWith(`${train.exercise.need}:\n`)).toBe(true);
    expect(by.setup.text).toContain(`\n\n${train.exercise.setup}:\nStep 1. `);
    expect(by.right.text.indexOf(train.exercise.right)).toBeLessThan(by.right.text.indexOf(train.exercise.mistakes));
  });
  it("says every stop sign and ends with what to press", () => {
    for (const line of g.stop) expect(by.stop.text).toContain(line.replace(/ cm\b/g, " centimetres"));
    expect(by.stop.text.endsWith("Do not push through it.")).toBe(true);
  });
  it("gives new audio to the part whose sentence changed, and to no other part", () => {
    const changed = exerciseScripts({ ...g, steps: [g.steps[0] + " Slowly.", ...g.steps.slice(1)] });
    const after = Object.fromEntries(changed.map((s) => [s.part, s.hash]));
    expect(after.steps).not.toBe(by.steps.hash);
    for (const part of ["what", "setup", "right", "stop"]) expect(after[part]).toBe(by[part].hash);
  });
});

describe("a game's scripts", () => {
  const g = gameGuides.find((x) => x.cues.length > 0)!;
  const by = Object.fromEntries(gameScripts(g).map((s) => [s.part, s]));
  it("reads each picture of 'when to press' as what you see, then what to do", () => {
    const lines = by.cues.text.split("\n");
    expect(lines[0]).toBe(`${train.game.guide.cues}:`);
    expect(lines).toHaveLength(g.cues.length + 1);
  });
  it("reads the steps as numbered steps", () => {
    expect(by.play.text.split("\n")).toHaveLength(g.play.length);
    expect(by.play.text.startsWith("Step 1. ")).toBe(true);
  });
});

describe("a clip's script", () => {
  it("says which eye to cover for a one-eye clip", () => {
    const m01 = scriptById("clip/m01/how")!;
    expect(m01.text).toContain("Cover your left eye with your palm.");
    expect(m01.text).toContain("\n\nStep 1. ");
  });
  it("comes in two ways round where the words name the eye behind the cyan lens, and the page picks one", () => {
    const def = offered.find(clipNamesAnEye)!;
    const [left, right] = clipScripts(def);
    expect(left.id).toBe(clipScriptId(def, "left"));
    expect(right.id).toBe(clipScriptId(def, "right"));
    expect(left.text).not.toBe(right.text);
    expect(left.hash).not.toBe(right.hash);
    const plain = offered.find((d) => !clipNamesAnEye(d))!;
    expect(clipScriptId(plain, "left")).toBe(clipScriptId(plain, "right"));
    expect(clipScriptId(plain, "left")).toBe(`clip/${plain.code.toLowerCase()}/how`);
  });
  it("is not made for a clip that is not offered", () => {
    for (const d of CLIP_DEFS.filter((x) => !x.offered)) expect(all.some((s) => s.kind === "clip" && s.item === d.code.toLowerCase()), d.code).toBe(false);
  });
});

describe("picking scripts for a run", () => {
  it("takes an exact id, a pattern with a star, and several patterns together", () => {
    expect(selectScripts(["exercise/brock-string/steps"]).map((s) => s.id)).toEqual(["exercise/brock-string/steps"]);
    expect(selectScripts(["exercise/brock-string/*"]).map((s) => s.part)).toEqual([...SCRIPT_PARTS.exercise]);
    expect(selectScripts(["*"])).toHaveLength(all.length);
    expect(selectScripts(["exercise/brock-string/steps", "clip/m01/*"])).toHaveLength(2);
    expect(selectScripts(["exercise/brock-string"])).toHaveLength(0);
    expect(selectScripts(["exercise/brock.string/steps"])).toHaveLength(0);
  });
});
