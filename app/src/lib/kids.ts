/**
 * Child mode's home (src/app/(app)/kids/) is a few big tiles. Staff choose which tiles show and in what order in the
 * Look and feel room (`content.childTiles`); Stop is always last and cannot be taken away.
 *
 * `kidTiles` is pure and tested. Play leads to the next step of the week's programme when there is one, else to
 * the games; it is replaced by a short note when the child may not play now (under four, or a stop flag a grown-up
 * must look at), and by a well-done note when today's steps are done. Listen shows only when audio exists.
 */
import { KID_TILES, type KidTile } from "@/lib/design/config";
import type { LineArtName } from "@/components/lineart/lineart";

export type KidKey = KidTile | "stop";
export type PlayState = { kind: "go"; href: string } | { kind: "done" } | { kind: "held" } | { kind: "young" };

export interface KidTileView {
  key: KidKey;
  /** Where a press leads. Absent for a Play tile that is a note instead. */
  href?: string;
  art: LineArtName;
  tone: "go" | "plain" | "stop";
  /** For Play only: why it is a note. */
  note?: Exclude<PlayState["kind"], "go">;
}

const ART: Record<KidKey, LineArtName> = { play: "glasses", break: "clock", outside: "sun", listen: "speaker", stop: "hand" };

export function kidTiles(input: { chosen: readonly KidTile[]; play: PlayState; listen: boolean }): KidTileView[] {
  const out: KidTileView[] = [];
  for (const key of input.chosen) {
    if (!KID_TILES.includes(key) || out.some((t) => t.key === key)) continue;
    if (key === "listen" && !input.listen) continue;
    if (key === "play") {
      const p = input.play;
      out.push(p.kind === "go" ? { key, href: p.href, art: ART.play, tone: "go" } : { key, art: ART.play, tone: "plain", note: p.kind });
      continue;
    }
    out.push({ key, href: `/kids/${key}`, art: ART[key], tone: "plain" });
  }
  out.push({ key: "stop", href: "/kids/stop", art: ART.stop, tone: "stop" });
  return out;
}

/** Child mode's home, and where a sealed grown-up screen or Today sends a child instead. */
export const KIDS_HOME = "/kids";
