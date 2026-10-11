import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { Btn, Card, Chip, Empty, PageHead, type Tone } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { duet as t } from "@/copy/duet";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import type { PartState } from "@/lib/duet";
import { duetCandidates, householdDuets, type Candidate, type DuetSide, type DuetView } from "@/lib/duet-data";
import { requireMember, type Member } from "@/lib/session";
import { endDuetAction, startDuetAction } from "./actions";
import css from "./duet.module.css";

const idea = ideaBySlug("duet-streak")!;
export const metadata: Metadata = { title: idea.name };

const stateTone: Record<PartState, Tone> = { done: "ok", open: "plain", rest: "none", missed: "plain" };

/** One sentence saying what this partner's part is. */
const partLine = (side: DuetSide, other: DuetSide) =>
  side.part.kind === "practice" ? t.part.practice(side.name, side.part.minutes) : side.part.kind === "care" ? t.part.care(side.name) : t.part.note(side.name, other.name);

/** Where the person looking can do an open part now: their own note, or the active profile's practice or care. */
function goFor(m: Member, side: DuetSide): { href: string; label: string } | null {
  if (side.today !== "open") return null;
  if (side.kind === "person") return side.id === m.user.id && m.can("encourage") ? { href: "/together/mail", label: t.go.note } : null;
  if (side.id !== m.profile.id || !m.can("train")) return null;
  return side.part.kind === "practice" ? { href: "/today", label: t.go.practice } : { href: "/train/exercises", label: t.go.care };
}

function Duet({ d, m, numbers }: { d: DuetView; m: Member; numbers: boolean }) {
  const sides = [[d.a, d.b], [d.b, d.a]] as const;
  const go = sides.map(([side]) => goFor(m, side)).find(Boolean) ?? null;
  const kept = d.days.filter((x) => x.state === "kept").length;
  const child = [d.a, d.b].find((x) => x.child);
  return (
    <Card title={t.pair(d.a.name, d.b.name)} span={7} as="article" right={!d.waits && <Chip tone={d.streak.current > 0 ? "grad" : "none"}>{t.days(d.streak.current)}</Chip>}>
      {d.waits ? <p className="notice" data-b="warn">{t.waits(child?.name ?? d.a.name)}</p> : (
        <>
          <h3 className="small muted">{t.today.title}</h3>
          <ul className={css.parts}>
            {sides.map(([side, other]) => (
              <li key={side.id}>
                <p>{partLine(side, other)}{side.kind === "person" && <span className="small muted"> {t.noRecord(side.name)}</span>}</p>
                <Chip tone={stateTone[side.today]}>{t.state[side.today]}</Chip>
              </li>
            ))}
          </ul>
          <p className="notice" data-b={d.today === "kept" ? "ok" : undefined}>{t.today[d.today]}</p>
          {go && <div className="row"><Btn href={go.href} kind="g">{go.label}</Btn></div>}

          <h3 className="small muted">{t.strip.title(d.days.length)}</h3>
          <div className={css.strip} role="img" aria-label={t.strip.label(kept, d.days.length)}>
            {d.days.map((x, i) => <i key={x.day} data-s={x.state} data-today={i === d.days.length - 1 ? "" : undefined} title={`${dayText(x.day)}: ${t.strip.state[x.state]}`} />)}
          </div>
          <p className="muted small">{t.strip.key}</p>

          {numbers && (
            <dl className="kv">
              <div><dt>{t.stats.current}</dt><dd className="tnum">{t.days(d.streak.current)}</dd></div>
              <div><dt>{t.stats.longest}</dt><dd className="tnum">{t.days(d.streak.longest)}</dd></div>
              <div><dt>{t.stats.kept}</dt><dd className="tnum">{t.days(d.streak.kept)}</dd></div>
            </dl>
          )}
          {d.streak.current === 0 && <p className="muted small">{d.streak.kept > 0 ? t.restart(d.streak.kept) : t.first}</p>}
        </>
      )}
      <p className="muted small">{t.since(dayText(d.startedOn))}</p>
      {m.can("manage_family") && (
        <details className={css.end}>
          <summary className="btn btn-sm">{t.end.open}</summary>
          <p className="small">{t.end.warn}</p>
          <StateForm action={endDuetAction} submit={t.end.submit}><input type="hidden" name="id" value={d.id} /></StateForm>
        </details>
      )}
    </Card>
  );
}

const Options = ({ list }: { list: Candidate[] }) => (
  <>
    {list.map((c) => (
      <option key={c.key} value={c.key} disabled={c.taken}>
        {c.taken ? t.start.taken(c.name, t.start.kind[c.kind] ?? c.kind) : t.start.option(c.name, t.start.kind[c.kind] ?? c.kind)}
      </option>
    ))}
  </>
);

export default async function DuetPage() {
  const m = await requireMember();
  const mayStart = m.can("manage_family");
  const [duets, people] = await Promise.all([householdDuets(m), mayStart ? duetCandidates(m) : null]);
  const first = duets.find((d) => !d.waits);

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={first && [
          { value: first.streak.current, label: t.stats.current },
          { value: first.streak.longest, label: t.stats.longest },
          { value: first.streak.kept, label: t.stats.kept },
        ]}
      />
      <p className="notice">{t.rule}</p>

      <div className="bento">
        {/* the first duet's numbers are the page's big numbers; any other duet carries its own */}
        {duets.map((d) => <Duet key={d.id} d={d} m={m} numbers={d !== first} />)}
        {duets.length === 0 && (
          <Card span={7}><Empty title={t.none.title}><span>{!mayStart ? t.none.other : people?.pick ? t.none.guardian : t.none.nobody}</span></Empty></Card>
        )}

        <Card title={t.how.title} span={5}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.how.points.map((line) => <li key={line}>{line}</li>)}</ul>
        </Card>

        {people?.pick && (
          <Card title={t.start.title} span={7}>
            <StateForm action={startDuetAction} submit={t.start.submit} primary={duets.length === 0}>
              <div className="field">
                <label htmlFor="duet-a">{t.start.first}</label>
                <select id="duet-a" name="a" required defaultValue={people.pick.a} aria-describedby="duet-a-hint"><Options list={people.profiles} /></select>
                <span id="duet-a-hint" className="muted small">{t.start.firstHint}</span>
              </div>
              <div className="field">
                <label htmlFor="duet-b">{t.start.second}</label>
                <select id="duet-b" name="b" required defaultValue={people.pick.b} aria-describedby="duet-b-hint">
                  <optgroup label={t.start.profiles}><Options list={people.profiles} /></optgroup>
                  <optgroup label={t.start.people}><Options list={people.people} /></optgroup>
                </select>
                <span id="duet-b-hint" className="muted small">{t.start.secondHint}</span>
              </div>
            </StateForm>
          </Card>
        )}
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
