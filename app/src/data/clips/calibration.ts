/**
 * The 30 calibration clips: the screen, the seat and the glasses. None of them measures an eye.
 *
 * Five reuse the colour checks that already exist at /settings/screen (the same matches, the same rules on the
 * server, the same values on the screen's row). Three set the size of the screen and the seat. Two use the camera.
 * Two let the browser measure itself. The rest are "look and answer" checks with a still picture: they leave a note
 * of how the check came out, because a web page cannot read a TV's picture menu or a room's light.
 */
import { BAKER_LEAK, IRIS, LAGOM, SRGB, WOODS, XIAO } from "./sources";
import type { ClipDef, Gear, OfferedClip, Play, Store, Who } from "./types";

const NOTE: Store = { to: "note" };

/** A "look and answer" check. It needs no measured screen: nothing in it is drawn to a true size. */
const look = (code: string, scene: string, basis: string, gear: Gear[] = [], sources = [LAGOM]): OfferedClip =>
  ({ code, offered: true, play: { template: "look", scene }, store: NOTE, gear, place: "any", who: "anyone", screen: false, basis, sources });

/** A clip that changes a value of the household's screen: a guardian's job. */
const sets = (code: string, play: Play, field: Extract<Store, { to: "screen" }>["field"], gear: Gear[], basis: string, sources: OfferedClip["sources"], who: Who = "guardian"): OfferedClip =>
  ({ code, offered: true, play, store: { to: "screen", field }, gear, place: "any", who, screen: true, basis, sources });

export const CALIBRATION: ClipDef[] = [
  sets("C01", { template: "measure", kind: "card" }, "size", ["card"],
    "A bar on the screen is made as tall as the short edge of a bank card held against it. Every bank card has the same size, so the match gives the number of screen dots in a centimetre. It is the same step setup uses.", []),
  sets("C02", { template: "measure", kind: "ruler" }, "size", ["tape"],
    "For a screen too large to hold a card against. The size printed on the TV (its diagonal in inches) gives a first value. A ruler is then drawn on the screen and measured with a tape, and the value is corrected by what the tape says. The tape has the last word.", []),
  sets("C03", { template: "measure", kind: "seat" }, "distance", ["tape"],
    "The distance from the eyes to the screen is measured once with a tape and typed in. Sizes, depth steps and the pull on the eyes are all worked out from it, so the seat should then stay where it is.", []),
  { ...sets("C04", { template: "camera", kind: "distance", seconds: 5 }, "distance", ["camera"],
    "The camera reads how far the face is from a screen held in the hands, from the width of the iris in the picture. It needs the camera's scale from the camera distance check first. Expect it to be right to about 5%. The picture never leaves the device.", [IRIS]), place: "near" },
  {
    code: "C05", offered: true, play: { template: "camera", kind: "scale", seconds: 5 }, store: { to: "browser" }, gear: ["camera", "tape"], place: "near", who: "anyone", screen: false,
    basis: "A web page is not told a camera's focal length. So the member sits at a distance measured with a tape, and the camera's scale is worked out from the width of the iris it sees. The scale is kept in this browser, for this camera. The picture never leaves the device.",
    sources: [IRIS],
  },
  look("C06", "edges", "Many TVs enlarge the picture a little and cut off its edges. A thin line drawn along the very edge of the screen shows whether this one does. A still picture: the member says what is seen."),
  look("C07", "pixels", "Lines one screen dot wide blend into an even grey from the seat when each dot of the picture lands on one dot of the screen. If the picture is stretched, bands and blotches appear instead."),
  sets("C08", { template: "match", kind: "leak_cyan" }, "leak", ["glasses"],
    "Through the cyan lens, with one eye, the red ink at full strength sits beside the cyan ink. The cyan ink is moved until the two squares look equally bright. The light of the matched square is the share of red that gets through. It is made twice, from below and from above. The same match as on the screen colours page.", [WOODS, BAKER_LEAK]),
  sets("C09", { template: "match", kind: "leak_red" }, "leak", ["glasses"],
    "Through the red lens, with one eye, the cyan ink at full strength sits beside the red ink. The red ink is moved until the two squares look equally bright. The light of the matched square is the share of cyan that gets through. The same match as on the screen colours page.", [WOODS, BAKER_LEAK]),
  look("C10", "ghost_red", "A shape in cyan ink at full strength, looked at through the red lens with one eye. A perfect lens would make it vanish. What the member sees is noted; the colour leak clips put a number on it.", ["glasses"], [WOODS]),
  look("C11", "ghost_cyan", "A shape in red ink at full strength, looked at through the cyan lens with one eye. A perfect lens would make it vanish. What the member sees is noted; the colour leak clips put a number on it.", ["glasses"], [WOODS]),
  look("C12", "lens_eye", "The cyan lens goes over the weaker eye, so the cyan ink reaches that eye. A cyan shape and a red shape, seen with that eye alone, show at once whether the glasses are the right way round.", ["glasses"], [XIAO]),
  look("C13", "glasses_on", "One red shape, one cyan shape and one white shape. With the glasses on, each eye alone sees two of the three. With the glasses off, each eye sees all three. A check to run before a session; games cannot see whether the glasses are on.", ["glasses"], [WOODS]),
  sets("C14", { template: "match", kind: "leak_both" }, "leak", ["glasses"],
    "Both colour leak matches made again with a new pair of glasses, one lens after the other. The result is shown beside what the last pair measured on this screen, and it replaces it, because the new pair is the one now in use.", [WOODS, BAKER_LEAK]),
  look("C15", "white_merge", "A square drawn in both inks at once is white on the screen. Through the glasses one eye gets it in red and the other in cyan. When both eyes take part the two join into a pale square; a square that stays one colour says one side is winning.", ["glasses"], [SRGB]),
  sets("C16", { template: "match", kind: "ink" }, "ink", ["glasses"],
    "On a standard screen the cyan ink carries about four fifths of white's light and the red ink one fifth, and the two lenses do not pass equal shares. A grown-up whose eyes see about equally well makes a red square and a cyan square look equally bright, twice, the second time with the glasses turned round. The same match as on the screen colours page.", [SRGB]),
  look("C17", "black_steps", "Therapy scenes are drawn on black. Four faint grey squares, from half a percent to four percent of full light, show whether room light or a raised black level is washing the dark field out.", ["dim"]),
  sets("C18", { template: "match", kind: "gamma" }, "gamma", [],
    "Fine black and white lines give half of the screen's full light from the seat. A plain grey beside them is moved until both halves look equally bright; the grey at the match gives the screen's tone curve (its gamma). It is made twice. The same match as on the screen colours page.", [LAGOM]),
  look("C19", "ladder", "Six bars of red ink at 100, 50, 30, 15, 10 and 5 percent of full light, drawn through the screen's tone curve. Each must look dimmer than the last. Fifteen percent is the level the stronger eye starts at in the two-eye video trial.", [], [XIAO]),
  look("C20", "even", "One even grey over the whole screen shows whether the corners are dimmer than the middle."),
  look("C21", "warm", "A warm colour filter (night light) takes blue out of the picture. The cyan ink is green and blue together, so the filter dims what the weaker eye is shown. A web page cannot read the setting: the member looks it up.", [], [SRGB]),
  look("C22", "auto_bright", "A screen that changes its own brightness changes the contrast the engine set. A web page cannot read the setting: the member covers the light sensor and watches a grey square."),
  look("C23", "picture_mode", "Vivid and dynamic picture modes push contrast and colour, so the strongest steps of a colour run together. Three rows of colour blocks show whether the top steps can still be told apart."),
  look("C24", "smoothing", "Motion smoothing makes up pictures in between the ones it is sent. A web page cannot read the setting: the member looks it up, and a bar gliding at a steady pace shows the halo and shimmer it leaves."),
  {
    code: "C25", offered: true, play: { template: "auto", kind: "frames" }, store: NOTE, gear: [], place: "any", who: "anyone", screen: false,
    basis: "The browser tells the page when each picture is drawn. For ten seconds the page records the time between pictures while a bar glides, then reports the pictures a second and the share that came late. This is the browser's own count; it cannot see delay inside the screen itself.",
    sources: [],
  },
  {
    code: "C26", offered: false,
    basis: "The delay between a press and the picture changing.",
    why: "A web page only sees its own part of the delay: from the moment the browser hears the press to the moment it hands the picture on. The larger parts, inside the remote or the touch screen and inside the TV, are hidden from it. Measuring them needs a fast camera filming the finger and the screen together, or a light sensor on the screen. A number from the browser alone would look exact and be wrong.",
    sources: [],
  },
  look("C27", "sync", "A soft sound plays as a ring grows. The member says whether the sound can be heard and whether it comes with the ring. A person can tell a sound that is clearly late; small delays cannot be measured this way.", ["sound"], []),
  {
    code: "C28", offered: true, play: { template: "auto", kind: "depth_step" }, store: NOTE, gear: [], place: "any", who: "anyone", screen: true,
    basis: "The finest depth step a screen can show is one of its dots, seen from the seat. It is worked out from the measured size of the screen, the measured distance and the number of real dots to one page dot. Nothing is judged by eye.",
    sources: [],
  },
  look("C29", "zero_offset", "A thin white cross is drawn twice in the same place, in red and in cyan. If the screen shifts or sharpens one colour, coloured edges show, and a shape meant to sit at the screen would float in front of it or behind it."),
  look("C30", "fine_stripes", "Many TVs and cables carry colour at half the sharpness of brightness. Very fine red and cyan lines show it at once: they smear, or their colours run together."),
];
