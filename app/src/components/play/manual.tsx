import { Card, Chip, Empty, EvidenceChip } from "@/components/ui";
import { Listen } from "@/components/voice/listen";
import { train as t } from "@/copy/train";
import { voice } from "@/copy/voice";
import { exerciseBySlug, gameBySlug, gameLevel, mechanismOf } from "@/data";
import { gameGuideFor } from "@/data/game-guides";
import { staffNotesFor } from "@/data/game-guides/staff-notes";
import { guideFor } from "@/data/guides";
import { exerciseStaffNotesFor } from "@/data/guides/staff-notes";
import { supervisionFor } from "@/data/supervision";
import { exerciseLevel, recommendedStatus, type Status } from "@/lib/status";
import { gameScriptId, type GamePart } from "@/voice/scripts";
import { Cues } from "./cue";
import css from "./guide.module.css";
import { SupervisionNote } from "./supervision";
import { evidenceWords, exerciseWords, gameWords } from "@/data/words";

const x = t.game.guide, e = t.exercise, m = t.manual;

const Lines = ({ items, numbered = false }: { items: readonly string[]; numbered?: boolean }) =>
  numbered ? <ol className={css.steps}>{items.map((line) => <li key={line}>{line}</li>)}</ol> : <ul className={css.list}>{items.map((line) => <li key={line}>{line}</li>)}</ul>;

const Sources = ({ sources }: { sources: readonly { label: string; url: string }[] }) => sources.length > 0 && (
  <>
    <p className="small muted">{x.sources}</p>
    <ol className={css.sources}>{sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noreferrer noopener">{src.label}</a></li>)}</ol>
  </>
);

/** What only staff read: why the item is in the library, who it is recommended for, and what it cannot tell. */
function ForStaff({ mechanism, level, recommended, status, notes, catalogue }: { mechanism: string; level: number; recommended: Status; status?: Status; notes: readonly string[]; catalogue: { label: string; value: string }[] }) {
  const mech = mechanismOf(mechanism);
  return (
    <Card title={m.staff.title} tone="dark">
      <dl className="kv">
        <div><dt>{m.staff.method}</dt><dd>{mech.label}. {mech.basis}</dd></div>
        <div><dt>{m.staff.label}</dt><dd>{evidenceWords(mech.evidence).label}: {evidenceWords(mech.evidence).meaning}</dd></div>
        <div><dt>{m.staff.level}</dt><dd>{m.staff.levels[level as 0 | 1 | 2]}</dd></div>
        <div><dt>{m.staff.recommended}</dt><dd>{e.statusFor[recommended]}{status && status !== recommended ? ` · ${m.staff.now(e.statusFor[status])}` : ""}</dd></div>
        {catalogue.map((c) => <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}
      </dl>
      <p className="small"><b>{m.staff.limits}</b></p>
      {notes.length ? <Lines items={notes} /> : <p className="small">{m.staff.noLimits}</p>}
    </Card>
  );
}

/**
 * The manual of one game: what it is, what it is for, what the member should see, how to play, when to press,
 * what counts as success, what is measured, when to stop, what supervision adds and where it all comes from.
 * With `staff`, it adds what staff need to explain the game: the method, its evidence, and what the game cannot tell.
 */
export function GameManual({ slug, staff = false, status, locale }: { slug: string; staff?: boolean; status?: Status; /** The household's language, for the Listen buttons. */ locale?: string | null }) {
  const g = gameBySlug(slug)!, guide = gameGuideFor(slug);
  const mech = mechanismOf(g.mechanism), level = gameLevel(g), w = gameWords(g);
  const sup = supervisionFor(g.mechanism, level);
  const k = t.game.kv;
  /* The spoken version of a card. It draws nothing where no audio exists. */
  const say = (part: GamePart) => <Listen id={gameScriptId(slug, part)} what={part === "play" ? voice.parts.steps : voice.parts[part]} locale={locale} />;
  return (
    <div className="bento">
      <Card title={x.what} span={7} right={say("what")}>
        <p>{guide?.what ?? w.play}</p>
        <dl className="kv">
          <div><dt>{k.for}</dt><dd>{w.who}</dd></div>
          <div><dt>{k.playsOn}</dt><dd>{w.playsOn}</dd></div>
          <div><dt>{k.gear}</dt><dd>{w.gear}</dd></div>
          <div><dt>{k.session}</dt><dd>{w.session}</dd></div>
        </dl>
      </Card>
      <Card title={x.helps} span={5} right={<EvidenceChip level={mech.evidence} />}>
        <p>{guide?.helps ?? w.purpose}</p>
      </Card>
      {!guide && <Card><Empty title={x.notWritten} /></Card>}
      {guide && (
        <>
          <Card title={x.ready} span={5}><p className="small muted">{x.need}</p><Lines items={guide.need} /></Card>
          <Card title={x.see} span={7} right={say("see")}><Lines items={guide.see} /></Card>
          <Card title={x.play} span={7} right={say("play")}>
            <Lines items={guide.play} numbered />
            <p className="small muted">{x.controls}</p>
            <ul className={css.list}><li><b>{x.touch}.</b> {guide.controls.touch}</li><li><b>{x.keys}.</b> {guide.controls.keys}</li></ul>
          </Card>
          <Card title={x.success} span={5}>
            <Lines items={guide.success} />
            <p className="small muted">{x.mistakes}</p>
            <Lines items={guide.mistakes} />
          </Card>
          {guide.cues.length > 0 && <Card title={x.cues} right={say("cues")}><Cues cues={guide.cues} tones={x.tone} /></Card>}
          {guide.measures.length > 0 && (
            <Card title={x.measure} span={7}>
              <div>
                {guide.measures.map((q) => (
                  <div key={q.key} className={css.measure}>
                    <b>{q.label}{q.unit ? `, ${q.unit}` : ""}</b>
                    <span>{q.how} <span className="muted">{x.better[q.better]}</span></span>
                  </div>
                ))}
              </div>
              <p className="small muted">{x.noNorm}</p>
            </Card>
          )}
          <Card title={x.stop} span={guide.measures.length > 0 ? 5 : 12} right={say("stop")}>
            <Lines items={guide.stop} />
            <p className="small muted">{x.stopNote}</p>
          </Card>
        </>
      )}
      {sup && <Card title={t.supervision.title} right={level >= 2 ? <Chip>{e.counsellorLed}</Chip> : undefined}><SupervisionNote s={sup} /></Card>}
      <Card title={t.game.evidence} right={<EvidenceChip level={mech.evidence} />}>
        <p><b>{mech.label}.</b> {mech.basis}</p>
        {guide && <p>{guide.evidence}</p>}
        <p className="muted small">{evidenceWords(mech.evidence).meaning}</p>
        {guide && <Sources sources={guide.sources} />}
      </Card>
      {staff && (
        <ForStaff
          mechanism={g.mechanism} level={level} recommended={recommendedStatus("game", slug)} status={status} notes={staffNotesFor(slug)}
          catalogue={[{ label: m.staff.catPlay, value: g.play }, { label: m.staff.catPurpose, value: g.purpose }, { label: m.staff.catFor, value: g.for }, { label: m.staff.tags, value: g.tags.join(", ") }]}
        />
      )}
    </div>
  );
}

/** The manual of one exercise, without its tool. With `staff`, it adds the method, its evidence and what the routine's tool cannot tell. */
export function ExerciseManual({ slug, staff = false, status }: { slug: string; staff?: boolean; status?: Status }) {
  const ex = exerciseBySlug(slug)!, g = guideFor(slug);
  const mech = mechanismOf(ex.mechanism), level = exerciseLevel(ex), w = exerciseWords(ex);
  const sup = supervisionFor(ex.mechanism, level);
  const k = e.kv;
  return (
    <div className="bento">
      <Card title={e.what} span={7}>
        <p>{g?.what ?? w.how}</p>
        <dl className="kv">
          <div><dt>{k.purpose}</dt><dd>{w.purpose}</dd></div>
          <div><dt>{k.for}</dt><dd>{w.who}</dd></div>
          <div><dt>{k.gear}</dt><dd>{w.gear}</dd></div>
          <div><dt>{k.dose}</dt><dd>{w.dose}</dd></div>
          {g && <div><dt>{m.tool}</dt><dd>{e.tool[g.tool.kind]}</dd></div>}
        </dl>
      </Card>
      {!g && <Card span={5}><Empty title={e.notWritten} /></Card>}
      {g && (
        <>
          <Card title={e.ready} span={5}>
            <p className="small muted">{e.need}</p><Lines items={g.need} />
            <p className="small muted">{e.setup}</p><Lines items={g.setup} numbered />
          </Card>
          <Card title={e.steps} span={7}><Lines items={g.steps} numbered /></Card>
          <Card title={e.right} span={5}>
            <Lines items={g.right} />
            <p className="small muted">{e.mistakes}</p>
            <Lines items={g.mistakes} />
          </Card>
          {g.measures.length > 0 && (
            <Card title={e.measure} span={7}>
              <div>
                {g.measures.map((q) => (
                  <div key={q.key} className={css.measure}>
                    <b>{q.label}{q.unit ? `, ${q.unit}` : ""}</b>
                    <span>{q.how}</span>
                    <span className="muted small">{e.measuredBy[q.from]}</span>
                    <span className="small"><b>{e.usual}.</b> {q.usual ? q.usual.text : e.noUsual}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card title={e.stop} span={g.measures.length > 0 ? 5 : 12}><Lines items={g.stop} /><p className="small muted">{e.stopNote}</p></Card>
        </>
      )}
      {sup && <Card title={t.supervision.title} right={level >= 2 ? <Chip>{e.counsellorLed}</Chip> : undefined}><SupervisionNote s={sup} /></Card>}
      <Card title={e.evidence} right={<EvidenceChip level={mech.evidence} />}>
        <p><b>{mech.label}.</b> {mech.basis}</p>
        {g && <p>{g.evidence}</p>}
        <p className="muted small">{evidenceWords(mech.evidence).meaning}</p>
        {g && <Sources sources={g.sources} />}
      </Card>
      {staff && (
        <ForStaff
          mechanism={ex.mechanism} level={level} recommended={recommendedStatus("exercise", slug)} status={status} notes={exerciseStaffNotesFor(slug)}
          catalogue={[{ label: m.staff.catPlay, value: ex.how }, { label: m.staff.catFor, value: ex.for }, { label: m.staff.group, value: ex.group }]}
        />
      )}
    </div>
  );
}
