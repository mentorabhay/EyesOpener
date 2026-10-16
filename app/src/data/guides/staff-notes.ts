// Eyes Opener: Notes for staff on the exercises: what a routine's tool cannot tell, and open points found when its guide was written.
/**
 * Notes for staff on the exercises: what a routine's tool cannot tell, and open points found when its guide was written.
 * Shown only in the staff Manual room.
 */
const SELF_REPORT = "The numbers are typed by the member. Nothing checks them.";
const NO_CAMERA = "The catalogue describes a camera check. The camera feature is not built: the routine is done by hand.";
const DRILL_REPORT = "The drill cannot see the eyes. \"One ring\" is whatever the member reports, and the pull recorded is what the screen drew.";

export const exerciseStaffNotes: Readonly<Record<string, readonly string[]>> = {
  "screen-vergence-ramp": [DRILL_REPORT, "The recovery point is always at least 2 below the break, because easing drops the pull by 2 at once."],
  "screen-diverge-ramp": [DRILL_REPORT, "Turning out is limited to 4 cm of separation on the screen, so most members reach \"the screen's limit\" before a true break."],
  "screen-vergence-steps": [DRILL_REPORT],
  "flip-switch": [DRILL_REPORT, "The clinic test uses 12 in and 3 out; the screen's pair is smaller (at most about 10 and 2.5), so the clinic figure of 15 cycles a minute is not a pass mark here. Idle time before Finish lowers the rate."],
  "long-hold": [DRILL_REPORT, "The two-minute hold is Eyes Opener's own choice. No trial set it."],
  "reading-under-demand": [DRILL_REPORT, "The trial of this therapy found no gain in reading scores over pretend therapy."],
  "distance-fusion-hold": [DRILL_REPORT],
  "see-both-lights": ["The share of checks answered \"two\" is the member's own report."],
  "stereogram-pairs": ["One right answer records a width, and a guess is right half the time. Relaxing is limited to 4 cm on screen; the printed card is for crossing only."],
  "contrast-ladder": ["The figure depends on the screen's brightness and the room's light. Compare only like with like."],
  "guided-line-reading": ["The catalogue says \"scrolling text\". The tool shows still lines, one at a time. The trial tested scrolling text, so this tool itself is untested."],
  "blind-side-sweeps": ["The member says which side is the missing side; the drill does not measure the field."],
  "weekly-grid-check": ["Marks are the member's own. Any mark tells the member to see an eye doctor; Eyes Opener names no disease."],
  "near-far-jumps": ["The dose is 20 jumps in 3 sets; the counter records one 60-second count. The guide does two uncounted sets first."],
  "one-eye-focus-rock": ["The stopwatch cannot count taps, so the member counts pairs in a timed minute for each eye."],
  "therapy-homework-plan": [SELF_REPORT, "This is the home half of supervised therapy. Without the therapist's half, the trial evidence does not apply."],
  "patch-wear-timer": [SELF_REPORT, "Hours are a record only. The plan comes from the eye doctor and Eyes Opener never sets it."],
  "patch-time-detail-tasks": [SELF_REPORT, "A trial found close work added nothing to patching. These tasks keep the patch on and the child busy."],
  "bead-threading": [SELF_REPORT, "A trial found close work added nothing to patching."],
  "patch-on-ball-play": [SELF_REPORT, "A trial found close work added nothing to patching."],
  "glasses-first-log": [SELF_REPORT],
  "glasses-check-in": [SELF_REPORT, NO_CAMERA],
  "atropine-day-companion": [SELF_REPORT, "Eyes Opener sends no reminder yet: the guide says to set a phone alarm."],
  "drop-reminder-routine": [SELF_REPORT, "Eyes Opener sends no reminder yet: the guide says to set a phone alarm."],
  "look-away-break": [NO_CAMERA, "The log does not remind anyone."],
  "distance-reset": [SELF_REPORT, NO_CAMERA],
  "desk-set-up-check": [SELF_REPORT, NO_CAMERA],
  "arm-s-length-reading": [SELF_REPORT, NO_CAMERA, "The 30 cm figure is a link found in one survey of twelve-year-olds, not a proven cause."],
  "outdoor-light-time": ["Minutes are typed by the family. The daily goal in the code is 90 minutes; the trial added 40 minutes a day."],
  "class-outdoor-period": ["There is no class log. Each family logs its own child."],
  "walk-in-target": [SELF_REPORT, "The stop rule (a rise of 2 points) is Eyes Opener's use of a screening cut-off; it was not tested as a stop point."],
  "head-turn-letter-hold": [SELF_REPORT],
  "near-far-with-movement": [SELF_REPORT, "The dose is 2 minutes; the counter runs 60 seconds, so the routine is done twice."],
};

export const exerciseStaffNotesFor = (slug: string): readonly string[] => exerciseStaffNotes[slug] ?? [];
