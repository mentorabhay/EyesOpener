/**
 * Screens for games that are not part of this edition. The public edition has none, so this draws nothing.
 * A fuller build replaces this one file.
 */
import type { Labels } from "@/components/play/results";
import type { EyeProps } from "@/components/play/stage";
import type { TrainDose } from "@/lib/sessions";

/** `labels` names the numbers shown when the session ends. */
export type CinemaProps = { slug: string; dose: TrainDose; labels?: Labels } & EyeProps;

/** The two-eye player with a game drawn over the member's own film. */
export function CinemaStage(_: CinemaProps) {
  void _;
  return null;
}
