/**
 * The folded section at the bottom of a page: the full text of the page, closed until someone opens it.
 * `More` is the one fold; `Fold` is one topic inside it, drawn as a part of an article with its own heading
 * (Ved, 18 October 2026: "10 hidden layers do not solve the purpose of literature"). Opening `More` shows the whole
 * text, to be read top to bottom. Plain <details>: it works with no script, by keyboard, and in every browser.
 * Server-safe: no hooks, no browser APIs.
 */
import type { ReactNode } from "react";
import { guide as w } from "@/copy/guide";
import css from "./guide.module.css";

export function More({ title = w.more, hint = w.moreHint, open = false, id, children }: {
  title?: string; hint?: string; open?: boolean; id?: string; children: ReactNode;
}) {
  return (
    <details className={css.more} open={open} id={id}>
      <summary>
        <span className={css.mt}><b>{title}</b>{hint && <span>{hint}</span>}</span>
        <span className={css.chev} aria-hidden="true" />
      </summary>
      <div className={css.mbody}>{children}</div>
    </details>
  );
}

/**
 * One topic inside `More`: a heading and its text, part of one article, never a fold of its own. `right` sits beside
 * the heading (a Listen button, a chip). `warn` marks the stop rules. `open` is kept for older callers and does nothing.
 */
export function Fold({ title, right, warn = false, children }: {
  title: ReactNode; right?: ReactNode; open?: boolean; warn?: boolean; children: ReactNode;
}) {
  return (
    <section className={css.part} data-warn={warn || undefined}>
      <div className={css.parthead}>
        <h3>{title}</h3>
        {right && <span className={css.fr}>{right}</span>}
      </div>
      <div className={css.partbody}>{children}</div>
    </section>
  );
}

/** Key facts as a row of small labelled values: who it is for, what to have ready, how long. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className={css.facts}>
      {items.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
    </dl>
  );
}
