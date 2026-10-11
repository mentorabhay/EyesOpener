import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import { GlassesOn } from "@/components/measure/cover";
import css from "@/components/together/rewards.module.css";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/ui";
import { gallery as t } from "@/copy/gallery";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import { foundDepth } from "@/lib/gallery";
import { galleryFor, type Shown } from "@/lib/gallery-data";
import { requireMember } from "@/lib/session";
import { LanternArt, PlantArt, ShapeArt } from "./art";
import { DepthPicture, FaintPicture } from "./pictures";

const idea = ideaBySlug("locked-gallery")!;
export const metadata: Metadata = { title: idea.name };

/** Used for the dots until onboarding has measured this profile: the letter a standard eye profile gets. */
const FALLBACK_LETTER_CM = 0.6;

const Mark = ({ item }: { item: Shown }) => (item.reachedAt ? <Chip tone="ok">{t.reached(dayText(item.reachedAt))}</Chip> : <Chip>{t.notReached}</Chip>);

/**
 * The active profile's gallery. Reading the page keeps the marks up to date from the profile's own check-ups and
 * practice days; nothing on it can be pressed to reach a picture. Anyone of the household who may look may open it.
 */
export default async function GalleryPage() {
  const m = await requireMember();
  const g = await galleryFor(m);
  const depth = g.items.filter((i) => i.kind === "depth"), faint = g.items.filter((i) => i.kind === "faint");
  const effort = g.items.filter((i) => i.kind === "days" || i.kind === "weeks");
  const pictures = [...depth, ...faint];
  const cyanEye = m.eye?.cyanEye === "right" ? "R" as const : "L" as const;
  const dotCm = (m.eye?.letterCm ?? FALLBACK_LETTER_CM) / 5;
  const mayTest = m.can("test");

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[
          { value: t.stats.of(pictures.filter((i) => i.reachedAt).length, pictures.length), label: t.stats.pictures },
          { value: g.effort.days, label: t.stats.days },
        ]}
      />
      <Card title={t.how.title}>
        <ul className={css.points}>{t.how.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="notice">{t.how.honest}</p>
      </Card>

      <h2>{t.depth.title}</h2>
      <Card>
        <GlassesOn cyanEye={cyanEye} />
        <p>{t.depth.intro}</p>
        <div className="row">
          <span>{!g.depth ? t.depth.latest.none : foundDepth(g.depth) ? t.depth.latest.found(g.depth.value, dayText(g.depth.takenAt)) : t.depth.latest.notFound(dayText(g.depth.takenAt))}</span>
          {mayTest && <Btn href="/test/stereo" small>{t.depth.take}</Btn>}
        </div>
        <p className="muted small">{t.depth.noGlasses}</p>
      </Card>
      {m.device ? (
        <div className={css.wall}>
          {depth.map((i) => i.kind === "depth" && (
            <article key={i.slug}>
              <DepthPicture slug={i.slug} shape={i.shape} arcsec={i.arcsec} ppc={m.device!.pxPerCm} dist={m.device!.distanceCm} cyanEye={cyanEye} dotCm={dotCm} name={i.reachedAt ? t.names[i.shape] : undefined} />
              <h3>{i.reachedAt ? t.names[i.shape] : t.depth.locked(i.arcsec)}</h3>
              <div className="row"><Mark item={i} /></div>
              {i.reachedAt
                ? <div className={css.shown}><div className="scene"><ShapeArt shape={i.shape} label={t.names[i.shape]} /></div><span className="small muted">{t.showsWhat}</span></div>
                : <p className="small muted">{t.depth.rule(i.arcsec)} {t.depth.seeIt}</p>}
            </article>
          ))}
        </div>
      ) : (
        <Empty title={t.depth.noScreen.title}>
          <span>{t.depth.noScreen.body}</span>
          {m.can("manage_family") && <div><Btn href="/settings/screen" small>{t.depth.noScreen.cta}</Btn></div>}
        </Empty>
      )}

      <h2>{t.faint.title}</h2>
      <Card>
        <p>{g.weakEye ? t.faint.weaker(g.weakEye) : t.faint.both}</p>
        <div className="row">
          <span>{g.faint.map((f) => (f.value === null ? t.faint.latest.none(f.eye) : t.faint.latest.found(f.eye, f.value))).join(" ")}</span>
          {mayTest && <Btn href="/test/contrast" small>{t.faint.take}</Btn>}
        </div>
      </Card>
      <div className={css.wall}>
        {faint.map((i) => i.kind === "faint" && (
          <article key={i.slug}>
            <FaintPicture shape={i.shape} logCs={i.logCs} gamma={m.device?.gamma ?? 2.2} name={i.reachedAt ? t.names[i.shape] : undefined} />
            <h3>{i.reachedAt ? t.names[i.shape] : t.faint.locked(i.logCs)}</h3>
            <div className="row"><Mark item={i} /></div>
            {i.reachedAt
              ? <div className={css.shown}><div className="scene"><ShapeArt shape={i.shape} label={t.names[i.shape]} /></div><span className="small muted">{t.showsWhat}</span></div>
              : <p className="small muted">{t.faint.rule(i.logCs)}</p>}
          </article>
        ))}
      </div>

      <h2>{t.effort.title}</h2>
      <Card>
        <p>{t.effort.intro}</p>
        <p className="muted small">{t.effort.rule}</p>
      </Card>
      <div className={`${css.wall} ${css.small}`}>
        {effort.map((i) => (i.kind === "days" || i.kind === "weeks") && (
          <article key={i.slug}>
            <div className={`scene ${css.frame}`} data-got={!!i.reachedAt}>
              {i.kind === "days"
                ? <PlantArt days={i.days} label={t.effort.alt.days(i.days, !!i.reachedAt)} />
                : <LanternArt weeks={i.weeks} label={t.effort.alt.weeks(i.weeks, !!i.reachedAt)} />}
            </div>
            <h3>{i.kind === "days" ? t.effort.days(i.days) : t.effort.weeks(i.weeks)}</h3>
            {i.reachedAt ? <div className="row"><Mark item={i} /></div> : i.progress && (
              <div className={css.count}>
                <span className="small tnum">{t.effort.progress(i.progress.done, i.progress.of)}</span>
                <span className={css.bar} aria-hidden="true"><i style={{ width: `${Math.round((i.progress.done / i.progress.of) * 100)}%` }} /></span>
              </div>
            )}
          </article>
        ))}
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
