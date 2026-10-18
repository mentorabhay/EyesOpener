/**
 * Shell for the staff, counsellor and sponsor areas: the same frame as the member app, with that area's own links, and
 * the same person's menu at the top right (name, email, the person's own places, light or dark, sign out).
 * Each area's layout calls its gate first, then renders this.
 *
 * The person's own places (Ved, 18 October 2026): their household when they have one, "Try the games" (a try-out space
 * with the library open and no daily limits, counted nowhere), "Use Eyes Opener for my own eyes" when they have no
 * household, and "Sign in as someone else" only where the demo sign-in is on.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import type { ReactNode } from "react";
import { NavGroups, TabBar, type NavItem } from "@/components/nav";
import { common } from "@/copy/common";
import { demoHere, type Viewer } from "@/lib/auth";
import { mayTryOut } from "@/lib/session";
import { AppFooter } from "@/components/shell/footer";
import { RAIL_BOOT } from "@/components/shell/rail";
import { TopBar, initialOf } from "@/components/shell/topbar";

const n = common.nav;

/** The person's own places, for the menu of any area. */
export async function ownPlaces(viewer: Viewer): Promise<NavItem[]> {
  const demo = await demoHere();
  return [
    ...(viewer.seat ? [{ href: viewer.seat === "circle" ? "/circle" : "/today", label: n.household }] : []),
    ...(mayTryOut(viewer) ? [{ href: "/tryout", label: n.tryout }] : []),
    ...(!viewer.seat && mayTryOut(viewer) ? [{ href: "/login/own", label: n.ownEyes }] : []),
    ...(demo ? [{ href: "/login", label: n.switchPerson }] : []),
  ];
}

export async function PortalShell({ area, viewer, role, groups, children }: {
  /** Name of the area, shown beside the logo. */
  area: string; viewer: Viewer; role: string;
  groups: { title: string; items: NavItem[]; icon?: string }[]; children: ReactNode;
}) {
  const all = groups.flatMap((g) => g.items);
  const who = viewer.user.displayName;
  const own = await ownPlaces(viewer);
  return (
    <div className="shell">
      <script dangerouslySetInnerHTML={{ __html: RAIL_BOOT }} />
      <aside className="side">
        <Link href={all[0]?.href ?? "/"} className="logo" title={common.product}><BrandMark /><span className="side-text">{common.product}</span></Link>
        <div className="who" title={who}>
          <i className="who-initial" aria-hidden="true">{initialOf(who)}</i>
          <span className="side-text"><b>{who}</b><span>{area} · {role}</span></span>
        </div>
        <NavGroups groups={[...groups, ...(own.length ? [{ title: n.you, items: own, icon: "/account" }] : [])]} />
      </aside>
      <div className="main">
        <TopBar home={all[0]?.href ?? "/"} search={false} person={{ menu: {
          initial: initialOf(who), name: who, email: viewer.user.email, profiles: [], current: "", guardian: false, links: own,
        } }} />
        <main className="page">{children}</main>
        <AppFooter />
      </div>
      <TabBar items={all.slice(0, 5)} />
    </div>
  );
}
