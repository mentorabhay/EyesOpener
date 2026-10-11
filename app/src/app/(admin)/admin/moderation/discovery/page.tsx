// Eyes Opener: Page controller component for the app/src/app/(admin)/admin/moderation/discovery web route.
import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin } from "@/copy/admin";
import { discovery } from "@/copy/discovery";
import { requireStaff } from "@/lib/auth";
import { dayText } from "@/lib/community";
import { ANSWER_MIN_MEMBERS, LIMITS, ROUND_MAX_DAYS } from "@/lib/discovery";
import { staffBoard, type StaffRound } from "@/lib/discovery-data";
import { addDays } from "@/lib/league";
import { todayKey } from "@/lib/session";
import { Confirm } from "../../parts";
import { closeRoundAction, retractAnswerAction, withdrawQuestionAction } from "./actions";
import { AddQuestionForm, AnswerQuestionForm, NewRoundForm } from "./forms";

const t = discovery.staff;
export const generateMetadata = (): Metadata => ({ title: t.title });

function Round({ r }: { r: StaffRound }) {
  const open = r.state === "open", listed = r.questions.filter((q) => !q.withdrawnAt);
  const most = Math.max(0, ...listed.map((q) => q.votes));
  return (
    <Card title={r.round.title} span={12} as="article" right={<><Chip tone={open ? "ok" : "plain"}>{open ? t.round.open(dayText(r.round.closesOn)) : t.round.closed(dayText(r.round.closesOn))}</Chip><span className="small muted tnum">{t.round.votes(r.votes)}</span></>}>
      {r.questions.length === 0 ? <p className="muted">{t.round.noQuestions}</p> : (
        <div className="tbwrap">
          <table className="tb">
            <thead><tr><th scope="col">{t.question.cols.question}</th><th scope="col">{t.question.cols.votes}</th><th scope="col">{t.question.cols.state}</th><th scope="col">{t.question.cols.action}</th></tr></thead>
            <tbody>
              {r.questions.map((q) => (
                <tr key={q.id}>
                  <td>
                    <b>{q.question}</b><div className="muted small">{q.why}</div>
                    {q.answer && <div className="notice stack" style={{ marginTop: 8 }}><p>{q.answer}</p><p className="small muted">{q.answerBasis} {q.answerMembers !== null && discovery.answer.members(q.answerMembers)}</p></div>}
                  </td>
                  <td className="tnum">{q.withdrawnAt ? "" : q.votes}</td>
                  <td>
                    {q.withdrawnAt ? <Chip tone="none">{t.question.withdrawn}</Chip> : q.answeredAt ? <Chip tone="ok">{t.question.answered}</Chip> : <Chip>{t.question.listed}</Chip>}
                    {!open && !q.withdrawnAt && most > 0 && q.votes === most && <> <Chip tone="grad">{t.question.top}</Chip></>}
                    {q.isSample && <> <Chip tone="warn">{discovery.answer.sample}</Chip></>}
                  </td>
                  <td>
                    {open && !q.withdrawnAt && (
                      <Confirm ask={t.question.withdraw} label={t.question.withdrawOf(q.question)} warn={t.question.withdrawWarn}>
                        <form action={withdrawQuestionAction}><input type="hidden" name="id" value={q.id} /><button className="btn btn-sm btn-d">{t.question.withdrawYes}</button></form>
                      </Confirm>
                    )}
                    {!open && !q.withdrawnAt && q.answeredAt && (
                      <Confirm ask={t.answer.retract} label={t.answer.retractOf(q.question)} warn={t.answer.retractWarn}>
                        <form action={retractAnswerAction}><input type="hidden" name="id" value={q.id} /><button className="btn btn-sm btn-d">{t.answer.retractYes}</button></form>
                      </Confirm>
                    )}
                    {!open && !q.withdrawnAt && !q.answeredAt && (
                      <details>
                        <summary className="btn btn-sm">{t.answer.title}</summary>
                        <div style={{ marginTop: 10, minWidth: 260 }}><AnswerQuestionForm questionId={q.id} answer={LIMITS.answer} basis={LIMITS.basis} minMembers={ANSWER_MIN_MEMBERS} /></div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <div className="bento">
          <Card title={t.add.title} span={7} as="div"><AddQuestionForm roundId={r.round.id} question={LIMITS.question} why={LIMITS.why} /></Card>
          <Card title={t.round.closing} span={5} as="div">
            <p className="muted small">{t.round.closesItself(dayText(r.round.closesOn))}</p>
            <Confirm ask={t.round.close} warn={t.round.closeWarn}>
              <form action={closeRoundAction}><input type="hidden" name="id" value={r.round.id} /><button className="btn btn-sm btn-d">{t.round.closeYes}</button></form>
            </Confirm>
          </Card>
        </div>
      )}
    </Card>
  );
}

export default async function DiscoveryStaffPage() {
  await requireStaff("moderation");
  const today = todayKey(), rounds = await staffBoard(today);
  const open = rounds.filter((r) => r.state === "open");
  const waiting = rounds.filter((r) => r.state === "closed").reduce((n, r) => n + r.questions.filter((q) => !q.withdrawnAt && !q.answeredAt).length, 0);
  return (
    <>
      <PageHead
        title={t.title} sub={t.sub} crumb={[{ href: "/admin", label: admin.back }, { href: "/admin/moderation", label: t.back }]}
        stats={[{ value: open.length, label: t.stats.open }, { value: waiting, label: t.stats.waiting }]}
      />
      <p className="notice">{t.counts}</p>
      <div className="bento">
        {rounds.length === 0 && <Card span={12}><Empty title={t.none.title}><span>{t.none.body}</span></Empty></Card>}
        {rounds.map((r) => <Round key={r.round.id} r={r} />)}
        {open.length === 0 && (
          <Card title={t.newRound.title} span={6}><NewRoundForm title={LIMITS.title} firstDay={addDays(today, 1)} lastDay={addDays(today, ROUND_MAX_DAYS)} /></Card>
        )}
      </div>
    </>
  );
}
