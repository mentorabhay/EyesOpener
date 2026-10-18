/**
 * What the root layout needs to draw a page in the request's language: the `lang` and direction of `<html>`,
 * the typeface for the script, and the script that gives the browser its words before the page comes alive.
 * Server only. docs/LANGUAGES.md explains the design.
 */
import { headers } from "next/headers";
import { clientWords } from "./client-words";
import { DRAFTS_COOKIE, LANG_COOKIE } from "./decide";
import { fontSheet, LANGUAGE, SOURCE, type Lang } from "./languages";
import { current, LANG_HEADER, readChoice, requestChoiceWasSet } from "./runtime";
import { LanguageWatch } from "./watch";
import "./languages.css";

/** Written here, in English, on purpose: it is a note for a developer, and it must not itself be a draft. */
const DRAFTS_NOTE = "Development view: machine-draft translations are shown. Nobody has checked them.";

export interface PageLanguage {
  lang: Lang; drafts: boolean; tag: string; dir: "ltr" | "rtl"; script: string;
  /** The address of the script that gives the browser its words. Null for English: there is nothing to load. */
  words: string | null;
}

/**
 * The language this page is drawn in. Reading the header also tells Next.js that the page depends on the request,
 * so no page is built ahead of time in one language and served to readers of another.
 *
 * Two readings must agree: the header as Next.js hands it to a page, and the language the words are looked up in
 * (src/i18n/runtime.ts, which reads the same request directly). If a future version of Next.js ever breaks the
 * second, the page is drawn in English from top to bottom rather than half in one language.
 */
export async function pageLanguage(): Promise<PageLanguage> {
  const asked = readChoice((await headers()).get(LANG_HEADER));
  const used = current();
  /* an action in this same request may have just changed the language: `used` then leads */
  const agreed = used.lang === asked.lang || requestChoiceWasSet();
  if (!agreed) console.error(`[languages] the request asks for "${asked.lang}" but words are looked up in "${used.lang}". Drawing this page in English.`);
  const lang = agreed ? used.lang : SOURCE, drafts = agreed ? used.drafts : false;
  const words = lang === SOURCE ? null : `/lang/words/${lang}/${clientWords(lang, drafts).version}${drafts ? "?drafts=1" : ""}`;
  return { lang, drafts, tag: LANGUAGE[lang].tag, dir: LANGUAGE[lang].dir, script: LANGUAGE[lang].script, words };
}

/** The typeface of the language's script, lifted into the head by React. Nothing at all for English. */
export function LanguageHead({ l }: { l: PageLanguage }) {
  const sheet = fontSheet(l.lang);
  /* precedence: React lifts the sheet into the head (the layout has no <head> of its own) */
  return sheet ? <link rel="stylesheet" href={sheet} precedence="default" /> : null;
}

/** Goes inside `<body>`: reloads the page when the browser's language has changed under it. */
export function LanguageBody({ l }: { l: PageLanguage }) {
  return (
    <>
      <LanguageWatch lang={l.lang} drafts={l.drafts} cookie={LANG_COOKIE} draftsCookie={DRAFTS_COOKIE} />
      {/* while machine drafts are on screen (development only), the page says so */}
      {l.drafts && <p className="lang-drafts" role="note">{DRAFTS_NOTE}</p>}
    </>
  );
}
