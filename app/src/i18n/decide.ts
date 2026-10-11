// Eyes Opener: Which language one request is answered in. Pure rules, unit-tested; src/proxy.ts applies them before anything.
/**
 * Which language one request is answered in. Pure rules, unit-tested; src/proxy.ts applies them before anything
 * is drawn, so a whole page is always in one language.
 *
 * A language has a status that staff set (src/i18n/status.ts):
 *   off      nobody is offered it. This is where every language starts; only English is on from the beginning.
 *   review   offered to staff only, so the people checking it can read the app in it before families do.
 *   on       offered to everyone. (Urdu cannot be switched on yet: see `HELD_AT_REVIEW` in languages.ts.)
 * Whatever the status, a sentence is shown in the language only when a person has reviewed its translation.
 * A sentence without one is shown in English.
 *
 * Machine drafts are shown only through the development switch (the cookie below, or the environment setting
 * SHOW_DRAFT_TRANSLATIONS=on). Production refuses both, so an unread translation cannot reach a family.
 */
import { isHeld, isLang, LANGS, SOURCE, type Lang } from "./languages";
import type { Choice } from "./runtime";

/** The browser's language. Set only by the server, after it has checked the language is offered to this person. */
export const LANG_COOKIE = "io_lang";
/** Development only: "on" shows machine drafts, in any of the eleven languages. Refused in production. */
export const DRAFTS_COOKIE = "io_draft_translations";
/** A signed note that this browser belongs to a staff member, who may read a language that is in review. */
export const PASS_COOKIE = "io_lang_pass";
/** Set for a few seconds after the browser was sent to pick up its household's language, so it is never sent twice in a row. */
export const SYNCED_COOKIE = "io_lang_synced";
/** The page the browser asked for, handed on by the proxy for the way back from /lang/sync. */
export const PATH_HEADER = "x-io-path";

export const LANG_STATUSES = ["off", "review", "on"] as const;
export type LangStatus = (typeof LANG_STATUSES)[number];
export type LangStatusMap = Partial<Record<Lang, LangStatus>>;
export const isLangStatus = (v: unknown): v is LangStatus => (LANG_STATUSES as readonly unknown[]).includes(v);

/**
 * English is always on. Every other language is off until staff say otherwise. A language that is held back
 * (src/i18n/languages.ts, `HELD_AT_REVIEW`) is never more than in review, whatever is stored.
 */
export const statusOfLang = (map: LangStatusMap, lang: Lang): LangStatus => {
  if (lang === SOURCE) return "on";
  const status = map[lang] ?? "off";
  return status === "on" && isHeld(lang) ? "review" : status;
};

/** Keeps only known languages and statuses, and drops English and "off" (both are the default). */
export function cleanLangStatuses(value: unknown): LangStatusMap {
  const out: LangStatusMap = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) if (isLang(key) && key !== SOURCE && isLangStatus(v) && v !== "off") out[key] = v;
  return out;
}

/** The languages a person is offered: English, those that are on, and for staff those in review. */
export const offeredLangs = (map: LangStatusMap, staff: boolean): Lang[] =>
  LANGS.filter((l) => { const s = statusOfLang(map, l); return s === "on" || (staff && s === "review"); });

/** May drafts be shown here? Never in production, whatever is asked. */
export const draftsAllowed = (production: boolean, cookie: string | undefined, env: string | undefined = process.env.SHOW_DRAFT_TRANSLATIONS): boolean =>
  !production && (cookie === "on" || env === "on");

export interface Asked {
  /** The value of the language cookie. */
  cookie: string | undefined;
  /** The value of the drafts cookie. */
  drafts: string | undefined;
  /** The language a good staff pass names, or null. */
  pass: string | null;
  statuses: LangStatusMap;
  production: boolean;
  /** SHOW_DRAFT_TRANSLATIONS. */
  env?: string;
}

/** The language of one request. English unless everything says otherwise. */
export function decide(a: Asked): Choice {
  const lang = isLang(a.cookie) ? a.cookie : SOURCE;
  if (lang === SOURCE) return { lang: SOURCE, drafts: false };
  if (draftsAllowed(a.production, a.drafts, a.env ?? "")) return { lang, drafts: true };
  const status = statusOfLang(a.statuses, lang);
  if (status === "on" || (status === "review" && a.pass === lang)) return { lang, drafts: false };
  return { lang: SOURCE, drafts: false };
}

/**
 * The language a household's setting stands for right now: its own when that is offered to this person,
 * English when it is not (the setting is kept, and counts again when staff switch the language on).
 */
export const householdLang = (locale: string | null | undefined, map: LangStatusMap, staff: boolean): Lang => {
  const want = (locale ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return isLang(want) && offeredLangs(map, staff).includes(want) ? want : SOURCE;
};
