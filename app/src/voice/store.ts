/**
 * Where the audio is kept, as the server reads it. Server only.
 *
 * Two places, one shape:
 *   VOICE_DIR      a folder on this machine that holds `manifest.json` and the audio files. For development
 *   VOICE_BUCKET   the name of a private Cloud Storage bucket with the same contents. For the released app
 * With neither set there is no audio and every Listen button stays away. While developing, a folder named `voice`
 * beside the app folder is used when it is there, so nothing has to be set.
 *
 * The bucket is private on purpose: a browser never reads it. The server reads it as the identity it runs as (the
 * token comes from Google Cloud's metadata server, or from GOOGLE_ACCESS_TOKEN on a developer's machine, and never
 * from a key file) and hands the bytes on through /voice/. That identity needs the role "Storage Object Viewer" on
 * the bucket and nothing more.
 *
 * Only a file the manifest lists is ever opened, and a page is never held up or broken by this: a manifest that
 * cannot be read means no Listen buttons, and the reason is written to the server's log.
 */
import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { MANIFEST_FILE, indexManifest, readManifest, type VoiceEntry, type VoiceIndex } from "./manifest";

export interface ByteRange { start: number; end: number }

export interface VoiceStore {
  /** "disk" or "bucket", with the folder or bucket name: for the log. */
  where: string;
  /** The manifest, ready for lookups. Null when there is none or it cannot be read. Never throws. */
  index(): Promise<VoiceIndex | null>;
  /** The bytes of a listed file, whole or from `start` to `end`. Null when the file is missing or is not the listed size. Never throws. */
  open(entry: VoiceEntry, range?: ByteRange): Promise<ReadableStream<Uint8Array> | null>;
}

type Fetch = typeof fetch;
const log = (what: string, err?: unknown) => console.warn(`voice: ${what}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ""}`);

function parse(text: string, where: string): VoiceIndex | null {
  let value: unknown;
  try { value = JSON.parse(text); } catch { log(`the manifest in ${where} is not JSON`); return null; }
  const read = readManifest(value);
  if (!read) { log(`the manifest in ${where} is not a version this app reads`); return null; }
  if (read.dropped) log(`${read.dropped} entries of the manifest in ${where} were left out: not well formed`);
  return indexManifest(read.manifest);
}

/* ───────────── a folder on disk ───────────── */

export function diskStore(dir: string): VoiceStore {
  const root = path.resolve(dir), where = `folder ${root}`;
  let cached: { stamp: string; index: VoiceIndex | null } | null = null;
  return {
    where,
    async index() {
      try {
        const file = path.join(root, MANIFEST_FILE), s = await stat(file);
        /* read again only when the file has changed, so a pipeline run shows up at once */
        const stamp = `${s.mtimeMs}:${s.size}`;
        if (cached?.stamp !== stamp) cached = { stamp, index: parse(await readFile(file, "utf8"), where) };
        return cached.index;
      } catch { cached = null; return null; }
    },
    async open(entry, range) {
      try {
        /* The manifest was checked on reading. This second check is for a link placed inside the folder that points out of it. */
        const [base, real] = await Promise.all([realpath(root), realpath(path.join(root, entry.file))]);
        if (!real.startsWith(base + path.sep)) return null;
        const s = await stat(real);
        if (!s.isFile() || s.size !== entry.bytes) return null;
        return Readable.toWeb(createReadStream(real, range)) as ReadableStream<Uint8Array>;
      } catch { return null; }
    },
  };
}

/* ───────────── a private Cloud Storage bucket ───────────── */

const METADATA_TOKEN = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
const STORAGE = "https://storage.googleapis.com/storage/v1";
const BUCKET = /^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/;

/**
 * A short-lived access token for Google's services: GOOGLE_ACCESS_TOKEN when it is set (a developer's machine),
 * otherwise the one the metadata server gives to whatever identity this server runs as. Kept until a minute before it ends.
 */
export function googleToken(env: Record<string, string | undefined> = process.env, doFetch: Fetch = fetch): () => Promise<string | null> {
  let kept: { token: string; until: number } | null = null;
  return async () => {
    const given = env.GOOGLE_ACCESS_TOKEN?.trim();
    if (given) return given;
    if (kept && kept.until > Date.now()) return kept.token;
    try {
      const res = await doFetch(METADATA_TOKEN, { headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000), cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof body.access_token !== "string" || !body.access_token) return null;
      kept = { token: body.access_token, until: Date.now() + Math.max(0, (typeof body.expires_in === "number" ? body.expires_in : 0) - 60) * 1000 };
      return kept.token;
    } catch { return null; }
  };
}

/** How long a manifest read from the bucket is trusted before it is read again, and how long to wait after a failure. */
const FRESH_MS = 5 * 60_000, RETRY_MS = 60_000;

export function bucketStore(bucket: string, token: () => Promise<string | null>, doFetch: Fetch = fetch, now: () => number = Date.now): VoiceStore {
  const where = `bucket ${bucket}`;
  const object = (name: string) => `${STORAGE}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}?alt=media`;
  let cached: { until: number; index: VoiceIndex | null } | null = null, loading: Promise<VoiceIndex | null> | null = null;

  async function load(): Promise<VoiceIndex | null> {
    const bearer = await token();
    if (!bearer) { log(`no access token for ${where}`); return null; }
    const res = await doFetch(object(MANIFEST_FILE), { headers: { authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) { log(`the manifest in ${where} answered ${res.status}`); return null; }
    return parse(await res.text(), where);
  }

  return {
    where,
    async index() {
      if (cached && cached.until > now()) return cached.index;
      /* one read at a time, however many pages ask */
      loading ??= load().catch((err) => { log(`the manifest in ${where} could not be read`, err); return null; }).then((index) => {
        /* a manifest that was read once stays in use while a later read fails */
        cached = index ? { until: now() + FRESH_MS, index } : { until: now() + RETRY_MS, index: cached?.index ?? null };
        loading = null;
        return cached.index;
      });
      return loading;
    },
    async open(entry, range) {
      try {
        const bearer = await token();
        if (!bearer) return null;
        const headers: Record<string, string> = { authorization: `Bearer ${bearer}` };
        if (range) headers.range = `bytes=${range.start}-${range.end}`;
        const res = await doFetch(object(entry.file), { headers, cache: "no-store" });
        if (!res.ok || !res.body) { await res.body?.cancel(); return null; }
        /* a whole file must be the size the manifest lists; a part must be a part */
        const length = Number(res.headers.get("content-length") ?? NaN), want = range ? range.end - range.start + 1 : entry.bytes;
        if ((range && res.status !== 206) || (Number.isFinite(length) && length !== want)) { await res.body.cancel(); return null; }
        return res.body;
      } catch { return null; }
    },
  };
}

/* ───────────── which one this server uses ───────────── */

let chosen: { key: string; store: VoiceStore | null } | null = null;

/** The store this server is set up with, or null. The choice is kept until the settings change. */
export function voiceStore(env: Record<string, string | undefined> = process.env): VoiceStore | null {
  const dir = env.VOICE_DIR?.trim() ?? "", bucket = env.VOICE_BUCKET?.trim() ?? "";
  /* while developing: a folder named "voice" beside the app folder, when nothing is set */
  const beside = !dir && !bucket && env.NODE_ENV === "development" ? [process.cwd(), "..", "voice"].join(path.sep) : "";
  const key = `${dir}|${bucket}|${beside}`;
  if (chosen?.key === key) return chosen.store;
  let store: VoiceStore | null = null;
  if (dir) store = diskStore(dir);
  else if (bucket) {
    if (BUCKET.test(bucket)) store = bucketStore(bucket, googleToken(env));
    else log("VOICE_BUCKET is not a bucket name");
  } else if (beside) store = diskStore(beside);
  chosen = { key, store };
  return store;
}
