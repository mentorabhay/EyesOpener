// Eyes Opener: The member's week on their programme, read-only, for the counsellor.
/**
 * The member's week on their programme, read-only, for the counsellor.
 * For a counsellor-led programme the plan is a suggestion: the counsellor sets the minutes and the days in the
 * dose card. Nothing here can be changed, and reading it writes nothing.
 */
import { Days } from "@/components/programme/days";
import { Card, Chip, Empty } from "@/components/ui";
import { programme as t } from "@/copy/programme";
import type { Viewer } from "@/lib/auth";
import { memberWeek } from "@/lib/programme";

export async function WeekCard({ viewer, linkId }: { viewer: Viewer; linkId: string }) {
  /* Null unless the link belongs to this counsellor and is active: the page has already answered "not found" then. */
  const w = await memberWeek(viewer, linkId);
  if (!w) return null;
  const c = t.counsellor;
  return (
    <Card title={c.title} span={12} right={w.state === "active" ? <Chip>{c.week(w.programme.name, w.week, w.weeks)}</Chip> : undefined}>
      <p className="muted small">{c.about}</p>
      {w.state === "none" && <p>{c.none}</p>}
      {w.state === "over" && <p className="notice">{c.over(w.weeks)}</p>}
      {w.state === "active" && (
        <>
          {w.counsellorLed && <p className="notice">{c.suggestion}</p>}
          <div className="bento">
            <div className="span6 stack">
              <h3>{c.chapter}: {t.chapters[w.chapter.key]?.name ?? w.chapter.key}</h3>
              <p className="muted small">{t.chapters[w.chapter.key]?.about}</p>
              {w.waiting && <p className="small">{c.notSet}</p>}
              {w.chapter.parts.length ? (
                <div>
                  {w.chapter.parts.map((p, i) => (
                    <div className="ins" key={p.key}>
                      <div className="tx">
                        <b>{c.part(t.parts[p.key]?.name ?? p.key, p.minutes)}</b>
                        <div className="sub">{p.items.map((it) => (it.kind === "film" ? t.cinema : it.name)).join(", ")}</div>
                      </div>
                      {p.kind === "care" ? <Chip>{t.today.care}</Chip> : w.done.parts[i].state === "done" ? <Chip tone="ok">{t.today.done}</Chip> : w.chapter.minutes > 0 ? <span className="small tnum muted">{t.today.partMinutes(w.done.parts[i].done, w.done.parts[i].goal)}</span> : null}
                    </div>
                  ))}
                </div>
              ) : <Empty title={t.today.empty.title}><span>{t.today.empty.body}</span></Empty>}
            </div>
            <div className="span6 stack">
              <h3>{c.days}</h3>
              <Days days={w.days} habit={w.habit} />
              <h3>{c.checks}</h3>
              {w.checks.length ? (
                <div>
                  {w.checks.map((k) => (
                    <div className="ins" key={k.test}>
                      <div className="tx">{k.def.name}</div>
                      <Chip tone={k.done ? "ok" : "plain"}>{k.done ? c.checkDone : c.checkDue}</Chip>
                    </div>
                  ))}
                </div>
              ) : <p className="muted">{c.noChecks}</p>}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
