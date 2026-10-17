import Link from "next/link";
import { BrandMark } from "@/components/brand";
import type { CSSProperties, ReactNode } from "react";
import { InkTuneSet } from "@/components/ink-tune";
import { NavGroups, TabBar } from "@/components/nav";
import { common } from "@/copy/common";
import { kids } from "@/copy/kids";
import { pageZoom, strongInk, trainRed, tuneOf } from "@/engine";
import { isGuardianSeat } from "@/lib/roles";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupBar, SetupLink } from "@/components/setup/setup";

const n = common.nav;
/* Functions, not lists made once: the labels are read for each request, in that reader's language (docs/LANGUAGES.md). */
const groups = (child: boolean) => [
  { title: n.track, items: [child ? { href: "/kids", label: kids.home } : { href: "/today", label: n.today }] },
  { title: n.test, items: [{ href: "/test", label: n.checkups }, ...(child ? [] : [{ href: "/setup", label: n.onboarding }])] },
  { title: n.train, items: [{ href: "/train", label: n.games }, { href: "/train/exercises", label: n.exercises }, { href: "/train/cinema", label: n.cinema }] },
  { title: n.together, items: [{ href: "/together", label: n.community }, { href: "/together/league", label: n.league }] },
];
const tabs = (child = false) => [child ? { href: "/kids", label: kids.home } : { href: "/today", label: n.track }, { href: "/test", label: n.test }, { href: "/train", label: n.train }, { href: "/together", label: n.together }, { href: "/settings", label: n.settings }];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  /* Setup sits at the top of the sidebar, with its ring, until every required step is done (src/lib/setup-rules.ts).
     Not in child mode: setup is a grown-up's job, and the child's tiles say to ask one. */
  const setup = await setupOf(m);
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
  /* the inks of this screen as tuned for its glasses (engine/tune.ts): set for the browser's scenes, and for the red ink here */
  const tune = tuneOf(m.device);
  const style = { "--strong": strongInk(trainRed(con, tune), m.device?.gamma ?? 2.2) } as CSSProperties;
  return (
    <div className="shell" style={style}>
      <a className="skip" href="#page">{n.skip}</a>
      <InkTuneSet tune={tune} />
      <aside className="side">
        <Link href={m.childMode ? "/kids" : "/today"} className="logo"><BrandMark />{common.product}</Link>
        <Link href={m.childMode ? "/leave-child-mode" : "/settings"} className="who">
          <b>{m.profile.displayName}</b>
          <span>{m.childMode ? n.leaveChildMode : `${m.user.displayName} · ${m.account.displayName}`}</span>
        </Link>
        {setup.held && !m.childMode && <SetupLink s={setup} />}
        <nav aria-label={n.menu}><NavGroups groups={[...groups(m.childMode), { title: n.you, items: you }, ...(areas.length && !m.childMode ? [{ title: n.otherAreas, items: areas }] : [])]} /></nav>
        <p className="foot">{common.notMedical}</p>
      </aside>
      <div className="main">
        <main id="page" className="page" style={{ zoom }} tabIndex={-1}>
          {m.tester && <p className="notice" role="note">{common.tester} <Link href="/admin/catalogue">{common.testerLink}</Link></p>}
          {setup.held && !m.childMode && <SetupBar s={setup} />}
          {children}
        </main>
      </div>
      <TabBar items={m.childMode ? [...tabs(true).slice(0, 4), { href: "/leave-child-mode", label: n.grownUp }] : tabs()} />
    </div>
  );
}
