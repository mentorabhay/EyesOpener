/**
 * The languages Eyes Opener speaks: Indian English first, then the ten Indian languages of the tech-stack decision.
 * A code here is the folder of that language's audio and the `lang` of its entries in the manifest.
 */
export const VOICE_LANGS = ["en-IN", "hi-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN", "kn-IN", "ml-IN", "ur-IN", "pa-IN"] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];

/** The language the app's own text is written in. Every other language is a translation of it. */
export const SOURCE_LANG: VoiceLang = "en-IN";

/** Each language's name, written in that language. */
export const LANG_NAME: Record<VoiceLang, string> = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "bn-IN": "বাংলা",
  "ta-IN": "தமிழ்",
  "te-IN": "తెలుగు",
  "mr-IN": "मराठी",
  "gu-IN": "ગુજરાતી",
  "kn-IN": "ಕನ್ನಡ",
  "ml-IN": "മലയാളം",
  "ur-IN": "اردو",
  "pa-IN": "ਪੰਜਾਬੀ",
};

export const isVoiceLang = (v: unknown): v is VoiceLang => typeof v === "string" && (VOICE_LANGS as readonly string[]).includes(v);

/**
 * The voice language for a household's language setting ("en", "hi", "hi-IN", ...). English when the setting is
 * empty or names a language Eyes Opener does not speak.
 */
export function voiceLangFor(locale: string | null | undefined): VoiceLang {
  const want = (locale ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return VOICE_LANGS.find((l) => l.toLowerCase().split("-")[0] === want) ?? SOURCE_LANG;
}
