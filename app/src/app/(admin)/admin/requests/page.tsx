import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t, ageText, day } from "@/copy/admin";
import { dataRequests } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { markDone } from "./actions";

const r = t.requests;
export const metadata: Metadata = { title: t.rooms.requests.name };

export default async function RequestsPage() {
  await requireStaff("requests");
  const { open, done } = await dataRequests();
  return (
    <>
      <PageHead title={t.rooms.requests.name} sub={r.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: open.length, label: r.stat }]} />
      <Empty title={r.notBuilt.title}><span>{r.notBuilt.body}</span></Empty>
      <div className="bento">
        <Card title={r.open} span={12}>
          {open.length ? (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{r.cols.household}</th><th scope="col">{r.cols.kind}</th><th scope="col">{r.cols.asked}</th><th scope="col">{r.cols.age}</th><th scope="col" className="n">{r.cols.action}</th></tr></thead>
                <tbody>
                  {open.map((q) => (
                    <tr key={q.id}>
                      <td>{q.household}</td>
                      <td><Chip tone={q.kind === "delete" ? "risk" : "plain"}>{r.kind[q.kind]}</Chip></td>
                      <td>{day(q.createdAt)}</td>
                      <td className="tnum">{ageText(q.createdAt)}</td>
                      <td className="n">
                        <form action={markDone}>
                          <input type="hidden" name="id" value={q.id} />
                          <button className="btn btn-sm" aria-label={r.markDoneOf(q.household)}>{r.markDone}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title={r.emptyOpen.title}><span>{r.emptyOpen.body}</span></Empty>}
        </Card>

        <Card title={r.done} span={12}>
          {done.length ? (
            <div className="tbwrap">
              <table className="tb">
                <thead><tr><th scope="col">{r.cols.household}</th><th scope="col">{r.cols.kind}</th><th scope="col">{r.cols.asked}</th><th scope="col">{r.cols.doneOn}</th><th scope="col">{r.cols.by}</th></tr></thead>
                <tbody>
                  {done.map((q) => (
                    <tr key={q.id}>
                      <td>{q.household}</td>
                      <td>{r.kind[q.kind]}</td>
                      <td>{day(q.createdAt)}</td>
                      <td>{q.doneAt ? day(q.doneAt) : t.none}</td>
                      <td>{q.handler ?? t.overview.activity.gone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">{r.emptyDone}</p>}
        </Card>
      </div>
    </>
  );
}
