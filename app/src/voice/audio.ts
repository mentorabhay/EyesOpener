/**
 * Whether a script can be heard, and where from. Server only: a page asks this while it is drawn.
 *
 * Audio is offered when the manifest lists it for the script and it was made from the script's words as they are
 * now. The household's language is tried first, then English, which is the language the page itself is written in.
 * Any failure on the way means "no audio": the page is drawn without a Listen button and is never held up.
 */
import { SOURCE_LANG, voiceLangFor, type VoiceLang } from "./langs";
import { findAudio } from "./manifest";
import { scriptById } from "./scripts";
import { voiceStore, type VoiceStore } from "./store";

export interface VoiceClip {
  /** The address the browser plays: /voice/... on this site. */
  src: string;
  seconds: number;
  lang: VoiceLang;
}

export async function audioFor(id: string, locale?: string | null, store: VoiceStore | null = voiceStore()): Promise<VoiceClip | null> {
  const script = scriptById(id);
  if (!script || !store) return null;
  const index = await store.index().catch(() => null);
  if (!index) return null;
  const want = voiceLangFor(locale);
  const entry = findAudio(index, id, want, script.hash) ?? (want === SOURCE_LANG ? undefined : findAudio(index, id, SOURCE_LANG, script.hash));
  return entry ? { src: `/voice/${entry.file}`, seconds: entry.seconds, lang: entry.lang } : null;
}
