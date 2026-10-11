// Eyes Opener: Page controller component for the app/src/app/(admin)/admin/staff web route.
import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import { admin as t } from "@/copy/admin";
import { staffList } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import type { StaffRole } from "@/lib/roles";
import { GiveRoleForm, RoleControls } from "./forms";

const st = t.staff;
export const generateMetadata = (): Metadata => ({ title: t.rooms.staff.name });
const ORDER: StaffRole[] = ["super_admin", "ops", "content"];

export default async function StaffPage() {
  const viewer = await requireStaff("staff");
  const people = (await staffList()).sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  return (
    <>
      <PageHead title={t.rooms.staff.name} sub={st.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: people.length, label: st.stat }]} />
      <div className="bento">
        <Card span={12}>
          <div className="tbwrap">
            <table className="tb">
              <thead><tr><th scope="col">{st.cols.name}</th><th scope="col">{st.cols.email}</th><th scope="col">{st.cols.role}</th><th scope="col">{st.cols.action}</th></tr></thead>
              <tbody>
                {people.map((p) => {
                  const me = p.id === viewer.user.id;
                  return (
                    <tr key={p.id}>
                      <td><span className="row">{p.name}{me && <Chip tone="ok">{st.you}</Chip>}</span></td>
                      <td>{p.email}</td>
                      <td><Chip tone={p.role === "super_admin" ? "ok" : "plain"}>{t.roles[p.role]}</Chip>{p.fromServer && <div className="muted small">{st.fromServer}</div>}</td>
                      <td>
                        {me ? <span className="muted small">{st.youHint}</span>
                          /* The key redraws the controls once the stored role changes, so the list shows the new role. */
                          : <RoleControls key={`${p.id}:${p.role}:${p.fromServer}`} id={p.id} name={p.name} role={p.role} removable={!p.fromServer} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={st.give.title} span={6}>
          <p className="muted small">{st.give.about}</p>
          <GiveRoleForm />
        </Card>

        <Card title={st.whatTitle} span={6}>
          <dl className="kv">
            {ORDER.map((r) => <div key={r}><dt>{t.roles[r]}</dt><dd>{st.what[r]}</dd></div>)}
          </dl>
        </Card>
      </div>
    </>
  );
}
