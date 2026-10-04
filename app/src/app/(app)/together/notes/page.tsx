import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { ideaBySlug, programmeBySlug } from "@/data";
import { aheadNotes, currentWeek, ownNote } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { leaveNote } from "./actions";

const t = together.notes;
const idea = ideaBySlug("notes-from-four-weeks-ahead")!;
export const metadata: Metadata = { title: idea.name };

export default async function NotesPage() {
  const m = await requireMember();
  const week = currentWeek(m);
  if (!m.enrolment || week === null) {
    return (
      <>
        <PageHead title={idea.name} sub={idea.what} crumb={[together.crumb]} />
        <p className="notice">{t.noProgramme}</p>
      </>
    );
  }
  const programme = m.enrolment.programme;
  const [notes, mine] = await Promise.all([aheadNotes(programme, week), ownNote(m.profile.id, programme, week)]);

  return (
    <>
      <PageHead title={idea.name} sub={`${t.reached(programmeBySlug(programme)?.name ?? programme, week)} ${idea.what}`} crumb={[together.crumb]} />
      <div className="bento">
        <Card title={t.title} span={7}>
          {notes.length === 0 && <p className="muted">{t.empty}</p>}
          <div>
            {notes.map((n) => (
              <div className="ins" key={n.id}>
                <div className="tx">{n.body}<div className="sub">{n.signature}</div></div>
                <Chip>{t.week(n.week)}</Chip>
              </div>
            ))}
          </div>
          <p className="muted small">{t.later}</p>
        </Card>

        <Card title={t.leave(week)} span={5}>
          {mine ? <p className="notice" data-b={mine.status === "published" ? "ok" : undefined}>{mine.status === "published" ? t.minePublished(week) : mine.status === "in_review" ? t.mineWaiting(week) : t.mineOther(week)}</p>
            : !m.can("share") ? <p className="muted">{together.cannot.share}</p> : (
            <>
              <p className="muted small">{t.leaveHint}</p>
              <StateForm action={leaveNote} submit={t.submit}>
                <div className="field"><label htmlFor="body">{t.body}</label><textarea id="body" name="body" required minLength={10} maxLength={280} rows={4} /></div>
                <div className="field">
                  <label htmlFor="signature">{t.signature}</label>
                  <input id="signature" name="signature" type="text" required minLength={3} maxLength={60} aria-describedby="signature-hint" />
                  <span id="signature-hint" className="muted small">{t.signatureHint}</span>
                </div>
              </StateForm>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
