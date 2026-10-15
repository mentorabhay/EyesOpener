/**
 * Screens for games that are not part of this edition. The public edition has none, so this draws nothing.
 * A fuller build replaces this one file.
 */
import type { ChapterPlan } from "@/components/film/chapters";
import type { Labels } from "@/components/play/results";
import type { EyeProps } from "@/components/play/stage";
import type { TrainDose } from "@/lib/sessions";

/**
 * `labels` names the numbers shown when the session ends. `plan` is the chapters and eye breaks the film is watched
 * under, `profileId` names whose list of films is shown, and `tester` is true for a staff test household: the same
 * three things the two-eye cinema's own player is given.
 */
export type CinemaProps = { slug: string; dose: TrainDose; labels?: Labels; plan: ChapterPlan; profileId: string; tester: boolean } & EyeProps;

/** The two-eye player with a game drawn over the member's own film. */
export function CinemaStage(_: CinemaProps) {
  void _;
  return null;
}
