/**
 * On-device vision: the camera, the face landmark model and the facts read from its points.
 * Camera pictures and face points never leave the device. A feature takes numbers from here and keeps only those.
 *
 *   face.ts        pure: distance, lid opening, head angles, "no face in view"
 *   blink.ts       pure: full blinks, half blinks, and what is not a blink
 *   scale.ts       the one-step distance set-up for each camera, remembered on the device
 *   camera.ts      opening and closing the camera
 *   landmarker.ts  loading the model from this site, lazily
 *   runner.ts      running it at a modest pace, in view or not
 *   made-up.ts     a made-up face for tests
 */
export * from "./face";
export * from "./blink";
export * from "./scale";
export * from "./camera";
export * from "./landmarker";
export * from "./runner";
