// Eyes Opener: Everything the landing page shows as a number or a name. The page computes it on the server from src/data and src/engine. .
import type { EvidenceKey } from "@/data";

/** Everything the landing page shows as a number or a name. The page computes it on the server from src/data and src/engine. */
export interface LandingFacts {
  games: number;
  exercises: number;
  checkups: number;
  /** One row for each evidence label that is in use, strongest first. `share` is its part of the longest row, 0 to 1. */
  evidence: { key: EvidenceKey; label: string; meaning: string; games: number; exercises: number; total: number; share: number }[];
  /** Three games from the library with different labels. `thumb` is the key of the catalogue drawing. */
  samples: { slug: string; name: string; thumb: string; mechanism: string; level: EvidenceKey }[];
  /** The game used for the two-eye scene on this page. */
  sceneGame: { name: string; thumb: string; mechanism: string; level: EvidenceKey };
  /** Programmes a member can start after the safety questions, and the ones that need a linked counsellor. */
  open: { slug: string; name: string; dailyMinutes: number; daysPerWeek: number }[];
  gated: { slug: string; name: string }[];
  /** The programme for people with no eye condition. */
  everyone: string;
  /** Names of the check-ups done one eye at a time. */
  perEye: string[];
  maxMinutes: number;
  minAge: number;
}
