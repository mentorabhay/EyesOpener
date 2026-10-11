// Eyes Opener: The group screen of Cinema Club: one film for a room.
"use client";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { reelSrc } from "@/app/(app)/train/cinema/reel";
import { breakLeft, clock, type ChapterPlan } from "@/components/film/chapters";
import { FilmControls, PlayIcon } from "@/components/film/controls";
import css from "@/components/film/film.module.css";
import { useFilm, useFullScreen } from "@/components/film/use-film";
import { cinemaClub, type KitNumbers } from "@/copy/cinema-club";
import { videoMatrix } from "@/engine";
import { clubScreen, GROUP_CONTRAST } from "@/lib/cinema-club";

const t = cinemaClub.screen;

/**
 * The group screen of Cinema Club: one film for a room.
 *  - The same full picture goes to both eyes (GROUP_CONTRAST). No child's own setting is read or used.
 *  - It is not a session: nothing is asked of the server, nothing is saved, and nobody's daily minutes are touched.
 *  - The film is read in the browser and never sent anywhere. Not even its name is kept.
 *  - It keeps the cinema's chapters and eye breaks, and stops by itself after one club hour of film.
 *    The clock counts only while the film moves.
 */
export function ClubScreen({ numbers, plan }: {
  numbers: KitNumbers;
  /** The cinema's standard plan. Shorter only in a staff test household, to try a break without waiting. */
  plan: ChapterPlan;
}) {
  const shell = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null), picker = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<{ url: string; name: string; own: boolean } | null>(null);
  const [watched, setWatched] = useState(0);
  const [breaks, setBreaks] = useState(0);
  const [ended, setEnded] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /* True while the film must stand still: an eye break, or the hour is over. Read by whatever tries to start the film. */
  const held = useRef(false);

  const film = useFilm(video, {
    onPlay: (v) => { if (held.current) v.pause(); },
    onBroken: () => setProblem(t.cannot),
  });
  const { pause, play } = film, { playing } = film.state;
  const full = useFullScreen(shell);

  const state = clubScreen(watched, breaks, plan);
  const stopped = state.over || ended, rest = state.breakDue && !ended;
  const mayPlay = !!src && !rest && !stopped && !film.state.broken;

  /* The clock of the evening: it moves only while the film does. */
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      /* a tab that slept does not count as watching */
      setWatched((w) => w + Math.min(1, (now - last) / 1000));
      last = now;
    }, 250);
    return () => clearInterval(timer);
  }, [playing]);
  /* An eye break, or the end of the hour: the film stops and stays stopped. */
  useEffect(() => {
    held.current = rest || stopped;
    if (rest || stopped) pause();
  }, [rest, stopped, pause]);
  /* A film in a tab nobody is looking at is not being watched. */
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [pause]);
  /* The film's address in the browser is given back when another film is chosen or the page is left. */
  useEffect(() => () => { if (src?.own) URL.revokeObjectURL(src.url); }, [src]);

  const keysToPicture = () => { if (stage.current?.contains(document.activeElement)) stage.current.focus({ preventScroll: true }); };
  const toggle = () => {
    if (playing) pause();
    else if (mayPlay) { keysToPicture(); void play(); }
  };
  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) { setProblem(t.notVideo); return; }
    setProblem(null);
    setSrc({ url: URL.createObjectURL(file), name: file.name, own: true });
  };
  const useReel = () => { setProblem(null); setSrc({ url: reelSrc(), name: t.reelName, own: false }); };
  const carryOn = () => { keysToPicture(); held.current = false; setBreaks(state.finished); void play(); };
  const again = () => { setWatched(0); setBreaks(0); setEnded(false); };

  const pictureKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) toggle(); }
  };

  return (
    <div className={css.shell} ref={shell} role="region" aria-label={t.region}>
      <div
        ref={stage} className={`scene ${css.stage}`} tabIndex={0} aria-label={t.picture}
        onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "VIDEO") toggle(); }} onKeyDown={pictureKeys}
      >
        <div className={css.frame}>
          <video ref={video} className={css.film} src={src?.url} playsInline preload="metadata" {...film.bind} />
        </div>
        {!src && (
          <div className={css.empty}>
            <p style={{ color: "#fff" }}>{t.none}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="btn" onClick={() => picker.current?.click()}>{t.choose}</button>
              <button type="button" className="btn" onClick={useReel}>{t.reel}</button>
            </div>
          </div>
        )}
        {src && !playing && !rest && !stopped && <span className={css.mark} aria-hidden="true"><PlayIcon /></span>}
        {rest && <Break key={state.finished} chapter={state.finished} seconds={plan.breakSeconds} metres={numbers.breakMetres} onCarryOn={carryOn} onEnd={() => setEnded(true)} />}
        {stopped && (
          <div className={`${css.card} ${css.solid}`} role="group" aria-label={t.over.title}>
            <h3>{t.over.title}</h3>
            <p role="status">{state.over ? t.over.body(numbers.filmMinutes) : t.over.ended}</p>
            <div className="row"><button type="button" className="btn" onClick={again}>{t.over.again}</button></div>
          </div>
        )}
        <svg className={css.defs} aria-hidden="true">
          <filter id="two-eye" colorInterpolationFilters="linearRGB"><feColorMatrix type="matrix" values={videoMatrix(GROUP_CONTRAST).join(" ")} /></filter>
        </svg>
      </div>

      <div className={css.status} role="status">
        <b>{t.chapter(state.chapter, numbers.chapters)}</b>
        {!stopped && !rest && <span className="tnum">{t.toBreak(clock(Math.ceil(state.toBreak)))}</span>}
        <span className="muted tnum">{t.hourLeft(clock(Math.ceil(state.left)))}</span>
        {src && <span className="muted">{src.name}</span>}
      </div>
      <FilmControls film={film} full={full} mayPlay={mayPlay} locked={!src || rest || stopped} onToggle={toggle}>
        <button type="button" className="btn" onClick={() => picker.current?.click()} disabled={playing}>{src ? t.chooseAgain : t.choose}</button>
      </FilmControls>
      <input ref={picker} className={css.picker} type="file" accept="video/*" aria-label={t.choose} tabIndex={-1} onChange={choose} />
      {problem && <p className="notice" data-b="warn" role="alert">{problem}</p>}
    </div>
  );
}

/** The eye break between two chapters: what the room does, and a slow countdown. "Carry on" answers only once it has ended. */
function Break({ chapter, seconds, metres, onCarryOn, onEnd }: { chapter: number; seconds: number; metres: number; onCarryOn: () => void; onEnd: () => void }) {
  const r = t.rest;
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => setLeft(breakLeft(started, performance.now(), seconds)), 250);
    return () => clearInterval(timer);
  }, [seconds]);
  const over = left <= 0;
  return (
    <div className={`${css.card} ${css.solid}`} role="group" aria-label={r.title} data-film-break={over ? "over" : "running"}>
      <p className={css.soft}>{r.finished(chapter)}</p>
      <h3>{r.title}</h3>
      {over ? <p role="status"><b>{r.over}</b></p> : (
        <>
          <p>{r.look(metres)}</p>
          <div className={css.count} role="timer" aria-label={`${r.countdown}: ${r.seconds(left)}`}>{clock(left)}</div>
          <div className={css.drain} aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0, left - 1) / Math.max(1, seconds - 1)})` }} /></div>
          <p className={css.soft}>{r.wait}</p>
        </>
      )}
      <div className="row">
        <button type="button" className="btn btn-g" autoFocus aria-disabled={!over} onClick={() => { if (over) onCarryOn(); }}>{r.carryOn}</button>
        <button type="button" className="btn" onClick={onEnd}>{r.end}</button>
      </div>
    </div>
  );
}
