/**
 * Shell for the staff, counsellor and sponsor areas: the same frame as the member app, with that area's own links.
 * Server-safe. Each area's layout calls its gate first, then renders this.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import type { ReactNode } from "react";
import { NavGroups, TabBar, type NavItem } from "@/components/nav";
import { common } from "@/copy/common";
import { AppFooter } from "@/components/shell/footer";
import { RAIL_BOOT } from "@/components/shell/rail";
import { TopBar, initialOf } from "@/components/shell/topbar";

export function PortalShell({ area, who, role, groups, children }: {
  /** Name of the area, shown beside the logo. */
  area: string; who: string; role: string;
  groups: { title: string; items: NavItem[] }[]; children: ReactNode;
}) {
  const all = groups.flatMap((g) => g.items);
  return (
    <div className="shell">
      <script dangerouslySetInnerHTML={{ __html: RAIL_BOOT }} />
      <aside className="side">
        <Link href={all[0]?.href ?? "/"} className="logo" title={common.product}><BrandMark /><span className="side-text">{common.product}</span></Link>
        <div className="who" title={who}>
          <i className="who-initial" aria-hidden="true">{initialOf(who)}</i>
          <span className="side-text"><b>{who}</b><span>{area} · {role}</span></span>
        </div>
        <NavGroups groups={[...groups, { title: common.nav.you, items: [{ href: "/login", label: common.nav.switchPerson }] }]} />
      </aside>
      <div className="main">
        <TopBar home={all[0]?.href ?? "/"} search={false} />
        <main className="page">{children}</main>
        <AppFooter />
      </div>
      <TabBar items={all.slice(0, 5)} />
    </div>
  );
}
