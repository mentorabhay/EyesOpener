import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Btn, Card, Chip, Empty, PageHead, Void } from "@/components/ui";
import { counsellor as t, day, shortDay } from "@/copy/counsellor";
import { notify } from "@/copy/notify";
import { setup as setupWords } from "@/copy/setup";
import { missing } from "@/lib/setup-rules";
import { lens } from "@/copy/lens";
import { MAX_DAILY_MINUTES, percent } from "@/engine";
import { requireCounsellor } from "@/lib/auth";
import { memberView, NOTE_MAX } from "@/lib/counsellor";
import { end } from "./actions";
import { DoseForm, NoteForm } from "./forms";
import css from "./member.module.css";
import { WeekCard } from "./week";

export const generateMetadata = (): Metadata => ({ title: t.member.crumb });

export default async function MemberPage({ params }: { params: Promise<{ linkId: string }> }) {
  const viewer = await requireCounsellor();
  const linkId = z.uuid().safeParse((await params).linkId);
  if (!linkId.success) notFound();
  /* Null unless the link belongs to this counsellor and is active. */
  const m = await memberView(viewer, linkId.data);
  if (!m) notFound();

  const { about: a, eye: e, results: r, practice: p, stops: s, dose: d, notes: n, end: x } = t.member;
  const top = Math.max(60, ...m.practice.map((b) => b.minutes));
  const practisedDays = m.practice.filter((b) => b.minutes > 0).length;
  const practisedMinutes = m.practice.reduce((sum, b) => sum + b.minutes, 0);
  const level2 = m.enrolments.find((en) => en.level === 2);
  const fromTrials = m.enrolments.filter((en) => en.level !== 2);

  return (
    <>
      <PageHead title={m.name} sub={t.member.sub} crumb={[{ href: "/counsellor", label: t.member.crumb }]}>
        <Btn href={`/counsellor/members/${linkId.data}/reminders`} small>{notify.page.title}</Btn>
      </PageHead>
      <div className="bento">
        <Card title={a.title} span={5}>
          <dl className="kv">
            <div><dt>{a.rows.name}</dt><dd>{m.name}</dd></div>
            <div><dt>{a.rows.age}</dt><dd>{t.age(m.age)}</dd></div>
            <div><dt>{a.rows.level}</dt><dd>{a.levels[m.accessLevel] ?? m.accessLevel}</dd></div>
            <div><dt>{a.rows.since}</dt><dd>{day(m.askedAt)}</dd></div>
          </dl>
        </Card>

        <Card title={e.title} span={7}>
          {!m.setup.ready && <p className="notice" data-b="warn">{setupWords.counsellor(m.setup.done, m.setup.of, missing(m.setup.steps).map((st) => setupWords.steps[st.key].name))}</p>}
          {m.eye ? (
            <dl className="kv">
              <div><dt>{e.rows.weak}</dt><dd>{m.eye.weakEye ? e.name[m.eye.weakEye] : e.noWeak}</dd></div>
              {m.weakInk === "red" && <div><dt>{lens.settingsRow}</dt><dd>{lens.counsellorLine(m.weakInkAt ? day(m.weakInkAt) : null)}</dd></div>}
              <div><dt>{e.rows.contrast}</dt><dd className="tnum">{percent(m.eye.strongContrast)}<small>{m.eye.balanceLogRatio === null ? e.fromStart : e.fromBalance}</small></dd></div>
              <div><dt>{e.rows.letter}</dt><dd className="tnum">{e.mm(m.eye.letterCm)}</dd></div>
              <div><dt>{e.rows.target}</dt><dd className="tnum">{e.mm(m.eye.targetCm)}</dd></div>
              <div><dt>{e.rows.text}</dt><dd className="tnum">{e.px(m.eye.appTextPx)}</dd></div>
              <div><dt>{e.rows.measured}</dt><dd>{day(m.eye.createdAt)}</dd></div>
            </dl>
          ) : <Empty title={e.none.title}><span>{e.none.body}</span></Empty>}
        </Card>

        <Card title={r.title} span={12}>
          <p className="muted small">{r.about}</p>
          <div className="tbwrap">
            <table className="tb">
              <thead><tr><th scope="col">{r.cols.test}</th><th scope="col">{r.cols.eye}</th><th scope="col">{r.cols.first}</th><th scope="col">{r.cols.last}</th><th scope="col">{r.cols.change}</th></tr></thead>
              <tbody>
                {m.results.map((line) => (
                  <tr key={line.test.key + (line.eye ?? "")}>
                    <td>{line.test.name}</td>
                    <td>{r.eye[line.eye ?? "both"]}</td>
                    <td>{line.first ? <><b className="tnum">{line.first.text}</b><div className="small muted">{day(line.first.at)}</div></> : <Void label={r.notMeasured} />}</td>
                    <td>{line.last ? <><b className="tnum">{line.last.text}</b><div className="small muted">{day(line.last.at)}</div></> : <Void label={r.notMeasured} />}</td>
                    <td>
                      {line.change ? <Chip tone={line.change === "better" ? "ok" : line.change === "worse" ? "risk" : "plain"}>{r.change[line.change]}</Chip>
                        : line.first ? <span className="small muted">{r.once}</span> : <Void label={r.notMeasured} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={p.title} span={7}>
          <div className={css.bars} role="img" aria-label={m.practice.map((b) => p.bar(shortDay(b.key), b.minutes)).join(", ")}>
            {m.practice.map((b) => (
              <div className={css.bar} key={b.key}>
                <span className="tnum">{b.minutes || ""}</span>
                {b.minutes ? <div className={css.fill} style={{ height: `${Math.max(8, (b.minutes / top) * 88)}px` }} /> : <div className={`prog hatched ${css.none}`} />}
                <span className="tnum">{Number(b.key.slice(8))}</span>
              </div>
            ))}
          </div>
          <p className="tnum">{p.total(practisedDays, practisedMinutes)}</p>
          <p className="muted small">{p.note}</p>
        </Card>

        <Card title={s.title} span={5}>
          <p className="muted small">{s.about}</p>
          {m.stops.length ? (
            <div>
              {m.stops.map((stop) => (
                <div className="ins" key={stop.id}>
                  <div className="tx">
                    <b>{(stop.symptom && s.symptom[stop.symptom]) || s.unknown}</b>
                    <div className="sub">{s.line(stop.item, day(stop.startedAt), stop.minutes)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p>{s.none}</p>}
        </Card>

        <Card title={d.title} span={6}>
          {level2 ? (
            <>
              <p className="muted small">{d.about}</p>
              <dl className="kv">
                <div><dt>{d.rows.programme}</dt><dd>{d.programme(level2.name, level2.week)}</dd></div>
                <div><dt>{d.rows.now}</dt><dd className="tnum">{level2.dailyMinutes > 0 ? d.now(level2.dailyMinutes, level2.daysPerWeek) : <><Void label={d.notSet} /> <small>{d.notSet}</small></>}</dd></div>
                <div><dt>{d.rows.by}</dt><dd>{level2.approvedBy === null ? d.byNobody : level2.approvedBy === viewer.user.id ? d.byYou : d.byOther}</dd></div>
              </dl>
              <DoseForm linkId={m.linkId} enrolmentId={level2.id} dailyMinutes={level2.dailyMinutes} daysPerWeek={level2.daysPerWeek} max={MAX_DAILY_MINUTES} />
            </>
          ) : (
            <>
              <p>{d.none}</p>
              {fromTrials.map((en) => (
                <p className="notice" key={en.id}>
                  {d.trial(en.name)} <span className="tnum">{en.dailyMinutes > 0 ? d.now(en.dailyMinutes, en.daysPerWeek) + "." : ""}</span>
                </p>
              ))}
            </>
          )}
        </Card>

        <Card title={n.title} span={6}>
          <p className="muted small">{n.family}</p>
          <NoteForm linkId={m.linkId} max={NOTE_MAX} />
          {m.notes.length ? (
            <div>
              {m.notes.map((note) => (
                <div className="ins" key={note.id}>
                  <div className="tx">
                    <div className={css.note}>{note.body}</div>
                    <div className="sub">{day(note.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="muted">{n.none}</p>}
        </Card>

        {/* The member's week on their programme, read-only. For a counsellor-led programme it is a suggestion. */}
        <WeekCard viewer={viewer} linkId={m.linkId} />

        <Card title={x.title} span={12}>
          <p className="muted small">{x.about}</p>
          <details className={css.confirm}>
            <summary className="btn btn-sm">{x.ask}</summary>
            <div className="stack">
              <p className="small">{x.warn}</p>
              <form action={end}>
                <input type="hidden" name="linkId" value={m.linkId} />
                <button className="btn btn-sm btn-d">{x.yes}</button>
              </form>
            </div>
          </details>
        </Card>
      </div>
    </>
  );
}
