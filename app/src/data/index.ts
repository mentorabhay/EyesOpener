// Eyes Opener: The catalogue: games, exercises, clips, mechanisms and community ideas.
/**
 * The catalogue: games, exercises, clips, mechanisms and community ideas.
 * catalogue.json holds this edition's games; catalogue.extra.json holds the games a fuller build adds (empty here).
 * `n` keeps the games in one fixed order whichever edition is built.
 */
import more from "./catalogue.extra.json";
import raw from "./catalogue.json";

export type EvidenceKey = "strong" | "sup" | "moderate" | "limited" | "unproven" | "measures";

export interface Evidence { key: EvidenceKey; label: string; meaning: string }
export interface Mechanism { key: string; label: string; evidence: EvidenceKey; basis: string }
export interface Game { n: number; slug: string; name: string; thumb: string; mechanism: string; play: string; purpose: string; for: string; playsOn: string; gear: string; session: string; tags: string[] }
export interface Exercise { slug: string; name: string; group: string; mechanism: string; how: string; purpose: string; for: string; gear: string; dose: string }
export interface Clip { code: string; title: string; measures: string; seconds: number; group: string }
export interface Idea { slug: string; name: string; theme: string; what: string; why: string; isNew: string; build: string; first: boolean }

interface Catalogue {
  evidence: Evidence[]; mechanisms: Mechanism[]; thumbs: Record<string, string>;
  gameTags: { key: string; label: string }[]; games: Game[]; exercises: Exercise[]; clips: Clip[]; films: string[];
  themes: { key: string; name: string; what: string }[]; ideas: Idea[];
}
const base = raw as unknown as Catalogue, extra = more as unknown as Pick<Catalogue, "games" | "thumbs">;

export const catalogue: Catalogue = {
  ...base,
  games: [...base.games, ...extra.games].sort((a, b) => a.n - b.n),
  thumbs: { ...base.thumbs, ...extra.thumbs },
};

const mech = new Map(catalogue.mechanisms.map((m) => [m.key, m]));
const evid = new Map(catalogue.evidence.map((e) => [e.key, e]));

export const mechanismOf = (key: string): Mechanism => mech.get(key)!;
export const evidenceOf = (key: EvidenceKey): Evidence => evid.get(key)!;
/** Strong evidence means "Strong" or "Strong with supervision". */
export const isStrong = (mechanismKey: string) => ["strong", "sup"].includes(mechanismOf(mechanismKey).evidence);

const EVIDENCE_ORDER: EvidenceKey[] = ["strong", "sup", "moderate", "limited", "unproven", "measures"];
const byEvidence = <T extends { mechanism: string }>(a: T, b: T) =>
  EVIDENCE_ORDER.indexOf(mechanismOf(a.mechanism).evidence) - EVIDENCE_ORDER.indexOf(mechanismOf(b.mechanism).evidence);

/** Games, strongest evidence first. */
export const games: Game[] = [...catalogue.games].sort(byEvidence);
export const exercises: Exercise[] = catalogue.exercises;
export const clips: Clip[] = catalogue.clips;
export const ideas: Idea[] = catalogue.ideas;
export const exerciseGroups: string[] = [...new Set(catalogue.exercises.map((e) => e.group))];

export const gameBySlug = (slug: string) => catalogue.games.find((g) => g.slug === slug);
/** Access level of a game: 0 open to everyone, 1 a named condition, 2 only on a counsellor's plan. Care companions carry no level and count as 0. */
export const gameLevel = (g: Game): 0 | 1 | 2 => Number(/level (\d)/.exec(g.for)?.[1] ?? 0) as 0 | 1 | 2;
export const exerciseBySlug = (slug: string) => catalogue.exercises.find((e) => e.slug === slug);
export const ideaBySlug = (slug: string) => catalogue.ideas.find((i) => i.slug === slug);

/**
 * Programmes. Doses for level 1 come from published trials; level 2 doses are set by a counsellor.
 * `tag` matches the game tags; `group` matches the exercise groups.
 */
export interface Programme {
  slug: string; name: string; level: 0 | 1 | 2; tag: string; group: string | null;
  dailyMinutes: number; daysPerWeek: number; doseBasis: string;
}

export const programmes: Programme[] = [
  { slug: "eye-fitness", name: "Eye fitness", level: 0, tag: "all", group: null, dailyMinutes: 0, daysPerWeek: 7, doseBasis: "No training dose. Breaks, outdoor time and check-ups." },
  { slug: "screen-strain", name: "Screen strain", level: 0, tag: "strain", group: "Screen strain", dailyMinutes: 0, daysPerWeek: 7, doseBasis: "Break and blink habits through the working day." },
  { slug: "child-myopia", name: "Child myopia", level: 0, tag: "myopia", group: "Child myopia", dailyMinutes: 0, daysPerWeek: 7, doseBasis: "Outdoor time counts on the Light ring." },
  { slug: "lazy-eye", name: "Lazy eye", level: 1, tag: "lazy", group: "Lazy eye", dailyMinutes: 60, daysPerWeek: 6, doseBasis: "One hour a day, six days a week: the Luminopia trial dose." },
  { slug: "convergence", name: "Convergence", level: 1, tag: "conv", group: "Convergence", dailyMinutes: 15, daysPerWeek: 5, doseBasis: "Fifteen minutes a day, five days a week: the home part of the CITT trial." },
  { slug: "depth", name: "Depth", level: 1, tag: "depth", group: null, dailyMinutes: 15, daysPerWeek: 5, doseBasis: "Short daily sessions. Evidence for depth training is limited." },
  { slug: "squint", name: "Squint", level: 2, tag: "squint", group: "Squint", dailyMinutes: 0, daysPerWeek: 0, doseBasis: "Set by the linked counsellor." },
  { slug: "after-concussion", name: "After concussion", level: 2, tag: "conc", group: "After concussion", dailyMinutes: 0, daysPerWeek: 0, doseBasis: "Set by the linked counsellor." },
  { slug: "after-stroke", name: "After stroke", level: 2, tag: "stroke", group: "After stroke", dailyMinutes: 0, daysPerWeek: 0, doseBasis: "Set by the linked counsellor." },
];

export const programmeBySlug = (slug: string) => programmes.find((p) => p.slug === slug);

/** The check-up tests the home kit runs, with the unit each one stores. */
export interface TestDef { key: string; name: string; unit: string; perEye: boolean; glasses: boolean; everyDays: number; what: string; lowerIsBetter: boolean; built: boolean }

export const tests: TestDef[] = [
  { key: "acuity", name: "Letter size", unit: "logMAR", perEye: true, glasses: false, everyDays: 7, what: "The smallest letter each eye can read.", lowerIsBetter: true, built: true },
  { key: "contrast", name: "Faint letters", unit: "logCS", perEye: true, glasses: false, everyDays: 30, what: "The faintest letter each eye can read.", lowerIsBetter: false, built: true },
  { key: "balance", name: "Eye balance", unit: "log_ratio", perEye: false, glasses: true, everyDays: 7, what: "How far the stronger eye must be dimmed for both eyes to pull equally.", lowerIsBetter: false, built: true },
  { key: "stereo", name: "Depth", unit: "arcsec", perEye: false, glasses: true, everyDays: 30, what: "The smallest depth step both eyes can see together.", lowerIsBetter: true, built: true },
  { key: "fusion_break", name: "Fusion range, break", unit: "prism_dioptre", perEye: false, glasses: true, everyDays: 7, what: "How far the eyes can turn in before the picture doubles.", lowerIsBetter: false, built: true },
  { key: "fusion_recovery", name: "Fusion range, recovery", unit: "prism_dioptre", perEye: false, glasses: true, everyDays: 7, what: "Where the doubled picture joins again.", lowerIsBetter: false, built: true },
  { key: "near_point", name: "Near point", unit: "cm", perEye: false, glasses: false, everyDays: 7, what: "How close a target comes before it doubles.", lowerIsBetter: true, built: true },
  { key: "suppression", name: "Suppression check", unit: "score", perEye: false, glasses: true, everyDays: 30, what: "Whether the brain is ignoring one eye's picture.", lowerIsBetter: true, built: true },
  { key: "symptoms", name: "Symptom survey", unit: "score", perEye: false, glasses: false, everyDays: 30, what: "Fifteen questions about reading and close work.", lowerIsBetter: true, built: true },
];

export const testByKey = (key: string) => tests.find((t) => t.key === key);
