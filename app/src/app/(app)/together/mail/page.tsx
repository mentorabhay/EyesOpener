// Eyes Opener: Each letter with the ink that draws it: the two eyes take turns, and spaces do not use up a turn. .
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { Btn, Card, PageHead } from "@/components/ui";
import { LensView } from "@/components/together/LensView";
import { StateForm } from "@/components/together/StateForm";
import s from "@/components/together/together.module.css";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText, inbox, letterFontPx } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { sendMail } from "./actions";

const t = together.mail;
const idea = ideaBySlug("fusion-mail")!;
export const metadata: Metadata = { title: idea.name };

/** Each letter with the ink that draws it: the two eyes take turns, and spaces do not use up a turn. */
function inked(body: string) {
  let turn = 0;
  return [...body].map((ch) => ({ ch, ink: /\s/.test(ch) ? undefined : turn++ % 2 ? "var(--strong)" : "var(--weak)" }));
}

export default async function MailPage() {
  const m = await requireMember();
  const notes = await inbox(m.profile.id);
  const fontSize = letterFontPx(m);

  return (
    <>
      <PageHead title={idea.name} crumb={[together.crumb]} />
      <div className="bento">
        <Card title={t.inbox(m.profile.displayName)} span={7}>
          <p className="muted small">{t.how}</p>
          {!m.eye && <div className="row"><span className="muted small">{t.standardSize}</span><Btn href="/setup" small>{t.onboarding}</Btn></div>}
          {notes.length === 0 ? <p className="muted">{t.empty}</p> : (
            <LensView label={t.lens}>
              {notes.map((n) => (
                <article key={n.id} className="stack">
                  <div className="row"><b>{t.from(n.fromName)}</b><span className="sp" /><span className="small muted">{dayText(n.createdAt)}</span></div>
                  <div className={`scene ${s.note}`} role="img" aria-label={n.body.replace(/\s+/g, " ")} style={{ fontSize }}>
                    {inked(n.body).map((l, i) => <span key={i} style={{ color: l.ink }}>{l.ch}</span>)}
                  </div>
                </article>
              ))}
            </LensView>
          )}
        </Card>

        <Card title={t.send} span={5}>
          {!m.can("encourage") ? <p className="muted">{together.cannot.encourage}</p> : (
            <StateForm action={sendMail} submit={t.submit}>
              <div className="field">
                <label htmlFor="to">{t.to}</label>
                <select id="to" name="to" required>{m.profiles.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="body">{t.body}</label>
                <textarea id="body" name="body" required maxLength={60} rows={3} aria-describedby="body-hint" style={{ textTransform: "uppercase" }} />
                <span id="body-hint" className="muted small">{t.bodyHint}</span>
              </div>
            </StateForm>
          )}
        </Card>
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
