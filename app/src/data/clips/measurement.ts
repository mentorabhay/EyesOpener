/**
 * The 70 measurement clips. Each is a home estimate of one thing about the eyes, taken on the member's own screen.
 * None of them is a diagnosis, and none replaces an eye examination.
 *
 * Where a clip measures the same thing as a check-up, it is played by the check-up's own screen part and stored
 * under the check-up's key, so the result joins the check-up's history. A method that differs (another target,
 * another speed, another direction) gets its own key: its results are compared only with each other.
 *
 * "near" clips need the screen within arm's reach, "far" clips need it across the room (200 cm or more), as it was
 * measured. The catalogue names 40 cm and 3 m; a clip runs at the distance the screen really stands at and stores
 * that distance with the result.
 */
import {
  ADAPTATION, AMSLER, AMSLER_LIMITS, ATS_SCREEN, BLINKS, CISS, CITT_NORMAL, CROWDING, DESK, DOMINANCE, DOTS, DRY_EYE, DYNAMIC_DEPTH,
  EYE_SEARCH, FIXATION, GALL, GAO, HOME_FIELD, IRIS, KWON, NEAR_POINT, PEEK, PELLI_BEX, PHORIA, RANDOT, READING, SCREEN_SYMPTOMS,
  SUMMATION, SUPPRESSION_MAP, VOMS, WOBBLE, WORTH,
} from "./sources";
import type { ClipDef, Eye, Gear, OfferedClip, Place, Play, Which } from "./types";

type More = Partial<Pick<OfferedClip, "place" | "who" | "screen">>;
/** A clip that stores rows of `test_result`. It needs a measured screen unless `more` says otherwise. */
const m = (code: string, play: Play, keys: string[], gear: Gear[], basis: string, sources: OfferedClip["sources"], more: More = {}): OfferedClip =>
  ({ code, offered: true, play, store: { to: "result", keys }, gear, place: "any", who: "anyone", screen: true, basis, sources, ...more });

const side = (eye: Which) => (eye === "R" ? "right eye" : eye === "L" ? "left eye" : "both eyes");

/* ───────────── letters ───────────── */

const letterBasis = (eye: Which, where: string) =>
  `A letter E points one of four ways and the member says which, with the ${side(eye)}${eye === "both" ? " open" : " and the other eye covered"}. The letters shrink on the engine's staircase until two of three are missed. ${where} It is the letter check-up's own test.`;
const letter = (code: string, eye: Which, place: Place): OfferedClip =>
  m(code, { template: "choose", kind: "letter", eye }, [eye === "both" ? "acuity_both" : "acuity"], place === "far" ? ["keys"] : [],
    letterBasis(eye, place === "far" ? "It is run with the screen across the room, so it reads the letter size for far." : "It is run with the screen within arm's reach, so it reads the letter size for near."),
    [PEEK], { place });

const shapes = (code: string, eye: Eye): OfferedClip =>
  m(code, { template: "choose", kind: "shapes", eye }, ["acuity_shapes"], ["helper"],
    `For a child who cannot yet say which way a letter points. One of the letters H, O, T and V is shown inside four bars, and the child points to the same shape among four large ones. This is the matching test the children's lazy-eye trials used; no reading is needed. ${side(eye)[0].toUpperCase()}${side(eye).slice(1)}, the other eye covered. No screen check-ups under age 4.`,
    [ATS_SCREEN]);

const crowded = (code: string, eye: Eye): OfferedClip =>
  m(code, { template: "choose", kind: "crowded", eye }, ["acuity_crowded"], [],
    `The letter E with a bar close on each of its four sides, half a letter's width away. A lazy eye reads a letter with close neighbours worse than a letter on its own, so this is kept apart from the plain letter size. ${side(eye)[0].toUpperCase()}${side(eye).slice(1)}, the other eye covered.`,
    [ATS_SCREEN, CROWDING]);

/* ───────────── stripes ───────────── */

const BANDS = { coarse: 1.5, medium: 6, fine: 12 } as const;
const stripes = (code: string, band: keyof typeof BANDS, eye: Which): OfferedClip =>
  m(code, { template: "choose", kind: "stripes", eye, cpd: BANDS[band] }, [eye === "both" ? "stripes_both" : `stripes_${band}`], [],
    `A round patch of soft-edged stripes on a mid-grey field: ${BANDS[band]} pairs of stripes to one degree at the eye. The stripes run one of four ways and the member says which. They fade in steps on the engine's staircase. The result is the faintest stripes read, with the ${side(eye)}${eye === "both" ? " open" : " and the other eye covered"}. The patch is small and still; nothing swaps or flickers. A screen with too few dots to draw stripes this fine from the seat does not offer the clip.`,
    eye === "both" ? [PELLI_BEX, SUMMATION] : [PELLI_BEX]);

/* ───────────── depth ───────────── */

const ringsBasis = "Four rings in a row, each drawn once for each eye. One ring's two pictures are shifted, so through the glasses it floats off the screen, and the member picks it. The shift halves after two right answers.";

/* ───────────── fusion range ───────────── */

const SPEED = { 0.5: "slow", 1: "", 2: "fast" } as const;
const rangeKeys = (way: "in" | "out", rate: 0.5 | 1 | 2) => {
  const tail = SPEED[rate] ? `_${SPEED[rate]}` : "";
  return way === "in" ? [`fusion_break${tail}`, `fusion_recovery${tail}`] : [`diverge_break${tail}`, `diverge_recovery${tail}`];
};
const range = (code: string, way: "in" | "out", rate: 0.5 | 1 | 2, place: Place): OfferedClip =>
  m(code, { template: "split", way, rate, mode: "range" }, rangeKeys(way, rate), place === "far" ? ["glasses", "keys"] : ["glasses"],
    `A ring for each eye moves ${way === "in" ? "so the eyes must turn in" : "so the eyes must turn out"} to keep one ring, ${rate === 1 ? "one prism dioptre" : rate === 0.5 ? "half a prism dioptre" : "two prism dioptres"} a second, starting from rest. The member says when it splits in two (the break) and, as it comes back, when it is one again (the recovery). Three repeats; the middle value of each is kept. `
    + (way === "out" ? "The two rings are never set more than 4 cm apart the wrong way, so the eyes are never asked to point outward past straight ahead; most people reach that limit without a split, and the result then reads \"this much or more\". " : "")
    + (way === "in" && rate === 1 ? "This is the fusion range check-up's own test. " : "")
    + "The published digital test used the same three speeds, with five repeats and a two-minute rest; the home clip takes three.",
    [GAO, CITT_NORMAL], { place });

/* ───────────── resting position ───────────── */

const drift = (code: string, axis: "h" | "v", place: Place): OfferedClip =>
  m(code, { template: "align", axis, lock: false }, [axis === "h" ? "alignment_h" : "alignment_v"], place === "far" ? ["glasses", "dim", "keys"] : ["glasses", "dim"],
    `One line is shown to each eye on a black screen, with nothing else for the two eyes to hold on to. The member moves one line until it sits exactly ${axis === "h" ? "under" : "beside"} the other. How far apart the two lines really are then is how far the eyes rest ${axis === "h" ? "turned in or out" : "one above the other"}. Three tries; the middle one is kept. It is the idea of the clinic's card-and-streak test, done with red-cyan glasses. The edge of the screen and the room still help the eyes a little, so a home reading tends to be smaller than a clinic one.`,
    [PHORIA], { place });

export const MEASUREMENT: ClipDef[] = [
  letter("M01", "R", "far"), letter("M02", "L", "far"), letter("M03", "both", "far"),
  letter("M04", "R", "near"), letter("M05", "L", "near"),
  shapes("M06", "R"), shapes("M07", "L"),
  crowded("M08", "R"), crowded("M09", "L"),
  m("M10", { template: "choose", kind: "faint", eye: "both" }, ["acuity_faint"], [],
    "The letter E again, in pale grey on white: one tenth darker than the page. It is the letter test at low contrast, which can show a loss that black letters hide. Both eyes open.", [PELLI_BEX]),

  stripes("M11", "coarse", "R"), stripes("M12", "coarse", "L"),
  stripes("M13", "medium", "R"), stripes("M14", "medium", "L"),
  stripes("M15", "fine", "R"), stripes("M16", "fine", "L"),

  m("M17", { template: "choose", kind: "dots", eye: "both" }, ["balance_motion"], ["glasses"],
    "Dots drift across a black panel. One eye is shown dots that all drift the same way; the other eye is shown dots that drift every way. The member says which way the dots are going. The strength of each eye's dots is moved until the answer is as often right with the steady dots in one eye as in the other: that point is the balance. It is the moving-dot idea from the suppression studies, run on the engine's balance staircase. The dots glide; none blink on and off. It is a second opinion beside the letter-pair result and does not change the member's settings.",
    [DOTS]),
  m("M18", { template: "choose", kind: "pairs", eye: "both" }, ["balance"], ["glasses"],
    "Two letters sit on top of each other, one for each eye, and the member says which looks stronger. The stronger one is dimmed until neither wins. This is the eye balance check-up's own test.", [KWON]),
  m("M19", { template: "choose", kind: "animals", eye: "both" }, ["balance"], ["glasses", "helper"],
    "The eye balance test with two simple animal shapes in place of letters, for a child who does not yet know letters. The same staircase, and the same result on the same scale.", [KWON]),
  m("M20", { template: "count" }, ["suppression"], ["glasses"],
    "One red dot, two cyan dots and one white dot. Four dots seen means both eyes are in use together; two or three means one eye's picture was not seen; five means both were seen but not joined. This is the suppression check-up's own test, with the screen near.", [WORTH], { place: "near" }),
  m("M21", { template: "count" }, ["suppression"], ["glasses", "keys"],
    "The four-dot check with the screen across the room. From far away the group of dots covers a much smaller part of the view, so it tests the very centre.", [WORTH], { place: "far" }),
  m("M22", { template: "spots", kind: "map", eye: "both" }, ["suppression_map"], ["glasses"],
    "Both eyes look at a white cross. The stronger eye is shown a field of small red marks. A cyan spot, which only the weaker eye can see, then eases in at one of sixteen places around the cross, or at none, and the member says whether a spot was seen. The result is the number of places missed. The app cannot see where the eyes look: it only works if they stay on the cross.",
    [SUPPRESSION_MAP]),
  stripes("M23", "medium", "both"),
  {
    code: "M24", offered: true, play: { template: "look", scene: "sighting" }, store: { to: "note" }, gear: [], place: "any", who: "anyone", screen: false,
    basis: "The hole-in-the-hands test: a small gap between the hands is lined up with a dot using both eyes, and closing each eye in turn shows which eye did the aiming. A habit, not a measure of sight; other tests of the leading eye can give another answer.",
    sources: [DOMINANCE],
  },

  m("M25", { template: "pick", kind: "rings", eye: "both", band: [3200, 400] }, ["stereo"], ["glasses"],
    `${ringsBasis} This clip covers the large steps only, down to 400 arc seconds: a quick first look. A result is kept only when the finest step read lies inside these steps; passing all of them says "go on to the medium steps".`, [RANDOT]),
  m("M26", { template: "pick", kind: "rings", eye: "both", band: [400, 100] }, ["stereo"], ["glasses"],
    `${ringsBasis} This clip covers the medium steps, 400 down to 100 arc seconds. A result is kept only when the finest step read lies inside these steps.`, [RANDOT]),
  m("M27", { template: "pick", kind: "rings", eye: "both", band: [100, 0] }, ["stereo"], ["glasses"],
    `${ringsBasis} This clip covers the finest steps, from 100 arc seconds down to one dot of this screen. A screen whose dots are larger than that from the seat cannot show them and does not offer the clip.`, [RANDOT]),
  m("M28", { template: "pick", kind: "rings", eye: "both" }, ["stereo"], ["glasses"],
    `${ringsBasis} The ring floats in front of the screen. This is the depth check-up's own test.`, [RANDOT]),
  m("M29", { template: "pick", kind: "rings", eye: "both", behind: true }, ["stereo_behind"], ["glasses"],
    `${ringsBasis} Here the shift is the other way round, so the ring sinks behind the screen. Some people read depth in front and depth behind unequally, so it is kept apart.`, [RANDOT]),
  m("M30", { template: "pick", kind: "hidden", eye: "both" }, ["stereo_hidden"], ["glasses", "helper"],
    "A panel of random dots hides a circle, a square, a triangle or a star. Each eye alone sees only dots; the shape stands out only when both eyes work together, and the child points to it among four. The step halves after two right answers. It is the random-dot idea of the preschool depth tests. It must be done with the glasses on: without them a careful eye can find the shape by its coloured edges.",
    [RANDOT]),
  m("M31", { template: "pick", kind: "rings", eye: "both" }, ["stereo"], ["glasses", "keys"],
    `${ringsBasis} Run with the screen across the room. From far away one dot of the screen is a finer step, so the test reaches finer depth.`, [RANDOT], { place: "far" }),
  m("M32", { template: "pick", kind: "rings", eye: "both", moving: true }, ["stereo_moving"], ["glasses"],
    `${ringsBasis} Here the four rings glide slowly from side to side together while the member chooses. Depth in a moving shape is not the same skill as depth in a still one, and clinic tests of it are not standard, so the result is compared only with the member's own.`, [DYNAMIC_DEPTH]),

  range("M33", "out", 0.5, "near"), range("M34", "out", 1, "near"), range("M35", "out", 2, "near"),
  range("M36", "in", 0.5, "near"), range("M37", "in", 1, "near"), range("M38", "in", 2, "near"),
  range("M39", "out", 0.5, "far"), range("M40", "out", 1, "far"), range("M41", "out", 2, "far"),
  range("M42", "in", 0.5, "far"), range("M43", "in", 1, "far"), range("M44", "in", 2, "far"),

  m("M45", { template: "hold", kind: "flips", seconds: 60 }, ["vergence_flips"], ["glasses"],
    "The pull on the eyes flips between turning in and letting out, and the member says \"one ring\" after each flip. Full cycles in a minute are counted. It is the exercise library's Flip Switch drill, run for one minute. The clinic test uses a fixed pair of prisms (3 turning out, 12 turning in); here the pair starts small, grows with success and stays inside what the screen and the 4 cm rule allow, so the clinic's usual figure does not apply.",
    [GALL], { place: "near" }),
  m("M46", { template: "hold", kind: "flips", seconds: 60 }, ["vergence_flips"], ["glasses", "keys"],
    "The flips-a-minute clip with the screen across the room. From far away the 4 cm rule leaves very little room for turning out, so the pair of pulls is small.", [GALL], { place: "far" }),
  m("M47", { template: "measure", kind: "near_point" }, ["near_point"], ["ruler", "helper"],
    "A small target is brought toward the nose until it turns into two, and a helper measures the gap with a ruler. Three tries; the middle one is kept. This is the near point check-up's own test. The catalogue names the phone camera for this; a camera cannot read a face a few centimetres away, so the ruler is used.",
    [NEAR_POINT, CITT_NORMAL], { screen: false }),
  m("M48", { template: "split", way: "in", rate: 1, mode: "recover" }, ["recovery_time"], ["glasses"],
    "The ring pulls the eyes in until it splits in two. At that moment the pull eases by two prism dioptres and stays there, and the clock runs until the member says the ring is one again. Three repeats; the middle time is kept. There is no published figure for this home measure: compare it only with your own.",
    [GAO], { place: "near" }),
  m("M49", { template: "hold", kind: "hold", seconds: 60 }, ["fusion_hold"], ["glasses"],
    "The ring is pulled in to a set amount (half of the member's last fusion break, or 6 prism dioptres when there is none) and the member holds it as one ring for up to a minute. The result is the seconds held before the first split.", [GAO, CITT_NORMAL], { place: "near" }),
  m("M50", { template: "hold", kind: "adapt", seconds: 120 }, ["alignment_shift"], ["glasses", "dim"],
    "Three parts: the resting position is measured, then one ring is held at a set pull for two minutes, then the resting position is measured again. The change is how far the resting position moved toward the hold. The therapy trial in adults found that this slow adaptation grew with therapy. A research measure with no usual figure for home use.",
    [ADAPTATION, PHORIA], { place: "near" }),

  drift("M51", "h", "near"), drift("M52", "h", "far"), drift("M53", "v", "any"),
  m("M54", { template: "align", axis: "h", lock: true }, ["fixation_offset"], ["glasses"],
    "A white ring and frame that both eyes see keep the eyes joined. A small line above it is shown to one eye and a line below it to the other, and the member moves one until the two line up. What is left between them is the small misaim that remains while both eyes are joined. Three tries; the middle one is kept. Lines this fine need a sharp screen: the step is never finer than one dot.",
    [FIXATION]),
  {
    code: "M55", offered: false,
    basis: "Eye position read from where a flash lands on each eye in a photo.",
    why: "A web page cannot fire a camera's flash, and reading the tiny reflection of light on each eye needs a model that Eyes Opener has not trained or checked. At the size a face has in a home photo, one dot of error is about ten prism dioptres, so only a very large turn would show. The evidence framework keeps this as a research item.",
    sources: [],
  },

  m("M56", { template: "grid", eye: "R" }, ["grid_marks"], [], "A grid of small squares with a dot in the middle, held at three times its width so each square covers one degree. With the left eye covered, the member looks at the dot and marks any squares where the lines look bent, blurred or missing. The number of squares marked is kept. It is the home grid check eye doctors hand out. It misses some early changes, so a clean grid is no all-clear.", [AMSLER, AMSLER_LIMITS]),
  m("M57", { template: "grid", eye: "L" }, ["grid_marks"], [], "The grid check for the left eye, with the right eye covered.", [AMSLER, AMSLER_LIMITS]),
  m("M58", { template: "pick", kind: "wobble", eye: "R" }, ["shape_wobble"], [], "Four circles; the edge of one has a gentle ripple, and the member picks it. The ripple halves after two right answers. The result is the smallest ripple told from a true circle, as a percent of the circle's radius. It is the shape test used on phones to watch the centre of vision. Right eye, the left eye covered.", [WOBBLE]),
  m("M59", { template: "pick", kind: "wobble", eye: "L" }, ["shape_wobble"], [], "The wobbly circle test for the left eye, with the right eye covered.", [WOBBLE]),
  m("M60", { template: "spots", kind: "field", eye: "R" }, ["field_missed"], ["dim"], "With the left eye covered, the right eye looks at a cross. A small grey spot eases in at one of 24 places within the middle of the view, or at none, and the member says whether a spot was seen. The result is the number of places missed. A home screen test of this kind has been compared with a clinic field machine for finding large losses; it is no substitute for one. The app cannot see where the eye looks: it only works if the eye stays on the cross.", [HOME_FIELD]),
  m("M61", { template: "spots", kind: "field", eye: "L" }, ["field_missed"], ["dim"], "The central field dots for the left eye, with the right eye covered.", [HOME_FIELD]),
  m("M62", { template: "find", kind: "search", seconds: 120 }, ["search_blind", "search_seeing"], [],
    "A white dot appears somewhere on the screen and the member sweeps the eyes across to find it and says which side it is on. The average time to find a dot is kept for each side. It is the exercise library's Blind-Side Sweeps drill, run for two minutes as a starting measure.", [EYE_SEARCH]),

  m("M63", { template: "read" }, ["reading_speed"], [],
    "A short passage of everyday words is read silently at a normal pace, and the clock gives the words a minute. The passages are Eyes Opener's own; they are not the standard clinic texts, so the result is compared only with the member's own earlier ones. The app cannot check that every word was read.", [READING], { screen: false }),
  m("M64", { template: "survey", kind: "near_work" }, ["symptoms"], [], "Fifteen questions about reading and close work, each answered from never to always, added up to a score from 0 to 60. This is the symptom survey check-up's own list.", [CISS], { screen: false }),
  m("M65", { template: "survey", kind: "screen" }, ["screen_strain"], [], "Ten questions about how the eyes feel during and after screen work, each answered from never to always, added up to a score from 0 to 40. The questions are Eyes Opener's own. They cover what the published screen-strain questionnaires ask about, but the score is not one of theirs and has no cut-off.", [SCREEN_SYMPTOMS], { screen: false }),
  m("M66", { template: "survey", kind: "dry" }, ["dry_eye"], [], "Six questions about dry, gritty, burning or watery eyes, each answered from never to always, added up to a score from 0 to 24. The questions are Eyes Opener's own. They cover what the published dry-eye questionnaires ask about, but the score is not one of theirs and has no cut-off.", [DRY_EYE], { screen: false }),
  m("M67", { template: "camera", kind: "blinks", seconds: 60 }, ["blink_rate"], ["camera"],
    "The camera watches the eyelids for a minute while the member reads the screen as usual, and counts blinks. The share of full blinks is not reported: at a home camera's sharpness, telling a full blink from a half one has not been checked. For a grown-up's profile, with the camera allowed. The picture never leaves the device.",
    [BLINKS, IRIS], { who: "adult", screen: false }),
  m("M68", { template: "camera", kind: "working", seconds: 60 }, ["working_distance"], ["camera"],
    "The camera reads the distance from the face to the screen for a minute while the member works as usual, and keeps the middle value. It needs the camera's scale from the camera distance check first. For a grown-up's profile, with the camera allowed. The picture never leaves the device.",
    [IRIS, DESK], { who: "adult", screen: false }),
  {
    code: "M69", offered: false,
    basis: "Dot plates that people with a red-green colour difference read differently.",
    why: "Colour plates only work when the colours on the screen are exactly the ones the test was designed with. Home screens differ widely, and warm filters and picture modes shift them further. On a screen whose colours have not been measured with an instrument, a plate can pass a person who has a colour difference and fail a person who has none. An eye doctor or an optician can do this test in a minute with printed plates.",
    sources: [],
  },
  m("M70", { template: "find", kind: "track", seconds: 60 }, ["tracking"], [],
    "A ring glides along a smooth looping path and the member keeps a pointer on it, with a finger, a mouse or the arrow keys. The share of the minute spent on the ring is kept. It measures the hand and the eyes following together, not the eyes alone: a web page cannot see where the eyes point.", [VOMS]),
];
