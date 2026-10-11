// Eyes Opener: Plays one clip: what it needs, how it goes, the template itself with a calm time bar, and the result.
"use client";
/**
 * Plays one clip: what it needs, how it goes, the template itself with a calm time bar, and the result.
 * The browser sends what it measured to the server once; the server decides what that means and what is stored.
 * A clip can be left at any point: nothing is saved until its measurement is complete.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { allowCamera, saveClipRun } from "@/app/(app)/test/clips/actions";
import { Cover, GlassesOn } from "@/components/measure/cover";
import { stepsOf } from "@/clips/steps";
import { clips as c } from "@/copy/clips";
import { clipLine, type OfferedClip, type SetKey } from "@/data/clips";
import type { Blocked } from "@/lib/clip-rules";
import type { ClipCtx, ClipSaved } from "@/lib/clips";
import css from "./clips.module.css";
import { ClipResult } from "./result";
import { TASKS } from "./tasks";
import { TimeBar } from "./time-bar";

type Refusal = Extract<ClipSaved, { ok: false }>["why"];
type Phase = { at: "intro" } | { at: "play" } | { at: "saving" } | { at: "result"; saved: Extract<ClipSaved, { ok: true }> } | { at: "refused"; why: Refusal | "cannot" };

export function ClipRunner({ def, ctx, blocked, setKey = null, onSaved, next, listen, shown = false }: {
  def: OfferedClip; ctx: ClipCtx;
  /** The Listen button for this clip's instructions, drawn by the page. Shown before the clip starts. */
  listen?: ReactNode;
  /** Why the clip cannot run now, as the server sees it. The server checks again when the result arrives. */
  blocked: Blocked | null;
  setKey?: SetKey | null;
  /** Told once the clip's result is stored, or once it ended with nothing to store. */
  onSaved?: (ok: boolean) => void;
  /** In a set: the button that moves on, shown with the result. */
  next?: { label: string; go: () => void };
  /** The page already shows this clip's steps in its step strip (components/guide/flow.tsx): the list here is left out. */
  shown?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>({ at: "intro" });
  const [, startSaving] = useTransition();
  const stage = useRef<HTMLElement>(null), first = useRef(true);
  const line = clipLine(def.code)!, play = def.play, Task = TASKS[play.template];
  const eye = "eye" in play && play.eye !== "both" ? play.eye : null;
  const glasses = def.gear.includes("glasses"), ownSteps = play.template === "look" || play.template === "match";

  /* each new step begins at the top of the stage, for the keyboard and for small screens */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = stage.current;
    if (!el) return;
    if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
    if (el.getBoundingClientRect().top < 0) el.scrollIntoView();
  }, [phase.at]);

  const onDone = useCallback((data: unknown) => {
    /* a scene in which one eye's picture was not being seen has nothing to measure: nothing is sent */
    if (data && typeof data === "object" && "cannot" in data) { setPhase({ at: "refused", why: "cannot" }); onSaved?.(false); return; }
    setPhase({ at: "saving" });
    startSaving(async () => {
      const saved = await saveClipRun(def.code, data, setKey).catch((): ClipSaved => ({ ok: false, why: "failed" }));
      setPhase(saved.ok ? { at: "result", saved } : { at: "refused", why: saved.why });
      if (saved.ok) onSaved?.(true);
    });
  }, [def.code, setKey, onSaved]);

  const refusal = (why: Refusal | "cannot"): string => {
    if (why === "cannot") return c.says.cannot;
    if (why === "need_near" || why === "need_far") return c.blocked[why](ctx.screen?.dist ?? 0);
    return why in c.refused ? c.refused[why as keyof typeof c.refused] : c.blocked[why as Exclude<Blocked, "need_near" | "need_far">];
  };

  let body;
  if (blocked) {
    body = (
      <>
        <p className="notice" data-b="warn">{blocked === "need_near" || blocked === "need_far" ? c.blocked[blocked](ctx.screen?.dist ?? 0) : c.blocked[blocked]}</p>
        {blocked === "no_screen" && <Link className="btn btn-g" style={{ alignSelf: "flex-start" }} href="/setup">{c.onboarding}</Link>}
        {(blocked === "need_near" || blocked === "need_far") && <Link className="btn btn-sm" style={{ alignSelf: "flex-start" }} href="/test/clips/C03">{c.seatClip}</Link>}
        {blocked === "camera" && (
          <>
            <p>{c.camera.allowBody(ctx.name)}</p>
            {ctx.canAllowCamera ? (
              <form action={allowCamera} className="stack">
                <label className={css.check}><input type="checkbox" name="agree" required /><span>{c.camera.allowTick(ctx.name)}</span></label>
                <button className="btn btn-g" style={{ alignSelf: "flex-start" }}>{c.camera.allow}</button>
                <p className="muted small">{c.camera.withdraw}</p>
              </form>
            ) : <p className="notice">{c.camera.needGuardian}</p>}
          </>
        )}
      </>
    );
  } else if (phase.at === "intro") {
    const steps = stepsOf(def);
    body = (
      <>
        {listen}
        {eye && <Cover eye={eye} />}
        {glasses && !ownSteps && <GlassesOn cyanEye={ctx.cyanEye} />}
        {steps.length > 0 && !shown && <ol className={css.list}>{steps.map((s) => <li key={s}>{s}</li>)}</ol>}
        <p className="muted small">{c.runner.time(c.seconds(line.seconds))}</p>
        <button type="button" className={`btn btn-g ${css.big}`} style={{ alignSelf: "flex-start" }} onClick={() => setPhase({ at: "play" })}>{c.runner.start}</button>
      </>
    );
  } else if (phase.at === "play") {
    body = (
      <>
        <TimeBar seconds={line.seconds} />
        <Task def={def} ctx={ctx} onDone={onDone} />
        <button type="button" className="btn btn-gh btn-sm" data-stop style={{ alignSelf: "flex-start" }} onClick={() => setPhase({ at: "intro" })}>{c.runner.stop}</button>
      </>
    );
  } else if (phase.at === "saving") body = <p role="status">{c.runner.saving}</p>;
  else if (phase.at === "refused") {
    body = (
      <>
        <h2>{c.runner.notSaved}</h2>
        <p className="notice" data-b="warn" role="alert">{refusal(phase.why)}</p>
        <div className={css.acts}>
          <button type="button" className="btn btn-g" autoFocus onClick={() => setPhase({ at: "intro" })}>{c.runner.retry}</button>
          {next && <button type="button" className="btn" onClick={next.go}>{next.label}</button>}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <ClipResult def={def} ctx={ctx} saved={phase.saved} />
        <div className={css.acts}>
          {next && <button type="button" className={`btn btn-g ${css.big}`} autoFocus onClick={next.go}>{next.label}</button>}
          <button type="button" className="btn" onClick={() => setPhase({ at: "intro" })}>{c.runner.again}</button>
          {!next && <Link className="btn btn-gh" href="/test/clips">{c.runner.back}</Link>}
        </div>
      </>
    );
  }

  return <section className={`c ${css.run}`} ref={stage} tabIndex={-1}>{body}</section>;
}
