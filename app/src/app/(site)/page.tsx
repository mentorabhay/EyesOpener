import type { Metadata } from "next";
import { evidenceOf, exercises, gameBySlug, games, mechanismOf, programmes, tests, type EvidenceKey } from "@/data";
import { MAX_DAILY_MINUTES, MIN_SCREEN_AGE } from "@/engine";
import { landing } from "@/copy/landing";
import { Evidence, Family, Safety, Screens } from "./_landing/Chapters";
import { Closing, NotThis } from "./_landing/Closing";
import { Flow } from "./_landing/Flow";
import { Hero } from "./_landing/Hero";
import { Motion } from "./_landing/Motion";
import { Reveal } from "./_landing/Reveal";
import { Spaces } from "./_landing/Spaces";
import { Play } from "./_landing/Play";
import { Tags } from "./_landing/Tags";
import type { LandingFacts } from "./_landing/types";
import "./_landing/landing.css";

export const generateMetadata = (): Metadata => ({ title: { absolute: `IOpener: ${landing.meta.title}` }, description: landing.meta.description });

const LABEL_ORDER: EvidenceKey[] = ["strong", "sup", "moderate", "limited", "unproven", "measures"];
/** The game drawn in the two-eye scene. If the catalogue ever drops it, the strongest two-eye game stands in. */
const SCENE_GAME = "lantern-run";

/** Every number and name on the page, read from the catalogue and the engine. Nothing is typed in by hand. */
function facts(): LandingFacts {
  const level = (mechanism: string) => mechanismOf(mechanism).evidence;
  const count = <T extends { mechanism: string }>(items: T[], key: EvidenceKey) => items.filter((i) => level(i.mechanism) === key).length;

  const rows = LABEL_ORDER.map((key) => {
    const g = count(games, key), e = count(exercises, key);
    return { key, label: evidenceOf(key).label, meaning: evidenceOf(key).meaning, games: g, exercises: e, total: g + e };
  }).filter((r) => r.total > 0);
  const longest = Math.max(1, ...rows.map((r) => r.total));

  const scene = gameBySlug(SCENE_GAME) ?? games[0];
  // One game from the strongest label, one from the middle and one from the weakest label a game carries.
  const sampleKeys: EvidenceKey[] = ["strong", "moderate", "unproven"];
  const samples = sampleKeys
    .map((key) => (level(scene.mechanism) === key ? scene : games.find((g) => level(g.mechanism) === key)))
    .filter((g) => g !== undefined)
    .map((g) => ({ slug: g.slug, name: g.name, thumb: g.thumb, mechanism: mechanismOf(g.mechanism).label, level: level(g.mechanism) }));

  const own = programmes.filter((p) => p.level < 2 && p.tag !== "all").sort((a, b) => b.level - a.level);

  return {
    games: games.length,
    exercises: exercises.length,
    checkups: tests.length,
    evidence: rows.map((r) => ({ ...r, share: r.total / longest })),
    samples,
    sceneGame: { name: scene.name, thumb: scene.thumb, mechanism: mechanismOf(scene.mechanism).label, level: level(scene.mechanism) },
    open: own.map((p) => ({ slug: p.slug, name: p.name, dailyMinutes: p.dailyMinutes, daysPerWeek: p.daysPerWeek })),
    gated: programmes.filter((p) => p.level === 2).map((p) => ({ slug: p.slug, name: p.name })),
    everyone: programmes.find((p) => p.tag === "all")?.name ?? "",
    perEye: tests.filter((t) => t.perEye).map((t) => t.name),
    maxMinutes: MAX_DAILY_MINUTES,
    minAge: MIN_SCREEN_AGE,
  };
}

/**
 * The landing page. A Server Component: all the words and numbers are in the HTML, in their final state.
 * `Motion` is the only client code. It turns the sections into pinned scroll scenes when the screen is large enough
 * and the visitor has not asked for reduced motion.
 */
export default function Landing() {
  const f = facts();
  return (
    <Motion>
      <Hero />
      <Tags maxMinutes={f.maxMinutes} />
      <Play />
      <Reveal facts={f} />
      <Spaces facts={f} />
      <Flow facts={f} />
      <Evidence facts={f} />
      <Safety facts={f} />
      <Family />
      <Screens />
      <NotThis />
      <Closing />
    </Motion>
  );
}
