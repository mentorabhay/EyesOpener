"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { canKeepFiles, dropHandle, keepHandle, keptHandles, openHandle, pickFilms, type FilmHandle } from "./handles";
import { emptyList, listStore } from "./list-store";
import {
  addFilms, addReel, filmKey, isVideoFile, moveFilm, nextFilm, REEL_KEY, removeFilm, selectFilm, setDuration, setPosition, type Film,
} from "./playlist";

/**
 * Where a film in the list stands on this visit.
 *  - "ready": it can be played now.
 *  - "ask": the browser kept access to the file and wants the member's OK before opening it.
 *  - "gone": the browser kept access, but the file was moved, renamed or deleted.
 *  - "file": only the title and the place are kept; the member picks the file again.
 *  - "cannot": this browser cannot play the file.
 */
export type FilmStatus = "ready" | "ask" | "gone" | "file" | "cannot";
/** What the last change to the list did, for one plain line under it. */
export interface ListNote { added: number; again: string | null; notVideo: number; left: number }

const noChange = () => () => undefined;
const never = () => false;
const noReel = () => null;

type Marks = ReadonlySet<string>;
/** Adds a film's key to a set of marks, or takes it out. */
const mark = (set: (change: (s: Marks) => Marks) => void, key: string, on: boolean) =>
  set((s) => {
    if (s.has(key) === on) return s;
    const next = new Set(s);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

/** Reads a film's length without showing it. Resolves to 0 when the browser cannot read the file. */
function lengthOf(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = document.createElement("video");
    const done = (seconds: number) => {
      clearTimeout(timer);
      probe.removeAttribute("src");
      probe.load();
      resolve(seconds);
    };
    const timer = setTimeout(() => done(-1), 10_000);
    probe.preload = "metadata";
    probe.muted = true;
    probe.onloadedmetadata = () => done(Number.isFinite(probe.duration) ? probe.duration : -1);
    probe.onerror = () => done(0);
    probe.src = url;
  });
}

/**
 * The member's film list for one profile on this device: what is in it, which films can be played on this visit,
 * and every change a member can make. Files are read in the browser only; see playlist.ts and handles.ts.
 */
export function useFilmList(
  profileId: string,
  /** The plain file input (`<input type="file" multiple>`) that browsers with no other picker use. */
  input: RefObject<HTMLInputElement | null>,
  { picker, reelName, reelSrc }: { picker: string; reelName: string; reelSrc: () => string },
) {
  const store = useMemo(() => listStore(profileId), [profileId]);
  const list = useSyncExternalStore(store.subscribe, store.get, emptyList);
  const keeps = useSyncExternalStore(noChange, canKeepFiles, never);
  /* Picked files as addresses the player can read. They live for this visit and are let go when the page closes. */
  const urls = useRef(new Map<string, string>());
  const handles = useRef(new Map<string, FilmHandle>());
  /* The films this browser could not play, as the handlers below need to know them at once. `cannot` is the same for drawing. */
  const broken = useRef(new Set<string>());
  const [ready, setReady] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [asking, setAsking] = useState<Marks>(() => new Set());
  const [gone, setGone] = useState<Marks>(() => new Set());
  const [cannot, setCannot] = useState<Marks>(() => new Set());
  /* Films whose file access the browser really keeps. Said per film, never assumed from what the browser could do. */
  const [held, setHeld] = useState<Marks>(() => new Set());
  const [note, setNote] = useState<ListNote | null>(null);
  /* Which of the reel's two files this browser plays is known only in the browser. */
  const reel = useSyncExternalStore(noChange, reelSrc, noReel);

  /** Makes a file playable on this visit and reads its length for the list. */
  const open = useCallback((key: string, file: File) => {
    if (!urls.current.has(key)) urls.current.set(key, URL.createObjectURL(file));
    setReady(new Map(urls.current));
    mark(setAsking, key, false);
    mark(setGone, key, false);
    const url = urls.current.get(key)!;
    if (!store.get().films.find((f) => f.key === key)?.duration) {
      void lengthOf(url).then((seconds) => {
        if (seconds > 0) store.set((s) => setDuration(s, key, seconds));
        else if (seconds === 0) { broken.current.add(key); mark(setCannot, key, true); }
      });
    }
  }, [store]);

  /** Takes in picked files: new ones go to the end of the list, known ones become playable again with their place kept. */
  const admit = useCallback((picked: readonly { file: File; handle?: FilmHandle }[]) => {
    const films = picked.filter((p) => isVideoFile(p.file.name, p.file.type));
    const { stored, added, known, left } = addFilms(store.get(), films.map((p) => p.file));
    const next = store.set(() => stored);
    for (const p of films) {
      const key = filmKey(p.file.name, p.file.size);
      if (!next.films.some((f) => f.key === key)) continue;
      broken.current.delete(key);
      mark(setCannot, key, false);
      open(key, p.file);
      if (p.handle) { handles.current.set(key, p.handle); void keepHandle(profileId, key, p.handle).then((ok) => mark(setHeld, key, ok)); }
    }
    /* Nothing on screen that can be played: put the first of the picked films there. */
    const first = added[0] ?? known[0];
    const shown = next.current;
    if (first && (!shown || broken.current.has(shown) || (shown !== REEL_KEY && !urls.current.has(shown)))) store.set((s) => selectFilm(s, first));
    setNote({ added: added.length, again: known.length === 1 && !added.length ? next.films.find((f) => f.key === known[0])?.name ?? null : null, notVideo: picked.length - films.length, left });
  }, [open, profileId, store]);

  /* On arriving: open the films this browser kept access to. Where it wants an OK first, the list says so. */
  useEffect(() => {
    let live = true;
    const keys = store.get().films.filter((f) => f.key !== REEL_KEY).map((f) => f.key);
    if (keys.length && canKeepFiles()) {
      void keptHandles(profileId, keys).then(async (found) => {
        for (const [key, handle] of found) {
          if (!live) return;
          handles.current.set(key, handle);
          mark(setHeld, key, true);
          const got = await openHandle(handle, false);
          if (!live) return;
          if (got.state === "ready") open(key, got.file);
          else mark(got.state === "ask" ? setAsking : setGone, key, true);
        }
      });
    }
    const held = urls.current;
    return () => {
      live = false;
      for (const url of held.values()) URL.revokeObjectURL(url);
      held.clear();
    };
  }, [profileId, store, open]);

  const statusOf = useCallback((key: string): FilmStatus =>
    cannot.has(key) ? "cannot" : key === REEL_KEY || ready.has(key) ? "ready" : asking.has(key) ? "ask" : gone.has(key) ? "gone" : "file",
  [cannot, ready, asking, gone]);

  /* Changes that only touch the list itself. These keep one identity, so effects may depend on them. */
  const edits = useMemo(() => ({
    select: (key: string) => { store.set((s) => selectFilm(s, key)); },
    move: (key: string, by: -1 | 1) => { store.set((s) => moveFilm(s, key, by)); },
    /** Puts IOpener's own test reel in the list and on screen. */
    showReel: () => {
      store.set((s) => selectFilm(addReel(s, reelName, 0), REEL_KEY));
      setNote(null);
    },
    notePlace: (key: string, seconds: number, duration: number) => { store.set((s) => setPosition(s, key, seconds, duration)); },
    noteLength: (key: string, seconds: number) => { store.set((s) => setDuration(s, key, seconds)); },
    noteBroken: (key: string) => { broken.current.add(key); mark(setCannot, key, true); },
  }), [store, reelName]);

  const actions = useMemo(() => ({
    /** Opens the browser's file picker. With the kind that hands out file access, the films are ready next visit too. */
    pick: () => {
      setNote(null);
      if (!canKeepFiles()) { input.current?.click(); return; }
      void pickFilms(picker).then((got) => { if (got === null) input.current?.click(); else if (got.length) admit(got); });
    },
    /** For the plain file input, where the browser has no other picker. Empty the input afterwards, so the same file can be picked again. */
    picked: (files: FileList | null) => { if (files?.length) admit([...files].map((file) => ({ file }))); },
    /** Asks the browser, on a button press, to open the films it kept access to. */
    allow: async () => {
      for (const key of [...asking]) {
        const handle = handles.current.get(key);
        if (!handle) continue;
        const got = await openHandle(handle, true);
        if (got.state === "ready") open(key, got.file);
        else if (got.state === "gone") { mark(setAsking, key, false); mark(setGone, key, true); }
        else break;
      }
    },
    remove: (key: string) => {
      store.set((s) => removeFilm(s, key));
      const url = urls.current.get(key);
      if (url) { URL.revokeObjectURL(url); urls.current.delete(key); setReady(new Map(urls.current)); }
      handles.current.delete(key);
      broken.current.delete(key);
      for (const set of [setAsking, setGone, setCannot, setHeld]) mark(set, key, false);
      void dropHandle(profileId, key);
      setNote(null);
    },
  }), [admit, asking, input, open, picker, profileId, store]);

  const current: Film | null = list.films.find((f) => f.key === list.current) ?? null;
  /** The address the player reads the film on screen from. Null when it cannot be played on this visit. */
  const srcOf = (key: string | null | undefined) => (!key || cannot.has(key) ? null : key === REEL_KEY ? reel : ready.get(key) ?? null);
  /** The film that follows `key` in the list and can be played now. */
  const after = (key: string) => nextFilm(list, key, (k) => statusOf(k) === "ready");

  /** True when the browser keeps access to every film file in the list, so none needs picking again next visit. */
  const allKept = list.films.every((f) => f.key === REEL_KEY || held.has(f.key));

  return { list, films: list.films, current, keeps, allKept, statusOf, srcOf, after, note, waiting: asking.size, ...edits, ...actions };
}

export type FilmList = ReturnType<typeof useFilmList>;
