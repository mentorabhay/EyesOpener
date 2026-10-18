import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Chip, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { initialOf } from "@/components/shell/topbar";
import { NavIcon } from "@/components/shell/icons";
import { account as t } from "@/copy/account";
import { auth as roleWords } from "@/copy/auth";
import { common } from "@/copy/common";
import { isGuardianSeat } from "@/lib/roles";
import { requireMember } from "@/lib/session";
import { signOutEverywhere, signOutHere } from "@/app/(auth)/login/actions";
import { ThemeChoice } from "@/components/shell/theme";
import { renameMe } from "./actions";
import { switchProfile } from "@/lib/actions";
import css from "./account.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

/**
 * The signed-in person's own page, on every device: who they are, how they signed in, what their roles let them do,
 * their household, the settings they reach most, and signing out. Not in child mode: it belongs to a grown-up.
 */
export default async function AccountPage() {
  const m = await requireMember();
  if (m.childMode) notFound();
  const v = m.viewer, u = m.user, n = common.nav;
  const roles = [
    ...(m.seat ? [roleWords.seat[m.seat]] : []),
    ...(v.staff ? [roleWords.staff[v.staff]] : []),
    ...(u.isCounsellor ? [u.counsellorVerifiedAt ? roleWords.counsellor.verified : roleWords.counsellor.waiting] : []),
    ...v.sponsors.map((s) => `${roleWords.sponsor[s.status]} · ${s.name}`),
  ];
  const areas = [
    ...(v.staff ? [{ href: "/admin", label: n.admin }] : []),
    ...(v.counsellor ? [{ href: "/counsellor", label: n.counsellor }] : []),
    ...(v.sponsors.length ? [{ href: "/sponsor", label: n.sponsor }] : []),
  ];
  const guardian = isGuardianSeat(m.seat);
  const links = [
    { href: "/settings/screen", ...t.links.screen },
    { href: "/settings/reminders", ...t.links.reminders },
    { href: "/today/notifications", ...t.links.notifications },
    ...(guardian ? [{ href: "/settings/data", ...t.links.data }] : []),
    { href: "/settings", ...t.links.all },
  ];
  return (
    <>
      <PageHead title={t.title} sub={t.sub} />
      <div className="bento">
        {m.profiles.length > 1 && (
          <Card span={12} title={common.shell.menu.using}>
            <div className={css.profiles}>
              {m.profiles.map((p) => p.id === m.profile.id ? (
                <div key={p.id} className={css.profile} data-on><i aria-hidden="true">{initialOf(p.displayName)}</i><b>{p.displayName}</b><span className={css.tick} aria-hidden="true">✓</span></div>
              ) : (
                <form key={p.id} action={switchProfile}>
                  <input type="hidden" name="profileId" value={p.id} />
                  <button type="submit" className={css.profile} aria-label={common.shell.menu.switchTo(p.displayName)}><i aria-hidden="true">{initialOf(p.displayName)}</i><b>{p.displayName}</b></button>
                </form>
              ))}
            </div>
          </Card>
        )}
        <Card span={7} title={t.you}>
          <div className={css.who}>
            <span className={css.avatar} aria-hidden="true">{initialOf(u.displayName)}</span>
            <div className={css.whoText}>
              <b>{u.displayName}</b>
              <span>{u.email}</span>
              <span className="muted small">{v.real ? t.how.real : t.how.demo}</span>
            </div>
          </div>
          {m.account.demoTester && <p className="notice" role="note">{t.demoCopy(m.account.demoTester)}</p>}
          <StateForm action={renameMe} submit={t.save}>
            <div className="field">
              <label htmlFor="acc-name">{t.name}</label>
              <input id="acc-name" name="name" defaultValue={u.displayName} maxLength={60} required autoComplete="name" />
              <p className="muted small">{t.nameHint}</p>
            </div>
          </StateForm>
        </Card>
        <Card span={5} title={t.roles}>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>{roles.map((r) => <Chip key={r}>{r}</Chip>)}</div>
          <h3 className={css.sub}>{t.household}</h3>
          <p><b>{m.account.displayName}</b> · <span className="muted">{t.profiles(m.profiles.length)}</span></p>
          <p className="muted small">{m.profiles.map((p) => p.displayName).join(", ")}</p>
          {guardian && <Link className="btn btn-sm" href="/family">{t.manageFamily}</Link>}
          {areas.length > 0 && (
            <>
              <h3 className={css.sub}>{t.areas}</h3>
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>{areas.map((a) => <Link key={a.href} className="btn btn-sm" href={a.href}>{a.label}</Link>)}</div>
            </>
          )}
        </Card>
        <Card span={7} title={t.settings}>
          <ul className={css.links}>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href}><span className={css.icon}><NavIcon href={l.href} /></span><span><b>{l.label}</b><small>{l.text}</small></span><span aria-hidden="true" className={css.chev}>›</span></Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card span={5} title={common.shell.theme.label}>
          <ThemeChoice />
          <p className="muted small" style={{ marginTop: 10 }}>{common.shell.theme.hint}</p>
        </Card>
        <Card span={12} title={t.signingOut}>
          <form action={signOutHere}><button className="btn btn-d">{t.signOut}</button></form>
          {v.real && (
            <form action={signOutEverywhere} className="stack" style={{ marginTop: 14 }}>
              <button className="btn">{t.signOutAll}</button>
              <p className="muted small">{t.signOutAllHint}</p>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
