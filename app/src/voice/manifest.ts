// Eyes Opener: The manifest: the list of audio that exists. It is a file, `manifest.json`, made by the audio pipeline and kept.
/**
 * The manifest: the list of audio that exists. It is a file, `manifest.json`, made by the audio pipeline and kept
 * beside the audio it lists, so the two always travel together. The app reads it and never writes it.
 *
 * {
 *   "version": 1,
 *   "made": "2026-10-05T08:00:00.000Z",
 *   "entries": [
 *     { "id": "exercise/brock-string/steps", "lang": "en-IN", "voice": "en-IN-Chirp3-HD-Sulafat",
 *       "hash": "3fa9c2d17b0e4a55", "source": "3fa9c2d17b0e4a55", "chars": 812, "seconds": 61.2, "bytes": 245120,
 *       "file": "en-IN/exercise/brock-string/steps.3fa9c2d17b0e4a55.mp3" }
 *   ]
 * }
 *
 *   id       the script that is spoken (src/voice/scripts.ts)
 *   hash     the mark of the text that was spoken, in that language
 *   source   the mark of the English script it was made from. For English the two are equal. Audio is offered only
 *            while `source` equals the mark of the script as the app has it now
 *   file     where the audio is, under the voice folder or bucket. The name carries the hash, so a file never changes
 *   test     true for audio made from a trial translation. It is listed and can be fetched, and is never offered
 *
 * Only a file the manifest lists can be fetched, and the manifest itself is checked on reading: an entry whose
 * `file` is not a plain path of the expected shape is dropped. Pure: nothing here reads a disk or a network.
 */
import { isVoiceLang, type VoiceLang } from "./langs";

export const MANIFEST_FILE = "manifest.json";
export const MANIFEST_VERSION = 1;
export const AUDIO_TYPE = "audio/mpeg";

export interface VoiceEntry {
  id: string;
  lang: VoiceLang;
  voice: string;
  hash: string;
  source: string;
  chars: number;
  seconds: number;
  bytes: number;
  file: string;
  test?: true;
}
export interface VoiceManifest { version: typeof MANIFEST_VERSION; made: string; entries: VoiceEntry[] }

const HASH = /^[0-9a-f]{16}$/;
const NAME = "[a-z0-9]+(?:-[a-z0-9]+)*";
const SCRIPT_ID = new RegExp(`^(?:exercise|game|clip)/${NAME}/${NAME}$`);
/** True for the name of a script: "exercise/brock-string/steps". Lower case letters, digits, hyphens and two slashes. */
export const isScriptId = (id: string): boolean => id.length <= 120 && SCRIPT_ID.test(id);
/** "en-IN/exercise/brock-string/steps.3fa9c2d17b0e4a55.mp3": a language, folders, a name, a hash. Nothing else gets through. */
const FILE = new RegExp(`^[a-z]{2,3}-[A-Z]{2}/(?:${NAME}/){1,3}${NAME}\\.[0-9a-f]{16}\\.mp3$`);
const VOICE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

/** True for a path of the one shape audio files have. No "..", no empty part, no back slash, no other file type can pass. */
export const isAudioFile = (file: unknown): file is string => typeof file === "string" && file.length <= 200 && FILE.test(file);

/** Where the audio of a script goes. The pipeline writes here; the name is part of the contract. */
export const audioFile = (lang: VoiceLang, id: string, hash: string): string => `${lang}/${id}.${hash}.mp3`;

const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

function readEntry(v: unknown): VoiceEntry | null {
  if (!v || typeof v !== "object") return null;
  const e = v as Record<string, unknown>;
  if (typeof e.id !== "string" || !isScriptId(e.id) || !isVoiceLang(e.lang)) return null;
  if (typeof e.voice !== "string" || !VOICE.test(e.voice) || e.voice.length > 80) return null;
  if (typeof e.hash !== "string" || !HASH.test(e.hash) || typeof e.source !== "string" || !HASH.test(e.source)) return null;
  if (!num(e.chars, 1, 100_000) || !num(e.seconds, 0.1, 3600) || !num(e.bytes, 100, 50_000_000) || !Number.isInteger(e.bytes)) return null;
  if (!isAudioFile(e.file) || !e.file.startsWith(`${e.lang}/`)) return null;
  const entry: VoiceEntry = { id: e.id, lang: e.lang, voice: e.voice, hash: e.hash, source: e.source, chars: e.chars, seconds: e.seconds, bytes: e.bytes, file: e.file };
  if (e.test === true) entry.test = true;
  return entry;
}

/**
 * A manifest as read from its file. Null when it is not a manifest of this version. An entry that is not well
 * formed is left out and counted in `dropped`; so is a second entry for the same script and language.
 */
export function readManifest(value: unknown): { manifest: VoiceManifest; dropped: number } | null {
  if (!value || typeof value !== "object") return null;
  const m = value as Record<string, unknown>;
  if (m.version !== MANIFEST_VERSION || !Array.isArray(m.entries)) return null;
  const seen = new Set<string>(), entries: VoiceEntry[] = [];
  for (const raw of m.entries) {
    const e = readEntry(raw), key = e ? keyOf(e.lang, e.id) : "";
    if (!e || seen.has(key)) continue;
    seen.add(key);
    entries.push(e);
  }
  return { manifest: { version: MANIFEST_VERSION, made: typeof m.made === "string" ? m.made : "", entries }, dropped: m.entries.length - entries.length };
}

export const emptyManifest = (): VoiceManifest => ({ version: MANIFEST_VERSION, made: "", entries: [] });

const keyOf = (lang: string, id: string) => `${lang}|${id}`;

/** A manifest ready for looking things up. */
export interface VoiceIndex {
  manifest: VoiceManifest;
  /** The entry for a script in a language. */
  entry(lang: VoiceLang, id: string): VoiceEntry | undefined;
  /** The entry that owns a file path, exactly as the manifest spells it. */
  byFile(file: string): VoiceEntry | undefined;
}

export function indexManifest(manifest: VoiceManifest): VoiceIndex {
  const byKey = new Map(manifest.entries.map((e) => [keyOf(e.lang, e.id), e]));
  const byFile = new Map(manifest.entries.map((e) => [e.file, e]));
  return { manifest, entry: (lang, id) => byKey.get(keyOf(lang, id)), byFile: (file) => byFile.get(file) };
}

/**
 * The audio to offer for a script, or nothing. `sourceHash` is the mark of the English script as the app has it now:
 * audio made from an older wording is not offered, and neither is audio from a trial translation.
 */
export function findAudio(index: VoiceIndex | null, id: string, lang: VoiceLang, sourceHash: string): VoiceEntry | undefined {
  const e = index?.entry(lang, id);
  return e && e.source === sourceHash && !e.test ? e : undefined;
}

/**
 * The part of a file a browser asked for with a Range header. Null: send the whole file (no header, or one this
 * server does not act on). "unsatisfiable": the range starts past the end. `end` is the last byte, counted from 0.
 */
export function parseRange(header: string | null | undefined, size: number): { start: number; end: number } | "unsatisfiable" | null {
  if (!header || size <= 0) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") {
    /* "bytes=-500": the last 500 bytes */
    const last = Number(m[2]);
    if (!Number.isSafeInteger(last)) return null;
    if (last === 0) return "unsatisfiable";
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  const start = Number(m[1]), end = m[2] === "" ? Number.MAX_SAFE_INTEGER : Number(m[2]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start) return null;
  if (start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}
