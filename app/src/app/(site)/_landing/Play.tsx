// Eyes Opener: A game to play right on the landing page, with no sign-in and nothing saved (the same demo as /try). .
import Link from "next/link";
import { marketing } from "@/copy/marketing";
import { DemoGame } from "../_components/demo-game";

/** A game to play right on the landing page, with no sign-in and nothing saved (the same demo as /try). */
export function Play() {
  const t = marketing.demo;
  return (
    <section className="lp-play" aria-labelledby="lp-play-h">
      <div className="lp-wrap lp-play-grid">
        <div>
          <p className="lp-play-kicker">{t.kicker}</p>
          <h2 id="lp-play-h" className="lp-tags-h">{t.title}</h2>
          <p className="lp-lead lp-play-lead">{t.lead}</p>
          <ol className="lp-play-how">{t.how.map((h) => <li key={h}>{h}</li>)}</ol>
          <p className="lp-caption lp-play-note">{t.note} <Link className="lp-link" href="/try">{t.metaTitle}</Link></p>
        </div>
        <div className="lp-play-game"><DemoGame /></div>
      </div>
    </section>
  );
}
