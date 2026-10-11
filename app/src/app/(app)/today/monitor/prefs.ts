// Eyes Opener: The member's own switches for the monitor, kept in this browser: which reminders to show, sound, system notices,.
/**
 * The member's own switches for the monitor, kept in this browser: which reminders to show, sound, system notices,
 * a second screen to the side, and whether the camera picture is on show. Nothing here is sent anywhere.
 * Also the small facts about this browser the page needs: is it a phone, has it an on-top window, has it notices.
 */
import { useSyncExternalStore } from "react";
import { ALL_PROMPTS, PROMPTS, type PromptPrefs } from "@/lib/monitor-rules";

export interface Prefs { prompts: PromptPrefs; sound: boolean; notices: boolean; sideScreen: boolean; preview: boolean }
/** Quiet by default: no sound and no system notice until the member turns one on. */
export const DEFAULT_PREFS: Prefs = { prompts: ALL_PROMPTS, sound: false, notices: false, sideScreen: false, preview: true };

const KEY = "iopener.monitor.prefs.v1", CHANGED = "iopener-monitor-prefs";
let cacheRaw: string | null | undefined, cache: Prefs = DEFAULT_PREFS;

function parse(raw: string | null): Prefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<Prefs> | null;
    if (!v || typeof v !== "object") return DEFAULT_PREFS;
    const prompts = { ...ALL_PROMPTS };
    for (const k of PROMPTS) if (typeof v.prompts?.[k] === "boolean") prompts[k] = v.prompts[k];
    const flag = (x: unknown, fallback: boolean) => (typeof x === "boolean" ? x : fallback);
    return { prompts, sound: flag(v.sound, false), notices: flag(v.notices, false), sideScreen: flag(v.sideScreen, false), preview: flag(v.preview, true) };
  } catch { return DEFAULT_PREFS; }
}

function read(): Prefs {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { /* storage is off: the defaults are used */ }
  if (raw !== cacheRaw) { cacheRaw = raw; cache = parse(raw); }
  return cache;
}

export function savePrefs(next: Prefs) {
  const raw = JSON.stringify(next);
  try { localStorage.setItem(KEY, raw); } catch { /* storage is off: the choice lasts until the page closes */ }
  cacheRaw = raw; cache = next;
  window.dispatchEvent(new Event(CHANGED));
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => { window.removeEventListener(CHANGED, onChange); window.removeEventListener("storage", onChange); };
};

export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);

/* ───────────── facts about this browser ───────────── */

const never = () => () => undefined;
const no = () => false;

/** A phone or a tablet: a finger is the only pointer. A laptop with a touch screen still has a fine pointer. */
export const usePhone = () => useSyncExternalStore(
  (onChange) => { const q = window.matchMedia("(any-pointer: fine)"); q.addEventListener("change", onChange); return () => q.removeEventListener("change", onChange); },
  () => window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches,
  no,
);
/** A small always-on-top window (Document Picture-in-Picture). */
export const useHasPip = () => useSyncExternalStore(never, () => "documentPictureInPicture" in window, no);
export const useHasNotices = () => useSyncExternalStore(never, () => "Notification" in window, no);
/** True once the page runs in the browser. */
export const useInBrowser = () => useSyncExternalStore(never, () => true, no);
