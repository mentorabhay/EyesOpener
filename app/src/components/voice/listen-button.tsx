// Eyes Opener: The Listen button: plays the spoken version of the instructions beside it.
"use client";
/**
 * The Listen button: plays the spoken version of the instructions beside it.
 *
 *  - It never starts by itself, and nothing is fetched until it is pressed.
 *  - It never plays over another sound on the page: when a film or another Listen button starts, this one pauses,
 *    and while a film is playing this one waits and says so.
 *  - Real buttons with words on them: they work with a keyboard, a switch and the OK button of a TV remote.
 *  - Nothing about what was played is kept, here or on the server.
 */
import { useEffect, useRef, useState } from "react";
import { voice as v } from "@/copy/voice";
import css from "./listen.module.css";

type State = "idle" | "loading" | "playing" | "paused" | "ended" | "failed";

/** True for a film or another spoken instruction that can be heard right now. A muted camera preview is not a sound. */
const sounding = (el: Element, self: HTMLAudioElement | null): boolean =>
  el instanceof HTMLMediaElement && el !== self && !el.paused && !el.ended && !el.muted && el.volume > 0;
/** Another Listen button gives way by itself when this one starts. A film does not: this one waits for it. */
const inTheWay = (el: Element, self: HTMLAudioElement | null): boolean => sounding(el, self) && !(el instanceof HTMLAudioElement && "listen" in el.dataset);

export function ListenButton({ src, seconds, what, langName, lang }: {
  src: string; seconds: number;
  /** What is read, for a screen reader: "Steps". */
  what: string;
  /** The language's own name, given only when the audio is not in the language of the page. */
  langName?: string; lang?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<State>("idle");
  const [at, setAt] = useState(0);
  const [waits, setWaits] = useState(false);

  useEffect(() => {
    const el = audio.current;
    /* another sound starts: this one gives way */
    const other = (e: Event) => { if (el && e.target instanceof Element && sounding(e.target, el)) el.pause(); };
    document.addEventListener("play", other, true);
    return () => { document.removeEventListener("play", other, true); el?.pause(); };
  }, []);

  const play = (fromStart: boolean) => {
    const el = audio.current;
    if (!el) return;
    if ([...document.querySelectorAll("video, audio")].some((m) => inTheWay(m, el))) { setWaits(true); return; }
    setWaits(false);
    /* after a failure the player has to be told to fetch again */
    if (el.error) el.load();
    if (fromStart) { el.currentTime = 0; setAt(0); }
    setState((s) => (s === "playing" ? s : "loading"));
    /* A press on Pause before the audio arrives ends the wait with an "aborted" answer: that is not a failure. */
    el.play().catch((err: unknown) => { if (!(err instanceof DOMException && err.name === "AbortError")) setState("failed"); });
  };
  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (state === "playing" || state === "loading") el.pause();
    else play(state === "ended");
  };

  const started = state === "playing" || state === "paused" || (state === "loading" && at > 0);
  const label = state === "playing" ? v.pause : state === "loading" ? v.loading : state === "paused" ? v.goOn : state === "ended" ? v.again : v.listen;
  const total = v.clock(seconds);

  return (
    <div className={css.listen} role="group" aria-label={v.about(what)}>
      <audio
        ref={audio} src={src} preload="none" lang={lang} data-listen=""
        onPlaying={() => setState("playing")}
        onWaiting={() => setState((s) => (s === "playing" ? "loading" : s))}
        onPause={(e) => { const el = e.currentTarget; if (!el.ended) setState(el.currentTime > 0 ? "paused" : "idle"); }}
        onEnded={() => { setState("ended"); setAt(0); }}
        onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
        onError={() => setState("failed")}
      />
      <button type="button" className="btn btn-sm" onClick={toggle} aria-busy={state === "loading" || undefined}>
        <svg className={css.icon} viewBox="0 0 16 16" aria-hidden="true">
          {state === "playing" || state === "loading"
            ? <path d="M4 3h3v10H4zM9 3h3v10H9z" />
            : <path d="M2 6h2.5L8 3v10L4.5 10H2zM10.2 5.2a4 4 0 0 1 0 5.6l-.9-.9a2.7 2.7 0 0 0 0-3.8zM12.1 3.3a6.6 6.6 0 0 1 0 9.4l-.9-.9a5.3 5.3 0 0 0 0-7.6z" />}
        </svg>
        <span>{label}</span>
        {!started && state !== "loading" && <span className={`${css.len} tnum`}>{v.length(seconds)}</span>}
      </button>
      {started && (
        <>
          <button type="button" className="btn btn-sm btn-gh" onClick={() => play(true)}>{v.restart}</button>
          <span className={`${css.time} tnum`}>{v.progress(v.clock(at), total)}</span>
        </>
      )}
      {langName && <span className={`${css.note} muted`}>{v.inLanguage(langName)}</span>}
      <span className={css.says} role="status">
        {state === "failed" ? v.failed : waits ? v.busy : ""}
      </span>
    </div>
  );
}
