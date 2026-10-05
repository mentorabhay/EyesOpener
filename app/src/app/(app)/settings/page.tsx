import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, Chip, Empty, PageHead, Void } from "@/components/ui";
import { day, settings as t } from "@/copy/settings";
import { programmeBySlug, programmes } from "@/data";
import { db, schema } from "@/db";
import { ageFrom, MIN_SCREEN_AGE, percent } from "@/engine";
import { switchProfile } from "@/lib/actions";
import { blockedBy, gates } from "@/lib/family";
import { requireMember } from "@/lib/session";
import { askCounsellor, leave, start } from "./actions";
import { Confirm } from "./confirm";
import { DataCard } from "./data/card";

export const metadata: Metadata = { title: t.title };

export default async function SettingsPage() {
  const m = await requireMember();
  const [g, devices] = await Promise.all([
    gates(m, m.profile.id),
    db.select().from(schema.device).where(eq(schema.device.accountId, m.account.id)).orderBy(desc(schema.device.calibratedAt)),
  ]);
  if (!g) throw new Error("The active profile is not in this account.");
  const { eye, enrolment } = m;
  const programme = enrolment ? programmeBySlug(enrolment.programme) : null;
  const waiting = programme?.level === 2 && enrolment?.dailyMinutes === 0;
  const e = t.eye, f = t.family, p = t.programme, c = t.counsellor;
  /* A cheer seat may look. Every control that writes is left out for them, and the actions refuse them too. */
  const canManage = m.can("manage_family");

  return (
    <>
      <PageHead title={t.title} sub={t.sub(m.profile.displayName)} />
      {!canManage && <p className="notice">{t.guardianOnly}</p>}
      <div className="bento">
        <Card title={e.title} span={7} right={m.can("test") && <Btn href="/onboarding" small kind={eye ? "" : "g"}>{eye ? e.again : e.empty.cta}</Btn>}>
          {eye ? (
            <dl className="kv">
              <div><dt>{e.rows.weak}</dt><dd>{eye.weakEye ? e.name[eye.weakEye] : e.noWeak}</dd></div>
              <div><dt>{e.rows.lens}</dt><dd>{e.lens(eye.cyanEye)}</dd></div>
              <div><dt>{e.rows.contrast}</dt><dd className="tnum">{percent(eye.strongContrast)}</dd></div>
              <div><dt>{e.rows.letter}</dt><dd className="tnum">{e.mm(eye.letterCm)}</dd></div>
              <div><dt>{e.rows.target}</dt><dd className="tnum">{e.mm(eye.targetCm)}</dd></div>
              <div><dt>{e.rows.text}</dt><dd className="tnum">{e.px(eye.appTextPx)}</dd></div>
              <div><dt>{e.rows.faint}</dt><dd>{eye.faintText ? e.faint.on : e.faint.off}</dd></div>
              <div><dt>{e.rows.measured}</dt><dd>{day(eye.createdAt)}</dd></div>
            </dl>
          ) : <Empty title={e.empty.title}><span>{e.empty.body}</span></Empty>}
        </Card>

        <Card title={f.title} span={5} right={canManage && <Btn href="/settings/profiles/new" small>{f.add}</Btn>}>
          <div>
            {m.profiles.map((pr) => {
              const age = ageFrom(pr.birthYear);
              const active = pr.id === m.profile.id;
              return (
                <div className="ins" key={pr.id}>
                  <div className="tx">
                    <span className="row"><b>{pr.displayName}</b>{active && <Chip tone="ok">{f.active}</Chip>}</span>
                    <div className="sub">{f.line(f.kind[pr.kind], age, pr.accessLevel)}</div>
                    {age !== null && age < MIN_SCREEN_AGE && <div className="sub">{f.under4}</div>}
                  </div>
                  {!active && (
                    <form action={switchProfile}>
                      <input type="hidden" name="profileId" value={pr.id} />
                      <button className="btn btn-sm" aria-label={f.switchTo(pr.displayName)}>{f.switch}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card title={p.title} span={7}>
          {enrolment ? (
            <>
              {g.triage?.redFlag && (programme?.level ?? 0) > 0 && <p className="notice" data-b="danger">{p.blocked.doctor_first}</p>}
              <dl className="kv">
                <div><dt>{p.rows.name}</dt><dd>{programme?.name ?? enrolment.programme}</dd></div>
                <div><dt>{p.rows.minutes}</dt><dd>{waiting ? p.waiting : p.minutes(enrolment.dailyMinutes)}</dd></div>
                <div><dt>{p.rows.days}</dt><dd className="tnum">{waiting ? <Void label={p.notSet} /> : enrolment.daysPerWeek}</dd></div>
                <div><dt>{p.rows.week}</dt><dd className="tnum">{enrolment.week}</dd></div>
                <div><dt>{p.rows.basis}</dt><dd>{programme?.doseBasis ?? <Void label={p.notSet} />}</dd></div>
              </dl>
              {canManage && (
                <Confirm ask={p.leave.ask} warn={p.leave.warn}>
                  <form action={leave}>
                    <input type="hidden" name="profileId" value={m.profile.id} />
                    <button className="btn btn-sm btn-d">{p.leave.yes}</button>
                  </form>
                </Confirm>
              )}
            </>
          ) : (
            <>
              <p className="muted">{canManage ? p.pick : p.none}</p>
              {p.levels.map((level, n) => {
                const why = blockedBy(g, n);
                return (
                  <div className="stack" key={level.name}>
                    <div><h3>{level.name}</h3><p className="muted small">{level.what}</p></div>
                    {why && (
                      <p className="notice" data-b={why === "doctor_first" ? "danger" : "warn"}>
                        {p.blocked[why]}
                        {canManage && (why === "needs_triage" || why === "doctor_first") && <> <Link href="/settings/triage">{p.triageLink}</Link></>}
                      </p>
                    )}
                    <div>
                      {programmes.filter((pg) => pg.level === n).map((pg) => (
                        <div className="ins" key={pg.slug}>
                          <div className="tx">{pg.name}<div className="sub">{pg.doseBasis}</div></div>
                          {canManage && !why && (
                            <form action={start}>
                              <input type="hidden" name="profileId" value={m.profile.id} />
                              <input type="hidden" name="slug" value={pg.slug} />
                              <button className="btn btn-sm" aria-label={p.startOf(pg.name)}>{p.start}</button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </Card>

        <Card title={c.title} span={5}>
          <p className="muted small">{c.about}</p>
          {g.links.length ? (
            <div>
              {g.links.map((l) => (
                <div className="ins" key={l.id}>
                  <div className="tx">{l.name}</div>
                  <Chip tone={l.status === "active" ? "ok" : l.status === "pending" ? "warn" : "plain"}>{c.status[l.status]}</Chip>
                </div>
              ))}
            </div>
          ) : <p>{c.none}</p>}
          {canManage && (
            <StateForm action={askCounsellor} submit={c.ask}>
              <input type="hidden" name="profileId" value={m.profile.id} />
              <div className="field">
                <label htmlFor="counsellor-email">{c.email}</label>
                <input id="counsellor-email" className="input" type="email" name="email" required maxLength={200} autoComplete="off" />
              </div>
            </StateForm>
          )}
        </Card>

        <Card title={t.devices.title} span={6} right={<Btn href="/settings/screen" small>{t.devices.colours}</Btn>}>
          {devices.length ? (
            <div>
              {devices.map((dv) => (
                <div className="ins" key={dv.id}>
                  <div className="tx">{dv.label}<div className="sub">{t.devices.line(t.devices.kind[dv.kind], dv.pxPerCm, dv.distanceCm, day(dv.calibratedAt))}</div></div>
                </div>
              ))}
            </div>
          ) : <Empty title={t.devices.empty.title}><span>{t.devices.empty.body}</span></Empty>}
        </Card>

        {/* The family's copy of its data, and deletion: src/app/(app)/settings/data/card.tsx */}
        <DataCard m={m} />
      </div>
    </>
  );
}
