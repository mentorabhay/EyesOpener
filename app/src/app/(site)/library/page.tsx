import type { Metadata } from "next";
import Link from "next/link";
import { Empty } from "@/components/ui";
import { site as t } from "@/copy/site";
import { catalogue, evidenceOf, exercises, games } from "@/data";
import { readStatuses } from "@/lib/catalogue";
import { isListed, statusOf } from "@/lib/status";
import { EVIDENCE_KEYS, filterLibrary, groupForTag, libraryHref, LIBRARY_KINDS, pageMeta, readLibraryFilter, type LibraryFilter } from "@/lib/site";
import { ExerciseCard, GameCard } from "../_components/catalogue";
import { Cta, Hero } from "../_components/parts";

const l = t.library;
export const generateMetadata = (): Metadata => (pageMeta("/library", l.meta));

/** A row of filter links. The choice lives in the address, so the page needs no script and can be shared. */
function FilterRow({ label, items }: { label: string; items: { key: string; label: string; href: string; on: boolean }[] }) {
  return (
    <div className="s-filter">
      <span id={`filter-${label}`}>{label}</span>
      <nav className="pills" aria-labelledby={`filter-${label}`}>
        {items.map((it) => <Link key={it.key} className="pill" href={it.href} aria-current={it.on ? "true" : undefined} scroll={false}>{it.label}</Link>)}
      </nav>
    </div>
  );
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = readLibraryFilter(await searchParams);
  /* Items staff have switched off or kept for staff are not shown to the public. */
  const [all, statuses] = [filterLibrary(f), await readStatuses()];
  const found = {
    games: all.games.filter((g) => isListed(statusOf(statuses, "game", g.slug), false)),
    exercises: all.exercises.filter((e) => isListed(statusOf(statuses, "exercise", e.slug), false)),
  };
  const to = (patch: Partial<LibraryFilter>) => libraryHref({ ...f, ...patch });
  const filtered = f.tag !== "any" || f.evidence !== "all" || f.kind !== "all";
  /* Exercises sit in groups, and only some tags have a group. */
  const tagHasNoGroup = f.tag !== "any" && !groupForTag(f.tag);

  return (
    <main className="s-page">
      <Hero kicker={l.hero.kicker} title={l.hero.title} lead={l.hero.lead(games.length, exercises.length)} />

      <section className="s-section tight" aria-labelledby="filters-h">
        <div className="s-wrap">
          <div className="s-filters">
            <h2 id="filters-h" className="s-meta">{l.filters.title}</h2>
            <FilterRow label={l.filters.tag} items={catalogue.gameTags.map((g) => ({ key: g.key, label: g.label, href: to({ tag: g.key }), on: f.tag === g.key }))} />
            <FilterRow label={l.filters.evidence} items={[
              { key: "all", label: l.filters.allEvidence, href: to({ evidence: "all" }), on: f.evidence === "all" },
              ...EVIDENCE_KEYS.map((k) => ({ key: k, label: evidenceOf(k).label, href: to({ evidence: k }), on: f.evidence === k })),
            ]} />
            <FilterRow label={l.filters.kind} items={LIBRARY_KINDS.map((k) => ({ key: k, label: l.filters.kinds[k], href: to({ kind: k }), on: f.kind === k }))} />
            <p className="s-meta">{l.opensApp} {filtered && <Link className="s-link" href="/library" scroll={false}>{l.filters.clear}</Link>}</p>
          </div>

          {f.kind !== "exercises" && (
            <>
              <div className="s-list-head">
                <h2 className="s-h2">{l.games.title}</h2>
                <p className="tnum" role="status">{l.games.shown(found.games.length, games.length)}</p>
              </div>
              {found.games.length
                ? <div className="grid-cards">{found.games.map((g) => <GameCard key={g.slug} g={g} />)}</div>
                : <Empty title={l.games.none}><Link className="btn btn-sm" href="/library" scroll={false}>{l.filters.clear}</Link></Empty>}
            </>
          )}

          {f.kind !== "games" && (
            <>
              <div className="s-list-head">
                <h2 className="s-h2">{l.exercises.title}</h2>
                <p className="tnum" role="status">{l.exercises.shown(found.exercises.length, exercises.length)}</p>
              </div>
              {found.exercises.length
                ? <div className="s-grid three">{found.exercises.map((e) => <ExerciseCard key={e.slug} e={e} />)}</div>
                : <Empty title={tagHasNoGroup ? l.exercises.noGroup : l.exercises.none}><Link className="btn btn-sm" href="/library" scroll={false}>{l.filters.clear}</Link></Empty>}
            </>
          )}
        </div>
      </section>

      <Cta second={{ href: "/evidence", label: t.cta.evidence }} />
    </main>
  );
}
