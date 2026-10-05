import type { Metadata } from "next";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, Chip, Empty, PageHead, type Tone } from "@/components/ui";
import { classMission as t } from "@/copy/class-mission";
import { together } from "@/copy/together";
import { gameBySlug, ideaBySlug } from "@/data";
import { MISSION_SECONDS, SCREEN_GAME, stepTimes, type MissionState } from "@/lib/class-mission";
import { householdMissions, type ChildMissions } from "@/lib/class-mission-data";
import { dayText } from "@/lib/community";
import { dayOf } from "@/lib/league";
import { requireMember, todayKey } from "@/lib/session";
import { statusFor } from "@/lib/sessions";
import { isListed } from "@/lib/status";
import { giveMissionAction, markMissionDoneAction, takeBackMissionAction } from "./actions";

const idea = ideaBySlug("class-mission")!;
export const metadata: Metadata = { title: idea.name };

const tone: Record<MissionState, Tone> = { none: "none", given: "warn", done: "ok" };
const KIT = "/together/class-mission/kit";

/** One child of the household: where the mission stands, and what a guardian can do next. */
function Child({ c, mayManage, today }: { c: ChildMissions; mayManage: boolean; today: string }) {
  const ch = t.child;
  return (
    <Card title={c.name} span={6} as="article" right={<Chip tone={tone[c.state]}>{t.state[c.state]}</Chip>}>
      {c.open ? (
        <>
          <p><b>{ch.given(c.name)}.</b> {ch.givenOn(dayText(c.open.givenAt))}</p>
          <div className="row"><Btn href={KIT} kind="g">{ch.kit}</Btn></div>
          {mayManage && (
            <>
              <h3>{ch.done.title}</h3>
              <StateForm action={markMissionDoneAction} submit={ch.done.submit}>
                <input type="hidden" name="id" value={c.open.id} />
                <div className="field">
                  <label htmlFor={`day-${c.open.id}`}>{ch.done.field}</label>
                  <input id={`day-${c.open.id}`} className="input" type="date" name="day" required defaultValue={today} min={dayOf(c.open.givenAt)} max={today} />
                </div>
              </StateForm>
              <details>
                <summary className="btn btn-sm">{ch.back.open}</summary>
                <div className="stack" style={{ marginTop: 10 }}>
                  <p className="small">{ch.back.warn}</p>
                  <StateForm action={takeBackMissionAction} submit={ch.back.submit}><input type="hidden" name="id" value={c.open.id} /></StateForm>
                </div>
              </details>
            </>
          )}
        </>
      ) : !c.consented ? <p className="notice" data-b="warn">{ch.needsConsent(c.name)}</p> : (
        <>
          {c.done.length === 0 && <p className="muted">{ch.none(c.name)}</p>}
          {mayManage && (
            <StateForm action={giveMissionAction} submit={c.done.length ? ch.giveAgain(c.name) : ch.give(c.name)} primary={c.done.length === 0}>
              <input type="hidden" name="profile" value={c.profileId} />
            </StateForm>
          )}
        </>
      )}
      {c.done.length > 0 && (
        <>
          <h3 className="small muted">{ch.earlier}</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {c.done.map((d) => <li className="ins" key={d.id}><div className="tx">{ch.doneOn(dayText(d.doneOn!))}</div></li>)}
          </ul>
        </>
      )}
      {!mayManage && <p className="muted small">{ch.lookOnly}</p>}
    </Card>
  );
}

/**
 * Class Mission. A guardian decides whether a child gets the mission; the app keeps that, and the day it was run.
 * A cheer seat can look. A device in child mode shows the child their own mission and the words to say, and nothing to change.
 */
export default async function ClassMissionPage() {
  const m = await requireMember();
  const [all, screenOpen] = await Promise.all([householdMissions(m), statusFor("game", SCREEN_GAME).then((s) => isListed(s, m.tester))]);
  const game = gameBySlug(SCREEN_GAME)!;
  const steps = stepTimes();

  /* Child mode: the device is handed to one child. They see their own mission once a guardian has given it, and nothing else. */
  if (m.childMode) {
    const mine = all.find((c) => c.profileId === m.profile.id);
    return (
      <>
        <PageHead title={t.mine.title} crumb={[together.crumb]} />
        <div className="bento">
          {mine?.open && mine.consented ? (
            <Card title={t.mine.lead} span={8}>
              <ol className="stack" style={{ margin: 0, paddingLeft: 22 }}>
                {t.kit.cards.list.map((card) => <li key={card.say}><b>{card.say}</b><div className="muted small">{card.doing}</div></li>)}
              </ol>
              {screenOpen && <div className="row"><Btn href={`/train/games/${SCREEN_GAME}`}>{t.screen.open(game.name)}</Btn></div>}
            </Card>
          ) : mine?.state === "done" ? <Card span={8}><p className="notice" data-b="ok">{t.mine.done}</p></Card>
            : <Card span={8}><Empty title={t.mine.none.title}><span>{t.mine.none.body}</span></Empty></Card>}
        </div>
      </>
    );
  }

  const mayManage = m.can("manage_family");
  const first = all[0];
  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[{ value: MISSION_SECONDS / 60, label: t.stats.length }, ...(first ? [{ value: t.state[first.state], label: `${first.name}: ${t.stats.state.toLowerCase()}` }] : [])]}
      />
      <div className="bento">
        {all.map((c) => <Child key={c.profileId} c={c} mayManage={mayManage} today={todayKey()} />)}
        {all.length === 0 && <Card span={6}><Empty title={t.child.noChildren.title}><span>{t.child.noChildren.body}</span></Empty></Card>}

        <Card title={t.decide.title} span={6}>
          <ul className="stack" style={{ margin: 0, paddingLeft: 18 }}>{t.decide.points.map((line) => <li key={line}>{line}</li>)}</ul>
          <div className="row"><Btn href={KIT}>{t.child.kit}</Btn></div>
        </Card>

        <Card title={t.what.title} span={7}>
          <p>{t.what.lead}</p>
          <div className="tbwrap">
            <table className="tb">
              <tbody>
                {steps.map((s) => (
                  <tr key={s.key}>
                    <th scope="row" className="tnum" style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>{s.from}</th>
                    <td><b>{t.what.steps[s.key].name}</b> <span className="muted small tnum">{t.seconds(s.seconds)}</span><div className="small">{t.what.steps[s.key].what}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{t.what.noGear} {t.what.safe}</p>
          <p className="muted small">{idea.why}</p>
        </Card>

        <div className="span5 stack" style={{ gap: 16, minWidth: 0 }}>
          <Card title={t.screen.title}>
            {screenOpen ? (
              <>
                <p>{t.screen.with(game.name)}</p>
                <p className="small">{t.screen.tip}</p>
                <p className="muted small">{t.screen.record}</p>
                <div className="row"><Btn href={`/train/games/${SCREEN_GAME}`} small>{t.screen.open(game.name)}</Btn></div>
              </>
            ) : <p className="notice">{t.screen.off}</p>}
            <p className="small">{t.screen.without}</p>
          </Card>
          <Card title={t.kept.title}>
            <ul className="stack small" style={{ margin: 0, paddingLeft: 18 }}>{t.kept.points.map((line) => <li key={line}>{line}</li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
