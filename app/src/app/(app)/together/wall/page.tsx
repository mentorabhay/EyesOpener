import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { Btn, Card, Chip, PageHead } from "@/components/ui";
import { WallPicture } from "@/components/together/wall-art";
import { together } from "@/copy/together";
import { wall as t } from "@/copy/wall";
import { ideaBySlug } from "@/data";
import { percent } from "@/engine";
import { requireMember } from "@/lib/session";
import { wallView, type WallShown } from "@/lib/wall";
import css from "./wall.module.css";

const idea = ideaBySlug("focus-wall")!;
export const metadata: Metadata = { title: idea.name };

const monthName = (month: string) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T00:00:00Z`));

/** One wall as a picture. The name of a picture is said only once the whole of it is in focus. Only this month's wall marks the family's own tiles. */
function Picture({ w, mine }: { w: WallShown; mine: boolean }) {
  const art = t.art[w.art], month = monthName(w.month);
  const label = w.complete ? `${t.gallery.picture(art.title, month)}. ${art.alt}` : mine ? t.blurred(w.count, w.tiles) : t.gallery.unfinished(month, w.count, w.tiles);
  return (
    <div className={`scene ${css.frame}`}>
      <WallPicture art={w.art} id={`wall-${w.month}`} cols={w.cols} rows={w.rows} tiles={w.tiles} sharp={w.sharp} ours={mine ? w.ours : undefined} label={label} />
    </div>
  );
}

export default async function WallPage() {
  const m = await requireMember();
  const { now, today, gallery } = await wallView(m);
  const name = m.profile.displayName;
  const mine = now.complete && !today.earned ? t.today.full
    : today.earned ? t.today.earned(name)
    : today.goal > 0 ? t.today.notYet(name, today.done, today.goal)
    : t.today.noGoal(name);

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[{ value: percent(now.share), label: t.stats.focus }, { value: now.ours.size, label: t.stats.ours }]}
      />
      <div className="bento">
        <Card title={now.complete ? t.art[now.art].title : t.hidden} right={<span className="small muted">{monthName(now.month)}</span>} span={8}>
          <Picture w={now} mine />
          <p className="tnum"><b>{t.grid(now.count, now.tiles)}</b></p>
          {now.complete && <p className="notice" data-b="ok">{t.whole(t.art[now.art].title)}</p>}
          <p className="muted small">{t.key}</p>
          <p className="muted small">{t.credit}</p>
        </Card>

        <Card title={t.rule.title} span={4}>
          <ul className={css.points}>{t.rule.points.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="notice" data-b={today.earned ? "ok" : undefined}>{mine}</p>
          {!today.earned && !now.complete && today.goal > 0 && m.can("train") && <div className="row"><Btn href="/today" kind="d" small>{t.today.cta}</Btn></div>}
        </Card>
      </div>

      <h2>{t.gallery.title}</h2>
      {gallery.length === 0 ? <p className="muted">{t.gallery.none}</p> : (
        <div className={css.past}>
          {gallery.map((w) => (
            <article key={w.month}>
              <Picture w={w} mine={false} />
              <h3>{w.complete ? t.art[w.art].title : monthName(w.month)}</h3>
              <div className="row">
                {w.complete ? <><Chip tone="ok">{t.gallery.finished}</Chip><span className="small muted">{monthName(w.month)}</span></> : <span className="small muted tnum">{t.gallery.ended(w.count, w.tiles)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
      <More><p>{t.sub}</p></More>
    </>
  );
}
