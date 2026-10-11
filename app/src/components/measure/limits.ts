// Eyes Opener: The ranges a measurement may fall in. The tests clamp to them and the server refuses anything outside. .
/** The ranges a measurement may fall in. The tests clamp to them and the server refuses anything outside. */
export const LIMITS = {
  /** CSS pixels per centimetre. A large TV showing a web page can have fewer than 10. */
  ppc: [4, 75],
  /** Viewing distance in centimetres. */
  dist: [30, 300],
  /** Acuity in logMAR. */
  va: [-0.3, 1.3],
  /** Contrast sensitivity in logCS. */
  cs: [0, 1.65],
  /** Balance value, log10 of red over cyan contrast. */
  bal: [-1.3, 1.3],
  /** Depth step in arcseconds. */
  stereo: [0.5, 3600],
  /** Depth offset between the two copies of a ring, in device pixels. */
  offsetPx: [1, 400],
  /** Device pixels to one CSS pixel. */
  dpr: [0.25, 8],
  /** Fusion demand in prism dioptres. */
  fusion: [0, 30],
  /** Near point in centimetres, from the bridge of the nose. */
  near: [1, 50],
  /** One answer of the symptom survey: never to always. */
  answer: [0, 4],
} as const satisfies Record<string, readonly [number, number]>;
