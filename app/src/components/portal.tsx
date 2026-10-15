/**
 * Shell for the staff, counsellor and sponsor areas: the same frame as the member app, with that area's own links.
 * Server-safe. Each area's layout calls its gate first, then renders this.
 */
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import type { ReactNode } from "react";
import { NavGroups, TabBar, type NavItem } from "@/components/nav";
import { common } from "@/copy/common";

export function PortalShell({ area, who, role, groups, children }: {
  /** Name of the area, shown beside the logo. */
  area: string; who: string; role: string;
  groups: { title: string; items: NavItem[] }[]; children: ReactNode;
}) {
  const all = groups.flatMap((g) => g.items);
  return (
    <div className="shell">
      <aside className="side">
        <Link href={all[0]?.href ?? "/"} className="logo"><BrandMark />{common.product}</Link>
        <div className="who"><b>{who}</b><span>{area} · {role}</span></div>
        <NavGroups groups={[...groups, { title: "You", items: [{ href: "/login", label: common.nav.switchPerson }] }]} />
      </aside>
      <div className="main"><main className="page">{children}</main></div>
      <TabBar items={all.slice(0, 5)} />
    </div>
  );
}
