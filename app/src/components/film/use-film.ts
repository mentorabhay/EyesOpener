// Eyes Opener: What the controls need to know about the film on screen. .
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject, type SyntheticEvent } from "react";

/** What the controls need to know about the film on screen. */
export interface FilmState {
  /** The film is moving. */
  playing: boolean;
  /** Whole seconds into the film. */
  now: number;
  /** The film's length in whole seconds. 0 until the browser has read it. */
  all: number;
  /** 0 to 1. */
  volume: number;
  muted: boolean;
  /** The browser could not read or play this file. */
  broken: boolean;
}

export interface FilmEvents {
  /** The film began to move, from a button, a key or the device's own media keys. */
  onPlay?: (video: HTMLVideoElement) => void;
  /** The film stopped moving: paused, waiting for data, or a new film was put in. */
  onStill?: (video: HTMLVideoElement) => void;
  /** The film is moving again after waiting for data. */
  onMoving?: (video: HTMLVideoElement) => void;
  onEnded?: (video: HTMLVideoElement) => void;
  onBroken?: () => void;
  /** The browser has read the film's length (in seconds). */
  onLength?: (seconds: number, video: HTMLVideoElement) => void;
  /** Called about four times a second while the film moves, and after a seek. */
  onPlace?: (seconds: number, video: HTMLVideoElement) => void;
}

const SOUND_KEY = "iopener.cinema.sound";
const START: FilmState = { playing: false, now: 0, all: 0, volume: 1, muted: false, broken: false };

function keptSound(): { volume: number; muted: boolean } | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(SOUND_KEY) ?? "null") as { volume?: unknown; muted?: unknown } | null;
    return v && typeof v.volume === "number" && v.volume >= 0 && v.volume <= 1 ? { volume: v.volume, muted: v.muted === true } : null;
  } catch { return null; }
}

/**
 * One `<video>` element, driven by Eyes Opener's own controls instead of the browser's.
 * Make the ref with `useRef<HTMLVideoElement>(null)`, give it to the element and spread `bind` on it.
 * The same element is kept from film to film, so a browser that lets a film start only after a press lets the
 * next film in a list start by itself.
 */
export function useFilm(ref: RefObject<HTMLVideoElement | null>, events: FilmEvents = {}) {
  const [state, setState] = useState<FilmState>(START);
  const on = useRef(events);
  useEffect(() => { on.current = events; });

  const patch = useCallback((change: Partial<FilmState>) => {
    setState((s) => ((Object.keys(change) as (keyof FilmState)[]).every((k) => s[k] === change[k]) ? s : { ...s, ...change }));
  }, []);

  const bind = useMemo(() => {
    const el = (e: SyntheticEvent<HTMLVideoElement>) => e.currentTarget;
    const place = (v: HTMLVideoElement) => {
      patch({ now: Math.floor(v.currentTime), all: Number.isFinite(v.duration) ? Math.floor(v.duration) : 0 });
      on.current.onPlace?.(v.currentTime, v);
    };
    return {
      onPlay: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: true }); on.current.onPlay?.(el(e)); },
      onPlaying: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: true }); on.current.onMoving?.(el(e)); },
      onPause: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: false }); on.current.onStill?.(el(e)); },
      onWaiting: (e: SyntheticEvent<HTMLVideoElement>) => on.current.onStill?.(el(e)),
      /* A new film was put in. The browser stops the old one without saying "pause". */
      onEmptied: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: false, now: 0, all: 0, broken: false }); on.current.onStill?.(el(e)); },
      onEnded: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: false }); on.current.onEnded?.(el(e)); },
      onError: (e: SyntheticEvent<HTMLVideoElement>) => { patch({ playing: false, broken: true }); on.current.onStill?.(el(e)); on.current.onBroken?.(); },
      onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
        const v = el(e), sound = keptSound();
        if (sound) { v.volume = sound.volume; v.muted = sound.muted; }
        patch({ broken: false, volume: v.volume, muted: v.muted });
        place(v);
        if (Number.isFinite(v.duration) && v.duration > 0) on.current.onLength?.(v.duration, v);
      },
      onDurationChange: (e: SyntheticEvent<HTMLVideoElement>) => place(el(e)),
      onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => place(el(e)),
      onSeeked: (e: SyntheticEvent<HTMLVideoElement>) => place(el(e)),
      onVolumeChange: (e: SyntheticEvent<HTMLVideoElement>) => patch({ volume: el(e).volume, muted: el(e).muted }),
    };
  }, [patch]);

  const actions = useMemo(() => {
    const keepSound = (v: HTMLVideoElement) => {
      try { window.localStorage.setItem(SOUND_KEY, JSON.stringify({ volume: v.volume, muted: v.muted })); } catch { /* not kept */ }
    };
    return {
      /** Resolves to false when the browser will not start the film without another press. */
      play: (from?: number) => {
        const v = ref.current;
        if (!v) return Promise.resolve(false);
        if (from !== undefined && Number.isFinite(from)) v.currentTime = Math.max(0, from);
        return v.play().then(() => true, () => false);
      },
      pause: () => ref.current?.pause(),
      seek: (seconds: number) => {
        const v = ref.current;
        if (!v || !Number.isFinite(seconds)) return;
        v.currentTime = Math.max(0, Number.isFinite(v.duration) ? Math.min(seconds, v.duration) : seconds);
      },
      nudge: (by: number) => {
        const v = ref.current;
        if (v) v.currentTime = Math.max(0, Number.isFinite(v.duration) ? Math.min(v.currentTime + by, v.duration) : v.currentTime + by);
      },
      /** Louder or quieter by tenths. Turning it up also turns the sound back on. */
      louder: (tenths: number) => {
        const v = ref.current;
        if (!v) return;
        v.volume = Math.max(0, Math.min(1, Math.round(v.volume * 10 + tenths) / 10));
        if (tenths > 0) v.muted = false;
        keepSound(v);
      },
      mute: () => {
        const v = ref.current;
        if (!v) return;
        v.muted = !v.muted;
        if (!v.muted && v.volume === 0) v.volume = 0.5;
        keepSound(v);
      },
    };
  }, [ref]);

  return { bind, state, ...actions };
}

export type FilmApi = ReturnType<typeof useFilm>;

const noChange = () => () => undefined;
const never = () => false;
function watchFullScreen(listener: () => void) {
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/**
 * Fills the screen with one element and its children, so Eyes Opener's own controls stay with the film.
 * Some phones can fill the screen only with the bare video and the browser's own controls. That is not offered:
 * `can` is false there.
 */
export function useFullScreen(target: RefObject<HTMLElement | null>) {
  const on = useSyncExternalStore(watchFullScreen, () => !!target.current && document.fullscreenElement === target.current, never);
  const can = useSyncExternalStore(noChange, () => document.fullscreenEnabled === true && typeof document.documentElement.requestFullscreen === "function", never);
  const toggle = () => {
    const el = target.current;
    if (!el) return;
    if (document.fullscreenElement === el) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen().catch(() => undefined);
  };
  return { on, can, toggle };
}

export type FullScreen = ReturnType<typeof useFullScreen>;
