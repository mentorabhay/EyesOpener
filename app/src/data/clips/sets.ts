// Eyes Opener: Sets: clips played one after another. A set is a list of what to consider, in order; which of them run for one.
/**
 * Sets: clips played one after another. A set is a list of what to consider, in order; which of them run for one
 * member on one screen is worked out in src/lib/clip-rules.ts (`planSet`), from where the screen stands, who is
 * signed in and what is due.
 *
 * Order matters in two places. The screen's size and the seat come before anything drawn to a true size, and the
 * tone curve comes before the colour matches that depend on it. In a set that measures the eyes, turning out comes
 * before turning in, as in the published fusion-range test.
 */
export const SET_KEYS = ["screen", "weekly", "visit"] as const;
export type SetKey = (typeof SET_KEYS)[number];
export const isSetKey = (key: string): key is SetKey => (SET_KEYS as readonly string[]).includes(key);

/** A step of a set: the clip to play. Where two codes are given, the first is for a near screen and the second for a far one. */
export type SetStep = string | { near: string; far: string };

export interface SetDef {
  key: SetKey;
  steps: readonly SetStep[];
}

export const SETS: Record<SetKey, SetDef> = {
  /**
   * Set up this screen: every calibration clip that applies to it. C14 (a new pair of glasses) is for another day
   * and is left out. The camera clips are added only for a profile with the camera allowed.
   */
  screen: {
    key: "screen",
    steps: [
      { near: "C01", far: "C02" }, "C03", "C06", "C07", "C23", "C24", "C21", "C22", "C17", "C18", "C19", "C20",
      "C13", "C12", "C10", "C11", "C09", "C08", "C16", "C15", "C28", "C29", "C30", "C25", "C27", "C05", "C04",
    ],
  },
  /**
   * The weekly check: the measurements the member's programme plan asks for this week (or, with no programme, the
   * check-ups that are due). Each check-up key is played by the clip that stores under that key.
   */
  weekly: { key: "weekly", steps: [] },
  /** Before an eye-test visit: one of each main measurement, so the summary page is fresh. */
  visit: {
    key: "visit",
    steps: [{ near: "M05", far: "M02" }, { near: "M04", far: "M01" }, "M18", { near: "M20", far: "M21" }, "M28", { near: "M37", far: "M43" }, "M47", "M56", "M57", "M64"],
  },
};

/** The clip that plays each check-up, for the weekly check. Two codes: left eye then right eye. */
export const CHECKUP_CLIPS: Record<string, readonly SetStep[]> = {
  acuity: [{ near: "M05", far: "M02" }, { near: "M04", far: "M01" }],
  balance: ["M18"],
  stereo: ["M28"],
  fusion_break: [{ near: "M37", far: "M43" }],
  near_point: ["M47"],
  suppression: [{ near: "M20", far: "M21" }],
  symptoms: ["M64"],
};
/** The balance clip for a child who does not yet read letters. */
export const YOUNG_BALANCE = "M19", YOUNG_AGE = 7;
