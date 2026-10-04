import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Btn, Card, Chip, PageHead, Void } from "@/components/ui";
import { SignalChart, signed } from "@/components/together/SignalChart";
import { StateForm } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { testByKey } from "@/data";
import { dayText, isTested, mayJoin, protocolById } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { joinExperiment } from "./actions";

const t = together.idea;
const g = together.signal;
export const metadata: Metadata = { title: together.title };

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await requireMember();
  const found = await protocolById(id, m.profile.id);
  if (!found) notFound();
  const { protocol: p, story, experiment } = found;
  const test = testByKey(p.moves);
  const testName = test?.name ?? p.moves;
  const inReview = p.status !== "published";
  const cannotJoin = inReview ? t.notYet : experiment?.status !== "open" ? t.closed : !m.can("share") ? together.cannot.share : null;
  const consent = cannotJoin || experiment?.mine ? true : await mayJoin(m);
  const done = (resultId: string | null) => (resultId ? t.recorded : <Void label={t.notRecorded} />);

  return (
    <>
      <PageHead title={p.title} sub={p.forWhom} crumb={[together.crumb]} />
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

        <Card title={t.experiment} span={5} right={experiment && <span className="small muted tnum">{together.list.people(experiment.joined, experiment.signal ? experiment.signal.nTried + experiment.signal.nControl : null)}</span>}>
          <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>{t.steps(testName, p.weeks).map((step) => <li key={step}>{step}</li>)}</ol>
          {experiment?.mine ? (
            <>
              <p className="notice" data-b="ok">{t.joined(dayText(experiment.mine.joinedAt))}</p>
              <dl className="kv">
                <div><dt>{t.before}</dt><dd>{done(experiment.mine.baselineId)}</dd></div>
                <div><dt>{t.after}</dt><dd>{done(experiment.mine.followupId)}</dd></div>
              </dl>
              <div className="row"><Btn href="/test" small>{t.checkups}</Btn></div>
            </>
          ) : cannotJoin ? <p className="muted">{cannotJoin}</p>
            : !consent ? <p className="notice" data-b="warn">{t.needsConsent(m.profile.displayName)}</p>
            : (
              <StateForm action={joinExperiment} submit={t.join} primary>
                <input type="hidden" name="protocolId" value={p.id} />
                <p className="muted small">{t.joiningAs(m.profile.displayName)}</p>
              </StateForm>
            )}
        </Card>

        {experiment?.signal && (
          <Card title={g.title} span={7}>
            <SignalChart signal={experiment.signal} />
            <dl className="kv">
              <div><dt>{g.tried}</dt><dd className="tnum">{signed(experiment.signal.changeTried)}<small>{g.members(experiment.signal.nTried)}</small></dd></div>
              <div><dt>{g.control}</dt><dd className="tnum">{signed(experiment.signal.changeControl)}<small>{g.members(experiment.signal.nControl)}</small></dd></div>
              <div><dt>{g.range}</dt><dd className="tnum">{signed(experiment.signal.low)} {g.to} {signed(experiment.signal.high)}</dd></div>
            </dl>
            {test && <p className="muted small">{g.about(test.name, test.lowerIsBetter)}</p>}
            <p className="notice">{g.honest}</p>
          </Card>
        )}

        {story && <Card title={t.story} span={5}><p>{story.body}</p></Card>}
      </div>
    </>
  );
}
