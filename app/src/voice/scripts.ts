// Eyes Opener: The scripts: what Eyes Opener can say aloud, built from the words the app already shows.
/**
 * The scripts: what Eyes Opener can say aloud, built from the words the app already shows.
 *
 * One script for each item and part, named like a path: "exercise/brock-string/steps", "game/tunnel-glide/cues",
 * "clip/m01/how". A script is read from the same data the page is drawn from, so the two cannot drift apart:
 *   exercise   what · setup (what to have ready, then the set-up) · steps · right (signs it is done right, then the
 *              common mistakes) · stop
 *   game       what · see (what you should see) · play (the steps) · cues (when to press) · stop
 *   clip       how (what the clip is, which eye to cover, then its steps)
 *   kids       play · break · outside · stop (child mode's tiles, read aloud on its Listen page)
 * Each part is what one card of the page shows, so a Listen button on a card reads that card.
 *
 * Every script carries the mark (hash) of its text. Stored audio is offered only while its mark still matches, so
 * a changed sentence is never spoken in its old wording, and unchanged audio is never made again.
 *
 * Nothing here is about a member. Where the page words depend on which eye wears the cyan lens, there are two
 * scripts, one for each way round (`CYAN_SIDES`), and the page picks by the member's eye settings.
 *
 * Pure and deterministic: the same code gives the same scripts, in the same order.
 */
import { stepsOf } from "@/clips/steps";
import { clips as clipWords } from "@/copy/clips";
import { kids } from "@/copy/kids";
import { measure } from "@/copy/test";
import { train } from "@/copy/train";
import { CLIP_DEFS, LOOKS, type OfferedClip } from "@/data/clips";
import { gameGuides, type GameGuide } from "@/data/game-guides";
import { guides, type Guide } from "@/data/guides";
import { inEnglish } from "@/i18n/runtime";
import { charsOf, hashOf, sentence, spokenList, spokenParts, spokenSection, spokenSteps } from "./speak";

export const SCRIPT_PARTS = {
  exercise: ["what", "setup", "steps", "right", "stop"],
  game: ["what", "see", "play", "cues", "stop"],
  clip: ["how"],
  kids: ["play", "break", "outside", "stop"],
} as const;
export type ScriptKind = keyof typeof SCRIPT_PARTS;
export type ExercisePart = (typeof SCRIPT_PARTS.exercise)[number];
export type GamePart = (typeof SCRIPT_PARTS.game)[number];
export type KidsPart = (typeof SCRIPT_PARTS.kids)[number];

/** Which eye the cyan lens sits over, for the few clips whose words name that eye. */
export const CYAN_SIDES = ["left", "right"] as const;
export type CyanSide = (typeof CYAN_SIDES)[number];

export interface Script {
  /** "exercise/brock-string/steps". Lower case, digits, hyphens and slashes only. */
  id: string;
  kind: ScriptKind;
  /** The exercise's or game's slug, or the clip's code in lower case. */
  item: string;
  part: string;
  /** What is said, in English. Plain text: sentences, with a line break between list items and an empty line between sections. */
  text: string;
  /** The mark of `text`. */
  hash: string;
  /** The characters a speech service counts for `text`. */
  chars: number;
}

export const exerciseScriptId = (slug: string, part: ExercisePart) => `exercise/${slug}/${part}`;
export const gameScriptId = (slug: string, part: GamePart) => `game/${slug}/${part}`;
export const kidsScriptId = (part: KidsPart) => `kids/tiles/${part}`;

const make = (kind: ScriptKind, item: string, part: string, text: string): Script[] =>
  text ? [{ id: `${kind}/${item}/${part}`, kind, item, part, text, hash: hashOf(text), chars: charsOf(text) }] : [];

/** The five scripts of one exercise guide. */
export function exerciseScripts(g: Guide): Script[] {
  const x = train.exercise;
  const text: Record<ExercisePart, string> = {
    what: sentence(g.what),
    setup: spokenParts(spokenSection(x.need, spokenList(g.need)), spokenSection(x.setup, spokenSteps(g.setup))),
    steps: spokenSteps(g.steps),
    right: spokenParts(spokenSection(x.right, spokenList(g.right)), spokenSection(x.mistakes, spokenList(g.mistakes))),
    stop: spokenParts(spokenSection(x.stop, spokenList(g.stop)), sentence(x.stopNote)),
  };
  return SCRIPT_PARTS.exercise.flatMap((part) => make("exercise", g.slug, part, text[part]));
}

/** The scripts of one game guide. A care companion with no pictures of "when to press" has no cues script. */
export function gameScripts(g: GameGuide): Script[] {
  const x = train.game.guide;
  const text: Record<GamePart, string> = {
    what: sentence(g.what),
    see: spokenSection(x.see, spokenList(g.see)),
    play: spokenSteps(g.play),
    cues: spokenSection(x.cues, g.cues.map((c) => `${sentence(c.title)} ${sentence(c.then)}`).join("\n")),
    stop: spokenParts(spokenSection(x.stop, spokenList(g.stop)), sentence(x.stopNote)),
  };
  return SCRIPT_PARTS.game.flatMap((part) => make("game", g.slug, part, text[part]));
}

/** Child mode's tiles, each read as its name and then what to do. */
export function kidsScripts(): Script[] {
  return SCRIPT_PARTS.kids.flatMap((part) => make("kids", "tiles", part, spokenParts(sentence(kids.tiles[part].name), sentence(kids.tiles[part].say))));
}

/** The steps a clip shows before it starts: its own for a "look and answer" clip, the template's otherwise. */
const clipSteps = (def: OfferedClip): readonly string[] => (def.play.template === "look" ? LOOKS[def.play.scene]?.steps ?? [] : stepsOf(def));

/** True when the clip's steps name the eye behind the cyan lens, which differs from member to member. */
export const clipNamesAnEye = (def: OfferedClip): boolean => clipSteps(def).some((s) => /\{(cyan|red)\}/.test(s));

/** The id of a clip's script. `cyan` is the eye the member's cyan lens sits over; it matters for a few clips only. */
export function clipScriptId(def: OfferedClip, cyan: CyanSide): string {
  return `clip/${def.code.toLowerCase()}/${clipNamesAnEye(def) ? `how-cyan-${cyan}` : "how"}`;
}

/** The script of one clip, or its two scripts when the words name an eye. */
export function clipScripts(def: OfferedClip): Script[] {
  const play = def.play, eye = "eye" in play && play.eye !== "both" ? play.eye : null;
  const cover = eye ? measure.cover(eye) : null;
  const text = (steps: readonly string[]) => spokenParts(sentence(clipWords.what(def.code)), cover ? sentence(cover.lead + cover.rest) : "", spokenSteps(steps));
  const item = def.code.toLowerCase(), steps = clipSteps(def);
  if (!clipNamesAnEye(def)) return make("clip", item, "how", text(steps));
  return CYAN_SIDES.flatMap((cyan) => {
    const red = cyan === "left" ? "right" : "left";
    return make("clip", item, `how-cyan-${cyan}`, text(steps.map((s) => s.replaceAll("{cyan}", cyan).replaceAll("{red}", red))));
  });
}

let built: { list: Script[]; byId: Map<string, Script> } | null = null;
function build() {
  if (built) return built;
  /* Always the English scripts, whatever language the request is in: a script's mark is the mark of its English
     text, and this list is kept for every request that follows. */
  const list = inEnglish(() => [
    ...guides.flatMap(exerciseScripts),
    ...gameGuides.flatMap(gameScripts),
    ...CLIP_DEFS.flatMap((d) => (d.offered ? clipScripts(d) : [])),
    ...kidsScripts(),
  ]);
  built = { list, byId: new Map(list.map((s) => [s.id, s])) };
  return built;
}

/** Every script of this edition: exercises, then games, then clips, then child mode's tiles, each in the order of its own list. */
export const allScripts = (): readonly Script[] => build().list;
export const scriptById = (id: string): Script | undefined => build().byId.get(id);

/**
 * Picks scripts by pattern, for a pipeline run or a test: an exact id, or a pattern in which "*" stands for any
 * run of characters ("exercise/brock-string/*", "game/*", "*"). Several patterns add up.
 */
export function selectScripts(patterns: readonly string[], from: readonly Script[] = allScripts()): Script[] {
  const tests = patterns.map((p) => new RegExp(`^${p.trim().split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`));
  return from.filter((s) => tests.some((t) => t.test(s.id)));
}
