import { Listen } from "@/components/voice/listen";
import { lens } from "@/copy/lens";
import { train as t } from "@/copy/train";
import { voice } from "@/copy/voice";
import type { GameGuide } from "@/data/game-guides";
import { gameScriptId } from "@/voice/scripts";
import { Cues } from "./cue";
import css from "./guide.module.css";
import type { Labels } from "./results";

const x = t.game.guide;

/** The numbers a game keeps, named the way its guide names them. The generic names fill in for anything the guide leaves out. */
export const labelsFor = (g: GameGuide | undefined, fallback: Labels): Labels =>
  g && g.measures.length ? { ...Object.fromEntries(g.measures.map((m) => [m.key, { label: m.label, unit: m.unit }])) } : fallback;

/** Says plainly that a game needs red-cyan glasses, which way round they go, and what to do with none at hand. */
export function GlassesNote({ gear, cyanEye, joined, swapped = false }: { gear: string; cyanEye: "L" | "R"; joined: boolean; /** The weaker eye sees red (engine/profile.ts): the guides are written for the usual way. */ swapped?: boolean }) {
  if (!/red-cyan/i.test(gear)) return null;
  const q = x.glasses;
  /* A game a patch can also do: nothing on its screen is red or cyan. */
  if (/patch/i.test(gear)) return <p className="notice" data-b="warn" role="note"><b>{q.patchTitle}</b> {q.patch}</p>;
  return (
    <p className="notice" data-b="warn" role="note">
      <b>{q.title}</b> {q.way(cyanEye)} {joined ? `${q.twoPictures} ${q.practice}` : `${q.bothSeeAll} ${q.check}`}{swapped && ` ${lens.swappedNote}`}
    </p>
  );
}

/** The short guide shown with the game: when to press, how to play, what success is. `locale` is the household's language, for the Listen buttons. */
export function HowToPlay({ g, open = true, locale }: { g: GameGuide; open?: boolean; locale?: string | null }) {
  return (
    <details className="c span12" open={open}>
      <summary><b>{x.howTitle}</b> <span className="muted small">{x.howToggle}</span></summary>
      <div style={{ marginTop: 12 }}><HowToPlayBody g={g} locale={locale} /></div>
    </details>
  );
}

/** The same guide without its own fold, for a page that folds it inside "Read more" (src/components/guide/more.tsx). */
export function HowToPlayBody({ g, locale }: { g: GameGuide; locale?: string | null }) {
  return (
    <div className="stack">
      {g.cues.length > 0 && (<><div className="row"><p className="small muted">{x.cues}</p><Listen id={gameScriptId(g.slug, "cues")} what={voice.parts.cues} locale={locale} /></div><Cues cues={g.cues} tones={x.tone} /></>)}
      <div className="bento">
        <div className="span7 stack">
          <div className="row"><p className="small muted">{x.play}</p><Listen id={gameScriptId(g.slug, "play")} what={voice.parts.steps} locale={locale} /></div>
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
  );
}
