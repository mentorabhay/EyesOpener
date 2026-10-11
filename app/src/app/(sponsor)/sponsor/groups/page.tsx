// Eyes Opener: Page controller component for the app/src/app/(sponsor)/sponsor/groups web route.
import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead, Void } from "@/components/ui";
import { day, sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { listGroups } from "@/lib/sponsor";
import { setOpen } from "./actions";
import { GroupForm } from "./group-form";

export const generateMetadata = (): Metadata => ({ title: t.groups.title });

export default async function SponsorGroups() {
  const { sponsor } = await requireSponsor("view");
  /* Not found for a sponsor that is still waiting. `households` is null for a group too small to show. */
  const groups = await listGroups(sponsor);
  const g = t.groups;

  return (
    <>
      <PageHead title={g.title} sub={g.sub} crumb={[{ href: "/sponsor", label: sponsor.name }]} />
      <div className="bento">
        <Card title={g.list} span={7}>
          {groups.length ? (
            <div>
              {groups.map((group) => (
                <div className="ins" key={group.id}>
                  <div className="tx stack">
                    <div className="row"><b>{group.name}</b><Chip tone={group.closedAt ? "plain" : "ok"}>{group.closedAt ? g.closed : g.open}</Chip></div>
                    <div className="row small">
                      <span className="muted">{g.code}</span>
                      <code className="tnum" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>{group.code}</code>
                      <span className="muted">{g.line(day(group.createdAt))}</span>
                    </div>
                    {group.households === null
                      ? <div className="row small"><Void label={t.few.title} /><span className="muted">{t.few.title}</span></div>
                      : <div className="small tnum">{g.households(group.households)}</div>}
                  </div>
                  <form action={setOpen}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="to" value={group.closedAt ? "open" : "closed"} />
                    <button className="btn btn-sm" aria-label={group.closedAt ? g.reopenOf(group.name) : g.closeOf(group.name)}>{group.closedAt ? g.reopen : g.close}</button>
                  </form>
                </div>
              ))}
            </div>
          ) : <Empty title={g.none.title}><span>{g.none.body}</span></Empty>}
          <p className="muted small">{t.few.body} {g.closedNote}</p>
        </Card>

        <Card title={g.create.title} span={5}>
          <GroupForm />
        </Card>
      </div>
    </>
  );
}
