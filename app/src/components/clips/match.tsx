"use client";
/**
 * Match two patches: the three colour checks of the screen, played by the same match and the same pictures as the
 * screen colours page (src/app/(app)/settings/screen). Each value comes from two matches made from opposite sides.
 * The browser keeps only what was matched; the value is worked out and saved on the server by the same rules.
 */
import { useState } from "react";
import { GREY_OVER, GREY_START, INK_OVER, INK_STEP, LEVEL_OVER, Lenses, pair, squares, stripes } from "@/app/(app)/settings/screen/flow";
import { Match } from "@/app/(app)/settings/screen/match";
import { clips as c } from "@/copy/clips";
import { screen as t } from "@/copy/screen";
import { CAL, type LensMatch } from "@/engine";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

type Lens = "red" | "cyan";
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.max(lo, Math.min(hi, v));
const Todo = ({ lines }: { lines: string[] }) => <ol className={css.list}>{lines.map((l) => <li key={l}>{l}</li>)}</ol>;
const Nth = ({ n }: { n: number }) => <p className="muted small tnum">{t.match.nth(n + 1)}</p>;

/** One lens of the colour leak: two matches, or "I cannot see the left square at all". */
function LensMatches({ lens, onDone }: { lens: Lens; onDone: (match: LensMatch) => void }) {
  const [levels, setLevels] = useState<number[]>([]);
  const n = levels.length, words = t.leak.lens[lens];
  return (
    <>
      <div className={css.cal}>
        <div style={{ flex: "0 0 96px" }}><Lenses look={lens} label={words.picture} /></div>
        <div><b>{words.head}</b>{n === 0 ? <span className="muted small">{t.leak.who}</span> : <span>{t.leak.second}</span>}</div>
      </div>
      {n === 0 && <Todo lines={words.todo} />}
      <Nth n={n} />
      <Match
        key={`${lens}${n}`} draw={squares(lens)} label={words.scene} dark min={CAL.level[0]} max={CAL.level[1]} step={1} left={1}
        start={n === 0 ? 0 : levels[0] + LEVEL_OVER}
        onDone={(level) => (n === 0 ? setLevels([level]) : onDone([levels[0], level]))}
      >
        <button type="button" className="btn btn-sm" onClick={() => onDone("unseen")}>{t.leak.unseen}</button>
      </Match>
    </>
  );
}

export function MatchTask({ def, ctx, onDone }: TaskProps) {
  const kind = def.play.template === "match" ? def.play.kind : "gamma";
  const gamma = ctx.screen?.gamma ?? 2.2;
  const [greys, setGreys] = useState<number[]>([]);
  const [red, setRed] = useState<LensMatch | null>(null);
  const [xs, setXs] = useState<number[]>([]);
  const [turned, setTurned] = useState<boolean | null>(null);

  if (kind === "gamma") {
    const n = greys.length;
    return (
      <>
        {n === 0 ? <><p>{t.gamma.why}</p><Todo lines={t.gamma.todo} /></> : <p>{t.gamma.second}</p>}
        <Nth n={n} />
        <Match
          key={n} draw={stripes} label={t.gamma.scene} sharp min={CAL.grey[0]} max={CAL.grey[1]} step={1} left={1}
          start={n === 0 ? GREY_START : greys[0] + GREY_OVER}
          onDone={(grey) => (n === 0 ? setGreys([grey]) : onDone({ greys: [greys[0], grey] }))}
        />
      </>
    );
  }

  if (kind === "leak_red" || kind === "leak_cyan") {
    return <><p>{t.leak.why}</p><LensMatches lens={kind === "leak_red" ? "red" : "cyan"} onDone={(match) => onDone({ match })} /></>;
  }

  if (kind === "leak_both") {
    return red === null
      ? <><p>{t.leak.why}</p><LensMatches key="red" lens="red" onDone={setRed} /></>
      : <LensMatches key="cyan" lens="cyan" onDone={(cyan) => onDone({ red, cyan })} />;
  }

  /* ink balance */
  const n = xs.length;
  if (n === 1 && turned === null) {
    return (
      <>
        <div className={css.cal}>
          <div style={{ flex: "0 0 96px" }}><Lenses look="both" turned label={t.ink.picture.turned} /></div>
          <div><b>{t.ink.turn.title}</b><span>{t.ink.turn.body}</span></div>
        </div>
        <div className={css.acts}>
          <button type="button" className="btn btn-g" autoFocus onClick={() => setTurned(true)}>{t.ink.turn.turned}</button>
          <button type="button" className="btn" onClick={() => setTurned(false)}>{t.ink.turn.cannot}</button>
        </div>
      </>
    );
  }
  return (
    <>
      {n === 0 ? <><p>{t.ink.why}</p><p className="notice">{c.match.who}</p><Todo lines={t.ink.todo} /></> : <p>{turned ? t.ink.second.turned : t.ink.second.same}</p>}
      <Nth n={n} />
      <Match
        key={n} draw={pair(gamma)} label={t.ink.scene} dark min={CAL.inkSet[0]} max={CAL.inkSet[1]} step={INK_STEP} left={-1}
        start={n === 0 ? 0 : clamp(xs[0] + INK_OVER, CAL.inkSet)}
        onDone={(x) => (n === 0 ? setXs([x]) : onDone({ xs: [xs[0], x], turned: !!turned }))}
      />
    </>
  );
}
