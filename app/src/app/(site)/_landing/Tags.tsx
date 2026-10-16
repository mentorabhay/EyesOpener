// Eyes Opener: Right under the hero: what Eyes Opener is, in a row of short tags and six small cards, and two ways in (the demo game.
import Link from "next/link";
import { marketing } from "@/copy/marketing";

/**
 * Right under the hero: what Eyes Opener is, in a row of short tags and six small cards, and two ways in (the demo game
 * and a family account). Plain words; the one number comes from the engine.
 */
export function Tags({ maxMinutes }: { maxMinutes: number }) {
  const t = marketing.tags;
  const cards = [...t.cards.slice(0, 3), { head: t.safe.head, body: t.safe.body(maxMinutes) }, ...t.cards.slice(3)];
  return (
    <section className="lp-tags" aria-labelledby="lp-tags-h">
      <div className="lp-wrap">
        <ul className="lp-taglist" aria-label={t.title}>
          {t.list.map((x) => <li key={x}>{x}</li>)}
        </ul>
        <h2 id="lp-tags-h" className="lp-tags-h">{t.title}</h2>
        <p className="lp-lead">{t.lead}</p>
        <div className="lp-tag-cards">
          {cards.map((c, i) => (
            <article key={c.head} className="lp-tag-card">
              <span className="lp-tag-n deco-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h3>{c.head}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
        <div className="lp-ctas lp-tags-ctas">
          <Link className="btn btn-g lp-btn" href="/try">{t.cta}</Link>
          <Link className="btn lp-btn" href="/register">{t.register}</Link>
        </div>
      </div>
    </section>
  );
}
