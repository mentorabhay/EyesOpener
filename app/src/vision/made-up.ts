/**
 * A made-up face for tests: a few points of a simple head, turned and placed in front of a pinhole camera, written
 * into the 478 slots the face model uses. It is geometry, not a person, and it is never shown to anyone.
 * The tests of face.ts, blink.ts and the monitor's rules build their pictures with it.
 */
import { FACE_POINTS, IRIS_MM, P, type Point } from "./face";

export interface MadeUpFace {
  /** Centimetres from the camera to the eyes. */
  distanceCm: number;
  /** The camera's scale: focal length in picture widths. 0.9 is an ordinary laptop camera. */
  scale?: number;
  width?: number; height?: number;
  /** Degrees. Turn is to a side, nod is down (+) or up (-), tilt is towards a shoulder. */
  turn?: number; nod?: number; tilt?: number;
  /** Lids: 1 wide open, 0 shut. */
  lids?: number;
  /** Where the face is in the picture, in picture widths from the middle. */
  shiftX?: number; shiftY?: number;
  /** This person's iris width in millimetres. */
  irisMm?: number;
}

type V = [number, number, number];
const rad = (d: number) => (d * Math.PI) / 180;

/** Millimetres in the head's own frame: x to the person's left (the picture's right), y down, z towards the back of the head. */
const HEAD = {
  eyeX: 32, eyeHalf: 15, lidHalf: 5.5, lidAt: 5,
  cheek: [72, 12, 62] as V, forehead: [0, -72, 14] as V, chin: [0, 86, 14] as V,
};

export function madeUpFace(o: MadeUpFace): { points: Point[]; width: number; height: number } {
  const width = o.width ?? 640, height = o.height ?? 480, scale = o.scale ?? 0.9;
  const z0 = o.distanceCm * 10, lids = o.lids ?? 1, r = (o.irisMm ?? IRIS_MM) / 2;
  const [cy, sy] = [Math.cos(rad(o.turn ?? 0)), Math.sin(rad(o.turn ?? 0))];
  const [cx, sx] = [Math.cos(rad(o.nod ?? 0)), Math.sin(rad(o.nod ?? 0))];
  const [cz, sz] = [Math.cos(rad(o.tilt ?? 0)), Math.sin(rad(o.tilt ?? 0))];
  const place = ([x, y, z]: V): Point => {
    /* tilt about the line of sight, then nod about the ear-to-ear line, then turn about the upright line */
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const X = x + (o.shiftX ?? 0) * z0 / scale, Y = y + (o.shiftY ?? 0) * z0 / scale, Z = z0 + z;
    /* a pinhole camera: size falls with depth. Depth is given the way the model gives it: in picture widths, nearer is smaller. */
    return { x: 0.5 + (scale * X) / Z, y: 0.5 + ((scale * Y) / Z) * (width / height), z: (scale * z) / z0 };
  };
  const blank: Point = { x: 0.5, y: 0.5, z: 0 };
  const points: Point[] = Array.from({ length: FACE_POINTS }, () => blank);
  const set = (i: number, v: V) => { points[i] = place(v); };

  for (const side of [-1, 1] as const) {
    const eye = side < 0 ? P.rightEye : P.leftEye, iris = side < 0 ? P.rightIris : P.leftIris, ex = side * HEAD.eyeX;
    set(eye.outer, [ex + side * HEAD.eyeHalf, 0, 4]);
    set(eye.inner, [ex - side * HEAD.eyeHalf, 0, 2]);
    eye.top.forEach((i, k) => set(i, [ex + (k ? 1 : -1) * HEAD.lidAt, -HEAD.lidHalf * lids, 0]));
    eye.bottom.forEach((i, k) => set(i, [ex + (k ? 1 : -1) * HEAD.lidAt, HEAD.lidHalf * lids, 0]));
    set(iris[0], [ex, 0, 0]);
    set(iris[1], [ex - r, 0, 0]); set(iris[2], [ex, -r, 0]); set(iris[3], [ex + r, 0, 0]); set(iris[4], [ex, r, 0]);
  }
  set(P.rightCheek, [-HEAD.cheek[0], HEAD.cheek[1], HEAD.cheek[2]]);
  set(P.leftCheek, HEAD.cheek);
  set(P.forehead, HEAD.forehead);
  set(P.chin, HEAD.chin);
  return { points, width, height };
}
