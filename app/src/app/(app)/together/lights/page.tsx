import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { Card, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText, giftsTo, lightCandidates, streakOf } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { giveLight } from "./actions";

const t = together.lights;
const idea = ideaBySlug("lend-a-light")!;
export const metadata: Metadata = { title: idea.name };

export default async function LightsPage() {
  const m = await requireMember();
  const [streak, gifts, people] = await Promise.all([streakOf(m.profile.id), giftsTo(m.profile.id), lightCandidates(m)]);

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[{ value: streak?.current ?? 0, label: t.streak }, { value: streak?.lights ?? 0, label: t.lights }]}
      />
      <p className="notice">{t.rule}</p>
      <div className="bento">
        <Card title={t.give} span={6}>
          {!m.can("encourage") ? <p className="muted">{together.cannot.encourage}</p>
            : !streak ? <p className="muted">{t.noStreak}</p>
            : streak.lights < 1 ? <p className="muted">{t.none}</p>
            : people.length === 0 ? <p className="muted">{t.nobody}</p>
            : (
              <StateForm action={giveLight} submit={t.submit} primary>
                <div className="field">
                  <label htmlFor="to">{t.to}</label>
                  <select id="to" name="to" required>{people.map((p) => <option key={p.id} value={p.id}>{t.streakOf(p.name, p.current)}</option>)}</select>
                </div>
                <div className="field"><label htmlFor="note">{t.note}</label><input id="note" name="note" type="text" maxLength={80} /></div>
              </StateForm>
            )}
        </Card>

        <Card title={t.received} span={6}>
          {gifts.length === 0 && <p className="muted">{t.noGifts}</p>}
          <div>
            {gifts.map((g) => (
              <div className="ins" key={g.id}><div className="tx">{g.note}<div className="sub">{t.from(g.from, dayText(g.forDay))}</div></div></div>
            ))}
          </div>
        </Card>
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
