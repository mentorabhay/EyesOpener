// Eyes Opener: The camera, opened on the member's own device. The picture stays in the page: nothing here sends it anywhere,.
/**
 * The camera, opened on the member's own device. The picture stays in the page: nothing here sends it anywhere,
 * stores it or draws it to anything but the preview the member can hide.
 * A modest picture is asked for (640 by 480, 15 a second): enough for the face model, light enough to run for hours.
 */

export type CameraProblem =
  | "unsupported"  // this browser has no camera access for web pages, or the page is not on a safe address
  | "denied"       // the member, the browser or the device said no
  | "none"         // no camera found
  | "busy"         // another program holds the camera
  | "failed";

export interface OpenCamera {
  stream: MediaStream;
  track: MediaStreamTrack;
  /** A name for this camera that stays the same on this device and browser. Used to remember its scale. */
  key: string;
  width: number; height: number;
}

export const CAMERA_ASK: MediaStreamConstraints = {
  audio: false,
  video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 30 }, facingMode: "user" },
};

/** Which problem a refused camera request was. */
export function cameraProblem(error: unknown): CameraProblem {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "none";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "failed";
}

/** The camera's own id with the shape of its picture: another lens or another picture shape needs its own scale. */
export function cameraKey(settings: { deviceId?: string; width?: number; height?: number }): string {
  const shape = settings.width && settings.height ? (settings.width / settings.height).toFixed(2) : "0";
  return `${settings.deviceId || "camera"}|${shape}`;
}

export async function openCamera(): Promise<{ ok: true; camera: OpenCamera } | { ok: false; why: CameraProblem }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return { ok: false, why: "unsupported" };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_ASK);
    const track = stream.getVideoTracks()[0];
    if (!track) { stream.getTracks().forEach((t) => t.stop()); return { ok: false, why: "none" }; }
    const s = track.getSettings();
    return { ok: true, camera: { stream, track, key: cameraKey(s), width: s.width ?? 0, height: s.height ?? 0 } };
  } catch (e) {
    return { ok: false, why: cameraProblem(e) };
  }
}

/** Switches the camera off. The camera light goes out. */
export function closeCamera(camera: Pick<OpenCamera, "stream"> | null | undefined) {
  camera?.stream.getTracks().forEach((t) => t.stop());
}

/** Shows the camera in a video element and waits for the first picture. False when no picture came. */
export async function showIn(video: HTMLVideoElement, stream: MediaStream, waitMs = 8000): Promise<boolean> {
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  try { await video.play(); } catch { /* a browser may refuse to play before a press; the pictures still arrive */ }
  const until = performance.now() + waitMs;
  while (performance.now() < until) {
    if (video.readyState >= 2 && video.videoWidth > 0) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return false;
}
