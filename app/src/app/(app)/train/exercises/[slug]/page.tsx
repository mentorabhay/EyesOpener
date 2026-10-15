import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StepFlow } from "@/components/guide/flow";
import { Facts, Fold, More } from "@/components/guide/more";
import { exerciseSteps } from "@/components/guide/steps";
import { History, type Labels } from "@/components/play/results";
import { DoseLine } from "@/components/play/session-ui";
import { Stage } from "@/components/play/stage";
import { Btn, Card, Chip, Empty, EvidenceChip, PageHead } from "@/components/ui";
import { Listen } from "@/components/voice/listen";
import { guide as gw } from "@/copy/guide";
import { train as t } from "@/copy/train";
import { voice } from "@/copy/voice";
import { exerciseBySlug, mechanismOf } from "@/data";
import { guideFor, type Guide } from "@/data/guides";
import { drillHelp, hasDrill } from "@/drills";
import { GridTool } from "@/drills/tools/grid";
import { ReadingTool } from "@/drills/tools/reading";
import { kindOf } from "@/games/built";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupGate } from "@/components/setup/setup";
import { SupervisionNote } from "@/components/play/supervision";
import { supervisionFor } from "@/data/supervision";
import { doseFor, isCareRoutine, pastSessions, statusFor } from "@/lib/sessions";
import { exerciseLevel, isListed } from "@/lib/status";
import { exerciseScriptId, type ExercisePart } from "@/voice/scripts";
import css from "@/components/play/guide.module.css";
import { Routine, type Hand } from "./routine";
import { evidenceWords, exerciseWords } from "@/data/words";

type Props = { params: Promise<{ slug: string }> };
const x = t.exercise;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: exerciseBySlug((await params).slug)?.name };
}

const labelsOf = (g: Guide | undefined): Labels => Object.fromEntries((g?.measures ?? []).map((m) => [m.key, { label: m.label, unit: m.unit }]));

export default async function ExercisePage({ params }: Props) {
  const { slug } = await params;
  const e = exerciseBySlug(slug);
  if (!e) notFound();
  const m = await requireMember();
  const status = await statusFor("exercise", slug);
  if (!isListed(status, m.tester)) notFound();
  const [dose, past] = await Promise.all([doseFor(m, "exercise", slug), pastSessions(m, "exercise", slug)]);
  const g = guideFor(slug);
  const mech = mechanismOf(e.mechanism);
  /* the catalogue's lines in the reader's language (src/data/words.ts) */
  const w = exerciseWords(e);
  const sup = supervisionFor(e.mechanism, exerciseLevel(e));
  const k = x.kv;
  const labels = labelsOf(g);
  const lower = (g?.measures ?? []).filter((q) => q.better === "lower").map((q) => q.key);
  /* A companion that is not in this edition falls back to the stopwatch. */
  const tool = g?.tool.kind === "companion" && !kindOf(g.tool.game) ? ({ kind: "timer" } as const) : (g?.tool ?? ({ kind: "timer" } as const));
  const ppc = m.device?.pxPerCm ?? 0;
  /* an on-screen drill seen through the red-cyan glasses waits until this person's setup is done */
  const setup = tool.kind === "drill" && /red-cyan/i.test(e.gear) ? await setupOf(m) : null;
  const eye = {
    contrast: m.eye?.strongContrast ?? 1, gamma: m.device?.gamma ?? 2.2,
    targetPx: (m.eye?.targetCm ?? 0) * ppc, letterPx: (m.eye?.letterCm ?? 0) * ppc, ppc,
    distCm: m.device?.distanceCm ?? 0, cyanEye: m.eye?.cyanEye === "right" ? ("R" as const) : ("L" as const), weakInk: m.eye?.weakInk === "red" ? ("red" as const) : ("cyan" as const),
  };
  /* The spoken version of a card. It draws nothing where no audio exists. */
  const say = (part: ExercisePart) => <Listen id={exerciseScriptId(slug, part)} what={voice.parts[part]} locale={m.account.locale} />;

  const wide = tool.kind === "drill" || tool.kind === "reading" || tool.kind === "grid";

  return (
    <>
      <PageHead title={e.name} crumb={[{ href: "/train/exercises", label: x.crumb }]} />
      {(status !== "open" || m.tester) && <div className="row"><Chip tone={status === "open" ? "ok" : status === "counsellor" ? "plain" : "warn"}>{x.statusFor[status]}</Chip></div>}
      <StepFlow steps={exerciseSteps(g, e.gear, eye.cyanEye)} />
      <div className="bento">
        <Card title={x.doNow} span={wide ? 12 : 7} right={g?.print && <Btn href={`/train/exercises/${slug}/print`} small>{x.print}</Btn>}>
          {tool.kind === "drill" ? (
            hasDrill(slug)
              ? (setup?.held ? <SetupGate s={setup} name={m.profile.displayName} />
                : <Stage kind="exercise" slug={slug} dose={dose} help={drillHelp[slug]} labels={labels} lens={/red-cyan/i.test(e.gear)} {...eye} />)
              : <Empty title={t.game.notBuilt.title} />
          ) : tool.kind === "reading" ? <ReadingTool slug={slug} dose={dose} labels={labels} ppc={ppc} />
            : tool.kind === "grid" ? <GridTool slug={slug} dose={dose} labels={labels} ppc={ppc} />
              : tool.kind === "cinema" ? <div className="row"><Btn href="/train/cinema" kind="g">{x.openCinema}</Btn><DoseLine dose={dose} enrolled={!!m.enrolment} /></div>
                : tool.kind === "companion" ? <div className="row"><Btn href={`/train/games/${tool.game}/play`} kind="g">{x.openCompanion}</Btn></div>
                  : <Routine slug={slug} dose={dose} tool={tool as Hand} measures={g?.measures ?? []} labels={labels} care={isCareRoutine("exercise", slug)} />}
        </Card>
        {tool.kind !== "cinema" && tool.kind !== "companion" && (
          <Card title={x.results} span={wide ? 12 : 5}>
            <History rows={past} labels={labels} lower={lower} />
          </Card>
        )}
      </div>

      <More title={gw.moreAbout(e.name)} hint={w.purpose}>
        <Facts items={[{ label: k.for, value: w.who }, { label: k.gear, value: w.gear }, { label: k.dose, value: w.dose }]} />
        <Fold title={x.what} right={say("what")}>
          <p>{g?.what ?? w.how}</p>
          <p className="muted small">{x.toolNote[tool.kind]}{isCareRoutine("exercise", slug) && tool.kind !== "companion" ? ` ${x.careNote}` : ""}</p>
        </Fold>
        {g ? (
          <>
            <Fold title={x.ready} right={say("setup")}>
              <p className="small muted">{x.need}</p>
              <ul className={css.list}>{g.need.map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="small muted">{x.setup}</p>
              <ol className={css.steps}>{g.setup.map((line) => <li key={line}>{line}</li>)}</ol>
            </Fold>
            <Fold title={x.steps} right={say("steps")}>
              <ol className={css.steps}>{g.steps.map((line) => <li key={line}>{line}</li>)}</ol>
            </Fold>
            <Fold title={x.right} right={say("right")}>
              <ul className={css.list}>{g.right.map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="small muted">{x.mistakes}</p>
              <ul className={css.list}>{g.mistakes.map((line) => <li key={line}>{line}</li>)}</ul>
            </Fold>
            {g.measures.length > 0 && (
              <Fold title={x.measure}>
                <div>
                  {g.measures.map((q) => (
                    <div key={q.key} className={css.measure}>
                      <b>{q.label}{q.unit ? `, ${q.unit}` : ""}</b>
                      <span>{q.how}</span>
                      <span className="muted small">{x.measuredBy[q.from]}</span>
                      <span className="small"><b>{x.usual}.</b> {q.usual ? q.usual.text : x.noUsual}</span>
                    </div>
                  ))}
                </div>
              </Fold>
            )}
            <Fold title={x.stop} right={say("stop")} warn>
              <ul className={css.list}>{g.stop.map((line) => <li key={line}>{line}</li>)}</ul>
              <p className="small muted">{x.stopNote}</p>
            </Fold>
          </>
        ) : <Empty title={x.notWritten} />}
        {sup && <Fold title={t.supervision.title}><SupervisionNote s={sup} /></Fold>}
        <Fold title={x.evidence} right={<EvidenceChip level={mech.evidence} />}>
          <p><b>{mech.label}.</b> {mech.basis}</p>
          {g && <p>{g.evidence}</p>}
          <p className="muted small">{evidenceWords(mech.evidence).meaning}</p>
          {g && g.sources.length > 0 && (
            <>
              <p className="small muted">{x.sources}</p>
              <ol className={css.sources}>{g.sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noreferrer noopener">{src.label}</a></li>)}</ol>
            </>
          )}
        </Fold>
      </More>
    </>
  );
}
