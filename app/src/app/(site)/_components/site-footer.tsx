import Link from "next/link";
import { common } from "@/copy/common";
import { site as t } from "@/copy/site";
import { inEdition } from "@/edition";
import { Mark } from "./site-nav";

/** The footer: the page groups, and the lines that IOpener is not a medical device, has an open-source core and has no ads. */
export function SiteFooter() {
  return (
    <footer className="s-foot">
      <div className="s-wrap">
        <div className="s-foot-cols">
          <div className="s-foot-brand">
            <Link className="s-logo" href="/" aria-label={t.logoLabel}><Mark />{t.name}</Link>
            <p>{t.footer.about}</p>
          </div>
          {t.footer.groups.map((g, i) => (
            <nav key={g.title} aria-labelledby={`s-foot-${i}`}>
              <h2 id={`s-foot-${i}`}>{g.title}</h2>
              <ul>{g.links.filter((l) => inEdition(l.href)).map((l) => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="s-foot-bar">
          <p>{common.notMedical}</p>
          <p className="s-chips">
            {t.footer.promises.map((p) => <span key={p} className="chip" data-b="plain">{p}</span>)}
          </p>
        </div>
      </div>
    </footer>
  );
}
