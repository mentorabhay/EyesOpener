/**
 * Facts about a face, worked out from the 478 points the face landmark model gives for one camera picture.
 * Pure functions: no camera, no model, no clock. The camera side is in camera.ts, landmarker.ts and runner.ts.
 *
 * Everything here runs on the member's own device. A picture and its points are used for one step and dropped;
 * only the few numbers a feature keeps (a distance, a blink count) ever leave this folder.
 *
 * ── Viewing distance: the method and its error, honestly ──
 * The coloured part of the eye (the iris) is almost the same width in everyone: 11.7 mm, give or take 0.5 mm.
 * A thing of known width looks smaller the further away it is, in exact proportion (a pinhole camera):
 *
 *     distance = iris width in mm x camera scale / iris width in the picture
 *
 * Source for the figure and the method: Google Research, "MediaPipe Iris: real-time iris tracking and depth
 * estimation", 2020, https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/
 * It reports a mean error of 4.3% (spread 2.4%) against a depth sensor, and 4.8% with glasses on, for more than
 * 200 people filmed with one phone model, at up to 2 metres. Like that work, this file takes the iris width as the
 * mean of its side-to-side and top-to-bottom widths, and corrects for an eye that is away from the middle of the
 * picture.
 *
 * What is different here, and what it does to the error:
 *  - A web page is not told a camera's focal length, so the "camera scale" is not known. It is set once for each
 *    camera, in one step: the member sits at a distance they measured, and the scale is solved from the formula
 *    (`scaleFrom`). The member's own iris width is folded into that scale, so the 0.5 mm spread between people
 *    drops out for that member. Another person at the same camera reads up to about 4% off until they set it too.
 *  - The scale is only as good as the distance it was set at. A tape measure that is 2 cm out at 50 cm puts every
 *    later reading 4% out, the same way. This does not shrink with more pictures.
 *  - At 50 cm a laptop camera shows the iris about 24 dots wide. One dot of wobble is 4% in one picture; the
 *    monitor takes the middle value of a whole minute, which removes most of the wobble but none of the two
 *    errors above.
 *  - A head turned to the side shows the iris narrower and reads too far. Pictures with the head turned more than
 *    `MEASURE_TURN_DEG` are not used for distance.
 *  - Strong glasses change how big the iris looks to the camera. Set the scale with the glasses you work in.
 *  - The number is the distance to the camera. It stands for the distance to the screen only when the camera sits
 *    on the screen, as it does on a laptop.
 * In short: after the one-step set-up expect roughly 5% (about 2 to 3 cm at 50 cm) for the person who set it.
 * It is a habit measure. It is not a clinical measurement, and nothing here has been checked against a real face
 * by this project yet.
 *
 * ── Blinks and head position ──
 * `open` is how far the lids are apart, as a share of the eye's width. A blink is a short dip in it: blink.ts.
 * `turn`, `nod` and `tilt` are the head's angles to the camera, from three lines across the face. They are coarse
 * (several degrees) and are used only to answer "is this person facing the screen" and "is the head held level".
 *
 * Nothing in this file reads the pupil, where the eyes look, or anything about mood. Those are out by design:
 * a laptop camera cannot measure them (evidence framework, "Workday eye monitor").
 */

/** One point of the face model: x and y are shares of the picture's width and height, z is depth in picture widths (smaller is nearer). */
export interface Point { x: number; y: number; z: number }

/** The model gives this many points when it was built with the iris points. */
export const FACE_POINTS = 478;

/**
 * The points this file reads. "Right" and "left" are the person's own right and left.
 * Numbers are those of the MediaPipe face mesh with iris.
 */
export const P = {
  rightEye: { outer: 33, inner: 133, top: [160, 158], bottom: [144, 153] },
  leftEye: { outer: 263, inner: 362, top: [387, 385], bottom: [373, 380] },
  /** centre, then the four edge points: side, top, side, bottom */
  rightIris: [468, 469, 470, 471, 472],
  leftIris: [473, 474, 475, 476, 477],
  forehead: 10, chin: 152, rightCheek: 234, leftCheek: 454,
} as const;

/** Width of the human iris, side to side, in millimetres (source in the header). */
export const IRIS_MM = 11.7;
/** A head turned or nodded further than this is not facing the screen: the eyes cannot be read well. */
export const FACING_TURN_DEG = 30;
export const FACING_NOD_DEG = 30;
/** Distance is read only from pictures with the head turned and nodded less than this. */
export const MEASURE_TURN_DEG = 20;
/**
 * The scale of a camera is its focal length in picture widths. A lens that sees 100 degrees across has 0.42,
 * one that sees 40 degrees has 1.37. A scale outside this range is not a web camera: the distance typed was wrong.
 */
export const SCALE_RANGE = [0.4, 1.5] as const;

export interface FaceFacts {
  /** Iris width as a share of the picture's width, mean of the two eyes. Null when an eye is off the picture's edge. */
  iris: number | null;
  /** How far the eyes are from the middle of the picture, in picture widths. */
  offCentre: number;
  /** Lid opening as a share of eye width, mean of the two eyes. About 0.3 open, under 0.1 shut. */
  open: number;
  /** Degrees: head turned to a side, nodded up or down, tilted towards a shoulder. 0 is square to the camera. */
  turn: number; nod: number; tilt: number;
  /** Turned towards the camera enough for the eyes to be read. */
  facing: boolean;
  /** Square enough to the camera for the distance to be read. */
  square: boolean;
}

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const deg = (rad: number) => (rad * 180) / Math.PI;
const finite = (p: Point | undefined): p is Point => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

/**
 * Reads one picture's points. `width` and `height` are the picture's size in dots; only their ratio matters.
 * Null means "no face in view": no points, too few points, or points that are not numbers.
 */
export function readFace(points: readonly Point[] | null | undefined, width: number, height: number): FaceFacts | null {
  if (!points || points.length < FACE_POINTS || !(width > 0) || !(height > 0)) return null;
  const ratio = height / width;
  /* Every length below is in picture widths, the same in every direction. */
  const at = (i: number): V3 | null => { const p = points[i]; return finite(p) ? [p.x, p.y * ratio, p.z] : null; };
  const all = (ids: readonly number[]) => { const out = ids.map(at); return out.every(Boolean) ? (out as V3[]) : null; };

  const frame = all([P.rightCheek, P.leftCheek, P.forehead, P.chin]);
  const eyes = [P.rightEye, P.leftEye].map((e) => all([e.outer, e.inner, ...e.top, ...e.bottom]));
  const irises = [P.rightIris, P.leftIris].map((ids) => all(ids));
  if (!frame || !eyes[0] || !eyes[1] || !irises[0] || !irises[1]) return null;
  const [right, left, top, bottom] = frame;
  if (len(sub(left, right)) < 1e-6 || len(sub(bottom, top)) < 1e-6) return null;

  /* Head angles from two lines across the face: cheek to cheek, forehead to chin. Their cross product points out of the back of the head. */
  const across = unit(sub(left, right)), down = unit(sub(bottom, top)), back = unit(cross(across, down));
  const turn = deg(Math.atan2(back[0], back[2]));
  const nod = deg(Math.asin(Math.max(-1, Math.min(1, -back[1]))));
  const tilt = deg(Math.atan2(across[1], across[0]));

  /* Lid opening: two lid-to-lid gaps over the eye's width, measured in depth as well so a small turn does not change it. */
  const opening = ([outer, inner, t1, t2, b1, b2]: V3[]) => (len(sub(t1, b1)) + len(sub(t2, b2))) / (2 * (len(sub(outer, inner)) || 1));
  const open = (opening(eyes[0]) + opening(eyes[1])) / 2;

  /* Iris width in the picture: flat distances only, as the published method does. */
  const flat = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const widthOf = ([, e1, e2, e3, e4]: V3[]) => (flat(e1, e3) + flat(e2, e4)) / 2;
  const centres = [irises[0][0], irises[1][0]];
  const inPicture = centres.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= ratio);
  const iris = (widthOf(irises[0]) + widthOf(irises[1])) / 2;
  const mid: [number, number] = [(centres[0][0] + centres[1][0]) / 2 - 0.5, (centres[0][1] + centres[1][1]) / 2 - ratio / 2];

  const facing = Math.abs(turn) <= FACING_TURN_DEG && Math.abs(nod) <= FACING_NOD_DEG;
  return {
    iris: inPicture && iris > 0 ? iris : null,
    offCentre: Math.hypot(mid[0], mid[1]),
    open, turn, nod, tilt, facing,
    square: facing && Math.abs(turn) <= MEASURE_TURN_DEG && Math.abs(nod) <= MEASURE_TURN_DEG,
  };
}

/** Is this a camera scale a web camera can have? */
export const isScale = (scale: number) => Number.isFinite(scale) && scale >= SCALE_RANGE[0] && scale <= SCALE_RANGE[1];

/**
 * Distance from the camera to the eyes in centimetres, from the iris width in one picture and this camera's scale.
 * Null when the iris could not be read or the scale is not set.
 */
export function distanceCm(iris: number | null, offCentre: number, scale: number | null): number | null {
  if (iris === null || !(iris > 0) || scale === null || !isScale(scale)) return null;
  return (IRIS_MM * Math.hypot(scale, offCentre)) / iris / 10;
}

/**
 * The one-step set-up: the scale of this camera, from the iris width seen while the member sits at a distance
 * they measured. Null when the answer is not a scale a web camera can have (the distance typed was wrong, or the
 * face was not the member's).
 */
export function scaleFrom(iris: number, offCentre: number, knownCm: number): number | null {
  if (!(iris > 0) || !(knownCm > 0)) return null;
  const reach = (knownCm * 10 * iris) / IRIS_MM;
  const scale = Math.sqrt(Math.max(0, reach * reach - offCentre * offCentre));
  return isScale(scale) ? scale : null;
}

/* ───────────── head position ───────────── */

/** A head tilted towards a shoulder by more than this is "not level". A product rule, not a published limit. */
export const LEVEL_TILT_DEG = 15;
/** Sitting closer than this share of the distance the camera was set at is "leaning in". A product rule. */
export const LEAN_SHARE = 0.85;

export interface Posture { level: boolean; leaning: boolean | null }

/**
 * Head position in one picture. `leaning` compares the distance now with the member's own usual distance, and is
 * null when either is unknown.
 */
export function postureOf(facts: Pick<FaceFacts, "tilt">, distance: number | null, usualCm: number | null): Posture {
  return {
    level: Math.abs(facts.tilt) <= LEVEL_TILT_DEG,
    leaning: distance === null || usualCm === null || !(usualCm > 0) ? null : distance < usualCm * LEAN_SHARE,
  };
}

/** The middle value of a list. Null for an empty list. */
export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
