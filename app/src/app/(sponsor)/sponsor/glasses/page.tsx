import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { sponsor as t } from "@/copy/sponsor";
import { requireSponsor } from "@/lib/auth";
import { listPairs } from "@/lib/sponsor";
import { PairForm } from "./pair-form";

export const metadata: Metadata = { title: t.glasses.title };

export default async function SponsorGlasses() {
  const { sponsor } = await requireSponsor("view");
  /* Not found for a sponsor that is still waiting. Counts and status only: never who wore a pair. */
  const pairs = await listPairs(sponsor);
  const g = t.glasses;

  return (
    <>
      <PageHead title={g.title} sub={g.sub} crumb={[{ href: "/sponsor", label: sponsor.name }]} />
      <div className="bento">
        <Card title={g.list} span={7}>
          {pairs.length ? (
            <div>
              {pairs.map((pair) => (
                <div className="ins" key={pair.id}>
                  <div className="tx">
                    <div className="row">
                      <span className="muted small">{g.code}</span>
                      <code className="tnum" style={{ fontWeight: 600, letterSpacing: "0.08em" }}>{pair.code}</code>
                      <span className="sp" />
                      <Chip tone={pair.status === "wearing" ? "ok" : pair.status === "new" ? "none" : "plain"}>{g.status[pair.status]}</Chip>
                    </div>
                    <div className="sub tnum">{g.worn(pair.worn)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty title={g.none.title}><span>{g.none.body}</span></Empty>}
        </Card>

        <Card title={g.register.title} span={5}>
          <PairForm />
        </Card>
      </div>
    </>
  );
}
