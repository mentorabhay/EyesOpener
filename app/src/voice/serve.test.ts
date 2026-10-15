import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { audioFor } from "./audio";
import { MANIFEST_FILE, type VoiceEntry } from "./manifest";
import { scriptById } from "./scripts";
import { serveVoice } from "./serve";
import { bucketStore, diskStore, googleToken, voiceStore, type VoiceStore } from "./store";

/* A voice folder on disk with two listed files, one file that is not listed, and things that must never be reachable. */
const steps = scriptById("exercise/brock-string/steps")!, what = scriptById("exercise/brock-string/what")!;
const STALE = "00000000deadbeef", HINDI = "1111222233334444";
const bytesOf = (n: number, seed: number) => Buffer.from(Array.from({ length: n }, (_, i) => (i * 7 + seed) % 251));
const A = bytesOf(1000, 1), B = bytesOf(300, 2), C = bytesOf(500, 3);
const entries: VoiceEntry[] = [
  { id: steps.id, lang: "en-IN", voice: "en-IN-Chirp3-HD-Sulafat", hash: steps.hash, source: steps.hash, chars: steps.chars, seconds: 61.2, bytes: A.length, file: `en-IN/${steps.id}.${steps.hash}.mp3` },
  /* made from an older wording of the script */
  { id: what.id, lang: "en-IN", voice: "en-IN-Chirp3-HD-Sulafat", hash: STALE, source: STALE, chars: 180, seconds: 12, bytes: B.length, file: `en-IN/${what.id}.${STALE}.mp3` },
  /* a trial translation: listed, never offered */
  { id: steps.id, lang: "hi-IN", voice: "hi-IN-Chirp3-HD-Sulafat", hash: HINDI, source: steps.hash, chars: 900, seconds: 70, bytes: C.length, file: `hi-IN/${steps.id}.${HINDI}.mp3`, test: true },
];
const manifest = { version: 1, made: "2026-10-05T08:00:00.000Z", entries };

let dir = "", outside = "", store: VoiceStore;
const put = async (rel: string, data: Buffer | string) => { await mkdir(path.dirname(path.join(dir, rel)), { recursive: true }); await writeFile(path.join(dir, rel), data); };

beforeAll(async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "io-voice-"));
  dir = path.join(base, "voice"); outside = path.join(base, "outside");
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(outside, "secret.txt"), "not for anyone");
  await put(MANIFEST_FILE, JSON.stringify(manifest));
  await put(entries[0].file, A);
  await put(entries[1].file, B);
  await put(entries[2].file, C);
  await put(`en-IN/exercise/brock-string/unlisted.${STALE}.mp3`, B);
  await put("usage.json", "{}");
  store = diskStore(dir);
});
afterAll(async () => { await rm(path.dirname(dir), { recursive: true, force: true }); });

const ask = (file: string, headers: Record<string, string> = {}, method = "GET", s: VoiceStore | null = store, locked = false) =>
  serveVoice({ method, headers: new Headers(headers) }, file.split("/"), s, { locked });
const body = async (res: Response) => Buffer.from(await res.arrayBuffer());

describe("GET /voice/...", () => {
  it("sends a listed file whole, as audio a browser may keep for a year", async () => {
    const res = await ask(entries[0].file);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("content-length")).toBe("1000");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toBe(`"${steps.hash}"`);
    expect((await body(res)).equals(A)).toBe(true);
  });
  it("lets only the asking browser keep it while the site is locked", async () => {
    expect((await ask(entries[0].file, {}, "GET", store, true)).headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
  });
  it("sends the part a player asks for", async () => {
    const first = await ask(entries[0].file, { range: "bytes=0-1" });
    expect(first.status).toBe(206);
    expect(first.headers.get("content-range")).toBe("bytes 0-1/1000");
    expect(first.headers.get("content-length")).toBe("2");
    expect((await body(first)).equals(A.subarray(0, 2))).toBe(true);
    const mid = await ask(entries[0].file, { range: "bytes=200-299" });
    expect((await body(mid)).equals(A.subarray(200, 300))).toBe(true);
    const tail = await ask(entries[0].file, { range: "bytes=900-" });
    expect(tail.headers.get("content-range")).toBe("bytes 900-999/1000");
    expect((await body(tail)).equals(A.subarray(900))).toBe(true);
    const last = await ask(entries[0].file, { range: "bytes=-10" });
    expect((await body(last)).equals(A.subarray(990))).toBe(true);
  });
  it("answers 416 for a part past the end, and the whole file for a header it does not act on", async () => {
    const past = await ask(entries[0].file, { range: "bytes=1000-" });
    expect(past.status).toBe(416);
    expect(past.headers.get("content-range")).toBe("bytes */1000");
    const many = await ask(entries[0].file, { range: "bytes=0-1,5-6" });
    expect(many.status).toBe(200);
    expect((await body(many)).length).toBe(1000);
  });
  it("answers HEAD with the size and no body, and 304 to a browser that already has the file", async () => {
    const head = await ask(entries[0].file, {}, "HEAD");
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("1000");
    expect((await body(head)).length).toBe(0);
    expect((await ask(entries[0].file, { "if-none-match": `"${steps.hash}"` })).status).toBe(304);
  });
  it("serves a trial file that the manifest lists (it is only never offered on a page)", async () => {
    expect((await ask(entries[2].file)).status).toBe(200);
  });
  it("answers 'not found', never stored, for anything the manifest does not list", async () => {
    const paths = [
      `en-IN/exercise/brock-string/unlisted.${STALE}.mp3`, MANIFEST_FILE, "usage.json", "en-IN", "",
      `en-IN/${steps.id}.${steps.hash}.mp3/`, `EN-IN/${steps.id}.${steps.hash}.mp3`, `en-IN/${steps.id}.${steps.hash}.MP3`,
      `en-IN/exercise/brock-string/../brock-string/steps.${steps.hash}.mp3`, `../voice/${entries[0].file}`, `./${entries[0].file}`,
      "../outside/secret.txt", "..%2Foutside%2Fsecret.txt", `en-IN/${steps.id}.${steps.hash}.mp3\u0000`, `${entries[0].file}?x`,
      "/etc/passwd", "en-IN/exercise/brock-string/steps", `en-IN\\exercise\\brock-string\\steps.${steps.hash}.mp3`,
    ];
    for (const p of paths) {
      const res = await ask(p);
      expect(res.status, p).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
    /* the pieces of the address arrive already split; a slash hidden inside one piece changes nothing */
    expect((await serveVoice({ method: "GET", headers: new Headers() }, ["en-IN", "exercise/brock-string", `steps.${steps.hash}.mp3`], store)).status).toBe(200);
    expect((await serveVoice({ method: "GET", headers: new Headers() }, ["..", "outside", "secret.txt"], store)).status).toBe(404);
  });
  it("answers 'not found' when no audio is set up", async () => {
    expect((await ask(entries[0].file, {}, "GET", null)).status).toBe(404);
  });
});

describe("the folder on disk", () => {
  it("does not open a listed file whose size is not the listed size", async () => {
    const short = await mkdtemp(path.join(os.tmpdir(), "io-voice-short-"));
    await mkdir(path.join(short, path.dirname(entries[0].file)), { recursive: true });
    await writeFile(path.join(short, MANIFEST_FILE), JSON.stringify(manifest));
    await writeFile(path.join(short, entries[0].file), A.subarray(0, 10));
    expect((await ask(entries[0].file, {}, "GET", diskStore(short))).status).toBe(404);
    await rm(short, { recursive: true, force: true });
  });
  it("does not follow a link that leads out of the folder, even when a manifest lists it", async () => {
    const linked = await mkdtemp(path.join(os.tmpdir(), "io-voice-link-"));
    const e = { ...entries[0], bytes: 14 };
    await mkdir(path.join(linked, path.dirname(e.file)), { recursive: true });
    await writeFile(path.join(linked, MANIFEST_FILE), JSON.stringify({ ...manifest, entries: [e] }));
    await symlink(path.join(outside, "secret.txt"), path.join(linked, e.file));
    expect((await ask(e.file, {}, "GET", diskStore(linked))).status).toBe(404);
    await rm(linked, { recursive: true, force: true });
  });
  it("has no manifest when the folder is empty, missing or holds something else", async () => {
    expect(await diskStore(path.join(dir, "nowhere")).index()).toBeNull();
    const odd = await mkdtemp(path.join(os.tmpdir(), "io-voice-odd-"));
    await writeFile(path.join(odd, MANIFEST_FILE), "not json");
    expect(await diskStore(odd).index()).toBeNull();
    await writeFile(path.join(odd, MANIFEST_FILE), JSON.stringify({ version: 99, entries: [] }));
    expect(await diskStore(odd).index()).toBeNull();
    await rm(odd, { recursive: true, force: true });
  });
  it("reads the manifest again after it changes", async () => {
    const live = await mkdtemp(path.join(os.tmpdir(), "io-voice-live-"));
    const s = diskStore(live);
    expect(await s.index()).toBeNull();
    await writeFile(path.join(live, MANIFEST_FILE), JSON.stringify({ ...manifest, entries: [entries[0]] }));
    expect((await s.index())?.manifest.entries).toHaveLength(1);
    await writeFile(path.join(live, MANIFEST_FILE), JSON.stringify(manifest));
    expect((await s.index())?.manifest.entries).toHaveLength(3);
    await rm(live, { recursive: true, force: true });
  });
});

describe("what a page offers", () => {
  it("offers audio made from the script's words as they are now", async () => {
    expect(await audioFor(steps.id, "en", store)).toEqual({ src: `/voice/${entries[0].file}`, seconds: 61.2, lang: "en-IN" });
    expect(await audioFor(steps.id, undefined, store)).toEqual({ src: `/voice/${entries[0].file}`, seconds: 61.2, lang: "en-IN" });
  });
  it("offers nothing for audio made from an older wording", async () => {
    expect(await audioFor(what.id, "en", store)).toBeNull();
  });
  it("falls back to English when the household's language has no audio fit to offer", async () => {
    /* the Hindi entry is a trial translation, so English is offered */
    expect((await audioFor(steps.id, "hi", store))?.lang).toBe("en-IN");
    expect((await audioFor(steps.id, "ta-IN", store))?.lang).toBe("en-IN");
  });
  it("offers the household's language once released audio exists for it", async () => {
    const released = await mkdtemp(path.join(os.tmpdir(), "io-voice-hi-"));
    const hi = { ...entries[2] };
    delete hi.test;
    await writeFile(path.join(released, MANIFEST_FILE), JSON.stringify({ ...manifest, entries: [entries[0], hi] }));
    expect(await audioFor(steps.id, "hi", diskStore(released))).toEqual({ src: `/voice/${hi.file}`, seconds: 70, lang: "hi-IN" });
    expect((await audioFor(steps.id, "en", diskStore(released)))?.lang).toBe("en-IN");
    await rm(released, { recursive: true, force: true });
  });
  it("offers nothing for a script that does not exist, with no store, or when the store fails", async () => {
    expect(await audioFor("exercise/no-such-thing/steps", "en", store)).toBeNull();
    expect(await audioFor(steps.id, "en", null)).toBeNull();
    const broken: VoiceStore = { where: "broken", index: () => Promise.reject(new Error("down")), open: () => Promise.resolve(null) };
    expect(await audioFor(steps.id, "en", broken)).toBeNull();
  });
});

describe("the private bucket", () => {
  const object = (name: string) => `https://storage.googleapis.com/storage/v1/b/iopener-test-voice/o/${encodeURIComponent(name)}?alt=media`;
  function fake(opts: { manifestStatus?: number } = {}) {
    const calls: { url: string; auth: string | null; range: string | null }[] = [];
    const doFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      calls.push({ url: String(url), auth: h.get("authorization"), range: h.get("range") });
      if (String(url) === object(MANIFEST_FILE)) return new Response(JSON.stringify(manifest), { status: opts.manifestStatus ?? 200 });
      if (String(url) === object(entries[0].file)) {
        const r = /^bytes=(\d+)-(\d+)$/.exec(h.get("range") ?? "");
        const part = r ? A.subarray(Number(r[1]), Number(r[2]) + 1) : A;
        return new Response(new Uint8Array(part), { status: r ? 206 : 200, headers: { "content-length": String(part.length) } });
      }
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    return { calls, doFetch };
  }
  const token = () => Promise.resolve("test-token");

  it("reads the manifest and a file with the server's own token, and passes a range on", async () => {
    const f = fake();
    const s = bucketStore("iopener-test-voice", token, f.doFetch);
    const whole = await ask(entries[0].file, {}, "GET", s);
    expect(whole.status).toBe(200);
    expect((await body(whole)).equals(A)).toBe(true);
    const part = await ask(entries[0].file, { range: "bytes=10-19" }, "GET", s);
    expect(part.status).toBe(206);
    expect((await body(part)).equals(A.subarray(10, 20))).toBe(true);
    expect(f.calls.every((c) => c.auth === "Bearer test-token")).toBe(true);
    expect(f.calls.map((c) => c.range)).toEqual([null, null, "bytes=10-19"]);
  });
  it("asks the bucket for nothing that the manifest does not list", async () => {
    const f = fake();
    const s = bucketStore("iopener-test-voice", token, f.doFetch);
    expect((await ask("usage.json", {}, "GET", s)).status).toBe(404);
    expect((await ask(`en-IN/exercise/brock-string/unlisted.${STALE}.mp3`, {}, "GET", s)).status).toBe(404);
    expect((await ask("../other-bucket/o/x", {}, "GET", s)).status).toBe(404);
    /* the manifest was read at most once, and no object was fetched */
    expect(f.calls.filter((c) => c.url !== object(MANIFEST_FILE))).toHaveLength(0);
    expect(f.calls.length).toBeLessThanOrEqual(1);
  });
  it("keeps the manifest for five minutes, then reads it again", async () => {
    const f = fake();
    let clock = 1_000_000;
    const s = bucketStore("iopener-test-voice", token, f.doFetch, () => clock);
    await s.index(); await s.index(); await Promise.all([s.index(), s.index()]);
    expect(f.calls).toHaveLength(1);
    clock += 5 * 60_000 + 1;
    await s.index();
    expect(f.calls).toHaveLength(2);
  });
  it("offers nothing, and does not ask again for a minute, when the bucket refuses", async () => {
    const f = fake({ manifestStatus: 403 });
    let clock = 0;
    const s = bucketStore("iopener-test-voice", token, f.doFetch, () => clock);
    expect(await s.index()).toBeNull();
    expect(await s.index()).toBeNull();
    expect(f.calls).toHaveLength(1);
    clock += 60_001;
    expect(await s.index()).toBeNull();
    expect(f.calls).toHaveLength(2);
    expect(await audioFor(steps.id, "en", s)).toBeNull();
  });
  it("does nothing without a token", async () => {
    const f = fake();
    const s = bucketStore("iopener-test-voice", () => Promise.resolve(null), f.doFetch);
    expect(await s.index()).toBeNull();
    expect(f.calls).toHaveLength(0);
  });
});

describe("the server's token", () => {
  it("uses GOOGLE_ACCESS_TOKEN when it is set, and asks nobody", async () => {
    let asked = 0;
    const get = googleToken({ GOOGLE_ACCESS_TOKEN: " given " }, (async () => { asked++; return new Response("{}"); }) as typeof fetch);
    expect(await get()).toBe("given");
    expect(asked).toBe(0);
  });
  it("asks the metadata server otherwise, and keeps the answer until it is about to end", async () => {
    const seen: (string | null)[] = [];
    const get = googleToken({}, (async (url: RequestInfo | URL, init?: RequestInit) => {
      seen.push(`${String(url)} ${new Headers(init?.headers).get("metadata-flavor")}`);
      return Response.json({ access_token: "from-metadata", expires_in: 3599 });
    }) as typeof fetch);
    expect(await get()).toBe("from-metadata");
    expect(await get()).toBe("from-metadata");
    expect(seen).toEqual(["http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token Google"]);
  });
  it("is null when there is no metadata server", async () => {
    expect(await googleToken({}, (async () => { throw new Error("no route"); }) as typeof fetch)()).toBeNull();
    expect(await googleToken({}, (async () => new Response("no", { status: 404 })) as typeof fetch)()).toBeNull();
  });
});

describe("which store a server uses", () => {
  it("uses the folder when VOICE_DIR is set, the bucket when VOICE_BUCKET is, and nothing otherwise", () => {
    expect(voiceStore({ VOICE_DIR: "/srv/voice", NODE_ENV: "production" })?.where).toBe("folder /srv/voice");
    expect(voiceStore({ VOICE_BUCKET: "iopener-staging-voice", NODE_ENV: "production" })?.where).toBe("bucket iopener-staging-voice");
    expect(voiceStore({ VOICE_DIR: "/srv/voice", VOICE_BUCKET: "iopener-staging-voice" })?.where).toBe("folder /srv/voice");
    expect(voiceStore({ NODE_ENV: "production" })).toBeNull();
    expect(voiceStore({ NODE_ENV: "test" })).toBeNull();
  });
  it("refuses a bucket name that is not one", () => {
    expect(voiceStore({ VOICE_BUCKET: "gs://iopener-staging-voice", NODE_ENV: "production" })).toBeNull();
    expect(voiceStore({ VOICE_BUCKET: "../x", NODE_ENV: "production" })).toBeNull();
  });
  it("looks beside the app folder while developing, when nothing is set", () => {
    expect(voiceStore({ NODE_ENV: "development" })?.where).toBe(`folder ${path.resolve(process.cwd(), "..", "voice")}`);
  });
});
