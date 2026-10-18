/**
 * The Games and Exercises lists (Ved, 18 October 2026): what this person is asked to do first ("For Gyan"), a field
 * that narrows the list as you type, then the whole library folded by kind of game or by what an exercise is for.
 * A short list, or a list narrowed by a filter, is shown open in one piece. Order only: every listed item is here.
 */
import type { ReactNode } from "react";
import { Card, EvidenceChip } from "@/components/ui";
import { ListFilter } from "@/components/shell/list-filter";
import { train as t } from "@/copy/train";
import { groupName, mechanismWords } from "@/data/words";
import { mechanismOf, type Exercise, type Game } from "@/data";
import type { ForYou } from "@/lib/for-you";
import type { Status } from "@/lib/status";
import { ExerciseMini, GameMini } from "./cards";

/** At most this many items, and the list is shown in one piece rather than folded. */
const OPEN_UNDER = 12;

function groups<T>(list: T[], key: (x: T) => string): [string, T[]][] {
  const out = new Map<string, T[]>();
  for (const x of list) out.set(key(x), [...(out.get(key(x)) ?? []), x]);
  return [...out];
}

/** `between`: what the page shows after "For Gyan" and before the whole list (its tiles and filters). */
export function GameLibrary({ list, top, status, flat, name, between }: { list: Game[]; top: ForYou[]; status: (slug: string) => Status; flat: boolean; name: string; between?: ReactNode }) {
  const bySlug = new Map(list.map((g) => [g.slug, g]));
  const first = top.filter((f) => bySlug.has(f.slug));
  const open = flat || list.length <= OPEN_UNDER;
  return (
    <div className="stack" id="lib-games">
      {first.length > 0 && !flat && (
        <Card title={t.forYou.title(name)}>
          <div className="mini-grid" data-lf-section>
            {first.map((f) => <GameMini key={f.slug} g={bySlug.get(f.slug)!} status={status(f.slug)} why={f} />)}
          </div>
        </Card>
      )}
      {between}
      <ListFilter target="lib-games" placeholder={t.games.find} />
      {open ? (
        <div className="mini-grid">{list.map((g) => <GameMini key={g.slug} g={g} status={status(g.slug)} />)}</div>
      ) : (
        <section className="fams" aria-label={t.games.library}>
          <p className="muted small">{t.games.librarySub}</p>
          {groups(list, (g) => g.mechanism).map(([mech, gs]) => (
            <details className="fam" key={mech}>
              <summary><b>{mechanismWords(mech)?.label ?? mechanismOf(mech).label}</b><span className="muted">{t.games.count(gs.length)}</span><EvidenceChip level={mechanismOf(mech).evidence} /></summary>
              <div className="fam-body mini-grid">{gs.map((g) => <GameMini key={g.slug} g={g} status={status(g.slug)} />)}</div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

export function ExerciseLibrary({ list, top, status, tool, flat, name, mine, between }: {
  list: Exercise[]; top: ForYou[]; status: (slug: string) => Status; tool: (slug: string) => string | undefined; flat: boolean; name: string; between?: ReactNode;
  /** The exercise group of the person's programme: its fold starts open. */
  mine: string | null;
}) {
  const bySlug = new Map(list.map((e) => [e.slug, e]));
  const first = top.filter((f) => bySlug.has(f.slug));
  const open = flat || list.length <= OPEN_UNDER;
  return (
    <div className="stack" id="lib-exercises">
      {first.length > 0 && !flat && (
        <Card title={t.forYou.title(name)}>
          <div className="mini-grid" data-lf-section>
            {first.map((f) => <ExerciseMini key={f.slug} e={bySlug.get(f.slug)!} status={status(f.slug)} tool={tool(f.slug)} why={f} />)}
          </div>
        </Card>
      )}
      {between}
      <ListFilter target="lib-exercises" placeholder={t.exercises.find} />
      {open ? (
        <div className="mini-grid">{list.map((e) => <ExerciseMini key={e.slug} e={e} status={status(e.slug)} tool={tool(e.slug)} />)}</div>
      ) : (
        <section className="fams" aria-label={t.exercises.library}>
          {groups(list, (e) => e.group).map(([group, es]) => (
            <details className="fam" key={group} open={group === mine}>
              <summary><b>{groupName(group)}</b><span className="muted">{t.exercises.count(es.length)}</span></summary>
              <div className="fam-body mini-grid">{es.map((e) => <ExerciseMini key={e.slug} e={e} status={status(e.slug)} tool={tool(e.slug)} />)}</div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
