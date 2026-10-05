"use client";
import type { KeyboardEvent, ReactNode } from "react";
import { cinema as c } from "@/copy/cinema";
import { lensFilter } from "@/engine";
import { clock } from "./chapters";
import css from "./film.module.css";
import type { FilmApi, FullScreen } from "./use-film";

const p = c.player;

const Icon = ({ d, fill = false }: { d: string; fill?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const PlayIcon = () => <Icon fill d="M8 5.5v13l11-6.5z" />;
export const PauseIcon = () => <Icon fill d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />;
const SoundIcon = ({ off }: { off: boolean }) => <Icon d={off ? "M4 9.5v5h3.5L12 18V6L7.5 9.5zM16 9.5l5 5M21 9.5l-5 5" : "M4 9.5v5h3.5L12 18V6L7.5 9.5zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"} />;
const FullIcon = ({ on }: { on: boolean }) => <Icon d={on ? "M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5" : "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"} />;

/**
 * Which way round the red-cyan glasses go, drawn as a mirror: the wearer's left eye is on the left.
 * `cyan` null means the eye settings do not say yet; the picture is then left out.
 */
export function Glasses({ cyan }: { cyan: "L" | "R" | null }) {
  if (!cyan) return null;
  return (
    <svg className={css.glasses} viewBox="0 0 84 46" role="img" aria-label={c.glasses.picture(cyan)}>
      <rect width="84" height="46" rx="8" fill="#000" stroke="#fff" strokeOpacity=".35" />
      <circle cx="26" cy="23" r="14" fill={lensFilter(cyan === "L" ? "weak" : "strong")} />
      <circle cx="58" cy="23" r="14" fill={lensFilter(cyan === "L" ? "strong" : "weak")} />
      <path d="M40 23h4" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

/** One short line saying which eye the cyan lens goes over. */
export const lensLine = (cyan: "L" | "R" | null) => (cyan ? c.glasses.short(cyan) : c.glasses.shortUnknown);

/**
 * IOpener's own film controls: play and pause, back and forward, the place in the film, sound and full screen.
 * Every control is a real button or slider, so touch, a keyboard and a remote's arrows and OK all work.
 *  - `mayPlay`: Play may be pressed now (a film is ready and training is open).
 *  - `locked`: nothing may be played or moved (no film, or an eye break is running).
 * `children` are drawn at the end of the button row.
 */
export function FilmControls({ film, full, mayPlay, locked, onToggle, children }: {
  film: FilmApi; full: FullScreen; mayPlay: boolean; locked: boolean; onToggle: () => void; children?: ReactNode;
}) {
  const { playing, now, all, volume, muted } = film.state;
  const known = all > 0, tenths = muted ? 0 : Math.round(volume * 10);
  /* The slider moves in steps of 10 seconds from the keys, the same as the picture does. */
  const seekKeys = (e: KeyboardEvent<HTMLInputElement>) => {
    const by = e.key === "ArrowLeft" ? -10 : e.key === "ArrowRight" ? 10 : e.key === "PageDown" ? -60 : e.key === "PageUp" ? 60 : 0;
    if (!by) return;
    e.preventDefault();
    film.nudge(by);
  };
  return (
    <div className={css.bar} role="group" aria-label={p.controls}>
      <div className={css.seek}>
        <span className="tnum" aria-label={p.filmNowLabel}>{clock(now)}</span>
        <input
          type="range" aria-label={p.place} min={0} max={Math.max(1, all)} step={1} value={Math.min(now, Math.max(1, all))}
          aria-valuetext={p.placeText(clock(now), clock(all))} disabled={locked || !known}
          onChange={(e) => film.seek(Number(e.target.value))} onKeyDown={seekKeys}
        />
        <span className="tnum muted" aria-label={p.filmLeftLabel}>{known ? p.filmLeft(clock(all - now)) : ""}</span>
      </div>
      <div className={css.buttons}>
        <button type="button" className={`btn ${!playing && mayPlay && !locked ? "btn-g " : ""}${css.lead}`} onClick={onToggle} disabled={locked || (!playing && !mayPlay)} data-film-play>
          {playing ? <PauseIcon /> : <PlayIcon />}{playing ? p.pause : p.play}
        </button>
        <button type="button" className="btn tnum" onClick={() => film.nudge(-10)} disabled={locked || !known} aria-label={p.back}>- 10 s</button>
        <button type="button" className="btn tnum" onClick={() => film.nudge(10)} disabled={locked || !known} aria-label={p.forward}>+ 10 s</button>
        <span className="sp" style={{ flex: 1 }} />
        <span className={css.sound}>
          <button type="button" className={`btn ${css.icon}`} onClick={film.mute} aria-label={muted ? p.soundOn : p.soundOff} aria-pressed={muted} title={muted ? p.soundOn : p.soundOff}><SoundIcon off={muted} /></button>
          <button type="button" className={`btn ${css.icon}`} onClick={() => film.louder(-1)} aria-label={p.quieter} title={p.quieter} disabled={tenths === 0}>-</button>
          <span className={css.level} role="img" aria-label={p.level(tenths)}>
            {Array.from({ length: 10 }, (_, i) => <i key={i} data-on={i < tenths ? "" : undefined} style={{ height: `${5 + i * 1.3}px` }} />)}
          </span>
          <button type="button" className={`btn ${css.icon}`} onClick={() => film.louder(1)} aria-label={p.louder} title={p.louder} disabled={!muted && tenths === 10}>+</button>
        </span>
        {full.can && (
          <button type="button" className={`btn ${css.icon}`} onClick={full.toggle} aria-label={full.on ? p.leaveFull : p.full} aria-pressed={full.on} title={full.on ? p.leaveFull : p.full}><FullIcon on={full.on} /></button>
        )}
        {children}
      </div>
    </div>
  );
}
