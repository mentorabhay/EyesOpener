/**
 * Notes for staff: what each game cannot tell, what it does not keep, and open points found when its guide was written.
 * Shown only in the staff Manual room. They are here so that nothing about a game is a black box:
 * a number on a member's record means only what these notes say it means.
 */
import { notes as extra } from "./extra";

const CANNOT_SEE_EYES = "The game cannot see the eyes. \"One picture\" is whatever the member reports: a member who presses while still seeing two raises every number.";
const PULL_IS_DRAWN = "\"Furthest turned in\" is the largest pull the screen drew this session. It is not proof the member held it.";
const WHICH_EYE = "The game cannot tell which eye did the finding. With the glasses off, or worn the wrong way round, it can still be scored in.";

export const staffNotes: Readonly<Record<string, readonly string[]>> = {
  "tunnel-glide": [
    CANNOT_SEE_EYES, PULL_IS_DRAWN,
    "Safety limits live in the shared vergence helpers: the pull starts at zero each session, never moves faster than 2 prism dioptres a second and never passes what the screen can show.",
  ],
  "firefly-catch": [WHICH_EYE],
  "lantern-run": [WHICH_EYE, "Left, Right and Down do nothing in this game."],
  "maze-of-two-lights": [WHICH_EYE, "Space and OK do nothing. The maze grows only at every second level, so a level rise does not always change it."],
  "depth-darts": [
    "It can be answered with the glasses off: on the bare screen the nearer target shows a red edge and a cyan edge. The game cannot tell.",
    "There is no \"I cannot tell\" answer. A member with no depth vision can only guess, and one guess in three or four is right by chance.",
    "Up and Down do nothing in this game.",
  ],
  "comet-trail": ["No trial shows that eye-movement play helps healthy eyes. It is offered as play, and its label says \"unproven\".", "Space and OK do nothing in this game."],
  "spot-jump": ["No trial shows that eye-movement play helps healthy eyes. It is offered as play, and its label says \"unproven\".", "The pace shown as \"a minute\" is not saved. Up, Down, Space and OK do nothing."],
  "e-safari": [
    "The result (\"Smallest tracks read: step N\") is drawn on the top line and is not saved with the session.",
    "The game does not know which eye is covered, and the level changes nothing.",
    "Track size ignores screen size and viewing distance, so a step is not a line on a letter chart. Compare only with the same screen at the same distance.",
  ],
  "sky-spotter": [
    "The minutes are typed by the family. Nothing measures daylight.",
    "The Light ring's goal in the code is 90 minutes a day. The trial behind outdoor time added 40 minutes a day at school. The two figures should be brought into line.",
  ],
  "blink-garden": [
    "It records a timer, not the eyes: a leaf grows whether or not anyone blinked.",
    "Written instructions are shown for parts done with the eyes closed. Only a phone buzz marks \"open\"; on a computer there is no signal.",
    "Blink sets and far looks share one cap of 12 counted a day.",
  ],
  "far-window": ["It does not remind anyone. The member needs their own 20-minute timer.", "Blink sets and far looks share one cap of 12 counted a day."],
  ...extra,
};

export const staffNotesFor = (slug: string): readonly string[] => staffNotes[slug] ?? [];
