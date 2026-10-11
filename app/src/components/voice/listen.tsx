// Eyes Opener: A Listen button for one script, drawn on the server. It appears only where audio exists for the script's words.
/**
 * A Listen button for one script, drawn on the server. It appears only where audio exists for the script's words
 * as they are now; with no audio it draws nothing at all, so a page looks the same as before.
 *
 *   <Listen id={exerciseScriptId(slug, "steps")} what={voice.parts.steps} locale={m.account.locale} />
 */
import { voice } from "@/copy/voice";
import { audioFor } from "@/voice/audio";
import { LANG_NAME, SOURCE_LANG } from "@/voice/langs";
import { ListenButton } from "./listen-button";

export async function Listen({ id, what, locale }: {
  /** The script: "exercise/brock-string/steps" (src/voice/scripts.ts). */
  id: string;
  /** What is read, for a screen reader: "Steps". */
  what?: string;
  /** The household's language setting. English when left out. */
  locale?: string | null;
}) {
  const clip = await audioFor(id, locale);
  if (!clip) return null;
  const other = clip.lang !== SOURCE_LANG;
  return <ListenButton src={clip.src} seconds={clip.seconds} what={what ?? voice.listen} langName={other ? LANG_NAME[clip.lang] : undefined} lang={other ? clip.lang : undefined} />;
}
