import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t, day } from "@/copy/admin";
import { counsellors } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { Confirm } from "../parts";
import { verify, withdraw } from "./actions";

const c = t.counsellors;
export const metadata: Metadata = { title: t.rooms.counsellors.name };

export default async function CounsellorsPage() {
  await requireStaff("counsellors");
  const people = await counsellors();
  return (
    <>
      <PageHead title={t.rooms.counsellors.name} sub={c.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: people.filter((p) => !p.verifiedAt).length, label: c.stat }]} />
      <Card>
        {people.length ? (
          <div className="tbwrap">
            <table className="tb">
              <thead><tr><th scope="col">{c.cols.name}</th><th scope="col">{c.cols.email}</th><th scope="col">{c.cols.state}</th><th scope="col">{c.cols.links}</th><th scope="col" className="n">{c.cols.action}</th></tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.email}</td>
                    <td>{p.verifiedAt ? <Chip tone="ok">{c.verified(day(p.verifiedAt))}</Chip> : <Chip tone="warn">{c.waiting}</Chip>}</td>
                    <td><span className="tnum">{p.links}</span><div className="muted small">{c.links(p.active, p.pending, p.ended)}</div></td>
                    <td className="n">
                      {p.verifiedAt ? (
                        <Confirm ask={c.withdraw} label={`${c.withdraw}: ${p.name}`} warn={c.withdrawWarn(p.active + p.pending)}>
                          <form action={withdraw}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="btn btn-sm btn-d">{c.withdrawYes}</button>
                          </form>
                        </Confirm>
                      ) : (
                        <form action={verify}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn-sm btn-d" aria-label={c.verifyOf(p.name)}>{c.verify}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title={c.empty.title}><span>{c.empty.body}</span></Empty>}
      </Card>
    </>
  );
}
