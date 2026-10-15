import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageHead, Progress } from "@/components/ui";
import { counsellor as t, day } from "@/copy/counsellor";
import { requireCounsellor } from "@/lib/auth";
import { linkedMembers, linkRequests } from "@/lib/counsellor";
import { answer } from "./actions";

export const generateMetadata = (): Metadata => ({ title: t.home.title });

export default async function CounsellorHome() {
  const viewer = await requireCounsellor();
  const [requests, members] = await Promise.all([linkRequests(viewer), linkedMembers(viewer)]);
  const r = t.home.requests, l = t.home.linked;

  return (
    <>
      <PageHead title={t.home.title} sub={t.home.sub} stats={[{ value: members.length, label: t.home.stats.linked }, { value: requests.length, label: t.home.stats.waiting }]} />
      <div className="bento">
        <Card title={r.title} span={5}>
          <p className="muted small">{r.about}</p>
          {requests.length ? (
            <div>
              {requests.map((q) => (
                <div className="ins" key={q.linkId}>
                  <div className="tx">
                    <b>{q.firstName}</b>, {t.age(q.age)}
                    <div className="sub">{r.line(q.household, day(q.askedAt))}</div>
                  </div>
                  <form action={answer} className="row">
                    <input type="hidden" name="linkId" value={q.linkId} />
                    <button className="btn btn-sm btn-d" name="answer" value="accept" aria-label={r.acceptOf(q.firstName)}>{r.accept}</button>
                    <button className="btn btn-sm" name="answer" value="decline" aria-label={r.declineOf(q.firstName)}>{r.decline}</button>
                  </form>
                </div>
              ))}
            </div>
          ) : <p>{r.none}</p>}
        </Card>

        <Card title={l.title} span={7}>
          {members.length ? (
            <div>
              {members.map((m) => (
                <div className="ins" key={m.linkId}>
                  <div className="tx stack">
                    <div>
                      <b>{m.name}</b>, {t.age(m.age)}
                      <div className="sub">{m.programme ? l.programme(m.programme.name, m.programme.week) : l.noProgramme}</div>
                    </div>
                    <Progress value={m.daysPractised / 7} label={l.practisedLabel} />
                    <span className="small muted tnum">{l.practised(m.daysPractised)}</span>
                  </div>
                  <Link href={`/counsellor/members/${m.linkId}`} className="btn btn-sm" aria-label={l.openOf(m.name)}>{l.open}</Link>
                </div>
              ))}
            </div>
          ) : <Empty title={l.none.title}><span>{l.none.body}</span></Empty>}
        </Card>
      </div>
    </>
  );
}
