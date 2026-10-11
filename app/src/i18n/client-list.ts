// Eyes Opener: The browser's set: which of a language's sentences the browser is given.
/**
 * The browser's set: which of a language's sentences the browser is given.
 *
 * Most words are read on the server while a page is drawn. Only the parts of a page that run in the browser read
 * words there, so only those words are sent to it (src/i18n/client-words.ts). Which ones is worked out from the
 * source by scripts/i18n/client.ts and kept in translations/manifest.json under `client`:
 *
 *   { "copy/site": ["site.nav", "site.enquiry"], "copy/train": true }
 *
 * `true` means every sentence of the file. A prefix covers the key itself and every key that continues it with
 * "." or "(": "site.nav" covers "site.nav.signIn" and "site.nav.links.0.label". A file that is not listed has
 * nothing sent. When there is no list at all, everything is sent.
 *
 * The server uses the same rule while it draws the browser's parts of a page (src/i18n/runtime.ts), so what it
 * draws and what the browser draws are always made from the same words.
 */
export type ClientList = Record<string, true | readonly string[]>;

export function sentToBrowser(list: ClientList | null | undefined, file: string, key: string): boolean {
  if (!list) return true;
  if (!Object.prototype.hasOwnProperty.call(list, file)) return false;
  const mine = list[file];
  if (mine === true) return true;
  if (!Array.isArray(mine)) return false;
  return mine.some((p) => typeof p === "string" && (key === p || (key.startsWith(p) && (key[p.length] === "." || key[p.length] === "("))));
}

/** Keeps a list read from a file only when it has the right shape. Anything else counts as "no list". */
export function cleanClientList(value: unknown): ClientList | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, true | string[]> = Object.create(null) as Record<string, true | string[]>;
  for (const [file, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === true) out[file] = true;
    else if (Array.isArray(v) && v.every((p) => typeof p === "string")) out[file] = v as string[];
    else return null;
  }
  return out;
}
