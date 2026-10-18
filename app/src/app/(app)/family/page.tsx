import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StateForm } from "@/components/together/StateForm";
import { Card, Chip, PageHead, Rings, Void } from "@/components/ui";
import { family as t } from "@/copy/family";
import { day } from "@/copy/settings";
import { programmeBySlug } from "@/data";
import { ageFrom, ringShare } from "@/engine";
import { childrenOverview, household, INVITE_SEATS, sponsorGroups } from "@/lib/family";
import { isGuardianSeat } from "@/lib/roles";
import { switchProfile } from "@/lib/actions";
import { common } from "@/copy/common";
import { requireMember } from "@/lib/session";
import { Confirm } from "../settings/confirm";
import css from "../settings/form.module.css";
import { consentGive, consentWithdraw, groupJoin, groupLeave, handOver, inviteCreate, inviteRevoke, pinSet } from "./actions";

export const generateMetadata = (): Metadata => ({ title: t.title });

export default async function FamilyPage() {
  const m = await requireMember();
  if (!isGuardianSeat(m.seat) || m.childMode) notFound();
  const [kids, [people, invites], groups] = await Promise.all([childrenOverview(m), household(m), sponsorGroups(m)]);
  const hasPin = !!m.account.exitPinHash;
  const canSeats = m.can("seats");
  const c = t.children, pp = t.people, cm = t.childMode, sp = t.sponsor;

  return (
    <>
      <PageHead title={t.title} />
      <div className="bento">
        {kids.length === 0 && <Card><p className="muted">{c.none}</p></Card>}
        {kids.map(({ profile, day: today, streak, enrolment, lastCheck, consent }) => {
          const d = { restBreaks: 0, restGoal: 6, trainMinutes: 0, trainGoal: enrolment?.dailyMinutes ?? 0, lightMinutes: 0, lightGoal: 90, ...today };
          return (
            <Card key={profile.id} title={profile.displayName} span={6} right={<div className="row" style={{ gap: 8 }}>
              <Chip>{c.age(ageFrom(profile.birthYear))}</Chip>
              {profile.id !== m.profile.id && (
                <form action={switchProfile}><input type="hidden" name="profileId" value={profile.id} /><button className="btn btn-sm btn-d">{common.shell.menu.switchTo(profile.displayName)}</button></form>
              )}
            </div>}>
              <div className="row">
                <Rings rest={ringShare(d.restBreaks, d.restGoal)} train={ringShare(d.trainMinutes, d.trainGoal)} light={ringShare(d.lightMinutes, d.lightGoal)} size={96} />
                <p className="sp small muted">{c.rings(d.restBreaks, d.restGoal, Math.round(d.trainMinutes), d.trainGoal, Math.round(d.lightMinutes), d.lightGoal)}</p>
              </div>
              <dl className="kv">
                <div><dt>{c.rows.streak}</dt><dd>{c.streak(streak)}</dd></div>
                <div><dt>{c.rows.programme}</dt><dd>{enrolment ? c.programme(programmeBySlug(enrolment.programme)?.name ?? enrolment.programme, enrolment.week) : c.noProgramme}</dd></div>
                <div><dt>{c.rows.lastCheck}</dt><dd>{lastCheck ? day(lastCheck) : <Void label={c.noCheck} />}</dd></div>
              </dl>
              {consent ? (
                <>
                  <p>{c.consentBy(consent.by, day(consent.grantedAt))}</p>
                  <Confirm ask={c.withdraw.ask} warn={c.withdraw.warn}>
                    <form action={consentWithdraw}>
                      <input type="hidden" name="profileId" value={profile.id} />
                      <button className="btn btn-sm btn-d">{c.withdraw.yes}</button>
                    </form>
                  </Confirm>
                </>
              ) : (
                <form action={consentGive} className="stack">
                  <p className="notice" data-b="warn">{c.noConsent}</p>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <label className={css.check}><input type="checkbox" name="confirm" required /><span>{c.confirm}</span></label>
                  <div className="row"><button className="btn btn-d">{c.give}</button></div>
                </form>
              )}
            </Card>
          );
        })}

        <Card title={pp.title} span={6}>
          <div>
            {people.map((u) => (
              <div className="ins" key={u.id}>
                <div className="tx">{u.name}</div>
                {u.id === m.user.id && <Chip tone="ok">{pp.you}</Chip>}
                {u.seat && <Chip>{pp.seat[u.seat]}</Chip>}
              </div>
            ))}
          </div>
          <h3>{pp.invites}</h3>
          {invites.length ? (
            <>
              <div>
                {invites.map((inv) => (
                  <div className="ins" key={inv.id}>
                    <div className="tx"><b className={`tnum ${css.code}`}>{inv.code}</b><div className="sub">{pp.inviteFor(pp.seat[inv.seat], day(inv.createdAt))}</div></div>
                    {canSeats && (
                      <form action={inviteRevoke}>
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <button className="btn btn-sm" aria-label={pp.revokeOf(inv.code)}>{pp.revoke}</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
              <p className="muted small">{pp.how}</p>
            </>
          ) : <p className="muted">{pp.noInvites}</p>}
          {canSeats ? (
            <form action={inviteCreate} className="stack">
              <fieldset className={css.set}>
                <legend>{pp.newLabel}</legend>
                {INVITE_SEATS.map((seat) => (
                  <label className={css.check} key={seat}><input type="radio" name="seat" value={seat} required />{pp.seatWhat[seat]}</label>
                ))}
              </fieldset>
              <div className="row"><button className="btn btn-d">{pp.create}</button></div>
            </form>
          ) : <p className="notice">{pp.guardianOnly}</p>}
        </Card>

        <Card title={cm.title} span={6}>
          <p className="muted small">{cm.about}</p>
          <p className="notice" data-b={hasPin ? "ok" : "warn"}>{hasPin ? cm.pinSet : cm.pinMissing}</p>
          {kids.map(({ profile, consent }) => consent ? (
            <form action={handOver} key={profile.id}>
              <input type="hidden" name="profileId" value={profile.id} />
              <button className="btn" disabled={!hasPin}>{cm.hand(profile.displayName)}</button>
            </form>
          ) : <p className="muted small" key={profile.id}>{cm.needsConsent(profile.displayName)}</p>)}
          {canSeats ? (
            <StateForm action={pinSet} submit={cm.pinSave(hasPin)}>
              <div className="field">
                <label htmlFor="exit-pin">{cm.pinLabel(hasPin)}</label>
                <input id="exit-pin" className="input" type="password" name="pin" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="off" />
              </div>
            </StateForm>
          ) : <p className="notice">{cm.guardianOnly}</p>}
          <p className="muted small">{cm.forgot}</p>
        </Card>

        <Card title={sp.title} span={6}>
          <p className="muted small">{sp.about}</p>
          {groups.length ? (
            <div>
              {groups.map((g) => (
                <div className="ins" key={g.id}>
                  <div className="tx">{g.name}<div className="sub">{sp.group(g.sponsor, day(g.joinedAt))}</div></div>
                  <form action={groupLeave}>
                    <input type="hidden" name="groupId" value={g.id} />
                    <button className="btn btn-sm" aria-label={sp.leaveOf(g.name)}>{sp.leave}</button>
                  </form>
                </div>
              ))}
            </div>
          ) : <p>{sp.none}</p>}
          <StateForm action={groupJoin} submit={sp.join}>
            <div className="field">
              <label htmlFor="group-code">{sp.code}</label>
              <input id="group-code" type="text" name="code" required maxLength={20} autoComplete="off" autoCapitalize="characters" />
            </div>
          </StateForm>
        </Card>
      </div>
      <More><p>{t.sub}</p></More>
    </>
  );
}
