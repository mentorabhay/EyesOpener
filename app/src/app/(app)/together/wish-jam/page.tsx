// Eyes Opener: "Aarav: Trains", for the list of earlier wishes. .
import { More } from "@/components/guide/more";
import type { Metadata } from "next";
import form from "@/app/(app)/settings/form.module.css";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, Chip, Empty, PageHead, type Tone } from "@/components/ui";
import { together } from "@/copy/together";
import { wishJam as t } from "@/copy/wish-jam";
import { ideaBySlug } from "@/data";
import { dayText } from "@/lib/community";
import { requireMember } from "@/lib/session";
import { GAME_KINDS, isGameKind, isLove, isPlay, LINE_MAX, LOVES, NAME, PLAYS, type WishStatus } from "@/lib/wish-jam";
import { householdWishes, publicWishes, type OwnWish } from "@/lib/wish-jam-data";
import { makeWishAction, offerNameAction, withdrawWishAction } from "./actions";

const idea = ideaBySlug("wish-jam")!;
export const metadata: Metadata = { title: idea.name };

/** "Aarav: Trains", for the list of earlier wishes. */
const short = (w: OwnWish) => `${w.child}: ${isLove(w.loves) ? t.loves[w.loves] : w.loves}`;
const tone: Record<WishStatus, Tone> = { in_review: "warn", listed: "plain", matched: "grad", built: "ok", blocked: "none" };

/** One wish of the household: what was written, where it stands, and what a guardian can do next. */
function Wish({ w, mayWrite, forChild }: { w: OwnWish; mayWrite: boolean; forChild?: boolean }) {
  const o = t.own, n = t.name;
  return (
    <Card title={o.title(w.child)} span={6} as="article" right={<Chip tone={tone[w.status]}>{o.status[w.status]}</Chip>}>
      <p>{forChild ? t.mine.next[w.status] : o.next[w.status]}</p>
      {!w.consented && w.open && <p className="notice" data-b="warn">{o.hidden}</p>}
      <dl className="kv">
        <div><dt>{o.shows.loves}</dt><dd>{isLove(w.loves) ? t.loves[w.loves] : w.loves}</dd></div>
        <div><dt>{o.shows.play}</dt><dd>{isPlay(w.play) ? t.plays[w.play] : w.play}</dd></div>
        <div><dt>{o.shows.game}</dt><dd>{isGameKind(w.game) ? t.games[w.game] : w.game}</dd></div>
        {w.line && <div><dt>{o.shows.line}</dt><dd>{w.line}</dd></div>}
        <div><dt>{o.shows.who}</dt><dd>{w.firstName ?? o.child}<small>{o.code(w.code)}. {o.sentOn(dayText(w.createdAt))}</small></dd></div>
      </dl>

      {w.status === "built" && (
        <div className="stack">
          {w.game_ ? <div className="row"><Btn href={`/train/games/${w.game_.slug}`} kind="g">{o.play(w.game_.name)}</Btn></div> : <p className="muted small">{o.checking}</p>}
          {w.nameStatus === "approved" && w.gameName && <p className="notice" data-b="ok">{n.named(w.gameName)}</p>}
          {w.nameStatus === "in_review" && w.gameName && <p className="notice">{n.waiting(w.gameName)}</p>}
          {w.nameStatus === "blocked" && <p className="notice" data-b="warn">{n.status.blocked}</p>}
          {mayWrite && w.consented && w.nameStatus !== "approved" && w.nameStatus !== "in_review" && (
            <>
              <h3>{n.title}</h3>
              <p>{n.lead(w.child)}</p>
              <StateForm action={offerNameAction} submit={n.submit} primary>
                <input type="hidden" name="id" value={w.id} />
                <div className="field">
                  <label htmlFor={`name-${w.id}`}>{n.field}</label>
                  <input id={`name-${w.id}`} className="input" type="text" name="name" required minLength={NAME.min} maxLength={NAME.max} autoComplete="off" aria-describedby={`name-hint-${w.id}`} />
                  <span id={`name-hint-${w.id}`} className="muted small">{n.hint(NAME.max)}</span>
                </div>
              </StateForm>
            </>
          )}
        </div>
      )}

      {mayWrite && w.open && (
        <details>
          <summary className="btn btn-sm">{o.back.open}</summary>
          <div className="stack" style={{ marginTop: 10 }}>
            <p className="small">{o.back.warn}</p>
            <StateForm action={withdrawWishAction} submit={o.back.submit}><input type="hidden" name="id" value={w.id} /></StateForm>
          </div>
        </details>
      )}
    </Card>
  );
}

/**
 * Wish Jam in the member app. A guardian writes a wish for a child, takes it back, and names the built game.
 * A cheer seat can look. A device in child mode shows the child their own wish and nothing to change.
 */
export default async function WishJamPage() {
  const m = await requireMember();
  const [{ wishes, children }, listed] = await Promise.all([householdWishes(m), publicWishes()]);

  if (m.childMode) {
    const mine = wishes.filter((w) => w.profileId === m.profile.id && w.status !== "blocked");
    return (
      <>
        <PageHead title={t.mine.title} crumb={[together.crumb]} />
        <div className="bento">
          {mine.length ? mine.slice(0, 1).map((w) => <Wish key={w.id} w={w} mayWrite={false} forChild />) : <Card span={6}><Empty title={t.mine.none.title}><span>{t.mine.none.body}</span></Empty></Card>}
        </div>
        <p className="muted small">{t.mine.lookOnly}</p>
      </>
    );
  }

  const mayWrite = m.can("share") && !m.tester;
  const open = wishes.filter((w) => w.open), earlier = wishes.filter((w) => !w.open);
  const free = children.filter((c) => c.consented && !c.hasOpen);
  const f = t.form;

  return (
    <>
      <PageHead
        title={idea.name} crumb={[together.crumb]}
        stats={[{ value: listed.length, label: t.stats.listed }, { value: listed.filter((w) => w.state === "built" || w.state === "named").length, label: t.stats.built }]}
      />
      <div className="bento">
        {open.map((w) => <Wish key={w.id} w={w} mayWrite={mayWrite} />)}

        <Card title={t.how.title} span={open.length % 2 === 1 ? 6 : 12}>
          {open.length === 0 && <Empty title={t.own.none.title}><span>{t.own.none.body}</span></Empty>}
          <ol className="stack" style={{ margin: 0, paddingLeft: 20 }}>{t.how.steps.map((s) => <li key={s.b}><b>{s.b}</b> {s.t}</li>)}</ol>
          <p className="muted small">{t.how.noPromise}</p>
          <div className="row"><Btn href="/wish-jam">{t.how.listLink}</Btn></div>
        </Card>

        <Card title={f.title} span={7}>
          {m.tester ? <p className="notice">{f.tester}</p> : !mayWrite ? <p className="notice">{f.lookOnly}</p> : free.length === 0 ? <p className="notice">{f.noChild}</p> : (
            <StateForm action={makeWishAction} submit={f.submit} primary={open.length === 0}>
              <div className="field">
                <label htmlFor="wish-profile">{f.child}</label>
                <select id="wish-profile" name="profile" required defaultValue={free.find((c) => c.profileId === m.profile.id)?.profileId ?? free[0].profileId}>
                  {free.map((c) => <option key={c.profileId} value={c.profileId}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="wish-loves">{f.loves}</label>
                <select id="wish-loves" name="loves" required>{LOVES.map((k) => <option key={k} value={k}>{t.loves[k]}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="wish-play">{f.play}</label>
                <select id="wish-play" name="play" required>{PLAYS.map((k) => <option key={k} value={k}>{t.plays[k]}</option>)}</select>
              </div>
              <div className="field">
                <label htmlFor="wish-game">{f.game}</label>
                <select id="wish-game" name="game" required defaultValue="any" aria-describedby="wish-game-hint">{GAME_KINDS.map((k) => <option key={k} value={k}>{t.games[k]}</option>)}</select>
                <span id="wish-game-hint" className="muted small">{f.gameHint}</span>
              </div>
              <div className="field">
                <label htmlFor="wish-line">{f.line}</label>
                <input id="wish-line" className="input" type="text" name="line" maxLength={LINE_MAX} autoComplete="off" aria-describedby="wish-line-hint" />
                <span id="wish-line-hint" className="muted small">{f.lineHint(LINE_MAX)}</span>
              </div>
              <label className={form.check}>
                <input type="checkbox" name="showFirstName" aria-describedby="wish-name-hint" />
                <span>{free.length === 1 && free[0].firstName ? f.firstName(free[0].firstName) : f.firstNameOne}</span>
              </label>
              <span id="wish-name-hint" className="muted small">{f.firstNameHint}</span>
            </StateForm>
          )}
        </Card>

        <Card title={f.public.title} span={5}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{f.public.points.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className="notice">{f.public.never}</p>
          <p className="muted small">{idea.why}</p>
        </Card>

        {earlier.length > 0 && (
          <Card title={t.own.earlier} span={12}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {earlier.map((w) => (
                <li className="ins" key={w.id}>
                  <div className="tx">
                    <b>{short(w)}</b>
                    <div className="sub">{t.own.code(w.code)}. {t.own.sentOn(dayText(w.createdAt))}{w.nameStatus === "approved" && w.gameName ? ` ${t.name.named(w.gameName)}` : ""}</div>
                  </div>
                  <Chip tone={tone[w.status]}>{t.own.status[w.status]}</Chip>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
      <More><p>{idea.what}</p></More>
    </>
  );
}
