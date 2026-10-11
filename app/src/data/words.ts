// Eyes Opener: The catalogue's lines as a reader sees them, in the reader's language.
/**
 * The catalogue's lines as a reader sees them, in the reader's language.
 *
 * The catalogue itself (`@/data`) stays as it is: its strings are also values the code works with. A level is read
 * out of a game's "for" line, an exercise's group is matched against a programme, an evidence key picks a colour.
 * Translating those in place would break the rules that read them. So the words a person reads are taken from
 * here instead, at the moment a page draws them:
 *
 *   const w = gameWords(game);      <p>{w.purpose}</p>     instead of     <p>{game.purpose}</p>
 *
 * Each function gives an object with only the fields that are words, looked up for this request
 * (src/i18n/texts.ts). The names of games and exercises are not among them: a name stays in English letters in
 * every language (src/i18n/terms.ts says why).
 *
 * A page that still reads `game.purpose` shows English. That is safe, and it is how the roll-out goes page by
 * page: docs/LANGUAGES.md lists which pages read from here.
 */
import { texts, textsEach } from "@/i18n/texts";
import { forWhom } from "@/lib/status";
import more from "./catalogue.extra.json";
import { catalogue, programmes, tests, type EvidenceKey, type Exercise, type Game, type Programme, type TestDef } from "./index";
import { EXTRA_WORDS } from "./words.extra";

/** Games an edition adds have their lines kept with that edition's own translation files. */
const added = new Set((more as { games: { slug: string }[] }).games.map((g) => g.slug));

const gameView = (g: Game) => ({ slug: `game.${g.slug}`, play: g.play, purpose: g.purpose, who: forWhom(g.for), playsOn: g.playsOn, gear: g.gear, session: g.session });
const exerciseView = (e: Exercise) => ({ slug: `exercise.${e.slug}`, how: e.how, purpose: e.purpose, who: forWhom(e.for), gear: e.gear, dose: e.dose, group: e.group });
const notSlug = { word: (path: readonly string[]) => path[1] !== "slug" };

const views = [
  ...textsEach("data/words", () => catalogue.games.filter((g) => !added.has(g.slug)).map(gameView), notSlug),
  ...textsEach(EXTRA_WORDS, () => catalogue.games.filter((g) => added.has(g.slug)).map(gameView), notSlug),
];
const exerciseViews = textsEach("data/words", () => catalogue.exercises.map(exerciseView), notSlug);
const programmeViews = textsEach("data/words", () => programmes.map((p) => ({ slug: `programme.${p.slug}`, name: p.name, doseBasis: p.doseBasis })), notSlug);
const testViews = textsEach("data/words", () => tests.map((t) => ({ slug: `test.${t.key}`, name: t.name, what: t.what })), notSlug);
const mechanismViews = textsEach("data/words", () => catalogue.mechanisms.map((m) => ({ slug: `mechanism.${m.key}`, label: m.label, basis: m.basis })), notSlug);
const evidenceViews = textsEach("data/words", () => catalogue.evidence.map((e) => ({ slug: `evidence.${e.key}`, label: e.label, meaning: e.meaning })), notSlug);
const tagViews = textsEach("data/words", () => catalogue.gameTags.map((t) => ({ slug: `tag.${t.key}`, label: t.label })), notSlug);
/** The exercise groups are also the names of conditions; a group's name is shown as a heading. */
const groupWords = texts("data/words", "group", () => Object.fromEntries([...new Set(catalogue.exercises.map((e) => e.group))].map((g) => [g.toLowerCase().replace(/[^a-z0-9]+/g, "-"), g])));

const by = <T extends { slug: string }>(list: T[]) => new Map(list.map((v) => [v.slug, v]));
const GAME = by(views), EXERCISE = by(exerciseViews), PROGRAMME = by(programmeViews), TEST = by(testViews), MECHANISM = by(mechanismViews), EVIDENCE = by(evidenceViews), TAG = by(tagViews);

export const gameWords = (g: Pick<Game, "slug">) => GAME.get(`game.${g.slug}`)!;
export const exerciseWords = (e: Pick<Exercise, "slug">) => EXERCISE.get(`exercise.${e.slug}`)!;
export const programmeWords = (p: Pick<Programme, "slug">) => PROGRAMME.get(`programme.${p.slug}`)!;
export const testWords = (t: Pick<TestDef, "key">) => TEST.get(`test.${t.key}`)!;
export const mechanismWords = (key: string) => MECHANISM.get(`mechanism.${key}`)!;
export const evidenceWords = (key: EvidenceKey) => EVIDENCE.get(`evidence.${key}`)!;
export const tagWords = (key: string) => TAG.get(`tag.${key}`);
/** An exercise group's name as a heading: "Convergence". The group itself stays the value the code matches on. */
export const groupName = (group: string): string => (groupWords as Record<string, string>)[group.toLowerCase().replace(/[^a-z0-9]+/g, "-")] ?? group;
