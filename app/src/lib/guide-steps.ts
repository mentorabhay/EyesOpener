// Eyes Opener: The steps of each kind of page, as plain data: the web draws them in its step strip (components/guide/flow.tsx), and.
/**
 * The steps of each kind of page, as plain data: the web draws them in its step strip (components/guide/flow.tsx), and
 * the phone and TV apps get the same list from the server and draw it themselves. Every step's words come from a file
 * of words or from the item's own guide, so they are the same sentences the app has always shown, only fewer and in
 * order. No React here and nothing for the browser only, so a server module of the apps may use it.
 */
import { guide as w } from "@/copy/guide";
import type { GameGuide, Shape } from "@/data/game-guides";
import type { Guide } from "@/data/guides";
import type { Eye } from "@/engine";

/** The pictures of the step strip (components/guide/icons.tsx draws them on the web). */
export const ICON_KEYS = [
  "glasses", "patch", "screen", "card", "eye", "cover", "tap", "keys", "timer", "far", "chart", "check",
  "stop", "sliders", "list", "people", "play", "print", "book", "film", "question", "letters", "swap",
  "pen", "download", "trash", "rings", "dots", "drop", "sun",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

/** A step's picture: a drawn icon, a game's own cue picture (black field, three inks), or a big step number. */
export type StepPic = { icon: IconKey; cyan?: Eye } | { cue: Shape[] } | { num: number };

export interface StepData {
  /** A few words: "Glasses on". */
  title: string;
  /** One short line under it. */
  text?: string;
  pic: StepPic;
  /** "stop" marks the step that says what to do if something goes wrong. */
  tone?: "go" | "wait" | "stop";
}

/** Most steps a game's strip shows: more than this and it stops being a glance. */
export const MOST_STEPS = 6;

/** The two fields of a step's words, read one by one so each is looked up in the reader's language. */
const pick = (x: { title: string; text?: string }) => ({ title: x.title, text: x.text });

/** A fixed list of steps from a file of words, each with its picture. */
export const listStepData = (items: readonly { title: string; text?: string }[], icons: readonly IconKey[]): StepData[] =>
  items.map((it, i) => ({ ...pick(it), pic: { icon: icons[i] ?? "check" } }));

/** The glasses step of anything seen through red-cyan glasses, or a patch for the games a patch can also do. */
export function glassesStepData(gear: string, cyan: Eye): StepData | null {
  if (!/red-cyan/i.test(gear)) return null;
  if (/patch/i.test(gear)) return { title: w.game.patch, text: w.game.patchText, pic: { icon: "patch" } };
  return { title: w.game.glasses, text: w.game.glassesWay(cyan), pic: { icon: "glasses", cyan } };
}

/**
 * A game: the glasses, then its "when you see this, do this" pictures (the moments to act), then the stop button.
 * A care companion has no scene and no pictures: its own steps are shown instead.
 */
export function gameStepData({ guide, gear, cyan, care = false }: { guide?: GameGuide; gear: string; cyan: Eye; care?: boolean }): StepData[] {
  const out: StepData[] = [];
  const glasses = glassesStepData(gear, cyan);
  if (glasses) out.push(glasses);
  const cues = guide?.cues ?? [];
  if (cues.length) for (const c of cues) out.push({ title: c.title, text: c.then, tone: c.tone, pic: { cue: c.shapes } });
  else if (guide) for (const line of guide.play) out.push({ title: line, pic: { num: out.length + 1 } });
  if (care) return out.slice(0, MOST_STEPS);
  out.splice(MOST_STEPS - 1);
  out.push({ title: w.game.stop, text: w.game.stopText, tone: "stop", pic: { icon: "stop" } });
  return out;
}

/** An exercise: what to have ready, its own steps one by one, then the numbers to keep. */
export function exerciseStepData(g: Guide | undefined, gear: string, cyan: Eye): StepData[] {
  if (!g) return [];
  const glasses = glassesStepData(gear, cyan);
  const out: StepData[] = [glasses ? { ...glasses, title: w.exercise.ready } : { title: w.exercise.ready, text: g.need[0], pic: { icon: "list" } }];
  for (const line of g.steps) out.push({ title: line, pic: { num: out.length + 1 } });
  if (g.measures.length) out.push({ title: w.exercise.record, text: w.exercise.recordText, pic: { icon: "chart" } });
  return out;
}

/** The steps of one check-up, as its runner asks for them. `cyan` is the eye behind the cyan lens. */
export function checkupStepData(key: string, cyan: Eye): StepData[] {
  const r = w.run;
  const s = (x: { title: string; text?: string }, icon: IconKey): StepData => ({ ...pick(x), pic: { icon, cyan } });
  const glasses = s(r.glasses(cyan), "glasses");
  const saved = s(r.saved, "check");
  switch (key) {
    case "acuity": return [s(r.cover("L"), "cover"), s(r.letter, "letters"), s(r.swap, "swap"), saved];
    case "contrast": return [s(r.cover("L"), "cover"), s(r.faint, "letters"), s(r.swap, "swap"), saved];
    case "balance": return [glasses, s(r.balance, "letters"), saved];
    case "stereo": return [glasses, s(r.depth, "tap"), saved];
    case "fusion_break": case "fusion_recovery": return [glasses, s(r.fusionCheck, "rings"), s(r.fusionSplit, "rings"), s(r.fusionJoin, "rings"), saved];
    case "suppression": return [glasses, s(r.dots, "dots"), saved];
    case "near_point": return [s(r.pen, "pen"), s(r.double, "pen"), s(r.typeIt, "list"), saved];
    case "symptoms": return [s(r.questions, "question"), saved];
    default: return [];
  }
}

/**
 * One clip: cover an eye or put the glasses on when it asks for that, then its own steps, then where the answer is
 * kept. A clip whose screen part explains itself (a survey, a look-and-answer clip) shows only "Press Start".
 */
export function clipStepData({ eye, glasses, lines, cyan }: { eye: Eye | null; glasses: boolean; lines: readonly string[]; cyan: Eye }): StepData[] {
  const out: StepData[] = [];
  if (eye) out.push({ ...pick(w.run.cover(eye)), pic: { icon: "cover" } });
  if (glasses) out.push({ ...pick(w.run.glasses(cyan)), pic: { icon: "glasses", cyan } });
  if (lines.length) for (const line of lines.slice(0, MOST_STEPS - 1 - out.length)) out.push({ title: line, pic: { num: out.length + 1 } });
  else out.push({ ...pick(w.clip.run), pic: { icon: "play" } });
  out.push({ ...pick(w.clip.kept), pic: { icon: "check" } });
  return out;
}

/** The setup step keys and their pictures (lib/setup-rules.ts names the steps). */
export const SETUP_ICON: Record<string, IconKey> = {
  size: "card", gamma: "sun", tune: "glasses", leak: "drop", ink: "sliders", safety: "question", eyes: "letters", lens: "swap", balance: "eye",
};
