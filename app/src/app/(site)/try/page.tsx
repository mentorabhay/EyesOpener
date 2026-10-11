// Eyes Opener: try: a 60-second demo game for anyone, with no sign-in. Nothing is saved. .
import type { Metadata } from "next";
import Link from "next/link";
import { marketing } from "@/copy/marketing";
import { exercises, games } from "@/data";
import { DemoGame } from "../_components/demo-game";
import { Hero, Section } from "../_components/parts";

export const generateMetadata = (): Metadata => ({ title: marketing.demo.metaTitle, description: marketing.demo.lead });

/** /try: a 60-second demo game for anyone, with no sign-in. Nothing is saved. */
export default function TryPage() {
  const t = marketing.demo;
  return (
    <main>
      <Hero kicker={t.kicker} title={t.title} lead={t.lead} />
      <Section id="demo" tight>
        <h2 id="demo-h" className="s-sr">{t.title}</h2>
        <div className="s-try">
          <div className="s-try-game"><DemoGame /></div>
          <aside className="s-try-side">
            <h3>{t.howTitle}</h3>
            <ol>{t.how.map((h) => <li key={h}>{h}</li>)}</ol>
            <h3>{t.glassesTitle}</h3>
            <p>{t.glasses}</p>
          </aside>
        </div>
      </Section>
      <Section id="next" alt tight>
        <div className="s-head center">
          <h2 id="next-h">{t.nextTitle}</h2>
          <p className="s-lead">{t.next(games.length, exercises.length)}</p>
        </div>
        <div className="s-ctas" style={{ justifyContent: "center" }}>
          <Link className="btn btn-g" href="/register">{t.register}</Link>
          <Link className="btn" href="/setup">{t.check}</Link>
        </div>
        <p className="small muted" style={{ textAlign: "center", marginTop: 14 }}>{t.note}</p>
      </Section>
    </main>
  );
}
