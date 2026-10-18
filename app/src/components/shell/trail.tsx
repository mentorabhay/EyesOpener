"use client";
/**
 * The short trail under the top bar on a page below the first level (Ved, 18 October 2026: deep pages had no way back
 * but the browser's): the pages above this one that have a name, each a link, e.g. "Games › Firefly Catch" on the
 * game's play page. The names come from the layout (the menu, the games, exercises and check-ups). Nothing on a page
 * of the first level. When it shows, a page's own crumb is hidden (globals.css), so the way back is never shown twice.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { common } from "@/copy/common";

export function Trail({ names }: { names: Readonly<Record<string, string>> }) {
  const path = usePathname();
  const parts = path.split("/").filter(Boolean);
  /* /train is the Games list: Exercises and the cinema sit beside it in the menu, not under it */
  const above = parts.slice(0, -1).map((_, i) => "/" + parts.slice(0, i + 1).join("/"))
    .filter((p) => names[p] && (p !== "/train" || path.startsWith("/train/games/")));
  if (!above.length) return null;
  return (
    <nav className="trail" aria-label={common.shell.trail}>
      {above.map((p, i) => (
        <span key={p} className="row" style={{ gap: 4 }}>
          {i > 0 && <span className="sep" aria-hidden="true">›</span>}
          <Link href={p}>{names[p]}</Link>
        </span>
      ))}
    </nav>
  );
}
