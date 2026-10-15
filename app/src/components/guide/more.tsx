/**
 * The folded section at the bottom of a page: the full text of the page, closed until someone opens it.
 * `More` is the one outer fold; `Fold` is a smaller fold inside it, one per topic, so a reader opens only the part
 * they want. Plain <details>: it works with no script, by keyboard, and in every browser, and it opens smoothly
 * where the browser can animate it.
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

/** One topic inside `More`. `right` sits beside the title (a Listen button, a chip). `warn` marks the stop rules. */
export function Fold({ title, right, open = false, warn = false, children }: {
  title: ReactNode; right?: ReactNode; open?: boolean; warn?: boolean; children: ReactNode;
}) {
  return (
    <details className={css.fold} open={open} data-warn={warn || undefined}>
      <summary>
        <b>{title}</b>
        {right && <span className={css.fr}>{right}</span>}
        <span className={css.chev} aria-hidden="true" />
      </summary>
      <div className={css.fbody}>{children}</div>
    </details>
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
