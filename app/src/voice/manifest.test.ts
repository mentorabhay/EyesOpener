import { describe, expect, it } from "vitest";
import { audioFile, emptyManifest, findAudio, indexManifest, isAudioFile, isScriptId, parseRange, readManifest, type VoiceEntry } from "./manifest";

const H = "3fa9c2d17b0e4a55", H2 = "00112233445566ff";
const entry = (over: Partial<VoiceEntry> = {}): VoiceEntry => ({
  id: "exercise/brock-string/steps", lang: "en-IN", voice: "en-IN-Chirp3-HD-Sulafat", hash: H, source: H,
  chars: 911, seconds: 61.2, bytes: 245_120, file: `en-IN/exercise/brock-string/steps.${H}.mp3`, ...over,
});
const file = (entries: unknown[], version: unknown = 1) => ({ version, made: "2026-10-05T08:00:00.000Z", entries });

describe("the shape of an audio file's path", () => {
  it("accepts the one shape the pipeline writes", () => {
    expect(isAudioFile(audioFile("en-IN", "exercise/brock-string/steps", H))).toBe(true);
    expect(isAudioFile(`hi-IN/clip/m01/how-cyan-left.${H}.mp3`)).toBe(true);
  });
  it("refuses every path trick and every other kind of file", () => {
    const bad = [
      "", "manifest.json", "usage.json", `../en-IN/exercise/a/steps.${H}.mp3`, `en-IN/../../etc/passwd`, `en-IN/exercise/../a/steps.${H}.mp3`,
      `/en-IN/exercise/a/steps.${H}.mp3`, `en-IN//exercise/a/steps.${H}.mp3`, `en-IN/exercise/a/steps.${H}.mp3/`, `en-IN\\exercise\\a\\steps.${H}.mp3`,
      `en-IN/exercise/a/steps.${H}.mp3%00`, `en-IN/exercise/a/steps.${H}.wav`, `en-IN/exercise/a/steps.mp3`, `en-IN/exercise/a/steps.${H.slice(1)}.mp3`,
      `en-IN/exercise/a/.${H}.mp3`, `en-IN/exercise/a/St eps.${H}.mp3`, `en-IN/exercise/A/steps.${H}.mp3`, `EN-in/exercise/a/steps.${H}.mp3`,
      `en-IN/exercise/a/steps.${H}.mp3?x=1`, `en-IN/steps.${H}.mp3`, `en-IN/a/b/c/d/steps.${H}.mp3`, `en-IN/exercise/a/steps.${H}.mp3\n`,
      `en-IN/exercise/%2e%2e/steps.${H}.mp3`, `en-IN/exercise/a/..${H}.mp3`, "x".repeat(300),
    ];
    for (const b of bad) expect(isAudioFile(b), JSON.stringify(b)).toBe(false);
    for (const b of [null, undefined, 7, {}, ["en-IN"]]) expect(isAudioFile(b)).toBe(false);
  });
});

describe("the name of a script", () => {
  it("is kind, item and part in lower case", () => {
    expect(isScriptId("exercise/brock-string/steps")).toBe(true);
    expect(isScriptId("clip/c12/how-cyan-left")).toBe(true);
    for (const b of ["exercise/brock-string", "story/a/b", "exercise/Brock/steps", "exercise/a/b/c", "exercise//steps", "exercise/a/../b", "game/a-/b"]) expect(isScriptId(b), b).toBe(false);
  });
});

describe("reading a manifest", () => {
  it("reads a well formed one", () => {
    const read = readManifest(file([entry(), entry({ id: "game/tunnel-glide/cues", file: `en-IN/game/tunnel-glide/cues.${H}.mp3` })]))!;
    expect(read.dropped).toBe(0);
    expect(read.manifest.entries).toHaveLength(2);
    expect(read.manifest.entries[0]).toEqual(entry());
  });
  it("is not a manifest when the version is unknown or the list is missing", () => {
    expect(readManifest(file([entry()], 2))).toBeNull();
    expect(readManifest({ version: 1 })).toBeNull();
    expect(readManifest(null)).toBeNull();
    expect(readManifest("[]")).toBeNull();
  });
  it("leaves out an entry that is not well formed, and keeps the rest", () => {
    const bad: unknown[] = [
      entry({ file: "../secret.mp3" }), entry({ file: `en-IN/../x/steps.${H}.mp3` }), entry({ file: `hi-IN/exercise/brock-string/steps.${H}.mp3` }),
      entry({ lang: "fr-FR" as never }), entry({ id: "Exercise/x/steps" }), entry({ hash: "xyz" }), entry({ source: "" }),
      entry({ bytes: 0 }), entry({ bytes: 1.5 }), entry({ seconds: -1 }), entry({ seconds: Number.NaN }), entry({ chars: 0 }),
      entry({ voice: "en-IN Chirp/../x" }), { ...entry(), file: 7 }, null, "x", 3,
    ];
    const read = readManifest(file([...bad, entry()]))!;
    expect(read.manifest.entries).toEqual([entry()]);
    expect(read.dropped).toBe(bad.length);
  });
  it("keeps the first of two entries for the same script and language", () => {
    const read = readManifest(file([entry(), entry({ hash: H2, file: `en-IN/exercise/brock-string/steps.${H2}.mp3` })]))!;
    expect(read.manifest.entries).toEqual([entry()]);
    expect(read.dropped).toBe(1);
  });
  it("keeps the mark of a trial translation, and nothing else that is extra", () => {
    const read = readManifest(file([{ ...entry({ lang: "hi-IN", file: `hi-IN/exercise/brock-string/steps.${H2}.mp3`, hash: H2 }), test: true, extra: "x" }]))!;
    expect(read.manifest.entries[0].test).toBe(true);
    expect("extra" in read.manifest.entries[0]).toBe(false);
    expect("test" in readManifest(file([{ ...entry(), test: "yes" }]))!.manifest.entries[0]).toBe(false);
  });
});

describe("finding audio to offer", () => {
  const hindi = entry({ lang: "hi-IN", hash: H2, source: H, file: `hi-IN/exercise/brock-string/steps.${H2}.mp3` });
  const index = indexManifest({ ...emptyManifest(), entries: [entry(), hindi] });
  it("finds the audio of a script in a language, by the mark of the English script", () => {
    expect(findAudio(index, "exercise/brock-string/steps", "en-IN", H)).toEqual(entry());
    expect(findAudio(index, "exercise/brock-string/steps", "hi-IN", H)).toEqual(hindi);
  });
  it("offers nothing when the words have changed since the audio was made", () => {
    expect(findAudio(index, "exercise/brock-string/steps", "en-IN", H2)).toBeUndefined();
    expect(findAudio(index, "exercise/brock-string/steps", "hi-IN", H2)).toBeUndefined();
  });
  it("offers nothing for another script, another language, or no manifest", () => {
    expect(findAudio(index, "exercise/brock-string/what", "en-IN", H)).toBeUndefined();
    expect(findAudio(index, "exercise/brock-string/steps", "ta-IN", H)).toBeUndefined();
    expect(findAudio(null, "exercise/brock-string/steps", "en-IN", H)).toBeUndefined();
  });
  it("never offers audio made from a trial translation, though the file is listed", () => {
    const trial = indexManifest({ ...emptyManifest(), entries: [{ ...hindi, test: true }] });
    expect(findAudio(trial, "exercise/brock-string/steps", "hi-IN", H)).toBeUndefined();
    expect(trial.byFile(hindi.file)?.test).toBe(true);
  });
  it("looks a file up exactly as the manifest spells it", () => {
    expect(index.byFile(entry().file)).toEqual(entry());
    expect(index.byFile(entry().file.toUpperCase())).toBeUndefined();
    expect(index.byFile(`./${entry().file}`)).toBeUndefined();
  });
});

describe("the part of a file a player asks for", () => {
  it("is the whole file with no header or one it does not act on", () => {
    for (const h of [null, undefined, "", "bytes=", "bytes=-", "items=0-5", "bytes=0-5,10-15", "bytes=5-2", "bytes=a-b", "bytes=1.5-3"]) expect(parseRange(h, 1000), String(h)).toBeNull();
  });
  it("reads a start, a start and an end, and a count from the end", () => {
    expect(parseRange("bytes=0-", 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange("bytes=0-1", 1000)).toEqual({ start: 0, end: 1 });
    expect(parseRange("bytes=200-299", 1000)).toEqual({ start: 200, end: 299 });
    expect(parseRange(" bytes=999-999 ", 1000)).toEqual({ start: 999, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=-5000", 1000)).toEqual({ start: 0, end: 999 });
  });
  it("stops at the end of the file", () => {
    expect(parseRange("bytes=500-99999", 1000)).toEqual({ start: 500, end: 999 });
  });
  it("cannot be met when it starts past the end, or asks for the last nothing", () => {
    expect(parseRange("bytes=1000-", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=5000-6000", 1000)).toBe("unsatisfiable");
    expect(parseRange("bytes=-0", 1000)).toBe("unsatisfiable");
  });
});
