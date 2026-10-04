import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Card, Chip, PageHead } from "@/components/ui";
import { auth as t } from "@/copy/auth";
import { common } from "@/copy/common";
import { db, schema } from "@/db";
import { demoSignIn } from "@/lib/actions";
import { demoLoginOn, getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: t.title };

export default async function LoginPage() {
  if (!demoLoginOn()) {
    return <main className="page" style={{ maxWidth: 720, marginInline: "auto" }}><PageHead title={t.title} sub={t.off} /></main>;
  }
  const viewer = await getViewer();
  const users = await db.select().from(schema.appUser).orderBy(asc(schema.appUser.createdAt));
  const sponsors = await db.select({ userId: schema.sponsorUser.userId, name: schema.sponsor.name, status: schema.sponsor.status })
    .from(schema.sponsorUser).innerJoin(schema.sponsor, eq(schema.sponsor.id, schema.sponsorUser.sponsorId));
  const households = await db.select().from(schema.account).where(eq(schema.account.isDemo, true));
  const demoIds = new Set(households.map((h) => h.id));

  const groups = [
    { ...t.groups.household, people: users.filter((u) => u.accountId && demoIds.has(u.accountId)).map((u) => ({ u, role: t.seat[u.seat ?? "guardian"] })) },
    { ...t.groups.staff, people: users.filter((u) => u.staffRole).map((u) => ({ u, role: t.staff[u.staffRole!] })) },
    { ...t.groups.counsellor, people: users.filter((u) => u.isCounsellor).map((u) => ({ u, role: u.counsellorVerifiedAt ? t.counsellor.verified : t.counsellor.waiting })) },
    { ...t.groups.sponsor, people: sponsors.map((s) => ({ u: users.find((u) => u.id === s.userId)!, role: t.sponsor[s.status] })).filter((p) => p.u) },
  ];

  return (
    <main className="page" style={{ maxWidth: 1040, marginInline: "auto" }}>
      <PageHead title={t.demoTitle} sub={t.demoSub} />
      <div className="bento">
        {groups.map((g) => (
          <Card key={g.title} title={g.title} span={6}>
            <p className="muted small">{g.sub}</p>
            <div>
              {g.people.map(({ u, role }) => (
                <form className="ins" key={u.id + role} action={demoSignIn}>
                  <input type="hidden" name="userId" value={u.id} />
                  <div className="tx"><b>{u.displayName}</b><div className="sub">{role} · {u.email}</div></div>
                  {viewer?.user.id === u.id ? <Chip tone="ok">{t.current}</Chip> : <button className="btn btn-sm" type="submit">{t.signIn}</button>}
                </form>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <p className="muted small">{common.notMedical}</p>
    </main>
  );
}
