import type { Metadata } from "next";
import form from "@/app/(app)/settings/form.module.css";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { discovery as t } from "@/copy/discovery";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import { boardFor, cannotVote, type BoardQuestion, type BoardRound } from "@/lib/discovery-data";
import { requireMember } from "@/lib/session";
import { vote } from "./actions";

const idea = ideaBySlug("discovery-board")!;
export const metadata: Metadata = { title: idea.name };

/** An answer, with what it rests on. Sample data says so before anything else. */
function Answer({ q, credited, own }: { q: BoardQuestion; credited: string[]; own: boolean }) {
  const a = q.answer!;
  return (
    <div className="stack">
      <div className="row"><h4>{t.answer.title}</h4>{a.sample && <Chip tone="warn">{t.answer.sample}</Chip>}</div>
      {a.sample && <p className="notice" data-b="warn">{t.answer.sampleNote}</p>}
      <p>{a.text}</p>
      <dl className="kv">
        <div><dt>{t.answer.basis}</dt><dd>{a.basis}<small className="tnum">{t.answer.members(a.members)} {t.answer.on(dayText(a.answeredAt))}</small></dd></div>
      </dl>
      <p className="muted small">{t.answer.honest}</p>
      {credited.length > 0 && <p className="notice" data-b="ok"><b>{own ? t.credit.you : t.credit.family}</b> {t.credit.who(credited)}</p>}
    </div>
  );
}

function Past({ round, activeProfileId }: { round: BoardRound; activeProfileId: string | null }) {
  const names = round.credited.map((p) => p.name), answered = round.questions.some((q) => q.answer);
  return (
    <article className="stack">
      <div className="row">
        <h3>{round.title}</h3>
        <span className="small muted tnum">{t.past.closed(dayText(round.closesOn))} {round.total === null || !round.counted ? t.past.tooFew : t.past.total(round.total)}</span>
      </div>
      <div>
        {round.questions.map((q) => (
          <div className="ins" key={q.id}>
            <div className="tx stack">
              <div className="row">
                <b>{q.question}</b>
                {q.top && <Chip tone="grad">{t.past.top}</Chip>}
                {q.votes !== null && <span className="small muted tnum">{t.votes(q.votes)}</span>}
              </div>
              <div className="sub">{q.why}</div>
              {q.answer ? <Answer q={q} credited={names} own={round.credited.some((p) => p.id === activeProfileId)} /> : q.top && <p className="muted small">{t.past.waiting}</p>}
            </div>
          </div>
        ))}
      </div>
      {!answered && names.length > 0 && <p className="muted small">{t.credit.round(names)}</p>}
    </article>
  );
}

export default async function DiscoveryPage() {
  const m = await requireMember();
  const [{ open, closed }, blocked] = await Promise.all([boardFor(m), cannotVote(m)]);
  const answered = closed.reduce((n, r) => n + r.questions.filter((q) => q.answer).length, 0);
  const others = open ? open.credited.filter((p) => p.id !== m.profile.id).map((p) => p.name) : [];

  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[{ value: closed.length, label: t.stats.rounds }, { value: answered, label: t.stats.answered }]}
      />
      <div className="bento">
        <Card title={open ? t.open.title(open.title) : undefined} span={7}>
          {!open ? <Empty title={t.open.none.title}><span>{t.open.none.body}</span></Empty> : (
            <>
              <p className="muted">{t.open.closes(dayText(open.closesOn))}</p>
              {blocked ? (
                <>
                  <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>
                    {open.questions.map((q) => <li key={q.id}><b>{q.question}</b><br /><span className="small muted">{q.why}</span></li>)}
                  </ol>
                  <p className="notice">{blocked === "needs_consent" ? t.refused.needs_consent(m.profile.displayName) : t.refused[blocked]}</p>
                </>
              ) : (
                <StateForm action={vote} submit={open.mine ? t.open.change : t.open.submit} primary>
                  <fieldset className={form.set}>
                    <legend>{t.open.pick}</legend>
                    {open.questions.map((q) => (
                      <label key={q.id} className={form.check}>
                        <input type="radio" name="question" value={q.id} required defaultChecked={q.id === open.mine} />
                        <span>
                          <b>{q.question}</b>{q.id === open.mine && <> <Chip tone="ok">{t.open.yours}</Chip></>}
                          <br /><span className="small muted">{q.why}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <p className="small muted">{t.open.votingAs(m.profile.displayName)}</p>
                </StateForm>
              )}
              <p className="small muted tnum">{open.total !== null && `${t.open.soFar(open.total)} `}{t.open.hidden}</p>
              {others.length > 0 && <p className="small muted">{t.credit.who(others)}</p>}
            </>
          )}
        </Card>

        <Card title={t.how.title} span={5}>
          <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>{t.how.points.map((line) => <li key={line}>{line}</li>)}</ol>
        </Card>

        <Card title={t.past.title} span={12}>
          {closed.length === 0 ? <p className="muted">{t.past.none}</p> : <div className="stack" style={{ gap: 22 }}>{closed.map((r) => <Past key={r.id} round={r} activeProfileId={m.seat === "circle" ? null : m.profile.id} />)}</div>}
        </Card>
      </div>
    </>
  );
}
