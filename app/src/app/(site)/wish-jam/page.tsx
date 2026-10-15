import type { Metadata } from "next";
import { Empty } from "@/components/ui";
import { wishJam } from "@/copy/wish-jam";
import { ENQUIRY_MIN_AGE, pageMeta } from "@/lib/site";
import { publicWishes } from "@/lib/wish-jam-data";
import { Head, Hero, Points, Section } from "../_components/parts";
import { TakePart, WriteToUs } from "../_components/roles";

const w = wishJam.site;
export const generateMetadata = (): Metadata => (pageMeta("/wish-jam", w.meta));

/**
 * Wish Jam, the public page: the wishes families have shared, the game kit's rules in short, and the form a
 * builder writes in with. No sign-in. Every wish here is what `toPublic` let through: a code, an age band, the
 * choices and the short line a person at IOpener approved. No household, no family name, no school, no city.
 */
export default async function WishJamSitePage() {
  const wishes = await publicWishes();
  const l = w.list;
  return (
    <main className="s-page">
      <Hero kicker={w.hero.kicker} title={w.hero.title} lead={w.hero.lead}>
        <div className="s-ctas">
          <a className="btn btn-d s-btn-lg" href="#write">{w.hero.cta}</a>
          <a className="btn s-btn-lg" href="#wishes-h">{w.hero.toList}</a>
        </div>
      </Hero>

      <Section id="wishes" alt>
        <Head id="wishes" kicker={l.kicker} title={l.title} lead={wishes.length ? `${l.count(wishes.length)}. ${l.lead}` : undefined} />
        {wishes.length === 0 ? <Empty title={l.none.title}><span>{l.none.body}</span></Empty> : (
          <div className="s-grid three">
            {wishes.map((x) => (
              <article key={x.code} className="s-card s-reveal">
                <h3>{l.from(x.firstName)}</h3>
                <p className="s-chips">
                  <span className="chip" data-b={x.state === "waiting" ? "grad" : x.state === "matched" ? "plain" : "ok"}>{l.state[x.state]}</span>
                  {x.band && <span className="chip" data-b="plain">{wishJam.band(x.band)}</span>}
                  {x.isSample && <span className="chip" data-b="warn">{l.sample}</span>}
                </p>
                <dl className="kv">
                  <div><dt>{l.loves}</dt><dd>{wishJam.loves[x.loves]}</dd></div>
                  <div><dt>{l.play}</dt><dd>{wishJam.plays[x.play]}</dd></div>
                  <div><dt>{l.game}</dt><dd>{wishJam.games[x.game]}</dd></div>
                </dl>
                {x.line && <blockquote style={{ margin: 0 }}><p>{x.line}</p></blockquote>}
                {x.gameName && <p><b>{l.named(x.gameName)}</b></p>}
                <p className="s-foot-row s-note tnum">{l.code(x.code)}</p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <TakePart id="steps" kicker={w.steps.kicker} title={w.steps.title} items={w.steps.items} />

      <Section id="rules" narrow>
        <Head id="rules" kicker={w.rules.kicker} title={w.rules.title} lead={w.rules.lead} />
        <div className="s-reveal"><Points items={w.rules.items} /></div>
        <p className="s-note s-reveal" style={{ marginTop: 22 }}>{w.rules.where} {w.rules.get}</p>
      </Section>

      <Section id="family" alt narrow>
        <Head id="family" kicker={w.never.kicker} title={w.never.title} />
        <div className="s-reveal"><Points tone="no" items={w.never.items.map((line) => ({ t: line }))} /></div>
        <p className="s-note s-reveal" style={{ marginTop: 22 }}>{w.never.adults(ENQUIRY_MIN_AGE)} {w.never.noPromise}</p>
      </Section>

      <WriteToUs kind="wish_jam" />
    </main>
  );
}
