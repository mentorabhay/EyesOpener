/**
 * Runs the face model on the camera at a modest, steady pace and hands each picture's facts to a feature.
 * The picture itself never leaves this function: it goes from the video element into the model and is gone.
 *
 * Pace. A blink lasts a few tenths of a second, so `fps` is 15 by default. On a slow computer that would take most
 * of a processor, so the pace is eased until the model uses no more than `MAX_LOAD` of the time; the feature is told
 * the real pace through the times on the frames, and decides for itself what it can still measure. (Blinks need
 * ten pictures a second, which a computer keeps up when the model takes 40 ms or less for a picture. Distance, head
 * position and "is anyone there" are fine at one picture a second.)
 * The pace is kept by a worker's clock (ticker.ts), which browsers do not slow when the page is out of view.
 * Whether pictures still arrive from the camera then is up to the browser: when none arrive, no frame is handed on,
 * and the feature sees the gap in the times.
 */
import { readFace, type FaceFacts } from "./face";
import type { Landmarker } from "./landmarker";
import { startTicker } from "./ticker";

/** The model may use this share of one processor. */
export const MAX_LOAD = 0.4;
export const DEFAULT_FPS = 15;
/** The slowest pace the runner eases to. */
const SLOWEST_MS = 1000;

export interface VisionFrame {
  /** When the picture was read, in milliseconds on the page's steady clock (`performance.now()`). */
  t: number;
  /** What the picture showed, or null for "no face in view". */
  facts: FaceFacts | null;
  /** How long the model took, in milliseconds. */
  tookMs: number;
}

export interface Runner {
  stop(): void;
  /** Pictures read each second at the pace now in use. */
  readonly fps: number;
}

export function startRunner(o: {
  landmarker: Landmarker; video: HTMLVideoElement; fps?: number;
  onFrame: (frame: VisionFrame) => void;
  /** Called once when the model has failed too often to go on. */
  onBroken?: () => void;
}): Runner {
  const wantMs = 1000 / (o.fps ?? DEFAULT_FPS);
  let paceMs = wantMs, lastPicture = -1, typical = 0, busy = false, stopped = false, told = false, frames = 0;

  const tick = () => {
    if (stopped || busy) return;
    const { video } = o;
    /* Only a new picture is read. A camera that has stopped giving pictures gives no frames. */
    if (video.readyState < 2 || video.currentTime === lastPicture) return;
    busy = true;
    try {
      lastPicture = video.currentTime;
      const t = performance.now();
      const points = o.landmarker.detect(video, t);
      const tookMs = performance.now() - t;
      if (o.landmarker.broken) { if (!told) { told = true; o.onBroken?.(); } return; }
      const facts = points ? readFace(points, video.videoWidth, video.videoHeight) : null;
      o.onFrame({ t, facts, tookMs });
      /* Ease the pace to the computer: a running mean of the model's time, looked at every 30 pictures. */
      typical = typical ? typical * 0.9 + tookMs * 0.1 : tookMs;
      if (++frames % 30 === 0) {
        const next = Math.min(SLOWEST_MS, Math.max(wantMs, typical / MAX_LOAD));
        if (Math.abs(next - paceMs) / paceMs > 0.15) { paceMs = next; ticker.every(paceMs); }
      }
    } finally { busy = false; }
  };
  const ticker = startTicker(paceMs, tick);
  return {
    get fps() { return 1000 / paceMs; },
    stop() { stopped = true; ticker.stop(); },
  };
}
