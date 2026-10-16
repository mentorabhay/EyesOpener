// Eyes Opener: The research library: the passages Eyes Opener's own pages already carry about the research, each with the source.
/**
 * The research library: the passages Eyes Opener's own pages already carry about the research, each with the source
 * it rests on. A search here returns passages, word for word, with their sources. It never writes an answer.
 *
 * What is in it:
 *  - the trials of the evidence page (src/copy/site.ts), each with its source
 *  - the methods behind the library and the evidence labels (src/data/catalogue.json)
 *  - what each exercise guide and each game guide says is known, with the guide's sources
 *  - passages an edition adds through the assistant seam (src/lib/assist/extra.ts)
 *
 * Pure: no database and no network, so it is unit-tested. The page decides who may see what.
 */
import { site } from "@/copy/site";
import { catalogue, evidenceOf, exerciseBySlug, gameBySlug } from "@/data";
import { gameGuides } from "@/data/game-guides";
import { guides, type Source } from "@/data/guides";

export const PASSAGE_KINDS = ["trial", "method", "label", "exercise", "game", "story"] as const;
export type PassageKind = (typeof PASSAGE_KINDS)[number];

export interface Passage {
  /** Stable and unique: "trial:citt", "exercise:pencil-push-ups". */
  key: string;
  kind: PassageKind;
  title: string;
  /** What it is about, where the page groups it: "Lazy eye", "Convergence". Helps a search find it. */
  topic?: string;
  /** The passage, exactly as the app's own page says it. */
  text: string;
  /** The page of this app the passage comes from. */
  href: string;
  /** Where to read the research itself. Empty for a passage that only explains a label. */
  sources: Source[];
  /** For an exercise or a game: its slug, so the page can leave out what staff have hidden. */
  item?: { kind: "exercise" | "game"; slug: string };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const join = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(" ");

/** Every passage this edition's own pages carry. Passages an edition adds come from the assistant seam. */
export function ownPassages(): Passage[] {
  const e = site.evidence, out: Passage[] = [];

  for (const group of e.trials.groups) {
    for (const t of group.items) {
      out.push({
        key: `trial:${slug(t.name)}`, kind: "trial", title: t.name, topic: group.title, href: "/evidence#trials",
        text: join(t.who, `${e.trials.found}: ${t.found}`, t.limit && `${e.trials.limit}: ${t.limit}`),
        sources: [{ label: t.source, url: t.href }, ...(t.more ? [{ label: t.more.label, url: t.more.href }] : [])],
      });
    }
  }
  for (const m of catalogue.mechanisms) {
    const label = evidenceOf(m.evidence);
    out.push({ key: `method:${m.key}`, kind: "method", title: m.label, href: "/evidence#methods", text: join(m.basis, `${label.label}: ${label.meaning}`), sources: [] });
  }
  for (const l of catalogue.evidence) {
    out.push({ key: `label:${l.key}`, kind: "label", title: l.label, href: "/evidence#labels", text: l.meaning, sources: [] });
  }
  for (const g of guides) {
    const ex = exerciseBySlug(g.slug);
    if (!ex) continue;
    const usual = g.measures.flatMap((m) => (m.usual ? [`${m.label}: ${m.usual.text}`] : []));
    out.push({
      key: `exercise:${g.slug}`, kind: "exercise", title: ex.name, topic: ex.group, href: `/train/exercises/${g.slug}`,
      text: join(g.what, g.evidence, ...usual), sources: g.sources, item: { kind: "exercise", slug: g.slug },
    });
  }
  for (const g of gameGuides) {
    const game = gameBySlug(g.slug);
    if (!game) continue;
    out.push({
      key: `game:${g.slug}`, kind: "game", title: game.name, href: `/train/games/${g.slug}/manual`,
      text: join(g.helps, g.evidence), sources: g.sources, item: { kind: "game", slug: g.slug },
    });
  }
  return out;
}

/** Everything of a passage a search may match: its topic, its title and its words. An assistant turns this into the passage's vector. */
export const searchText = (p: Passage): string => [p.topic, p.title, p.text].filter(Boolean).join(". ");

/* ───────────── search by words ───────────── */

export const QUESTION_MAX = 200;

/** A word in any script. Marks are part of the word: in Hindi or Tamil a vowel sign is a mark, not a letter. */
const WORDS = /[\p{L}\p{M}\p{N}]+/gu;

/** Small words that say nothing about what is asked. */
const SKIP = new Set(["the", "and", "for", "with", "does", "from", "that", "this", "what", "how", "are", "was", "can", "you", "your", "has", "have", "not", "but", "into", "about", "there", "their", "which", "when", "will", "help", "helps", "work", "works"]);

/** The words of a question that carry meaning: lower case, three letters or more, each once. Any script. */
export function questionWords(question: string): string[] {
  const words = question.slice(0, QUESTION_MAX).toLowerCase().match(WORDS) ?? [];
  return [...new Set(words.filter((w) => w.length >= 3 && !SKIP.has(w)).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)))];
}

export interface WordHit { passage: Passage; /** How many of the question's words the passage has. */ matched: number; score: number }

/**
 * Passages that carry the question's words, best first. A word counts when a word of the passage starts with it,
 * so "patch" finds "patching". A word in the title counts three times. A passage must carry at least half the words.
 */
export function wordSearch(passages: readonly Passage[], question: string, take = 12): WordHit[] {
  const words = questionWords(question);
  if (!words.length) return [];
  const starts = (text: string) => { const have = text.toLowerCase().match(WORDS) ?? []; return (w: string) => have.some((h) => h.startsWith(w)); };
  const hits: WordHit[] = [];
  for (const passage of passages) {
    const inTitle = starts(`${passage.title} ${passage.topic ?? ""}`), inText = starts(`${passage.text} ${passage.sources.map((s) => s.label).join(" ")}`);
    let matched = 0, score = 0;
    for (const w of words) {
      const t = inTitle(w), b = inText(w);
      if (t || b) matched++;
      score += (t ? 3 : 0) + (b ? 1 : 0);
    }
    if (matched * 2 >= words.length && matched > 0) hits.push({ passage, matched, score });
  }
  return hits.sort((a, b) => b.matched - a.matched || b.score - a.score || a.passage.title.localeCompare(b.passage.title)).slice(0, take);
}
