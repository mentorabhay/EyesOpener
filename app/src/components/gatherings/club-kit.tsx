// Eyes Opener: The Cinema Club host kit, drawn once and shown in three places: the member app, the sponsor portal and the.
/**
 * The Cinema Club host kit, drawn once and shown in three places: the member app, the sponsor portal and the
 * counsellor portal. Server-safe. Each page calls its own gate first; nothing here reads who is looking.
 */
import Link from "next/link";
import { BREAK_METRES, type ChapterPlan } from "@/components/film/chapters";
import { Card, Chip, Empty } from "@/components/ui";
import { cinema } from "@/copy/cinema";
import { cinemaClub as t, type KitNumbers } from "@/copy/cinema-club";
import { MAX_DAILY_MINUTES } from "@/engine";
import { CLUB_PLAN, timeText } from "@/lib/cinema-club";
import type { Club } from "@/lib/cinema-club-data";
import { ClubScreen } from "./club-screen";
import css from "./paper.module.css";
import { PrintButton } from "./print-button";

export const KIT_PARTS = ["guide", "sheet", "screen"] as const;
export type KitPart = (typeof KIT_PARTS)[number];
export const isKitPart = (v: string): v is KitPart => (KIT_PARTS as readonly string[]).includes(v);

/** Every number the kit prints, from the cinema's own rules. */
export const kitNumbers = (): KitNumbers => ({ ...CLUB_PLAN, breakMetres: BREAK_METRES, dayCap: MAX_DAILY_MINUTES });

/** The three parts of the kit as links. `base` is where this area keeps them, such as "/together/cinema-club". */
export function KitLinks({ base }: { base: string }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {KIT_PARTS.map((part, i) => (
        <li className="ins" key={part}>
          <div className="tx"><b>{t.kit[part].name}</b><div className="sub">{t.kit[part].what}</div></div>
          <Link className={`btn btn-sm${i === 0 ? " btn-g" : ""}`} href={`${base}/${part}`} aria-label={`${t.kit.open}: ${t.kit[part].name}`}>{t.kit.open}</Link>
        </li>
      ))}
    </ul>
  );
}

/** What a shared screen cannot do, and the setting a group uses. */
export function Limits() {
  const n = kitNumbers();
  return (
    <>
      <p><b>{t.limits.lead}</b></p>
      <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>
        {t.limits.points(n).map((p) => <li key={p.b}><b>{p.b}</b> {p.t}</li>)}
      </ul>
      <div className="notice stack"><b>{t.limits.own.title}</b><p>{t.limits.own.body}</p></div>
    </>
  );
}

/** The clubs a family can go to: a place and a time. */
export function ClubList({ clubs }: { clubs: Club[] }) {
  if (!clubs.length) return <Empty title={t.list.none.title}><span>{t.list.none.body}</span></Empty>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {clubs.map((c) => (
        <li className="ins" key={c.id}>
          <div className="tx">
            <b>{c.placeName}</b>
            <div className="sub tnum">{t.list.when(c.weekday, timeText(c.startMinute))}</div>
          </div>
          <span className="row" style={{ justifyContent: "flex-end" }}>
            {c.isSample && <Chip tone="warn">{t.list.sample}</Chip>}
            <Chip>{t.list.kind[c.placeKind]}</Chip>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The note and the Print button that stand above a sheet on screen and are left off the paper. */
function PrintBar() {
  return (
    <div className={`row ${css.hide}`}>
      <PrintButton label={t.kit.print} />
      <span className="muted small">{t.kit.printHint}</span>
    </div>
  );
}

/** The host guide, as paper. */
export function HostGuide() {
  const n = kitNumbers();
  return (
    <div className={css.doc}>
      <PrintBar />
      <div className={css.pages}>
        <article className={css.paper}>
          <h2>{t.guide.title}</h2>
          <p className="soft">{t.guide.sub}</p>
          <div className={css.box}>
            <b>{t.limits.title}</b>
            <ul>{t.limits.points(n).map((p) => <li key={p.b}><b>{p.b}</b> {p.t}</li>)}</ul>
            <p><b>{t.limits.own.title}.</b> {t.limits.own.body}</p>
          </div>
          {t.guide.sections(n).map((s) => (
            <section key={s.id}>
              <h3>{s.title}</h3>
              {"lead" in s && s.lead && <p className="lead">{s.lead}</p>}
              {"items" in s && s.items && <ul>{s.items.map((line) => <li key={line}>{line}</li>)}</ul>}
              {"steps" in s && s.steps && <ol>{s.steps.map((line) => <li key={line}>{line}</li>)}</ol>}
              {"after" in s && s.after && <p>{s.after}</p>}
            </section>
          ))}
          <p className={css.foot}>{t.guide.foot}</p>
        </article>
      </div>
    </div>
  );
}

/** The session sheet, as paper: one page to tick with a pen. It has no place for a child's name. */
export function SessionSheet() {
  const n = kitNumbers(), s = t.sheet;
  const before = s.before.items(n);
  return (
    <div className={css.doc}>
      <PrintBar />
      <div className={css.pages}>
        <article className={css.paper}>
          <h2>{s.title}</h2>
          <p className="soft">{s.sub} <b>{s.noNames}</b></p>
          <div className={css.fill}>
            {(["place", "date", "host", "second"] as const).map((f) => <div key={f}>{s.fields[f]}<span /></div>)}
          </div>
          <section>
            <h3>{s.before.title}</h3>
            <ul className={css.ticks}>
              {before.map((line) => <li key={line}><span>{line}{line.endsWith(":") && <i className={css.blank} />}</span></li>)}
            </ul>
          </section>
          <section>
            <h3>{s.chapters.title}</h3>
            <table className={css.grid}>
              <thead><tr><th scope="col">{s.chapters.cols.chapter}</th><th scope="col">{s.chapters.cols.watched}</th><th scope="col">{s.chapters.cols.rest}</th></tr></thead>
              <tbody>
                {Array.from({ length: n.chapters }, (_, i) => (
                  <tr key={i}>
                    <th scope="row">{s.chapters.row(i + 1)}</th>
                    <td className={css.tick} />
                    {i + 1 < n.chapters ? <td className={css.tick} /> : <td className={`${css.tick} ${css.none}`}>{s.chapters.lastBreak}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="soft">{s.chapters.note(n)}</p>
          </section>
          <section>
            <h3>{s.after.title}</h3>
            <ul className={css.ticks}>
              {s.after.items.map((line) => <li key={line}><span>{line}{line.endsWith(":") && <i className={css.blank} />}</span></li>)}
            </ul>
            <p>{s.after.count}: {s.after.children}<i className={css.blank} /> {s.after.grownUps}<i className={css.blank} /></p>
          </section>
          <p className={css.foot}>{s.never} {s.noNames}</p>
        </article>
      </div>
    </div>
  );
}

/** The group screen with what a host must know beside it. */
export function GroupScreen({ plan }: { plan: ChapterPlan }) {
  const n = kitNumbers(), s = t.screen;
  return (
    <>
      <p className="notice" data-b="warn" role="note"><b>{s.notPractice}</b> {s.setting}</p>
      {plan.shortened && <p className="notice" role="note">{cinema.how.test(plan.chapterSeconds, plan.breakSeconds, { chapterSeconds: n.chapterMinutes * 60, breakSeconds: n.breakSeconds })}</p>}
      <div className="bento">
        <Card span={8} as="div"><ClubScreen numbers={n} plan={plan} /></Card>
        <Card span={4} title={s.how.title}>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{s.how.lines(n).map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="muted small">{s.onDevice}</p>
          <p className="notice">{s.unwell}</p>
        </Card>
      </div>
    </>
  );
}
