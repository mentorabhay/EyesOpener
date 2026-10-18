/**
 * A row of labelled tiles with a picture each, for the pages a screen leads on to (Ved, 18 October 2026: features
 * hidden as lines of small text links were never found). The same pictures as the menu (icons.tsx). Server-safe.
 */
import Link from "next/link";
import { NavIcon } from "./icons";

export interface Tile { href: string; label: string; sub?: string; icon?: string }

export function Tiles({ items, label }: { items: Tile[]; label: string }) {
  if (!items.length) return null;
  return (
    <nav className="tiles" aria-label={label}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} className="tile">
          <span className="tile-pic"><NavIcon href={t.icon ?? t.href} /></span>
          <span className="tile-tx"><b>{t.label}</b>{t.sub && <small>{t.sub}</small>}</span>
        </Link>
      ))}
    </nav>
  );
}
