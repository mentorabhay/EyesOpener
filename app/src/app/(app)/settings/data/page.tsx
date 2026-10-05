import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, Chip, PageHead } from "@/components/ui";
import { data as t, day, dayTime } from "@/copy/data";
import { percent } from "@/engine";
import { buildFamilyFile } from "@/lib/data/export";
import { copyToDownload } from "@/lib/data/requests";
import { summarise, type ProfileSummary } from "@/lib/data/summary";
import { requireMember } from "@/lib/session";
import { PrintButton } from "./print-button";
import css from "./summary.module.css";

const s = t.summary;
export const metadata: Metadata = { title: s.title, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The short, printable form of the family's copy. Open to the same people, under the same conditions, as the
 * download itself: a guardian of this household, with a copy that was asked for and is still open. Anyone else
 * gets "not found". It is built from the same file as the download, read fresh from the database.
 */
export default async function DataSummaryPage() {
  const m = await requireMember();
  const now = new Date();
  if (m.childMode || !m.can("data") || !(await copyToDownload(m, now))) notFound();
  const file = await buildFamilyFile(m.account.id, { id: m.user.id, email: m.user.email }, now);
  if (!file) notFound();
  const sum = summarise(file), h = s.household, r = s.profile.rows;
  const on = (d: Date | null) => (d ? day(d) : s.profile.none);

  const facts = (p: ProfileSummary): [string, string][] => [
    [r.programme, p.programmes.length ? p.programmes.map((e) => s.profile.programme(e.name, e.status, e.week)).join("; ") : s.profile.none],
    [r.eye, p.eye ? s.profile.eye(p.eye.weakEye ? s.profile.eyeName[p.eye.weakEye] ?? p.eye.weakEye : null, percent(p.eye.strongContrast), on(p.eye.at)) : s.profile.none],
    [r.checkUps, p.checkUps.length ? p.checkUps.map((c) => s.profile.checkUp(c.name, s.profile.measured(c.n, on(c.first), on(c.last)))).join("; ") : s.profile.none],
    [r.sessions, String(p.sessions)],
    [r.minutes, String(p.minutes)],
    [r.stopped, String(p.stopped)],
    [r.days, String(p.days)],
    [r.plans, String(p.plans)],
    [r.care, String(p.care)],
    [r.monitor, String(p.monitor)],
    [r.counsellors, p.counsellors.length ? p.counsellors.map((c) => s.profile.counsellor(c.name, c.status)).join("; ") : s.profile.none],
    [r.shared, s.profile.shared(p.stories, p.ideas, p.weekNotes)],
    [r.mail, s.profile.mail(p.mail, p.lights)],
    [r.safety, String(p.safety)],
    ...(p.kind === "child" ? [[r.consent, s.profile.consent(p.consent.n, p.consent.live)] as [string, string]] : []),
  ];

  return (
    <div className={css.sheet}>
      <PageHead title={s.title} sub={s.sub(sum.household.name, dayTime(sum.madeAt))} crumb={[{ href: "/settings", label: s.back }]} />
      <div className={`row ${css.hide}`}>
        <PrintButton label={s.print} />
        <a className="btn" href="/settings/data/export" download>{s.download}</a>
      </div>
      <p className="notice">{s.lead} {s.notMedical}</p>

      <div className="bento">
        <Card title={h.title} span={5}>
          <dl className="kv">
            <div><dt>{h.name}</dt><dd>{sum.household.name}</dd></div>
            <div><dt>{h.since}</dt><dd>{on(sum.household.since)}</dd></div>
            <div><dt>{h.language}</dt><dd>{h.languages[sum.household.locale] ?? sum.household.locale}</dd></div>
            <div><dt>{h.exitPin}</dt><dd>{sum.household.exitPinSet ? h.set : h.notSet}</dd></div>
            <div><dt>{h.screens}</dt><dd className="tnum">{sum.household.screens}</dd></div>
            <div><dt>{h.groups}</dt><dd className="tnum">{sum.household.groups}</dd></div>
            <div><dt>{h.invites}</dt><dd className="tnum">{sum.household.invites}</dd></div>
          </dl>
        </Card>

        <Card title={s.people.title} span={7}>
          {sum.people.length ? (
            <div>
              {sum.people.map((p, i) => (
                <div className="ins" key={i}>
                  <div className="tx">
                    <b>{p.name}</b>
                    <div className="sub">{s.people.line(s.seat[p.seat ?? "none"] ?? p.seat ?? "", p.email || s.people.hidden, on(p.since))}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="muted">{s.people.none}</p>}
        </Card>

        {sum.profiles.map((p) => (
          <Card key={p.id} span={12} title={<span className={css.who}>{p.name}<Chip>{s.profile.kind[p.kind] ?? p.kind}</Chip></span>}>
            <p className="muted small">{[p.kind === "child" ? s.profile.born(p.birthYear) : null, p.archived ? s.profile.archived : null].filter(Boolean).join(", ")}</p>
            <dl className="kv">
              {facts(p).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            {p.notes.length > 0 && (
              <div className="stack">
                <h3>{s.notes.title}</h3>
                {p.notes.map((n, i) => (
                  <div className="ins" key={i}><div className="tx"><div className={css.note}>{n.body}</div><div className="sub">{s.notes.by(n.by, on(n.at))}</div></div></div>
                ))}
              </div>
            )}
          </Card>
        ))}

        <Card title={s.parts.title} span={12}>
          <div>
            {sum.parts.map((p) => (
              <div className="ins" key={p.key}>
                <div className="tx"><b>{p.title}</b><div className="sub">{p.what}</div></div>
                <span className={`tnum ${css.rows}`}>{s.parts.count(p.rows)}</span>
              </div>
            ))}
          </div>
          <p className="muted small">{s.parts.total(sum.total)}</p>
        </Card>

        <Card title={s.leftOut.title} span={12}>
          <ul className={css.list}>{sum.leftOut.map((line) => <li key={line}>{line}</li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
