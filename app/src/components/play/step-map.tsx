/**
 * The steps of a game as a flow diagram, as on the How it works page (Ved, 18 October 2026), under the step strip with
 * its pictures: one box for each step, joined in order with arrows, in rows of four; a press on a box (or Enter, or OK
 * on a remote) opens the whole sentence. A step that starts at a level says
 * so, and the step for the highest level this person has reached is marked, so the manual shows how far they got.
 * Under it, the two ways to answer: touch or mouse, keys or a TV remote. Server-safe.
 */
import { Flow, type Node } from "@/components/diagram/kit";
import { Card } from "@/components/ui";
import { train as t } from "@/copy/train";
import type { GameGuide } from "@/data/game-guides/types";

const m = t.manual, x = t.game.guide;

/** A short head for a step: its first clause, at most about 60 letters, cut at a word. */
export function headOf(step: string): string {
  const first = step.split(/(?<=[.;:])\s|,\s(?:then|and)\s/)[0].replace(/[.;:]$/, "");
  if (first.length <= 64) return first;
  /* at a comma when one falls early enough, else at the last whole word */
  const comma = first.slice(0, 64).lastIndexOf(", ");
  if (comma >= 20) return first.slice(0, comma);
  const cut = first.slice(0, 60);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 30))}…`;
}

/** The highest level reached in a game's past sessions (their saved `top`, or `level`), or null. */
export const bestLevelOf = (past: readonly { detail: Record<string, number> | null }[]): number | null =>
  past.reduce<number | null>((b, p) => { const top = p.detail?.top ?? p.detail?.level; return typeof top === "number" && (b === null || top > b) ? top : b; }, null);

/** The level a step starts at, when its sentence names one ("From level 4 ..."). */
export const levelOf = (step: string): number | null => {
  const hit = /\blevel (\d+)\b/i.exec(step);
  return hit ? Number(hit[1]) : null;
};

export function StepMap({ guide, name, best }: { guide: GameGuide; name: string; /** Highest level this person reached in this game, or null. */ best: number | null }) {
  const levels = guide.play.map(levelOf);
  /* the step of the highest level reached: the last step whose level is at or under the best */
  const here = best === null ? -1 : levels.reduce<number>((at, lv, i) => (lv !== null && lv <= best ? i : at), -1);
  const nodes: Node[] = guide.play.map((step, i) => {
    const head = headOf(step), lv = levels[i];
    return {
      key: `${i}`,
      label: head,
      say: <p>{step}</p>,
      tag: i === here && best !== null ? m.here(best) : lv !== null ? m.level(lv) : undefined,
      tone: i === here ? "go" : undefined,
    };
  });
  return (
    <>
      <Flow label={m.flow(name)} nodes={nodes} per={nodes.length > 4 ? 4 : undefined} />
      <section className="bento" aria-label={m.answer}>
        <Card title={x.touch} span={6}><p>{guide.controls.touch}</p></Card>
        <Card title={x.keys} span={6}><p>{guide.controls.keys}</p></Card>
      </section>
    </>
  );
}
