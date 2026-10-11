// Eyes Opener: Page controller component for the app/src/app/(admin)/admin/sponsors web route.
import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead, type Tone } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { sponsors } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import { Confirm } from "../parts";
import { approve, restore, suspend } from "./actions";

const sp = t.sponsors;
export const generateMetadata = (): Metadata => ({ title: t.rooms.sponsors.name });
const TONE: Record<"pending" | "approved" | "suspended", Tone> = { pending: "warn", approved: "ok", suspended: "danger" };

export default async function SponsorsPage() {
  await requireStaff("sponsors");
  const rows = await sponsors();
  return (
    <>
      <PageHead title={t.rooms.sponsors.name} sub={sp.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: rows.filter((r) => r.status === "pending").length, label: sp.stat }]} />
      <Card>
        {rows.length ? (
          <div className="tbwrap">
            <table className="tb">
              <thead>
                <tr>
                  <th scope="col">{sp.cols.name}</th><th scope="col">{sp.cols.kind}</th><th scope="col">{sp.cols.city}</th><th scope="col">{sp.cols.state}</th>
                  <th scope="col">{sp.cols.groups}</th><th scope="col">{sp.cols.households}</th><th scope="col" className="n">{sp.cols.action}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}{r.about && <div className="muted small">{r.about}</div>}</td>
                    <td>{sp.kind[r.kind]}</td>
                    <td>{r.city || <span className="muted">{sp.noCity}</span>}</td>
                    <td><Chip tone={TONE[r.status]}>{sp.status[r.status]}</Chip></td>
                    <td className="tnum">{r.groups}</td>
                    <td className="tnum">{r.households}</td>
                    <td className="n">
                      {r.status === "pending" && (
                        <form action={approve}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn btn-sm btn-d" aria-label={sp.of(sp.approve, r.name)}>{sp.approve}</button>
                        </form>
                      )}
                      {r.status === "approved" && (
                        <Confirm ask={sp.suspend} label={sp.of(sp.suspend, r.name)} warn={sp.suspendWarn}>
                          <form action={suspend}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="btn btn-sm btn-d">{sp.suspendYes}</button>
                          </form>
                        </Confirm>
                      )}
                      {r.status === "suspended" && (
                        <form action={restore}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="btn btn-sm" aria-label={sp.of(sp.restore, r.name)}>{sp.restore}</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title={sp.empty.title}><span>{sp.empty.body}</span></Empty>}
      </Card>
    </>
  );
}
