import type { Metadata } from "next";
import { Btn, Card, Chip, Empty, PageHead, Progress } from "@/components/ui";
import { sponsor as t } from "@/copy/sponsor";
import { percent } from "@/engine";
import { requireSponsor } from "@/lib/auth";
import { familyNumbers, glassesNumbers } from "@/lib/sponsor";

export const generateMetadata = (): Metadata => ({ title: t.nav.overview });

export default async function SponsorHome() {
  const { sponsor } = await requireSponsor("view");
  const h = t.home;

  /* A sponsor that is still waiting sees its status and no numbers. Nothing is counted for it. */
  if (sponsor.status !== "approved") {
    return (
      <>
        <PageHead title={sponsor.name}><Chip tone="warn">{t.status[sponsor.status]}</Chip></PageHead>
        <div className="bento">
          <Card title={h.waiting.title} span={7}><p>{h.waiting.body}</p></Card>
        </div>
      </>
    );
  }

  /* Both return counts only. `families` is null when too few households have joined to show any number. */
  const [families, glasses] = await Promise.all([familyNumbers(sponsor), glassesNumbers(sponsor)]);
  const f = h.families, g = h.glasses;

  return (
    <>
      <PageHead title={sponsor.name} sub={h.sub} stats={families ? [{ value: families.joined, label: f.joined }] : undefined}>
        <Chip tone="ok">{t.status.approved}</Chip>
      </PageHead>
      <div className="bento">
        <Card title={f.title} span={7} right={<Btn href="/sponsor/groups" small>{f.groups}</Btn>}>
          {families ? (
            <>
              <div className="stack">
                <div className="row"><span>{f.active}</span><span className="sp" /><b className="tnum">{f.of(families.active, families.joined)}</b></div>
                <Progress value={families.active / families.joined} label={f.active} />
                <p className="muted small">{f.activeHint}</p>
              </div>
              <div className="stack">
                <div className="row"><span>{f.steady}</span><span className="sp" /><b className="tnum">{percent(families.steady / families.joined)}</b></div>
                <Progress value={families.steady / families.joined} label={f.steady} />
              </div>
              <dl className="kv">
                <div><dt>{f.days}</dt><dd className="tnum">{families.practiceDays}<small>{f.daysHint}</small></dd></div>
              </dl>
            </>
          ) : (
            <>
              <Progress value={null} label={f.active} />
              <Empty title={t.few.title}><span>{t.few.body}</span></Empty>
            </>
          )}
        </Card>

        <Card title={g.title} span={5} right={<Btn href="/sponsor/glasses" small>{g.link}</Btn>}>
          <dl className="kv">
            <div><dt>{g.pairs}</dt><dd className="tnum">{glasses?.pairs ?? 0}</dd></div>
            <div><dt>{g.finished}</dt><dd className="tnum">{glasses?.finished ?? 0}<small>{g.hint}</small></dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
