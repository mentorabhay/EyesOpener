/**
 * Screens for games that are not part of this edition. The public edition has none, so this draws nothing.
 * A fuller build replaces this one file.
 */
import type { EyeProps } from "@/components/play/stage";
import type { TrainDose } from "@/lib/sessions";

export type CinemaProps = { slug: string; dose: TrainDose } & EyeProps;

/** The two-eye player with a game drawn over the member's own film. */
export function CinemaStage(_: CinemaProps) {
  void _;
  return null;
}
