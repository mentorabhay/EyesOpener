/**
 * Compact cards for the Games and Exercises lists (Ved, 18 October 2026: the lists were 6,300 px on a computer and
 * 23,300 px on a phone): a small picture, the name and its chips, one short line. Each carries its words in `data-q`
 * for the list filter (components/shell/list-filter.tsx). Server-safe.
 */
import Link from "next/link";
import { Chip, EvidenceChip, SceneThumb } from "@/components/ui";
import { train as t } from "@/copy/train";
import { mechanismOf, type Exercise, type Game } from "@/data";
import { exerciseWords, gameWords } from "@/data/words";
import type { ForYou } from "@/lib/for-you";
import type { Status } from "@/lib/status";

const q = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();

export function WhyChip({ f, kind = "game" }: { f: ForYou; kind?: "game" | "exercise" }) {
  const w = t.forYou.why;
  return <Chip tone={f.why === "recent" ? "plain" : "grad"}>{f.why === "counsellor" ? w.counsellor(f.by ?? "") : f.why === "week" ? w.week : kind === "game" ? w.recent : t.forYou.recentExercise}</Chip>;
}

export function GameMini({ g, status, why }: { g: Game; status: Status; why?: ForYou }) {
  const w = gameWords(g);
  return (
    <Link href={`/train/games/${g.slug}`} className="mini" data-q={q(g.name, w.purpose, w.who)} data-why={why?.why}>
      <SceneThumb thumb={g.thumb} label={g.name} />
      <span className="mini-b">
        <b>{g.name}</b>
        <span className="row">
          {why ? <WhyChip f={why} /> : <EvidenceChip level={mechanismOf(g.mechanism).evidence} />}
          {status !== "open" && <Chip tone={status === "counsellor" ? "plain" : "warn"}>{t.game.statusFor[status]}</Chip>}
        </span>
        <small>{w.who}</small>
      </span>
    </Link>
  );
}

export function ExerciseMini({ e, status, tool, why }: { e: Exercise; status: Status; tool?: string; why?: ForYou }) {
  const w = exerciseWords(e);
  return (
    <Link href={`/train/exercises/${e.slug}`} className="mini" data-q={q(e.name, w.purpose, w.who, w.how)} data-why={why?.why}>
      <span className="mini-b">
        <b>{e.name}</b>
        <span className="row">
          {why ? <WhyChip f={why} kind="exercise" /> : <EvidenceChip level={mechanismOf(e.mechanism).evidence} />}
          {tool && <Chip>{tool}</Chip>}
          {status !== "open" && <Chip tone={status === "counsellor" ? "plain" : "warn"}>{t.exercise.statusFor[status]}</Chip>}
        </span>
        <small>{w.who} · {w.dose}</small>
      </span>
    </Link>
  );
}
