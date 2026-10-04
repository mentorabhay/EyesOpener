import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { listTeam } from "@/lib/sponsor";
import { AddForm, MemberActions } from "./team-forms";

export const metadata: Metadata = { title: t.team.title };

export default async function SponsorTeam() {
  /* Owners only. An editor, and a sponsor that is still waiting, get "not found". */
  const { viewer, sponsor } = await requireSponsor("manage_team");
  const team = await listTeam(sponsor);
  const owners = team.filter((p) => p.role === "owner").length;
  const m = t.team;

  return (
    <>
      <PageHead title={m.title} sub={m.sub} crumb={[{ href: "/sponsor", label: sponsor.name }]} />
      <div className="bento">
        <Card title={m.list} span={7}>
          <div>
            {team.map((p) => (
              <div className="ins" key={p.userId}>
                <div className="tx stack">
                  <div>
                    <span className="row"><b>{p.name}</b><Chip tone={p.role === "owner" ? "ok" : "plain"}>{t.role[p.role]}</Chip>{p.userId === viewer.user.id && <Chip tone="plain">{m.you}</Chip>}</span>
                    <div className="sub" style={{ overflowWrap: "anywhere" }}>{p.email}</div>
                  </div>
                  <MemberActions userId={p.userId} name={p.name} role={p.role} lastOwner={p.role === "owner" && owners <= 1} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={m.add.title} span={5}>
          <p className="muted small">{m.add.about}</p>
          <AddForm />
        </Card>
      </div>
    </>
  );
}
