/** Catalogue cards for the public pages: a game, an exercise, a programme. Each links into the app. */
import Link from "next/link";
import { Chip, EvidenceChip, SceneThumb } from "@/components/ui";
import { site as t } from "@/copy/site";
import { gameLevel, mechanismOf, type Exercise, type Game, type Programme } from "@/data";
import { MAX_DAILY_MINUTES } from "@/engine";
import { isBuilt } from "@/games/built";
import { evidenceIn, exercisesIn, forWhom, gamesIn } from "@/lib/site";
import { NotBuilt } from "./parts";

const c = t.library.card;

export function GameCard({ g }: { g: Game }) {
  return (
    <Link className="gcard" href={`/train/games/${g.slug}`}>
      <SceneThumb thumb={g.thumb} label={c.thumb(g.name)} />
      <div className="b">
        <h3>{g.name}</h3>
        <p>{g.purpose}</p>
        <p className="s-meta"><b>{c.for}:</b> {forWhom(g)}</p>
        <p className="s-meta"><b>{c.gear}:</b> {g.gear} · <b>{c.playsOn}:</b> {g.playsOn}</p>
        <div className="s-chips"><EvidenceChip level={mechanismOf(g.mechanism).evidence} /><Chip>{mechanismOf(g.mechanism).label}</Chip>{gameLevel(g) === 2 && <LevelChip level={2} />}{!isBuilt(g.slug) && <NotBuilt />}</div>
      </div>
    </Link>
  );
}

export function ExerciseCard({ e }: { e: Exercise }) {
  return (
    <Link className="s-card s-ex" href={`/train/exercises/${e.slug}`}>
      <h3>{e.name}</h3>
      <p>{e.purpose}</p>
      <p className="s-meta"><b>{c.for}:</b> {forWhom(e)}</p>
      <p className="s-meta"><b>{c.gear}:</b> {e.gear} · <b>{c.dose}:</b> {e.dose}</p>
      <div className="s-chips s-foot-row"><EvidenceChip level={mechanismOf(e.mechanism).evidence} /><Chip>{mechanismOf(e.mechanism).label}</Chip></div>
    </Link>
  );
}

/** One exercise as a row of a list: the whole row opens it. Who it is for, what to have and the dose sit on one quiet line. */
export function ExerciseRow({ e }: { e: Exercise }) {
  return (
    <li>
      <Link className="s-exrow" href={`/train/exercises/${e.slug}`}>
        <span className="s-exname"><b>{e.name}</b><span>{e.purpose}</span></span>
        <span className="s-exmeta">{forWhom(e)} · {e.gear} · {e.dose}</span>
        <span className="s-chips"><EvidenceChip level={mechanismOf(e.mechanism).evidence} /></span>
        <span className="s-exgo" aria-hidden="true" />
      </Link>
    </li>
  );
}

const d = t.programmes.dose;

/** The dose of a programme in words, worked out from the catalogue. */
export function doseLine(p: Programme): string {
  if (p.level === 2) return d.counsellor;
  if (!p.dailyMinutes) return d.none;
  return d.set(Math.min(p.dailyMinutes, MAX_DAILY_MINUTES), p.daysPerWeek);
}

export const LevelChip = ({ level }: { level: 0 | 1 | 2 }) => <Chip tone={level === 0 ? "ok" : level === 1 ? "plain" : "warn"}>{t.level.chip[level]}</Chip>;

export function ProgrammeCard({ p }: { p: Programme }) {
  const about = t.programmes.about[p.slug];
  return (
    <Link className="s-card s-reveal" href={`/programmes/${p.slug}`} aria-label={t.programmes.card.openOf(p.name)}>
      <div className="s-chips"><LevelChip level={p.level} /></div>
      <h3>{p.name}</h3>
      <p>{about?.forWho}</p>
      <dl className="kv">
        <div><dt>{t.programmes.card.dose}</dt><dd className="tnum">{doseLine(p)}</dd></div>
      </dl>
      <p className="s-meta tnum">{t.programmes.card.holds(gamesIn(p).length, exercisesIn(p).length)}</p>
      <div className="s-chips">{evidenceIn(p).map((k) => <EvidenceChip key={k} level={k} />)}</div>
      <p className="s-foot-row s-go">{t.programmes.card.open}</p>
    </Link>
  );
}
