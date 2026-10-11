// Eyes Opener: Sunset Rule: the sky, and what the family reads when the day's practice is done.
/**
 * Sunset Rule: the sky, and what the family reads when the day's practice is done.
 * No hooks beyond `useId` and no browser APIs, so the same components serve the Today page (on the server) and the
 * end of a session (in the browser). The drawing is made here, by code.
 */
import Link from "next/link";
import { useId } from "react";
import { sunset as t } from "@/copy/sunset";
import { train } from "@/copy/train";
import type { SunsetView } from "@/lib/sunset-data";
import { OUTDOOR_LOG, SKY_HUNT } from "@/lib/sunset-names";
import css from "./rewards.module.css";

/**
 * The sky over far hills. `height` is how high the sun stands: 1 at the top of its path, 0 on the horizon.
 * At 0 the sky is the evening's and the sun sinks behind the hills once.
 */
export function SunsetSky({ height, label }: { height: number; label: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = Math.max(0, Math.min(1, height)), set = h <= 0;
  const horizon = 112, sunY = set ? horizon + 4 : horizon - 22 - h * 62;
  return (
    <svg viewBox="0 0 400 150" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          {set
            ? <><stop offset="0" stopColor="#2a1760" /><stop offset=".5" stopColor="#8b31f0" /><stop offset=".78" stopColor="#c4569c" /><stop offset="1" stopColor="#f4aa2d" /></>
            : <><stop offset="0" stopColor="#9db9f5" /><stop offset=".7" stopColor="#dfe6fb" /><stop offset="1" stopColor="#fdf2df" /></>}
        </linearGradient>
        <clipPath id={`land${id}`}><rect x="0" y="0" width="400" height={horizon} /></clipPath>
      </defs>
      <rect width="400" height="150" fill={`url(#sky${id})`} />
      {set && [[44, 20, 1.4], [118, 34, 1.1], [286, 16, 1.5], [352, 40, 1.1], [200, 12, 1]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="#fff" opacity=".7" />)}
      <g clipPath={`url(#land${id})`}>
        <g className={set ? css.sink : undefined}>
          <circle cx="200" cy={sunY} r="40" fill="#ffd98a" opacity=".28" />
          <circle cx="200" cy={sunY} r="25" fill={set ? "#ffe2a6" : "#f4aa2d"} />
        </g>
      </g>
      <path d={`M0 ${horizon}Q70 ${horizon - 26} 150 ${horizon}T300 ${horizon - 6}Q350 ${horizon - 22} 400 ${horizon}V150H0Z`} fill={set ? "#3a2378" : "#7d6cc0"} />
      <path d={`M0 ${horizon + 14}Q90 ${horizon - 6} 190 ${horizon + 12}T400 ${horizon + 8}V150H0Z`} fill={set ? "#1d1140" : "#5a4a9c"} />
    </svg>
  );
}

/** The words of the sunset: there is no more to earn today, and the invitation outside when it can still be light. */
export function SunsetWords({ view }: { view: SunsetView }) {
  const s = view.sunset;
  if (s.state !== "set") return null;
  return (
    <div className="stack">
      <p>{s.cap ? t.set.cap : t.set.done}</p>
      <p><b>{t.set.noMore}</b> {t.set.league}</p>
      <p className="notice" data-b={s.outside === "tomorrow" ? undefined : "ok"}>
        {s.outside === "go" ? t.outside.go(s.lightLeft) : s.outside === "full" ? t.outside.full : t.outside.tomorrow}
      </p>
      {s.outside === "go" && (view.links.hunt || view.links.log) && (
        <div className="row">
          {view.links.hunt && <Link className="btn btn-g" href={`/train/games/${SKY_HUNT}/play`}>{t.outside.hunt}</Link>}
          {view.links.log && <Link className="btn" href={`/train/exercises/${OUTDOOR_LOG}`}>{t.outside.log}</Link>}
        </div>
      )}
      <p className="muted small">{t.set.tomorrow}</p>
    </div>
  );
}

/**
 * What the family sees when the day's minutes are done: the sunset and its words. On a day a session was stopped
 * for feeling unwell and the minutes are also used, the stop rule's own words are shown and no sunset.
 * Nothing at all in every other case.
 */
export function SunsetPanel({ view }: { view: SunsetView }) {
  const s = view.sunset;
  if (s.state === "rest" && s.dayDone) return <p className="notice" data-b="warn"><b>{train.ended.stop_rule}</b> {train.stop.rest}</p>;
  if (s.state !== "set") return null;
  return (
    <section className={`c ${css.sunset}`}>
      <div className={css.sky}><SunsetSky height={0} label={t.alt.set} /></div>
      <div className="stack">
        <h2>{t.set.title}</h2>
        <SunsetWords view={view} />
      </div>
    </section>
  );
}
