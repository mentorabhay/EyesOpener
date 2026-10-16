// Eyes Opener: Video playback, stereo anaglyph rendering, and audiovisual pacing component (player).
"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ARROW_GROUP, directionOf, moveFocus } from "@/components/film/arrows";
import { ChapterBreak } from "@/components/film/break-card";
import { chapterAt, clock, type ChapterPlan } from "@/components/film/chapters";
import { FilmControls, Glasses, lensLine, PlayIcon } from "@/components/film/controls";
import { FilmList } from "@/components/film/film-list";
import css from "@/components/film/film.module.css";
import { hasOwnButtons, minutesUsed, overlayFor } from "@/components/film/overlay";
import { resumeAt } from "@/components/film/playlist";
import { useFilm, useFullScreen } from "@/components/film/use-film";
import { useFilmList } from "@/components/film/use-list";
import { LensView } from "@/components/play/lens";
import { canBegin, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { cinema as c } from "@/copy/cinema";
import { train as t } from "@/copy/train";
import { videoMatrix } from "@/engine";
import type { Detail, EndReason, TrainDose } from "@/lib/sessions";
import { reelSrc } from "./reel";

/* Which of the reel's two files this browser plays is worked out once. */
let reelAddress: string | null = null;
const reel = () => (reelAddress ??= reelSrc());

/** What a film session measured: the chapters watched to their end, and the films watched to theirs when there were any. */
const measured = (chapters: number, films: number): Detail => (films > 0 ? { chapters, films } : { chapters });

/** Positions are written to the device this often while a film plays, in seconds of film. */
const KEEP_EVERY = 5;

/**
 * The two-eye cinema: the member's own films, played through the two-eye filter with Eyes Opener's own controls.
 *  - A film is read in the browser and never sent anywhere. The list of films lives on this device only.
 *  - The film moves only inside a session the server allowed, and the session clock counts only while it moves.
 *  - Watching is cut into chapters with an eye break between them (see chapters.ts). A break is not watching.
 *  - A list of films plays one after another inside the same session, so it can never run past the dose.
 */
export function Player({ itemSlug, contrast, dose, cyanEye, weakInk = "cyan", plan, profileId, tester }: {
  itemSlug: string; contrast: number; dose: TrainDose;
  /** The eye the cyan lens goes over, or null when the eye settings do not say yet. */
  cyanEye: "L" | "R" | null;
  /** Which ink the weaker eye sees (engine/profile.ts): the film's dimmed rows follow it. */
  weakInk?: "cyan" | "red";
  plan: ChapterPlan; profileId: string;
  /** A staff test household: the daily limits are off, so "today's minutes are used" never applies. */
  tester: boolean;
}) {
  /* What the session has measured so far, the film's place as last written to the device, and the film time of that write. */
  const detail = useRef<Detail | null>(null);
  const live = useRef({ finished: 0, films: 0 });
  const place = useRef<{ key: string; seconds: number; duration: number } | null>(null);
  const kept = useRef(-KEEP_EVERY);
  /* The film the member has started on this visit, and the film to start by itself once it has loaded. */
  const startedRef = useRef<string | null>(null);
  const pending = useRef<{ key: string; from: number } | null>(null);
  const resting = useRef(false);
  const root = useRef<HTMLDivElement>(null), shell = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null), input = useRef<HTMLInputElement>(null);

  const list = useFilmList(profileId, input, { picker: c.list.picker, reelName: c.list.reelName, reelSrc: reel });
  const { notePlace } = list;
  /* Leaving the page: write the film's place to the device, and the exact chapters before the session saves itself. */
  useEffect(() => () => {
    if (place.current) notePlace(place.current.key, place.current.seconds, place.current.duration);
    detail.current = measured(live.current.finished, live.current.films);
  }, [notePlace]);

  const s = useTrainSession("film", itemSlug, undefined, detail);
  const { phase, begin, setTicking } = s;
  const [breaks, setBreaks] = useState(0);
  const [startedKey, setStartedKey] = useState<string | null>(null);

  const open = dose.reason !== "guardian_only";
  /* A seat that may only look sees no film and no list. */
  const shown = open ? list.current : null, shownKey = shown?.key ?? null;
  const status = shownKey ? list.statusOf(shownKey) : null;
  const src = list.srcOf(shownKey);
  const active = phase === "active";
  const chapter = chapterAt(s.seconds, breaks, plan, s.allowed);
  const rest = active && chapter.breakDue;
  const started = !!shownKey && startedKey === shownKey;
  const mayPlay = !!src && !rest && (active || canBegin(s, dose));

  const markStarted = (key: string | null) => { startedRef.current = key; setStartedKey(key); };
  /** Writes where the film on screen stands to the device. Only a film the member has started is written. */
  const keepPlace = (v: HTMLVideoElement) => {
    const key = v.dataset.film;
    if (!key || startedRef.current !== key || v.readyState < 1 || !Number.isFinite(v.duration)) return;
    place.current = { key, seconds: v.currentTime, duration: v.duration };
    kept.current = v.currentTime;
    list.notePlace(key, v.currentTime, v.duration);
  };
  /** Ends the session by the member's hand or at the end of the films, with the chapters exactly as watched. */
  const endBy = (reason: EndReason) => {
    detail.current = measured(live.current.finished, live.current.films);
    return s.end(reason);
  };

  const film = useFilm(video, {
    /* Whatever starts the film (a button, a key, the device's media keys) comes through here, so nothing plays outside a session. */
    onPlay: (v) => {
      if (resting.current) { v.pause(); return; }
      if (phase === "active") { setTicking(true); return; }
      if (phase === "starting") return;
      if (!canBegin(s, dose)) { v.pause(); return; }
      live.current = { finished: 0, films: 0 };
      detail.current = null;
      setBreaks(0);
      /* The film starts on the press and the server is asked at once. A refusal stops it again. */
      void begin().then((ok) => { if (!ok) v.pause(); else if (v.paused || v.ended) setTicking(false); });
    },
    onMoving: () => { if (phase === "active" && !resting.current) setTicking(true); },
    onStill: (v) => { setTicking(false); keepPlace(v); },
    onPlace: (seconds, v) => { if (Math.abs(seconds - kept.current) >= KEEP_EVERY) keepPlace(v); },
    onLength: (seconds, v) => {
      const key = v.dataset.film;
      if (!key) return;
      list.noteLength(key, seconds);
      /* The next film of the list, or one picked from the list, starts by itself once the browser can play it. */
      const next = pending.current;
      pending.current = null;
      if (next?.key !== key || resting.current) return;
      markStarted(key);
      kept.current = next.from;
      void film.play(next.from).then((ok) => { if (!ok) markStarted(null); });
    },
    onBroken: () => { if (shownKey) list.noteBroken(shownKey); },
    onEnded: (v) => {
      const key = v.dataset.film;
      if (key) list.notePlace(key, v.duration, v.duration);
      place.current = null;
      if (phase !== "active" || !key) return;
      live.current.films++;
      const next = list.after(key);
      if (!next) { void endBy("done"); return; }
      /* On to the next film, inside the same session. It carries on from where it stopped if it was begun before. */
      pending.current = { key: next, from: resumeAt(list.films.find((f) => f.key === next)) ?? 0 };
      list.select(next);
    },
  });
  const { pause, play } = film, { playing, now } = film.state;
  const full = useFullScreen(shell);

  /* The film runs only inside a session: it stops when the server refuses one or the allowed minutes are used. */
  useEffect(() => { if (phase !== "starting" && phase !== "active") pause(); }, [phase, pause]);
  /* An eye break: the film pauses, and with it the session clock. */
  useEffect(() => {
    resting.current = rest;
    if (rest) pause();
  }, [rest, pause]);
  /* What the session will save. The clock ends a session at exactly the allowed time, one tick before this can see it, so the last second is written ahead. */
  useEffect(() => {
    if (phase !== "active") return;
    live.current.finished = chapter.finished;
    const atEnd = s.seconds + 1 >= s.allowed;
    detail.current = measured(atEnd ? Math.max(chapter.finished, Math.floor(s.allowed / plan.chapterSeconds)) : chapter.finished, live.current.films);
  }, [phase, s.seconds, s.allowed, chapter.finished, plan.chapterSeconds]);
  /* A film in a tab nobody is looking at is not being watched. */
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, [pause]);

  const resume = started ? null : resumeAt(shown);
  /* A card's button goes away when it is pressed. The keys then stay with the picture instead of falling off the page. */
  const keysToPicture = () => { if (stage.current?.contains(document.activeElement)) stage.current.focus({ preventScroll: true }); };
  /** Starts the film on screen: from a given place, or from where it stands. */
  const startAt = (from?: number) => {
    if (!shownKey || !mayPlay) return;
    keysToPicture();
    markStarted(shownKey);
    if (from !== undefined) kept.current = from;
    void play(from);
  };
  const toggle = () => {
    if (playing) pause();
    else startAt(resume ?? undefined);
  };
  /** Puts a film from the list on screen. It starts by itself unless there is a place to carry on from to ask about. */
  const show = (key: string) => {
    if (rest) return;
    if (video.current) keepPlace(video.current);
    if (key === shownKey) { startAt(resume ?? undefined); return; }
    const to = list.films.find((f) => f.key === key);
    pending.current = to && resumeAt(to) === null && (active || canBegin(s, dose)) ? { key, from: 0 } : null;
    setTicking(false);
    list.select(key);
  };
  /** After an eye break: the next chapter begins. A film that came on screen during the break carries on from its kept place. */
  const carryOn = () => {
    if (!shownKey || !src) return;
    keysToPicture();
    resting.current = false;
    setBreaks(chapter.finished);
    const from = started ? undefined : resume ?? undefined;
    markStarted(shownKey);
    if (from !== undefined) kept.current = from;
    void play(from);
  };

  /* Keys on the picture itself: OK or Space plays and pauses, left and right move through the film. */
  const pictureKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === " " || e.key === "Enter" || e.key === "k" || e.key === "K") { e.preventDefault(); if (!e.repeat && !rest) toggle(); }
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && src && !rest) { e.preventDefault(); film.nudge(e.key === "ArrowLeft" ? -10 : 10); }
  };
  /* Everywhere in the cinema: the four arrows move between the controls, for a remote with nothing else. */
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    /* In full screen only what is on the screen can be reached: the film and its controls. */
    const within = full.on ? shell.current : root.current;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !within) return;
    const target = e.target as HTMLElement, typing = target instanceof HTMLInputElement && target.type !== "range";
    if (!typing && (e.key === "m" || e.key === "M")) { film.mute(); return; }
    if (!typing && (e.key === "f" || e.key === "F") && full.can) { full.toggle(); return; }
    const dir = directionOf(e.key);
    if (!dir) return;
    const slider = target instanceof HTMLInputElement && target.type === "range";
    if (slider && (dir === "left" || dir === "right")) return;
    /* On a slider, up and down leave it instead of moving it. */
    if (moveFocus(within, dir) || slider) e.preventDefault();
  };

  const lens = lensLine(cyanEye);
  const ended = phase === "ended" ? s.ended : null;
  const usedUp = minutesUsed({ doseReason: dose.reason, endReason: ended?.endReason ?? null, watchedSeconds: s.seconds, allowedSeconds: s.allowed, tester });
  /* What lies over the picture: at most one card. Cards with their own buttons take the keys; otherwise the picture is one big play and pause button. */
  const card = overlayFor({ status, rest, usedUp, stopped: ended?.endReason === "stop_rule", playing, mayPlay, active, started });
  const ownButtons = hasOwnButtons(card, open);
  const picture = !ownButtons && !!src;

  return (
    <div ref={root} onKeyDown={arrows} style={{ display: "contents" }}>
      <section className="c span8" aria-label={c.player.region}>
        <LensView swapped={weakInk === "red"}>
          <div ref={shell} className={css.shell} data-film-shell data-full={full.on ? "" : undefined}>
            <div
              ref={stage} className={`scene ${css.stage}`} tabIndex={picture ? 0 : -1} role={picture ? "button" : undefined} aria-label={picture ? c.player.picture : undefined}
              onKeyDown={pictureKeys} onClick={picture ? toggle : undefined} data-film-stage={card ?? "film"} {...(ownButtons ? { [ARROW_GROUP]: "" } : {})}
            >
              <div className={css.frame}>
                {src && (
                  <video
                    ref={video} className={css.film} src={src} data-film={shownKey ?? undefined} playsInline preload="auto" aria-label={t.cinema.film}
                    disablePictureInPicture disableRemotePlayback {...film.bind}
                  />
                )}
              </div>
              {card === "empty" && (
                <div className={css.empty}>
                  <p>{c.player.none}</p>
                  {open && <button type="button" className="btn" onClick={list.pick}>{c.player.add}</button>}
                </div>
              )}
              {card === "cannot" && (
                <div className={css.card} role="alert">
                  <h3>{c.cannot.title}</h3>
                  <p>{c.cannot.body}</p>
                </div>
              )}
              {card === "file" && shown && (
                <div className={css.card}>
                  <h3>{shown.name}</h3>
                  <p>{status === "ask" ? c.list.askNote : status === "gone" ? `${c.list.gone}. ${c.list.needsPick}` : c.list.needsPick}</p>
                  {open && (status === "ask"
                    ? <button type="button" className="btn btn-g" onClick={() => void list.allow()}>{c.list.ask}</button>
                    : <button type="button" className="btn btn-g" onClick={list.pick}>{c.list.pickAgain}</button>)}
                </div>
              )}
              {card === "rest" && <ChapterBreak chapter={chapter.finished} plan={plan} cyan={cyanEye} onCarryOn={carryOn} onEnd={() => { keysToPicture(); void endBy("left"); }} />}
              {card === "used" && (
                <div className={css.card} role="status">
                  <h3>{c.used.title}</h3>
                  <p>{shown && now > 0 ? c.used.at(clock(now)) : c.used.tomorrow}</p>
                </div>
              )}
              {card === "stopped" && (
                <div className={css.card}>
                  <h3>{c.stopped.title}</h3>
                  <p>{c.stopped.body}</p>
                </div>
              )}
              {card === "ready" && (
                <div className={css.card}>
                  <div className={css.lens}>
                    <Glasses cyan={cyanEye} />
                    <p><b>{c.glasses.title}</b><br />{lens}.</p>
                  </div>
                  {resume !== null && <p className={css.soft}>{c.ready.stoppedAt(clock(resume))}</p>}
                  <div className="row">
                    {resume !== null
                      ? (
                        <>
                          <button type="button" className="btn btn-g" onClick={() => startAt(resume)} data-film-resume><PlayIcon />{c.ready.carryOn(clock(resume))}</button>
                          <button type="button" className="btn" onClick={() => startAt(0)}>{c.ready.fromStart}</button>
                        </>
                      )
                      : <button type="button" className="btn btn-g" onClick={() => startAt()} data-film-start><PlayIcon />{c.ready.play}</button>}
                  </div>
                </div>
              )}
              {card === "paused" && <span className={css.mark} role="img" aria-label={c.ready.paused}><PlayIcon /></span>}
            </div>
            {/* The matrix works in real light (linearRGB), as the engine's contrast values do. */}
            <svg className={css.defs} aria-hidden="true">
              <filter id="two-eye" colorInterpolationFilters="linearRGB"><feColorMatrix type="matrix" values={videoMatrix(contrast, undefined, weakInk).join(" ")} /></filter>
            </svg>

            {open && <FilmControls film={film} full={full} mayPlay={mayPlay} locked={!src || rest} onToggle={toggle} />}

            <div className={css.status}>
              <span><b>{clock(s.seconds)}</b> <span className="muted">{c.session.watched}</span></span>
              {active && <span data-film-chapter>{c.session.chapter(chapter.chapter)}{!rest && <span className="muted">, {c.session.toBreak(clock(chapter.toBreak))}</span>}</span>}
              <span style={{ flex: 1 }} />
              {active && <span role="timer" aria-label={c.session.leftLabel}><b>{clock(Math.max(0, s.allowed - s.seconds))}</b> <span className="muted">{c.session.left}</span></span>}
            </div>
            {/* The stop button stays with the film at all times, in full screen and during a break too. */}
            {active && (
              <div className="row">
                <StopButton s={{ ...s, end: endBy }} />
                <button type="button" className="btn" onClick={() => void endBy("left")}>{t.finish}</button>
              </div>
            )}
            <SessionNote s={s} dose={dose} labels={c.labels} />
          </div>
          {open && <p className="small muted">{c.player.keys}</p>}
        </LensView>
      </section>

      {open && (
        <section className="c span4" aria-label={c.list.title}>
          <div className="c-head"><h2>{c.list.title}</h2>{list.films.length > 0 && <div className="r"><span className="chip" data-b="plain">{c.list.films(list.films.length)}</span></div>}</div>
          <FilmList list={list} input={input} playingKey={playing ? shownKey : null} locked={rest} onPlay={show} reelLabel={t.cinema.reel} reelPrompt={t.cinema.noFilm} />
        </section>
      )}
    </div>
  );
}
