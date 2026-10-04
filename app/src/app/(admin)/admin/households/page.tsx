import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t, day } from "@/copy/admin";
import { households } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";

const h = t.households;
export const metadata: Metadata = { title: t.rooms.households.name };

/** Counts only: the query behind this page never reads a test result, an eye profile or what happened in a session. */
export default async function HouseholdsPage() {
  await requireStaff("households");
  const rows = await households();
  return (
    <>
      <PageHead title={t.rooms.households.name} sub={h.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: rows.length, label: h.stat }]} />
      <Card>
        {rows.length ? (
          <div className="tbwrap">
            <table className="tb">
              <thead>
                <tr>
                  <th scope="col">{h.cols.name}</th><th scope="col">{h.cols.adults}</th><th scope="col">{h.cols.children}</th><th scope="col">{h.cols.seats}</th>
                  <th scope="col">{h.cols.last}</th><th scope="col">{h.cols.requests}</th><th scope="col">{h.cols.groups}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><span className="row">{r.name}{r.isDemo && <Chip>{h.demo}</Chip>}</span></td>
                    <td className="tnum">{r.adults}</td>
                    <td className="tnum">{r.children}</td>
                    <td className="tnum">{r.seats}</td>
                    <td>{r.lastSession ? day(r.lastSession) : <span className="muted">{h.never}</span>}</td>
                    <td className="tnum">{r.openRequests ? <Chip tone="warn">{r.openRequests}</Chip> : 0}</td>
                    <td>{r.groups.length ? r.groups.join(", ") : <span className="muted">{h.noGroups}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title={h.empty.title}><span>{h.empty.body}</span></Empty>}
      </Card>
    </>
  );
}
