/**
 * Answers a request for one audio file: GET or HEAD /voice/<language>/<kind>/<item>/<part>.<hash>.mp3
 *
 * The path is looked up in the manifest exactly as it was asked for. Only a file the manifest lists is ever
 * opened; anything else, however it is spelled, answers "not found" without touching a disk or a bucket.
 * The audio is spoken instructions that are the same for everyone, so nothing here looks at who is asking and
 * nothing is recorded about what was played.
 *
 * A file's name carries the mark of its words, so a file never changes: browsers may keep it for a year.
 * While the site is locked behind an access phrase, only the asking browser may keep it, not a shared cache.
 * A browser's audio player asks for parts of a file (a Range header): one range is served; several are answered with the whole file.
 */
import { AUDIO_TYPE, isAudioFile, parseRange } from "./manifest";
import type { VoiceStore } from "./store";

const YEAR = 31_536_000;

const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function serveVoice(
  req: { method: string; headers: Headers },
  segments: readonly string[],
  store: VoiceStore | null,
  opts: { locked?: boolean } = {},
): Promise<Response> {
  const file = segments.join("/");
  if (!store || !isAudioFile(file)) return notFound();
  const entry = (await store.index())?.byFile(file);
  if (!entry) return notFound();

  const etag = `"${entry.hash}"`;
  const headers: Record<string, string> = {
    "content-type": AUDIO_TYPE,
    "accept-ranges": "bytes",
    "cache-control": `${opts.locked ? "private" : "public"}, max-age=${YEAR}, immutable`,
    etag,
    "x-robots-tag": "noindex",
  };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const range = parseRange(req.headers.get("range"), entry.bytes);
  if (range === "unsatisfiable") return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${entry.bytes}` } });
  const length = range ? range.end - range.start + 1 : entry.bytes;
  headers["content-length"] = String(length);
  if (range) headers["content-range"] = `bytes ${range.start}-${range.end}/${entry.bytes}`;
  const status = range ? 206 : 200;
  if (req.method === "HEAD") return new Response(null, { status, headers });

  const body = await store.open(entry, range ?? undefined);
  if (!body) return notFound();
  return new Response(body, { status, headers });
}
