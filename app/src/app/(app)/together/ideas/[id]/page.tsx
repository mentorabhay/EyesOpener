// Eyes Opener: Page controller component for the app/src/app/(app)/together/ideas/[id] web route.
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import form from "@/app/(app)/settings/form.module.css";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/ui";
import { SignalChart, signed } from "@/components/together/SignalChart";
import { StateForm } from "@/components/together/StateForm";
import { assistCopy } from "@/copy/assist";
import { experiments } from "@/copy/experiments";
import { together } from "@/copy/together";
import { testByKey } from "@/data";
import { assist } from "@/lib/assist/extra";
import { dayText, isTested, mayJoin, protocolById } from "@/lib/community";
import { progressOf } from "@/lib/experiment-data";
import { MIN_FINISHED_PER_GROUP, enough, lean } from "@/lib/experiments";
import { requireMember } from "@/lib/session";
import { joinExperiment } from "./actions";

const t = together.idea;
const g = together.signal;
const x = experiments;
export const generateMetadata = (): Metadata => ({ title: together.title });

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await requireMember();
  const found = await protocolById(id, m.profile.id);
  if (!found) notFound();
  const { protocol: p, story, experiment } = found;
  const test = testByKey(p.moves);
  const testName = test?.name ?? p.moves;
  const inReview = p.status !== "published";
  const mine = experiment?.mine;
  const cannotJoin = inReview ? t.notYet : experiment?.status !== "open" ? t.closed : !m.can("share") ? together.cannot.share : null;
  const consent = cannotJoin || mine ? true : await mayJoin(m);
  /* a number is shown only when both groups are large enough to carry it, whatever the stored row says */
  const signal = experiment?.signal && enough(experiment.signal.nTried, experiment.signal.nControl) ? experiment.signal : null;
  const progress = experiment && !inReview ? await progressOf(experiment.id, p.moves, p.weeks) : null;
  const spread = (sd: number | null) => (sd === null ? "" : `. ${x.pooled.spread}: ${Number(sd.toFixed(2))}`);
  /* Only an edition with an assistant has worked out which published ideas say something similar. */
  const similar = inReview || !assist.available ? [] : await assist.similarToIdea(p.id).catch(() => []);

  return (
    <>
      <PageHead title={p.title} crumb={[together.crumb]} />
      {inReview && <p className="notice">{t.inReview}</p>}
      {!isTested(p.step) && <p className="notice" data-b="warn"><b>{t.untestedTitle}</b> {t.untested}</p>}

      <div className="bento">
        <Card title={t.fields} span={7} right={<Chip tone={isTested(p.step) ? "plain" : "none"}>{together.ladder.steps[p.step].name}</Chip>}>
          <dl className="kv">
            <div><dt>{t.forWhom}</dt><dd>{p.forWhom}</dd></div>
            <div><dt>{t.doWhat}</dt><dd>{p.doWhat}</dd></div>
            <div><dt>{t.howMuch}</dt><dd>{p.howMuch}</dd></div>
            <div><dt>{t.weeks}</dt><dd>{t.weeksValue(p.weeks)}</dd></div>
            <div><dt>{t.moves}</dt><dd>{testName}{test && <small>{test.what}</small>}</dd></div>
          </dl>
        </Card>

        <Card title={t.experiment} span={5} right={experiment && <span className="small muted tnum">{together.list.people(experiment.joined, signal ? signal.nTried + signal.nControl : null)}</span>}>
          <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>{t.steps(testName, p.weeks).map((step) => <li key={step}>{step}</li>)}</ol>
          {mine?.leftAt ? <p className="muted">{x.leave.left(dayText(mine.leftAt))}</p>
            : mine ? (
              <>
                <p className="notice" data-b="ok">{x.join.joinedAs(dayText(mine.joinedAt), x.group[mine.arm].name)}</p>
                <div className="row"><Btn href="/together/experiments" kind="g">{x.join.open}</Btn></div>
              </>
            ) : cannotJoin ? <p className="muted">{cannotJoin}</p>
              : !consent ? <p className="notice" data-b="warn">{x.join.needsConsent(m.profile.displayName)}</p>
                : (
                  <StateForm action={joinExperiment} submit={x.join.submit} primary>
                    <input type="hidden" name="protocolId" value={p.id} />
                    <fieldset className={form.set}>
                      <legend>{x.join.pick}</legend>
                      {(["tried", "control"] as const).map((arm) => (
                        <label key={arm} className={form.check}>
                          <input type="radio" name="arm" value={arm} required />
                          <span><b>{x.join[arm].label}</b><br /><span className="small muted">{x.join[arm].hint(testName, p.weeks)}</span></span>
                        </label>
                      ))}
                    </fieldset>
                    <p className="small muted">{x.join.why} {x.join.choice}</p>
                    <p className="small muted">{x.join.privacy}</p>
                    <p className="small muted">{t.joiningAs(m.profile.displayName)}</p>
                  </StateForm>
                )}
        </Card>

        {experiment && progress && (
          <Card title={x.pooled.title} span={7}>
            {signal && test ? (
              <>
                <p>{x.pooled.lean[lean(signal, test.lowerIsBetter)]}</p>
                <SignalChart signal={signal} />
                <dl className="kv">
                  <div><dt>{g.tried}</dt><dd className="tnum">{signed(signal.changeTried)}<small>{g.members(signal.nTried)}{spread(signal.sdTried)}</small></dd></div>
                  <div><dt>{g.control}</dt><dd className="tnum">{signed(signal.changeControl)}<small>{g.members(signal.nControl)}{spread(signal.sdControl)}</small></dd></div>
                  <div><dt>{g.range}</dt><dd className="tnum">{signed(signal.low)} {g.to} {signed(signal.high)}</dd></div>
                  <div><dt>{x.pooled.now}</dt><dd className="tnum">{x.pooled.people(progress.now)}</dd></div>
                  <div><dt>{x.pooled.out}</dt><dd className="tnum">{x.pooled.people(progress.out)}</dd></div>
                </dl>
                <p className="muted small">{g.about(test.name, test.lowerIsBetter)} {x.pooled.unit(x.pooled.units[test.unit] ?? test.unit)}</p>
                <p className="notice">{g.honest} {x.pooled.ownChoice}</p>
                <details>
                  <summary className="small">{x.pooled.method}</summary>
                  <ol className="stack small muted" style={{ margin: "8px 0 0", paddingLeft: 20 }}>{x.pooled.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                  <p className="small muted">{x.pooled.computed(dayText(signal.computedAt))}</p>
                </details>
              </>
            ) : (
              <>
                <Empty title={x.pooled.none}><span>{x.pooled.noneWhy(MIN_FINISHED_PER_GROUP)}</span></Empty>
                <dl className="kv">
                  <div><dt>{x.pooled.finished}: {x.pooled.tried.toLowerCase()}</dt><dd className="tnum">{x.pooled.of(progress.tried, MIN_FINISHED_PER_GROUP)}</dd></div>
                  <div><dt>{x.pooled.finished}: {x.pooled.control.toLowerCase()}</dt><dd className="tnum">{x.pooled.of(progress.control, MIN_FINISHED_PER_GROUP)}</dd></div>
                  <div><dt>{x.pooled.now}</dt><dd className="tnum">{x.pooled.people(progress.now)}</dd></div>
                  <div><dt>{x.pooled.out}</dt><dd className="tnum">{x.pooled.people(progress.out)}</dd></div>
                </dl>
              </>
            )}
          </Card>
        )}

        {story && <Card title={t.story} span={5}><p>{story.body}</p></Card>}

        {similar.length > 0 && (
          <Card title={assistCopy.idea.similarTitle} span={12}>
            <p className="muted small">{assistCopy.idea.similarWhat}{similar.some((i) => i.standIn) ? ` ${assistCopy.standIn}` : ""}</p>
            <div>
              {similar.map((i) => (
                <div className="ins" key={i.id}>
                  <div className="tx">
                    <Link href={`/together/ideas/${i.id}`}><b>{i.title}</b></Link>
                    <div className="sub">{i.forWhom}</div>
                  </div>
                  <Chip tone={isTested(i.step) ? "plain" : "none"}>{together.ladder.steps[i.step].name}</Chip>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      <More><p>{p.forWhom}</p></More>
    </>
  );
}
