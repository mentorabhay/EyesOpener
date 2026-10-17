// Reads what child mode's tiles need for one child: the design's chosen tiles, the next step, the audio.
import { MIN_SCREEN_AGE } from "@/engine";
import { readDesign } from "@/lib/design/read";
import { kidTiles, type KidTileView, type PlayState } from "@/lib/kids";
import { nextStep, programmeView } from "@/lib/programme";
import type { Member } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { audioFor } from "@/voice/audio";
import { SCRIPT_PARTS, kidsScriptId } from "@/voice/scripts";

export async function playState(m: Member): Promise<PlayState> {
  if (m.age !== null && m.age < MIN_SCREEN_AGE) return { kind: "young" };
  /* a stop flag, a missing consent or a counsellor not yet linked: a grown-up must act first */
  if (m.stopFlag || m.dose.consentMissing || m.dose.awaitingCounsellor) return { kind: "held" };
  /* setup not finished: the two-eye items are held (src/lib/setup-rules.ts), and setup is a grown-up's job */
  if ((await setupOf(m)).held) return { kind: "held" };
  const view = await programmeView(m);
  if (view.state !== "active") return { kind: "go", href: "/train" };
  const next = nextStep(view);
  return next ? { kind: "go", href: next.href } : { kind: "done" };
}

/** True when stored audio exists for at least one of the tiles' scripts, in the household's language or English. */
export async function kidsAudio(locale: string | null | undefined): Promise<boolean> {
  for (const part of SCRIPT_PARTS.kids) if (await audioFor(kidsScriptId(part), locale)) return true;
  return false;
}

export async function kidTilesFor(m: Member): Promise<KidTileView[]> {
  const [design, play, listen] = await Promise.all([readDesign(), playState(m), kidsAudio(m.account.locale)]);
  return kidTiles({ chosen: design.content.childTiles, play, listen });
}
