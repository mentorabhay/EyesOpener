// Eyes Opener: The languages Eyes Opener can be read in: Indian English, which every word is written in, and the ten Indian.
/**
 * The languages Eyes Opener can be read in: Indian English, which every word is written in, and the ten Indian
 * languages of the tech-stack decision. Pure data. How a page gets its words is in docs/LANGUAGES.md.
 *
 * A language is offered to families only when staff have switched it on (src/i18n/status.ts).
 */
export const LANGS = ["en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "ur", "pa"] as const;
export type Lang = (typeof LANGS)[number];
/** The language the app's own words are written in. Every other language is a translation of it. */
export const SOURCE: Lang = "en";
export const TRANSLATED: readonly Exclude<Lang, "en">[] = LANGS.filter((l): l is Exclude<Lang, "en"> => l !== "en");

export interface Language {
  /** What goes in `<html lang>` and in a file name for a voice or a translator. */
  tag: string;
  /** The language's name, written in that language. This is what a menu shows. */
  own: string;
  /** Its name in English, for staff. */
  english: string;
  /** Urdu is written from right to left. */
  dir: "ltr" | "rtl";
  script: Script;
}

export type Script = "latin" | "devanagari" | "bengali" | "tamil" | "telugu" | "gujarati" | "kannada" | "malayalam" | "arabic" | "gurmukhi";

export const LANGUAGE: Record<Lang, Language> = {
  en: { tag: "en-IN", own: "English", english: "English", dir: "ltr", script: "latin" },
  hi: { tag: "hi-IN", own: "हिन्दी", english: "Hindi", dir: "ltr", script: "devanagari" },
  bn: { tag: "bn-IN", own: "বাংলা", english: "Bengali", dir: "ltr", script: "bengali" },
  ta: { tag: "ta-IN", own: "தமிழ்", english: "Tamil", dir: "ltr", script: "tamil" },
  te: { tag: "te-IN", own: "తెలుగు", english: "Telugu", dir: "ltr", script: "telugu" },
  mr: { tag: "mr-IN", own: "मराठी", english: "Marathi", dir: "ltr", script: "devanagari" },
  gu: { tag: "gu-IN", own: "ગુજરાતી", english: "Gujarati", dir: "ltr", script: "gujarati" },
  kn: { tag: "kn-IN", own: "ಕನ್ನಡ", english: "Kannada", dir: "ltr", script: "kannada" },
  ml: { tag: "ml-IN", own: "മലയാളം", english: "Malayalam", dir: "ltr", script: "malayalam" },
  ur: { tag: "ur-IN", own: "اردو", english: "Urdu", dir: "rtl", script: "arabic" },
  pa: { tag: "pa-IN", own: "ਪੰਜਾਬੀ", english: "Punjabi", dir: "ltr", script: "gurmukhi" },
};

/**
 * The typeface for each script.
 *
 * The app's Latin face is Outfit, loaded from Google Fonts; Outfit has no Indian script in it. Letters of another
 * script are drawn with a face the device already has: src/i18n/languages.css names, for each script, the faces
 * that Windows, Apple devices and desktop Linux carry, and then lets the device choose (an Android phone picks
 * its own Noto face for the page's language). Nothing is downloaded for them. A family that reads Tamil has a
 * device that shows Tamil, and a page in their language costs them no more data than one in English.
 *
 * Google publishes a Noto face for every one of these scripts, and the table below names it. Loading it would make
 * every device show the same letter shapes, at the price of a download on the first visit (Devanagari is small,
 * the nastaliq face for Urdu is large). That is switched off (`LOAD_WEB_FONTS`): it is the owner's choice, and it
 * has never been looked at, because the machine this was built on cannot reach Google Fonts from its browser.
 */
export const LOAD_WEB_FONTS = false;
export const SCRIPT_FONT: Record<Exclude<Script, "latin">, { family: string; query: string }> = {
  devanagari: { family: "Noto Sans Devanagari", query: "Noto+Sans+Devanagari:wght@400;500;600;700" },
  bengali: { family: "Noto Sans Bengali", query: "Noto+Sans+Bengali:wght@400;500;600;700" },
  tamil: { family: "Noto Sans Tamil", query: "Noto+Sans+Tamil:wght@400;500;600;700" },
  telugu: { family: "Noto Sans Telugu", query: "Noto+Sans+Telugu:wght@400;500;600;700" },
  gujarati: { family: "Noto Sans Gujarati", query: "Noto+Sans+Gujarati:wght@400;500;600;700" },
  kannada: { family: "Noto Sans Kannada", query: "Noto+Sans+Kannada:wght@400;500;600;700" },
  malayalam: { family: "Noto Sans Malayalam", query: "Noto+Sans+Malayalam:wght@400;500;600;700" },
  arabic: { family: "Noto Nastaliq Urdu", query: "Noto+Nastaliq+Urdu:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700" },
  gurmukhi: { family: "Noto Sans Gurmukhi", query: "Noto+Sans+Gurmukhi:wght@400;500;600;700" },
};

/**
 * The address of the Google Fonts stylesheet for a language's script, when web faces are loaded at all.
 * Null for English (Outfit is already loaded) and, while `LOAD_WEB_FONTS` is off, for every language.
 */
export function fontSheet(lang: Lang, load: boolean = LOAD_WEB_FONTS): string | null {
  const script = LANGUAGE[lang].script;
  return !load || script === "latin" ? null : `https://fonts.googleapis.com/css2?family=${SCRIPT_FONT[script].query}&display=swap`;
}

/**
 * Languages that may be put in review, for staff to read, and not yet switched on for families: the reason is
 * shown to staff. Urdu is written from right to left. The shared layout turns round for it (languages.css), but
 * each screen's own styles, the charts and the pictures have not been looked at one by one in a right-to-left
 * page, and nobody who reads Urdu has seen it. Until that is done, a family is not offered Urdu.
 * Taking a language out of this list is the whole change needed to let staff switch it on.
 */
export const HELD_AT_REVIEW: readonly Lang[] = ["ur"];
export const isHeld = (lang: Lang): boolean => HELD_AT_REVIEW.includes(lang);

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** The language a stored value names ("hi", "hi-IN", "HI_in"). English when it names none of the eleven. */
export function langOf(value: string | null | undefined): Lang {
  const want = (value ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return isLang(want) ? want : SOURCE;
}
