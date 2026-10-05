import type { Metadata } from "next";
import Link from "next/link";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { assistCopy } from "@/copy/assist";
import { together } from "@/copy/together";
import { assist } from "@/lib/assist/extra";
import { readStatuses } from "@/lib/catalogue";
import { PASSAGE_KINDS, QUESTION_MAX, ownPassages, wordSearch, type Passage, type PassageKind } from "@/lib/library";
import { requireMember } from "@/lib/session";
import { isListed, statusOf } from "@/lib/status";

const t = assistCopy.research;
export const metadata: Metadata = { title: t.title };

/** How many passages a search by meaning shows, and how many more a search by words may add under them. */
const BY_MEANING = 8, MORE_BY_WORDS = 4;

type Found = { passage: Passage; by: "meaning" | "words" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isKind = (v: string): v is PassageKind => (PASSAGE_KINDS as readonly string[]).includes(v);

function PassageCard({ found: { passage: p, by }, searched }: { found: Found; searched: boolean }) {
  return (
    <Card title={p.title} span={6} as="article" right={<><Chip>{t.kinds[p.kind]}</Chip>{searched && <Chip tone={by === "meaning" ? "ok" : "plain"}>{by === "meaning" ? t.byMeaning : t.byWords}</Chip>}</>}>
      <p>{p.text}</p>
      {p.sources.length > 0 ? (
        <div className="stack">
          <h3 className="small muted">{t.sources}</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {p.sources.map((s) => <li key={s.url} className="small"><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}
          </ul>
        </div>
      ) : <p className="muted small">{t.noSource}</p>}
      <p className="small muted">{t.from}: <Link href={p.href}>{t.open}</Link></p>
    </Card>
  );
}

/**
 * The research library. A search returns passages of IOpener's own pages, word for word, each with its source.
 * It never writes an answer. Every edition searches by words; an edition with an assistant also searches by meaning.
 */
export default async function ResearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await requireMember();
  const sp = await searchParams;
  const asked = one(sp.q).trim(), tooLong = asked.length > QUESTION_MAX, q = tooLong ? "" : asked;
  const kind = isKind(one(sp.kind)) ? (one(sp.kind) as PassageKind) : null;

  /* A game or an exercise staff have hidden from members is left out here too. */
  const [statuses, extra] = await Promise.all([readStatuses(), assist.extraPassages().catch((): Passage[] => [])]);
  const all = [...ownPassages(), ...extra].filter((p) => !p.item || isListed(statusOf(statuses, p.item.kind, p.item.slug), m.tester));
  const byKey = new Map(all.map((p) => [p.key, p]));

  let found: Found[] = [], standIn = false;
  if (q) {
    const meaning = assist.available ? await assist.searchLibrary(m, q, all.map((p) => p.key)).catch(() => null) : null;
    standIn = !!meaning?.standIn;
    const close = (meaning?.hits ?? []).flatMap((h) => { const p = byKey.get(h.key); return p ? [{ passage: p, by: "meaning" as const }] : []; }).slice(0, BY_MEANING);
    const words = wordSearch(all, q).filter((h) => !close.some((c) => c.passage.key === h.passage.key)).map((h) => ({ passage: h.passage, by: "words" as const }));
    found = [...close, ...words.slice(0, close.length ? MORE_BY_WORDS : 12)];
  } else if (kind) {
    found = all.filter((p) => p.kind === kind).map((passage) => ({ passage, by: "words" as const }));
  }
  const usedMeaning = found.some((f) => f.by === "meaning");
  const kinds = PASSAGE_KINDS.map((k) => ({ k, n: all.filter((p) => p.kind === k).length })).filter((x) => x.n > 0);

  return (
    <>
      <PageHead title={t.title} sub={t.sub} crumb={[together.crumb]} stats={[{ value: all.length, label: t.stat }]} />
      <div className="bento">
        <Card span={12}>
          <form action="/together/research" method="get" className="stack" role="search">
            <div className="field">
              <label htmlFor="q">{t.label}</label>
              <input id="q" className="input" name="q" type="search" defaultValue={asked} maxLength={QUESTION_MAX} aria-describedby="q-hint" />
              <span id="q-hint" className="muted small">{t.hint}</span>
            </div>
            <div className="row">
              <button className="btn btn-g">{t.submit}</button>
              {(q || kind) && <Link className="btn btn-gh" href="/together/research">{t.clear}</Link>}
            </div>
          </form>
          {tooLong && <p className="notice" data-b="warn">{t.tooLong}</p>}
          <nav className="pills" aria-label={t.title}>
            {kinds.map(({ k, n }) => (
              <Link key={k} className="pill" href={`/together/research?kind=${k}`} aria-current={!q && kind === k ? "true" : undefined} scroll={false}>{t.kindCount(t.kinds[k], n)}</Link>
            ))}
          </nav>
        </Card>

        {q && (
          <div className="c span12" role="status">
            <b className="tnum">{t.count(found.length)}</b>
            {found.length > 0 && <p className="muted small">{usedMeaning ? t.byMeaningNote : t.byWordsNote} {t.notAdvice}</p>}
            {usedMeaning && standIn && <p className="muted small">{assistCopy.standIn}</p>}
          </div>
        )}
        {found.map((f) => <PassageCard key={f.passage.key} found={f} searched={!!q} />)}
      </div>
      {q && found.length === 0 && <Empty title={t.none.title}><span>{t.none.body}</span></Empty>}
      {!q && !kind && <Empty title={t.start.title}><span>{t.start.body}</span></Empty>}
    </>
  );
}
