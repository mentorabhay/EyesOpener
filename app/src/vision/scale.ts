// Eyes Opener: The scale of each camera on this device, set once in one step (see face.ts) and remembered in this browser.
/**
 * The scale of each camera on this device, set once in one step (see face.ts) and remembered in this browser.
 * It is kept on the device, by camera, because it belongs to the lens: another laptop, or a camera clipped to the
 * screen, has its own. It is one number and the distance it was set at. It is never sent anywhere.
 */
import { isScale, median, scaleFrom } from "./face";

const STORE = "iopener.vision.scale.v1";
/** The distances a member can set the scale at, in centimetres: a desk, not a phone and not a television. */
export const SET_AT_CM = [30, 120] as const;
/** Pictures needed for the one-step set-up, and how much they may differ from each other. */
export const SET_PICTURES = 12;
export const SET_SPREAD = 0.08;

export interface CameraScale { scale: number; atCm: number; setAt: number }
type Store = Record<string, CameraScale>;

const read = (): Store => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "{}") as unknown;
    return raw && typeof raw === "object" ? (raw as Store) : {};
  } catch { return {}; }
};

export function loadScale(cameraKey: string): CameraScale | null {
  const s = read()[cameraKey];
  return s && isScale(s.scale) && s.atCm >= SET_AT_CM[0] && s.atCm <= SET_AT_CM[1] ? s : null;
}

export function saveScale(cameraKey: string, value: CameraScale) {
  try { localStorage.setItem(STORE, JSON.stringify({ ...read(), [cameraKey]: value })); } catch { /* storage is off: the scale lasts until the page closes */ }
}

export function forgetScale(cameraKey: string) {
  try { const all = read(); delete all[cameraKey]; localStorage.setItem(STORE, JSON.stringify(all)); } catch { /* nothing kept */ }
}

export type SetUp = { ok: true; scale: number } | { ok: false; why: "too_few" | "moving" | "distance" };

/**
 * The one-step set-up from a short run of pictures taken while the member sits still at a distance they measured.
 * Pure. `readings` are the iris widths and off-centre values of pictures that were square to the camera.
 */
export function setUpScale(readings: readonly { iris: number; offCentre: number }[], knownCm: number): SetUp {
  if (!(knownCm >= SET_AT_CM[0] && knownCm <= SET_AT_CM[1])) return { ok: false, why: "distance" };
  if (readings.length < SET_PICTURES) return { ok: false, why: "too_few" };
  const widths = readings.map((r) => r.iris).sort((a, b) => a - b);
  const mid = median(widths)!;
  const low = widths[Math.floor(widths.length * 0.1)], high = widths[Math.min(widths.length - 1, Math.floor(widths.length * 0.9))];
  if (!(mid > 0) || (high - low) / mid > SET_SPREAD) return { ok: false, why: "moving" };
  const scale = scaleFrom(mid, median(readings.map((r) => r.offCentre))!, knownCm);
  return scale === null ? { ok: false, why: "distance" } : { ok: true, scale };
}
