// Eyes Opener: A plain-language legal page: the draft line at the top, a list of sections, and links to the pages beside it. .
/** A plain-language legal page: the draft line at the top, a list of sections, and links to the pages beside it. */
import Link from "next/link";
import { site as t } from "@/copy/site";

export interface LegalSection { id: string; title: string; body?: string[]; list?: string[] }

const PAGES = () => [
  { href: "/privacy", label: t.legal.privacy.title },
  { href: "/childrens-data", label: t.legal.children.title },
  { href: "/terms", label: t.legal.terms.title },
  { href: "/safety", label: t.safety.hero.kicker },
];

export function LegalPage({ path, title, lead, sections }: { path: string; title: string; lead: string; sections: LegalSection[] }) {
  return (
    <main className="s-page">
      <header className="s-hero">
        <div className="s-wrap">
          <p className="s-draft" role="note">{t.legal.draft}</p>
          <p className="s-kicker">{t.footer.groups[3].title}</p>
          <h1>{title}</h1>
          <p className="s-lead">{lead}</p>
          <p className="s-note" style={{ marginTop: 14 }}>{t.legal.updated}</p>
        </div>
      </header>
      <div className="s-section tight">
        <div className="s-wrap s-legal">
          <nav className="s-toc" aria-labelledby="toc-h">
            <h2 id="toc-h">{t.legal.contents}</h2>
            <ol>{sections.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol>
          </nav>
          <div className="s-prose">
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`}>{s.title}</h2>
                {s.body?.map((line) => <p key={line}>{line}</p>)}
                {s.list && s.list.length > 0 && <ul>{s.list.map((line) => <li key={line}>{line}</li>)}</ul>}
              </section>
            ))}
            <section aria-labelledby="related-h">
              <h2 id="related-h">{t.legal.related}</h2>
              <p className="s-chips">{PAGES().filter((p) => p.href !== path).map((p) => <Link key={p.href} className="btn" href={p.href}>{p.label}</Link>)}</p>
              <p className="s-draft" role="note" style={{ marginTop: 26, marginBottom: 0 }}>{t.legal.draft}</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
