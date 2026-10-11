// Eyes Opener: The measurements a clip may store in `test_result`: a key, a unit and whether it is taken one eye at a time.
/**
 * The measurements a clip may store in `test_result`: a key, a unit and whether it is taken one eye at a time.
 *
 * Nine of them are the check-ups (src/data `tests`): a clip that measures the same thing as a check-up stores under
 * the check-up's own key, so that quantity has one history, on the check-up's page. The rest are measured by clips
 * only. Each has its own key because it is a different quantity or a different method: a result is only ever
 * compared with earlier results taken the same way.
 */
import { tests } from "../index";

export const UNITS = ["logMAR", "logCS", "log_ratio", "arcsec", "prism_dioptre", "cm", "score", "count", "per_min", "seconds", "arcmin", "percent", "words_per_min"] as const;
export type Unit = (typeof UNITS)[number];

export interface ClipTest {
  key: string;
  /** The name a member reads. */
  name: string;
  unit: Unit;
  perEye: boolean;
  /** Which way is better. null when the number is only a record (a resting position, a habit). */
  lowerIsBetter: boolean | null;
  /** True for the nine check-ups: the history lives on the check-up's page. */
  checkup: boolean;
  /** Smallest and largest value the server accepts. */
  range: readonly [number, number];
}

const own = (key: string, name: string, unit: Unit, range: readonly [number, number], lowerIsBetter: boolean | null, perEye = false): ClipTest =>
  ({ key, name, unit, perEye, lowerIsBetter, checkup: false, range });

/** The ranges of the nine check-ups, as the check-ups themselves refuse them (src/components/measure/limits.ts). */
const CHECKUP_RANGE: Record<string, readonly [number, number]> = {
  acuity: [-0.3, 1.3], contrast: [0, 1.65], balance: [-1.3, 1.3], stereo: [0.5, 3600], fusion_break: [0, 30],
  fusion_recovery: [0, 30], near_point: [1, 50], suppression: [0, 2], symptoms: [0, 60],
};

const PD: readonly [number, number] = [0, 30];

export const CLIP_TESTS: ClipTest[] = [
  ...tests.map((t): ClipTest => ({ key: t.key, name: t.name, unit: t.unit as Unit, perEye: t.perEye, lowerIsBetter: t.lowerIsBetter, checkup: true, range: CHECKUP_RANGE[t.key] })),

  /* letters */
  own("acuity_both", "Letter size, both eyes", "logMAR", [-0.3, 1.3], true),
  own("acuity_shapes", "Letter size, matching shapes", "logMAR", [-0.3, 1.3], true, true),
  own("acuity_crowded", "Letter size, crowded", "logMAR", [-0.3, 1.3], true, true),
  own("acuity_faint", "Letter size, faint grey letters", "logMAR", [-0.3, 1.3], true),

  /* stripes */
  own("stripes_coarse", "Faint stripes, wide", "logCS", [0, 1.65], false, true),
  own("stripes_medium", "Faint stripes, medium", "logCS", [0, 1.65], false, true),
  own("stripes_fine", "Faint stripes, fine", "logCS", [0, 1.65], false, true),
  own("stripes_both", "Faint stripes, both eyes", "logCS", [0, 1.65], false),

  /* balance and suppression */
  own("balance_motion", "Eye balance, moving dots", "log_ratio", [-1.3, 1.3], null),
  own("suppression_map", "Spots the weaker eye missed", "count", [0, 16], true),

  /* depth */
  own("stereo_behind", "Depth, behind the screen", "arcsec", [0.5, 3600], true),
  own("stereo_hidden", "Depth, hidden picture", "arcsec", [0.5, 3600], true),
  own("stereo_moving", "Depth, moving rings", "arcsec", [0.5, 3600], true),

  /* fusion range at other speeds, and turning out */
  own("fusion_break_slow", "Fusion range, slow, break", "prism_dioptre", PD, false),
  own("fusion_recovery_slow", "Fusion range, slow, recovery", "prism_dioptre", PD, false),
  own("fusion_break_fast", "Fusion range, fast, break", "prism_dioptre", PD, false),
  own("fusion_recovery_fast", "Fusion range, fast, recovery", "prism_dioptre", PD, false),
  own("diverge_break", "Turning out, break", "prism_dioptre", PD, false),
  own("diverge_recovery", "Turning out, recovery", "prism_dioptre", PD, false),
  own("diverge_break_slow", "Turning out, slow, break", "prism_dioptre", PD, false),
  own("diverge_recovery_slow", "Turning out, slow, recovery", "prism_dioptre", PD, false),
  own("diverge_break_fast", "Turning out, fast, break", "prism_dioptre", PD, false),
  own("diverge_recovery_fast", "Turning out, fast, recovery", "prism_dioptre", PD, false),

  /* how the eyes move together */
  own("vergence_flips", "Flips a minute", "per_min", [0, 60], false),
  own("recovery_time", "Time to one picture again", "seconds", [0, 30], true),
  own("fusion_hold", "Hold at a set pull", "seconds", [0, 120], false),
  own("alignment_shift", "Shift after a long hold", "prism_dioptre", [-30, 30], null),

  /* resting position */
  own("alignment_h", "Resting position, sideways", "prism_dioptre", [-30, 30], null),
  own("alignment_v", "Resting position, up and down", "prism_dioptre", [-30, 30], null),
  own("fixation_offset", "Aim while both eyes are joined", "arcmin", [-120, 120], null),

  /* centre of vision and field */
  own("grid_marks", "Grid squares marked", "count", [0, 400], true, true),
  own("shape_wobble", "Smallest ripple seen", "percent", [0.05, 20], true, true),
  own("field_missed", "Spots missed", "count", [0, 24], true, true),
  own("search_blind", "Search time, hard side", "seconds", [0, 60], true),
  own("search_seeing", "Search time, other side", "seconds", [0, 60], true),

  /* function and comfort */
  own("reading_speed", "Reading speed", "words_per_min", [20, 600], false),
  own("screen_strain", "Screen strain questions", "score", [0, 40], true),
  own("dry_eye", "Dry-eye questions", "score", [0, 24], true),
  own("blink_rate", "Blinks a minute", "per_min", [0, 80], null),
  own("working_distance", "Working distance", "cm", [15, 200], null),
  own("tracking", "Time on a moving target", "percent", [0, 100], false),
];

const byKey = new Map(CLIP_TESTS.map((t) => [t.key, t]));
export const clipTest = (key: string): ClipTest | undefined => byKey.get(key);
