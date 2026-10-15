/**
 * The words of one language for the browser: a small script the root layout loads before the page comes alive.
 * Only translations a person has reviewed are in it. Machine drafts are added only when the development switch
 * asks for them, and production refuses that. The address carries a version, so a browser keeps the file until
 * the words change; a file asked for under any other version than this server's own is never kept.
 */
import { clientWords } from "@/i18n/client-words";
import { draftsAllowed, statusOfLang } from "@/i18n/decide";
import { isLang, SOURCE } from "@/i18n/languages";
import { langStatuses } from "@/i18n/status";

export async function GET(req: Request, { params }: { params: Promise<{ lang: string; version: string }> }) {
  const { lang, version: asked } = await params;
  if (!isLang(lang) || lang === SOURCE) return new Response("Not found", { status: 404 });
  const production = process.env.NODE_ENV === "production";
  const drafts = new URL(req.url).searchParams.get("drafts") === "1" && draftsAllowed(production, "on");
  /* A language that is switched off has no words to give, except to a developer looking at drafts. */
  if (!drafts && statusOfLang(await langStatuses(), lang) === "off") return new Response("Not found", { status: 404 });
  const { body, version } = clientWords(lang, drafts);
  /* A browser may keep the file for good only when it is the very version the address names. While a release is
     rolling out, a page drawn by the new server can ask an old server for the new version: it gets that server's
     words, and must not keep them under the new name. */
  const keep = !drafts && asked === version;
  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": keep ? "public, max-age=31536000, immutable" : "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
