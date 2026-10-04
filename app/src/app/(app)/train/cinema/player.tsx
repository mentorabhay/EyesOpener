"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { LensView } from "@/components/play/lens";
import { canBegin, Clock, mmss, SessionNote, StopButton } from "@/components/play/session-ui";
import { useTrainSession } from "@/components/play/use-session";
import { train as t } from "@/copy/train";
import { videoMatrix } from "@/engine";
import type { TrainDose } from "@/lib/sessions";
import css from "./cinema.module.css";
import { reelSrc } from "./reel";

const c = t.cinema;

/** Plays a film from the member's own device as a two-eye picture. The file is read in the browser and never sent anywhere. */
export function Player({ itemSlug, contrast, dose }: { itemSlug: string; contrast: number; dose: TrainDose }) {
  const s = useTrainSession("film", itemSlug);
  const { phase, begin, end, setTicking } = s;
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => () => { if (src?.startsWith("blob:")) URL.revokeObjectURL(src); }, [src]);
  /* The film runs only inside a session: it stops when the server refuses one or the allowed minutes are used. */
  useEffect(() => { if (phase !== "starting" && phase !== "active") video.current?.pause(); }, [phase]);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void end("left");
    setSrc(URL.createObjectURL(file));
  };
  /* IOpener's own drawn film, for trying the cinema with no video at hand. */
  const reel = () => {
    void end("left");
    setSrc(reelSrc());
  };
  const onPlay = () => {
    if (phase === "active") setTicking(true);
    else if (canBegin(s, dose)) void begin().then((ok) => { if (ok && video.current?.paused) setTicking(false); });
    else if (phase !== "starting") video.current?.pause();
  };

  return (
    <LensView right={phase === "active" && <Clock s={s} />}>
      {dose.reason !== "guardian_only" && (
        <div className="field">
          <label htmlFor="film">{c.choose}</label>
          <input id="film" type="file" accept="video/*" onChange={pick} />
          <div className="row"><span className="muted small">{c.noFilm}</span><button type="button" className="btn btn-sm" onClick={reel}>{c.reel}</button></div>
        </div>
      )}
      <div className="scene ratio">
        {src
          ? <video ref={video} className={css.film} src={src} controls playsInline aria-label={c.film} onPlay={onPlay} onPause={() => setTicking(false)} onEnded={() => void end("done")} />
          : <p className={css.none}>{c.none}</p>}
      </div>
      {/* The matrix works in real light (linearRGB), as the engine's contrast values do. */}
      <svg className={css.defs} aria-hidden="true">
        <filter id="two-eye" colorInterpolationFilters="linearRGB"><feColorMatrix type="matrix" values={videoMatrix(contrast).join(" ")} /></filter>
      </svg>
      <div className="row">
        <span className="small"><b className="tnum">{mmss(s.seconds)}</b> <span className="muted">{c.watched}</span></span>
        <span className="sp" />
        {phase === "active" && <><StopButton s={s} /><button type="button" className="btn" onClick={() => void end("left")}>{t.finish}</button></>}
      </div>
      <SessionNote s={s} dose={dose} />
    </LensView>
  );
}
