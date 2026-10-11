// Eyes Opener: Building blocks shared by the public pages: the page hero, sections, section heads and the closing band. Server-safe. .
/** Building blocks shared by the public pages: the page hero, sections, section heads and the closing band. Server-safe. */
import Link from "next/link";
import type { ReactNode } from "react";
import { site as t } from "@/copy/site";
import { LightsBare } from "./art";

export function Hero({ kicker, title, lead, crumb, visual, children }: {
  kicker: string; title: string; lead?: ReactNode; crumb?: { href: string; label: string }; visual?: ReactNode; children?: ReactNode;
}) {
  return (
    <header className="s-hero">
      <div className={`s-wrap s-hero-grid${visual ? "" : " solo"}`}>
        <div>
          {crumb && <nav className="s-crumb" aria-label="Breadcrumb"><Link href={crumb.href}>{crumb.label}</Link> /</nav>}
          <p className="s-kicker">{kicker}</p>
          <h1>{title}</h1>
          {lead && <p className="s-lead">{lead}</p>}
          {children}
        </div>
        {visual && <div className="s-vis">{visual}</div>}
      </div>
    </header>
  );
}

export function Section({ id, alt, tight, narrow, children }: { id: string; alt?: boolean; tight?: boolean; narrow?: boolean; children: ReactNode }) {
  return (
    <section className={`s-section${alt ? " alt" : ""}${tight ? " tight" : ""}`} aria-labelledby={`${id}-h`}>
      <div className={`s-wrap${narrow ? " narrow" : ""}`}>{children}</div>
    </section>
  );
}

/** The head of a section. `id` must match the Section it sits in, so the section is named by its heading. */
export function Head({ id, kicker, title, lead, center }: { id: string; kicker?: string; title: string; lead?: ReactNode; center?: boolean }) {
  return (
    <div className={`s-head s-reveal${center ? " center" : ""}`}>
      {kicker && <p className="s-kicker">{kicker}</p>}
      <h2 id={`${id}-h`}>{title}</h2>
      {lead && <p className="s-lead">{lead}</p>}
    </div>
  );
}

/** A list of short points: a bold lead-in, then one plain line. */
export function Points({ items, tone }: { items: { b?: string; t: string }[]; tone?: "yes" | "no" }) {
  return (
    <ul className={`s-points${tone ? " " + tone : ""}`}>
      {items.map((p) => <li key={p.b ?? p.t}><span>{p.b && <b>{p.b} </b>}{p.t}</span></li>)}
    </ul>
  );
}

/** The closing band. The one gradient button on the page lives here. */
export function Cta({ second }: { second?: { href: string; label: string } }) {
  return (
    <section className="s-section" aria-labelledby="cta-h">
      <div className="s-wrap">
        <div className="s-cta s-reveal">
          <LightsBare className="s-cta-art" />
          <h2 id="cta-h">{t.cta.title}</h2>
          <p>{t.cta.body}</p>
          <div className="s-ctas">
            <Link className="btn btn-g s-btn-lg" href="/setup">{t.cta.start}</Link>
            {second && <Link className="btn s-btn-lg" href={second.href}>{second.label}</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Hatched chip: this part is not built yet. */
export const NotBuilt = ({ children = t.notBuilt }: { children?: ReactNode }) => <span className="chip" data-b="none">{children}</span>;
