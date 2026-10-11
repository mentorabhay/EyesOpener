// Eyes Opener: The member's own films, lined up on this device: order, length and where each one stopped. Pure rules, unit-tested.
/**
 * The member's own films, lined up on this device: order, length and where each one stopped. Pure rules, unit-tested.
 *
 * Nothing here ever goes to the server. A film is the member's own file; the list keeps only what is needed to
 * show it and to carry on where it stopped: its name, its size, its length and a place in seconds.
 * The list is kept per profile in this browser's own storage (see `storageKey`).
 */

/** IOpener's own test reel is always at hand, so it needs no file. */
export const REEL_KEY = "reel";
/** A list longer than this would be a library, not a playlist. */
export const MAX_FILMS = 40;
/** A film that stopped this close to its start is simply started again. */
export const RESUME_AFTER = 10;
/** A film that stopped this close to its end counts as watched to the end. */
export const END_SLACK = 5;

export interface Film {
  /** Stable on this device: the file's size and name, or `REEL_KEY`. */
  key: string;
  /** The title shown: the file's name without its ending. */
  name: string;
  /** Bytes. 0 for the test reel. */
  size: number;
  /** Seconds. 0 until the browser has read the film's length. */
  duration: number;
  /** Seconds into the film where watching stopped. */
  position: number;
  /** Watched to the end at least once. */
  done: boolean;
}

export interface Stored { films: Film[]; current: string | null }

export const EMPTY: Stored = { films: [], current: null };

/** Where one profile's list is kept in the browser's storage. */
export const storageKey = (profileId: string) => `iopener.cinema.v1.${profileId}`;
/** Where one film's kept file access is filed in the browser's database. */
export const handleKey = (profileId: string, filmKey: string) => `${profileId}|${filmKey}`;

/** The same file picked again gives the same key, so its place is found again. */
export const filmKey = (name: string, size: number) => `f:${Math.max(0, Math.floor(size))}:${name}`;

/** A file name as a title: no folder, no ending, at most 120 characters. */
export function titleOf(fileName: string) {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const bare = base.replace(/\.[a-z0-9]{1,5}$/i, "").trim();
  return (bare || base.trim() || "Film").slice(0, 120);
}

const seconds = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(v, 86_400) : 0);

function cleanFilm(v: unknown): Film | null {
  if (!v || typeof v !== "object") return null;
  const f = v as Record<string, unknown>;
  if (typeof f.key !== "string" || !f.key || f.key.length > 400 || typeof f.name !== "string" || !f.name) return null;
  const duration = seconds(f.duration), position = seconds(f.position);
  return {
    key: f.key, name: f.name.slice(0, 120), size: typeof f.size === "number" && Number.isFinite(f.size) && f.size > 0 ? Math.floor(f.size) : 0,
    duration, position: duration ? Math.min(position, duration) : position, done: f.done === true,
  };
}

/** Reads what the browser kept. Anything that is not a well-formed list gives an empty one. */
export function parseStored(raw: string | null | undefined): Stored {
  if (!raw) return EMPTY;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return EMPTY; }
  if (!data || typeof data !== "object" || !Array.isArray((data as { films?: unknown }).films)) return EMPTY;
  const films: Film[] = [];
  for (const item of (data as { films: unknown[] }).films) {
    const f = cleanFilm(item);
    if (f && !films.some((x) => x.key === f.key) && films.length < MAX_FILMS) films.push(f);
  }
  const current = (data as { current?: unknown }).current;
  return { films, current: typeof current === "string" && films.some((f) => f.key === current) ? current : null };
}

export const serialise = (s: Stored) => JSON.stringify({ v: 1, films: s.films, current: s.current });

const newFilm = (key: string, name: string, size: number, duration = 0): Film => ({ key, name, size, duration, position: 0, done: false });

/**
 * Adds picked files to the end of the list. A film already in the list keeps its row, its order and its place.
 * `added` are the new keys, `known` the ones that were there already, `left` how many did not fit.
 */
export function addFilms(s: Stored, picked: readonly { name: string; size: number }[]): { stored: Stored; added: string[]; known: string[]; left: number } {
  const films = [...s.films], added: string[] = [], known: string[] = [];
  let left = 0;
  for (const p of picked) {
    const key = filmKey(p.name, p.size);
    if (films.some((f) => f.key === key)) { if (!known.includes(key) && !added.includes(key)) known.push(key); continue; }
    if (films.length >= MAX_FILMS) { left++; continue; }
    films.push(newFilm(key, titleOf(p.name), p.size));
    added.push(key);
  }
  return { stored: { films, current: s.current ?? added[0] ?? known[0] ?? null }, added, known, left };
}

/** Puts the test reel in the list if it is not there. */
export function addReel(s: Stored, name: string, duration: number): Stored {
  if (s.films.some((f) => f.key === REEL_KEY) || s.films.length >= MAX_FILMS) return s;
  return { films: [...s.films, newFilm(REEL_KEY, name, 0, duration)], current: s.current };
}

/** Takes a film out of the list. Its place in the film is forgotten with it. */
export function removeFilm(s: Stored, key: string): Stored {
  const at = s.films.findIndex((f) => f.key === key);
  if (at < 0) return s;
  const films = s.films.filter((f) => f.key !== key);
  const current = s.current !== key ? s.current : (films[at] ?? films[at - 1])?.key ?? null;
  return { films, current };
}

/** Moves a film one place up (-1) or down (+1). The ends of the list stop it. */
export function moveFilm(s: Stored, key: string, by: -1 | 1): Stored {
  const at = s.films.findIndex((f) => f.key === key), to = at + by;
  if (at < 0 || to < 0 || to >= s.films.length) return s;
  const films = [...s.films];
  [films[at], films[to]] = [films[to], films[at]];
  return { films, current: s.current };
}

export const selectFilm = (s: Stored, key: string): Stored => (s.films.some((f) => f.key === key) && s.current !== key ? { films: s.films, current: key } : s);

const update = (s: Stored, key: string, change: (f: Film) => Film): Stored => {
  let changed = false;
  const films = s.films.map((f) => {
    if (f.key !== key) return f;
    const next = change(f);
    if (next !== f) changed = true;
    return next;
  });
  return changed ? { films, current: s.current } : s;
};

/** Notes a film's length once the browser has read it. */
export const setDuration = (s: Stored, key: string, duration: number): Stored =>
  update(s, key, (f) => {
    const d = seconds(duration);
    return !d || Math.abs(d - f.duration) < 0.5 ? f : { ...f, duration: d, position: Math.min(f.position, d) };
  });

/** Notes where a film stopped. Stopping within a few seconds of the end counts as watched to the end. */
export const setPosition = (s: Stored, key: string, position: number, duration = 0): Stored =>
  update(s, key, (f) => {
    const d = seconds(duration) || f.duration, p = d ? Math.min(seconds(position), d) : seconds(position);
    const done = f.done || (d > 0 && p >= d - END_SLACK);
    return Math.abs(p - f.position) < 0.25 && d === f.duration && done === f.done ? f : { ...f, duration: d, position: p, done };
  });

/**
 * Where to offer "carry on from": the place a film stopped, when that is neither its start nor its end.
 * Null means start from the beginning.
 */
export function resumeAt(f: Pick<Film, "position" | "duration"> | undefined | null): number | null {
  if (!f || f.position < RESUME_AFTER) return null;
  if (f.duration > 0 && f.position >= f.duration - END_SLACK) return null;
  return Math.floor(f.position);
}

/** How much of a film is watched, 0 to 1. Null when its length is not known yet. */
export const watchedShare = (f: Pick<Film, "position" | "duration">): number | null =>
  f.duration > 0 ? Math.max(0, Math.min(1, f.position / f.duration)) : null;

/** The film that plays after `key`: the next one down the list that can be played now. Null at the end of the list. */
export function nextFilm(s: Stored, key: string, playable: (key: string) => boolean): string | null {
  const at = s.films.findIndex((f) => f.key === key);
  if (at < 0) return null;
  for (let i = at + 1; i < s.films.length; i++) if (playable(s.films[i].key)) return s.films[i].key;
  return null;
}

const VIDEO_ENDING = /\.(mp4|m4v|webm|mov|mkv|ogv|ogg|avi|mpg|mpeg|3gp|ts)$/i;
/** Is this picked file a film? Browsers give no type, or a catch-all one, for some video files, so the ending is read too. */
export const isVideoFile = (name: string, type: string) =>
  type.startsWith("video/") || ((type === "" || type === "application/octet-stream") && VIDEO_ENDING.test(name));

/** A file's size in words a member reads: 1.4 GB, 730 MB. */
export function sizeText(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}
