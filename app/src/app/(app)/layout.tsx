import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { NavGroups, TabBar } from "@/components/nav";
import { common } from "@/copy/common";
import { pageZoom, strongInk } from "@/engine";
import { isGuardianSeat } from "@/lib/roles";
import { requireMember } from "@/lib/session";

const n = common.nav;
/* Functions, not lists made once: the labels are read for each request, in that reader's language (docs/LANGUAGES.md). */
const groups = () => [
  { title: n.track, items: [{ href: "/today", label: n.today }] },
  { title: n.test, items: [{ href: "/test", label: n.checkups }, { href: "/onboarding", label: n.onboarding }] },
  { title: n.train, items: [{ href: "/train", label: n.games }, { href: "/train/exercises", label: n.exercises }, { href: "/train/cinema", label: n.cinema }] },
  { title: n.together, items: [{ href: "/together", label: n.community }, { href: "/together/league", label: n.league }] },
];
const tabs = () => [{ href: "/today", label: n.track }, { href: "/test", label: n.test }, { href: "/train", label: n.train }, { href: "/together", label: n.together }, { href: "/settings", label: n.settings }];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  /* The member's eye profile reaches every screen here: the red ink, and the size of the app's own text. */
  const con = m.eye?.strongContrast ?? 1;
  const zoom = pageZoom(m.eye?.appTextPx);
  /* Each person sees only the areas their roles open. Child mode hides the grown-up links. */
  const you = m.childMode ? [] : [
    ...(isGuardianSeat(m.seat) ? [{ href: "/family", label: n.family }] : [{ href: "/circle", label: n.circle }]),
    { href: "/settings", label: n.settings },
  ];
  const areas = [
    ...(m.viewer.staff ? [{ href: "/admin", label: n.admin }] : []),
    ...(m.viewer.counsellor ? [{ href: "/counsellor", label: n.counsellor }] : []),
    ...(m.viewer.sponsors.length ? [{ href: "/sponsor", label: n.sponsor }] : []),
    { href: "/login", label: n.switchPerson },
  ];
  const style = { "--strong": strongInk(con, m.device?.gamma ?? 2.2) } as CSSProperties;
  return (
    <div className="shell" style={style}>
      <aside className="side">
        <Link href="/today" className="logo"><span className="mark" aria-hidden="true"><i /><i /></span>{common.product}</Link>
        <Link href={m.childMode ? "/leave-child-mode" : "/settings"} className="who">
          <b>{m.profile.displayName}</b>
          <span>{m.childMode ? n.leaveChildMode : `${m.user.displayName} · ${m.account.displayName}`}</span>
        </Link>
        <NavGroups groups={[...groups(), { title: n.you, items: you }, ...(areas.length && !m.childMode ? [{ title: n.otherAreas, items: areas }] : [])]} />
        <p className="foot">{common.notMedical}</p>
      </aside>
      <div className="main">
        <main className="page" style={{ zoom }}>
          {m.tester && <p className="notice" role="note">{common.tester} <Link href="/admin/catalogue">{common.testerLink}</Link></p>}
          {children}
        </main>
      </div>
      <TabBar items={m.childMode ? [...tabs().slice(0, 4), { href: "/leave-child-mode", label: n.grownUp }] : tabs()} />
    </div>
  );
}
