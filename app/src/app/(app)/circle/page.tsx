// Eyes Opener: Page controller component for the app/src/app/(app)/circle web route.
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Btn, Card, PageHead } from "@/components/ui";
import { circle as t } from "@/copy/family";
import { day } from "@/copy/settings";
import { circleFacts } from "@/lib/family";
import { requireMember } from "@/lib/session";

export const generateMetadata = (): Metadata => ({ title: t.title });

export default async function CirclePage() {
  const m = await requireMember();
  if (m.childMode) redirect("/today");
  const kids = await circleFacts(m);

  return (
    <>
      <PageHead title={t.title}>
        <div className="row"><Btn href="/together/mail" kind="g">{t.mail}</Btn><Btn href="/together/lights">{t.lights}</Btn></div>
      </PageHead>
      <div className="bento">
        {kids.length === 0 && <Card><p className="muted">{t.none}</p></Card>}
        {kids.map((k) => (
          <Card key={k.id} title={k.name} span={6}>
            <dl className="kv">
              <div><dt>{t.rows.streak}</dt><dd>{t.streak(k.streak)}</dd></div>
              <div><dt>{t.rows.week}</dt><dd>{t.days(k.days)}</dd></div>
              <div><dt>{t.rows.note}</dt><dd>{k.note ? t.note(k.note.from, day(k.note.sentAt)) : t.noNote}</dd></div>
            </dl>
          </Card>
        ))}
      </div>
      <More><p>{t.sub}</p></More>
    </>
  );
}
