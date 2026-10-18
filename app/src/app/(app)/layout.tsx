import Link from "next/link";
import { BrandMark } from "@/components/brand";
import type { CSSProperties, ReactNode } from "react";
import { InkTuneSet } from "@/components/ink-tune";
import { NavGroups, TabBar } from "@/components/nav";
import { common } from "@/copy/common";
import { pageZoom, strongInk, trainRed, tuneOf } from "@/engine";
import { requireMember } from "@/lib/session";
import { setupOf } from "@/lib/setup";
import { SetupBar, SetupLink } from "@/components/setup/setup";
import { NotifyBell } from "@/components/notify/bell";
import { AppFooter } from "@/components/shell/footer";
import { menuGroups, menuTabs } from "@/components/shell/menu";
import { RAIL_BOOT } from "@/components/shell/rail";
import { TopBar, initialOf, zoomStyle } from "@/components/shell/topbar";
import { Dock } from "@/components/assistant/dock";
import { assist } from "@/lib/assist/extra";
import { unreadCount } from "@/lib/notify/service";

const n = common.nav;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const m = await requireMember();
  /* Setup sits at the top of the sidebar, with its ring, until every required step is done (src/lib/setup-rules.ts).
     Not in child mode: setup is a grown-up's job, and the child's tiles say to ask one. */
  const setup = await setupOf(m);
  /* new notifications for this grown-up (src/lib/notify): a quiet count on the bell at the top of the page */
  const unread = m.childMode ? 0 : await unreadCount(m.user.id);
  /* The member's eye profile reaches every screen here: the red ink, and the size of the app's own text. */
  const con = m.eye?.strongContrast ?? 1;
  const zoom = pageZoom(m.eye?.appTextPx);
  /* the inks of this screen as tuned for its glasses (engine/tune.ts): set for the browser's scenes, and for the red ink here */
  const tune = tuneOf(m.device);
  const style = { "--strong": strongInk(trainRed(con, tune), m.device?.gamma ?? 2.2) } as CSSProperties;
  const groups = menuGroups(m);
  return (
    <div className="shell" style={style}>
      <script dangerouslySetInnerHTML={{ __html: RAIL_BOOT }} />
      <a className="skip" href="#page">{n.skip}</a>
      <InkTuneSet tune={tune} />
      <Dock chat={assist.available && !m.childMode} place="app" />
      <aside className="side">
        <Link href={m.childMode ? "/kids" : "/today"} className="logo" title={common.product}><BrandMark /><span className="side-text">{common.product}</span></Link>
        <Link href={m.childMode ? "/leave-child-mode" : "/settings"} className="who" title={m.profile.displayName}>
          <i className="who-initial" aria-hidden="true">{initialOf(m.profile.displayName)}</i>
          <span className="side-text"><b>{m.profile.displayName}</b>
            <span>{m.childMode ? n.leaveChildMode : `${m.user.displayName} · ${m.account.displayName}`}</span></span>
        </Link>
        {setup.held && !m.childMode && <SetupLink s={setup} />}
        <nav aria-label={n.menu}><NavGroups groups={groups} /></nav>
      </aside>
      <div className="main">
        <TopBar home={m.childMode ? "/kids" : "/today"} person={m.childMode ? undefined : { initial: initialOf(m.user.displayName), href: "/account", label: common.nav.account }}>
          {!m.childMode && <NotifyBell start={unread} />}
        </TopBar>
        <main id="page" className="page" style={zoomStyle(zoom)} tabIndex={-1}>
          {m.tester && <p className="notice" role="note">{common.tester} <Link href="/admin/catalogue">{common.testerLink}</Link></p>}
          {setup.held && !m.childMode && <SetupBar s={setup} />}
          {children}
        </main>
        <AppFooter />
      </div>
      <TabBar items={menuTabs(m)} />
    </div>
  );
}
