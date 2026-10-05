import type { Metadata } from "next";
import { Btn, Card, PageHead } from "@/components/ui";
import { HeroInGame, HeroShape } from "@/components/together/hero-art";
import { hero as t } from "@/copy/hero";
import { heroGamesExtra } from "@/copy/hero-games.extra";
import { together } from "@/copy/together";
import { gameBySlug, ideaBySlug } from "@/data";
import { isBuilt } from "@/games/built";
import { readStatuses } from "@/lib/catalogue";
import { dayText, mayJoin } from "@/lib/community";
import { cameraConsent, heroesOf } from "@/lib/hero";
import { HERO_GAMES, HERO_KEEP } from "@/lib/hero-rules";
import { requireMember } from "@/lib/session";
import { isListed, statusOf } from "@/lib/status";
import { drop, pick, stop } from "./actions";
import css from "./hero.module.css";
import { Maker } from "./maker";

const idea = ideaBySlug("draw-your-hero")!;
export const metadata: Metadata = { title: idea.name };

/**
 * Draw Your Hero. Everything on this page belongs to the active profile of the signed-in household: a hero is
 * never shown to another family, to a counsellor, to a sponsor or to staff, and so it is not moderated.
 */
export default async function HeroPage() {
  const m = await requireMember();
  const [heroes, camera, parental, statuses] = await Promise.all([heroesOf(m), cameraConsent(m), mayJoin(m), readStatuses()]);
  const current = heroes.find((h) => h.isCurrent) ?? null;
  const games = HERO_GAMES.filter((slug) => isBuilt(slug) && isListed(statusOf(statuses, "game", slug), m.tester)).map((slug) => ({ slug, name: gameBySlug(slug)!.name }));
  /* A game a fuller build adds comes with its own words for what the hero is there; the games built here share one line. */
  const roles = new Map(heroGamesExtra.map((g) => [g.slug, g.as])), own = games.filter((g) => !roles.has(g.slug)), added = games.filter((g) => roles.has(g.slug));
  const guardianHere = m.can("share"), mayPick = m.can("train");
  /* Hero 1 is the first one made. */
  const number = new Map(heroes.map((h, i) => [h.id, heroes.length - i]));
  const cannot = !guardianHere ? (m.childMode ? t.mine.child : t.mine.guardianOnly) : !parental ? t.blocked.consent(m.profile.displayName) : null;

  return (
    <>
      <PageHead
        title={idea.name} sub={t.sub} crumb={[together.crumb]}
        stats={[{ value: heroes.length, label: t.stats.kept }, { value: games.length, label: t.stats.games }]}
      />
      <div className="bento">
        <Card title={t.make.title} span={7}>
          {cannot
            ? <p className="notice">{cannot}</p>
            : heroes.length >= HERO_KEEP
              ? <p className="notice">{t.blocked.full(HERO_KEEP)}</p>
              : <Maker cameraAllowed={!!camera} canAllow={m.can("consent")} name={m.profile.displayName} />}
        </Card>

        <Card title={t.inGame.title} span={5}>
          <div className="scene ratio"><HeroInGame sprite={current?.sprite ?? null} label={current ? t.inGame.scene : t.inGame.sceneEmpty} /></div>
          {games.length === 0 && <p>{t.inGame.none}</p>}
          {own.length > 0 && <p>{t.inGame.line(own.map((g) => g.name).join(", "))}</p>}
          {added.length > 0 && <ul className={css.points}>{added.map((g) => <li key={g.slug}>{t.inGame.also(g.name, roles.get(g.slug)!)}</li>)}</ul>}
          {!current && <p className="muted small">{heroes.length ? t.mine.ownOn : t.mine.none}</p>}
          <p className="muted small">{t.inGame.rule}</p>
          {games.length > 0 && mayPick && <div className="row">{games.map((g) => <Btn key={g.slug} href={`/train/games/${g.slug}/play`} kind="d" small>{t.inGame.play(g.name)}</Btn>)}</div>}
        </Card>

        <Card title={t.mine.title(m.profile.displayName)} span={7}>
          {heroes.length === 0 ? <p className="muted">{t.mine.none}</p> : (
            <>
              <ul className={css.kept}>
                {heroes.map((h) => {
                  const n = number.get(h.id)!;
                  return (
                    <li key={h.id} data-current={h.isCurrent ? "" : undefined}>
                      <div className={`scene ${css.thumb}`}><HeroShape sprite={h.sprite} label={t.mine.picture(n, h.isCurrent)} /></div>
                      {h.isCurrent
                        ? <span className="chip" data-b="plain">{t.mine.current}</span>
                        : mayPick && <form action={pick}><input type="hidden" name="id" value={h.id} /><button className="btn btn-sm" aria-label={t.mine.useLabel(n)}>{t.mine.use}</button></form>}
                      {guardianHere && (
                        <details>
                          <summary aria-label={t.mine.removeLabel(n)}>{t.mine.remove}</summary>
                          <p>{t.mine.removeAsk}</p>
                          <form action={drop}><input type="hidden" name="id" value={h.id} /><button className="btn btn-sm">{t.mine.removeYes}</button></form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="row">
                <span className="small muted tnum">{t.mine.count(heroes.length, HERO_KEEP)}</span>
                <span className="sp" />
                {current && mayPick && <form action={pick}><input type="hidden" name="id" value="" /><button className="btn btn-sm btn-gh">{t.mine.own}</button></form>}
              </div>
            </>
          )}
        </Card>

        <Card title={t.privacy.title} span={5}>
          <ul className={css.points}>{t.privacy.points.map((p) => <li key={p}>{p}</li>)}</ul>
          {camera && (
            <div className="notice stack">
              <p>{t.camera.allowed(camera.by, dayText(camera.grantedAt))}</p>
              {m.can("consent") && <form action={stop}><button className="btn btn-sm">{t.camera.withdraw}</button></form>}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
