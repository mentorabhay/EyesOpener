import { train as t } from "@/copy/train";
import type { GameGuide } from "@/data/game-guides";
import { Cues } from "./cue";
import css from "./guide.module.css";
import type { Labels } from "./results";

const x = t.game.guide;

/** The numbers a game keeps, named the way its guide names them. The generic names fill in for anything the guide leaves out. */
export const labelsFor = (g: GameGuide | undefined, fallback: Labels): Labels =>
  g && g.measures.length ? { ...Object.fromEntries(g.measures.map((m) => [m.key, { label: m.label, unit: m.unit }])) } : fallback;

/** Says plainly that a game needs red-cyan glasses, which way round they go, and what to do with none at hand. */
export function GlassesNote({ gear, cyanEye, joined }: { gear: string; cyanEye: "L" | "R"; joined: boolean }) {
  if (!/red-cyan/i.test(gear)) return null;
  const q = x.glasses;
  /* A game a patch can also do: nothing on its screen is red or cyan. */
  if (/patch/i.test(gear)) return <p className="notice" data-b="warn" role="note"><b>{q.patchTitle}</b> {q.patch}</p>;
  return (
    <p className="notice" data-b="warn" role="note">
      <b>{q.title}</b> {q.way(cyanEye)} {joined ? `${q.twoPictures} ${q.practice}` : `${q.bothSeeAll} ${q.check}`}
    </p>
  );
}

/** The short guide shown with the game: when to press, how to play, what success is. */
export function HowToPlay({ g, open = true }: { g: GameGuide; open?: boolean }) {
  return (
    <details className="c span12" open={open}>
      <summary><b>{x.howTitle}</b> <span className="muted small">{x.howToggle}</span></summary>
      <div className="stack" style={{ marginTop: 12 }}>
        {g.cues.length > 0 && (<><p className="small muted">{x.cues}</p><Cues cues={g.cues} tones={x.tone} /></>)}
        <div className="bento">
          <div className="span7 stack">
            <p className="small muted">{x.play}</p>
            <ol className={css.steps}>{g.play.map((line) => <li key={line}>{line}</li>)}</ol>
          </div>
          <div className="span5 stack">
            <p className="small muted">{x.success}</p>
            <ul className={css.list}>{g.success.map((line) => <li key={line}>{line}</li>)}</ul>
            <p className="small muted">{x.controls}</p>
            <ul className={css.list}><li><b>{x.touch}.</b> {g.controls.touch}</li><li><b>{x.keys}.</b> {g.controls.keys}</li></ul>
          </div>
        </div>
      </div>
    </details>
  );
}
