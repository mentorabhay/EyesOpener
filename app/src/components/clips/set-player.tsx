"use client";
/**
 * Plays the clips of a set one after another. Each clip saves its own result the moment it is finished, so the set
 * can be stopped at any point with nothing lost: "Stop here" is always in view, and what was finished today is
 * skipped when the set is opened again.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { clips as c } from "@/copy/clips";
import { clipDef, clipLine, type SetKey } from "@/data/clips";
import type { Blocked } from "@/lib/clip-rules";
import type { ClipCtx } from "@/lib/clips";
import css from "./clips.module.css";
import { ClipRunner } from "./runner";

const s = c.sets;
export interface SetStepView { code: string; blocked: Blocked | null; done: boolean }
type State = "done" | "now" | "todo" | "skipped";

export function SetPlayer({ setKey, steps, ctx, endHref }: { setKey: SetKey; steps: SetStepView[]; ctx: ClipCtx; endHref?: { href: string; label: string } }) {
  /* what was finished or skipped in this visit, on top of what the server says was finished today */
  const [finished, setFinished] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [again, setAgain] = useState(false);

  const playable = useMemo(() => steps.filter((x) => !x.blocked), [steps]);
  const isDone = (x: SetStepView) => finished.includes(x.code) || (!again && x.done);
  const current = playable.find((x) => !isDone(x) && !skipped.includes(x.code));
  const doneCount = playable.filter(isDone).length;
  const stateOf = (x: SetStepView): State => (x.blocked || skipped.includes(x.code) ? "skipped" : isDone(x) ? "done" : x.code === current?.code && started && !stopped ? "now" : "todo");
  const def = current && clipDef(current.code);
  const over = !current || stopped;
  const next = () => { if (current && !finished.includes(current.code)) setSkipped((was) => [...was, current.code]); };
  const leftAfter = playable.filter((x) => !isDone(x) && !skipped.includes(x.code) && x.code !== current?.code).length;

  return (
    <div className="bento">
      <div className="span7 stack" style={{ gap: 16 }}>
        {!started && !over && (
          <section className={`c ${css.run}`}>
            <p>{s.what[setKey]}</p>
            <p className="muted small">{s.sub}</p>
            <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} onClick={() => setStarted(true)}>{doneCount > 0 ? s.resume : s.start}</button>
          </section>
        )}
        {started && !over && def?.offered && (
          <>
            <div className="row">
              <b>{s.progress(doneCount + skipped.filter((code) => playable.some((x) => x.code === code && !isDone(x))).length + 1, playable.length)}</b>
              <span className="muted">{clipLine(def.code)?.title}</span>
              <span className="sp" />
              <button type="button" className="btn btn-sm" onClick={next}>{s.skip}</button>
              <button type="button" className="btn btn-sm btn-d" onClick={() => setStopped(true)}>{c.runner.stop}</button>
            </div>
            <p className="muted small">{c.what(def.code)}</p>
            <ClipRunner
              key={def.code} def={def} ctx={ctx} blocked={null} setKey={setKey}
              onSaved={(ok) => { if (ok) setFinished((was) => (was.includes(def.code) ? was : [...was, def.code])); }}
              next={{ label: leftAfter > 0 ? s.nextClip : s.finish, go: next }}
            />
          </>
        )}
        {over && (
          <section className={`c ${css.run}`}>
            {playable.length === 0 ? (
              <div className="empty"><b>{setKey === "weekly" && steps.length === 0 ? s.nothingDue.title : s.nothingHere.title}</b><span>{setKey === "weekly" && steps.length === 0 ? s.nothingDue.body : s.nothingHere.body}</span></div>
            ) : (
              <>
                <h2>{stopped && current ? s.stopped.title : s.finished.title}</h2>
                <p>{stopped && current ? s.stopped.body(doneCount, playable.length) : s.finished.body(doneCount)}</p>
              </>
            )}
            <div className={css.acts}>
              {stopped && current && <button type="button" className="btn btn-g" onClick={() => { setStopped(false); setStarted(true); }}>{s.resume}</button>}
              {!current && playable.length > 0 && <button type="button" className="btn" onClick={() => { setAgain(true); setFinished([]); setSkipped([]); setStarted(true); setStopped(false); }}>{s.startOver}</button>}
              {endHref && doneCount > 0 && <Link className="btn btn-g" href={endHref.href}>{endHref.label}</Link>}
              <Link className="btn btn-gh" href="/test/clips">{s.backToClips}</Link>
            </div>
          </section>
        )}
      </div>
      <section className="c span5">
        <div className="c-head"><h2>{s.list}</h2></div>
        {steps.length ? (
          <ol className={css.steps}>
            {steps.map((x) => {
              const state = stateOf(x);
              return (
                <li key={x.code} aria-current={state === "now" ? "step" : undefined}>
                  <span><Link href={`/test/clips/${x.code}`}>{clipLine(x.code)?.title}</Link></span>
                  <span className="chip" data-b={state === "done" ? "ok" : state === "now" ? "grad" : state === "skipped" ? "none" : "plain"}>
                    {x.blocked ? c.blockedShort[x.blocked] : s.state[state]}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : <p className="muted">{s.nothingDue.body}</p>}
      </section>
    </div>
  );
}
