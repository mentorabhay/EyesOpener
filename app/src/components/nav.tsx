"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { common } from "@/copy/common";

export interface NavItem { href: string; label: string }

const current = (path: string, href: string, all: NavItem[]) => {
  if (path !== href && !path.startsWith(href + "/")) return false;
  /* the longest matching link wins, so /train/exercises does not also light up /train */
  return !all.some((o) => o.href.length > href.length && (path === o.href || path.startsWith(o.href + "/")));
};

export function NavGroups({ groups }: { groups: { title: string; items: NavItem[] }[] }) {
  const path = usePathname();
  const all = groups.flatMap((g) => g.items);
  return (
    <>
      {groups.map((g) => (
        <div className="navg" key={g.title}>
          <p className="navh">{g.title}</p>
          <ul className="navl">
            {g.items.map((it) => (
              <li key={it.href}><Link href={it.href} aria-current={current(path, it.href, all) ? "page" : undefined}>{it.label}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export function TabBar({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label={common.nav.tabs}>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={current(path, it.href, items) ? "page" : undefined}>{it.label}</Link>
      ))}
    </nav>
  );
}
