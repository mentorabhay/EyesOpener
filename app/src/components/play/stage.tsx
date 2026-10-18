"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as KeyEvent } from "react";
import { train as t } from "@/copy/train";
import { drillable } from "@/drills/registry";
import type { GameProps, Stats } from "@/games/kit";
import { playable } from "@/games/registry";
import type { Detail, TrainDose } from "@/lib/sessions";
import { LensView } from "./lens";
import type { Labels } from "./results";
import { canBegin, Clock, SessionNote, StopButton } from "./session-ui";
import { useTrainSession, type TrainSession } from "./use-session";

export type EyeProps = Omit<GameProps, "running" | "onScore" | "onStats" | "joined" | "view" | "paused">;

const s_ = t.stage;

/** Where the member has got to, read from the game's live record while it runs: level, best level, right answers. */
interface Reached { level: number; top: number; right: number; up: number | null }

/**
 * The level, the best level of this session, the right answers and the chapter's minutes, in one line. A plain group,
 * not a live region: the clock in it changes every second, and a screen reader would read the whole line each time.
 * The level alone is spoken when it changes (`LevelSpoken`).
 */
function StageLine({ r, s }: { r: Reached | null; s: TrainSession }) {
  return (
    <span className="stage-line" role="group" aria-label={s_.line}>
      {r && r.level > 0 && <b className="chip tnum" data-b="grad">{s_.level(r.level)}</b>}
      {r && r.top > r.level && <span className="chip tnum" data-b="plain">{s_.best(r.top)}</span>}
      {r && r.right > 0 && <span className="chip tnum" data-b="plain">{s_.right(r.right)}</span>}
      {s.allowed > 0 && <span className="chip tnum" data-b="plain">{s_.minutes(Math.floor(s.seconds / 60), Math.round(s.allowed / 60))}</span>}
      <Clock s={s} />
    </span>
  );
}

/** Says the level to a screen reader when it changes, and nothing else. One per stage, outside the line (drawn twice in full screen). */
const LevelSpoken = ({ level }: { level: number }) => <span className="sr-only" aria-live="polite" aria-atomic="true">{level > 0 ? s_.level(level) : ""}</span>;

/**
 * Everything around a game or an exercise drill: the session, the countdown, the stop rule, the glasses view
 * and, when the session ends, what it measured. The game only draws.
 * `kind` picks the library: "game" plays a game, "exercise" plays the drill that goes with an exercise.
 *
 * Full screen (Ved, 18 October 2026): the scene fills the screen on black with a thin bar on top (the level line,
 * Finish now, Stop). The browser always leaves full screen on Esc; leaving it while a session runs pauses the game
 * and its clock, with Finish now ready to press, so a stray key never ends ten minutes of practice. Sizes stay true:
 * full screen changes the room, not the screen's pixels. Where the browser has no full screen for a page (an iPhone),
 * the scene is laid over the whole page instead and Esc does the same.
 */
export function Stage({ slug, dose, help, kind = "game", labels, lens = true, joinable = false, ...eye }: { slug: string; dose: TrainDose; help?: string; kind?: "game" | "exercise"; labels?: Labels; lens?: boolean; /** Offer the "eyes joined" practice view: for scenes where two pictures must join into one. */ joinable?: boolean } & EyeProps) {
  const Game = (kind === "game" ? playable : drillable)[slug];
  const score = useRef(0), detail = useRef<Detail | null>(null);
  const onScore = useCallback((n: number) => { score.current = n; }, []);
  const onStats = useCallback((stats: Stats) => { detail.current = stats; }, []);
  const s = useTrainSession(kind, slug, score, detail);
  const playing = s.phase === "active";
  const [joined, setJoined] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  /* "real": the browser's full screen; "page": laid over the page where the browser has none */
  const [full, setFull] = useState<"real" | "page" | null>(null);
  const [paused, setPaused] = useState(false);
  const [reached, setReached] = useState<Reached | null>(null);
  const finishBtn = useRef<HTMLButtonElement>(null);
  const live = useRef({ playing, setTicking: s.setTicking });
  useEffect(() => { live.current = { playing, setTicking: s.setTicking }; });

  const pause = useCallback(() => { if (!live.current.playing) return; setPaused(true); live.current.setTicking(false); }, []);
  const goOn = () => { setPaused(false); s.setTicking(true); };
  const enterFull = () => {
    const el = box.current;
    if (el?.requestFullscreen && document.fullscreenEnabled) el.requestFullscreen({ navigationUI: "hide" }).then(() => setFull("real"), () => setFull("page"));
    else setFull("page");
  };
  const leaveFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); setFull(null); };

  /* the browser left full screen (Esc, or its own button): pause a running game */
  useEffect(() => {
    const change = () => { if (!document.fullscreenElement) { setFull((f) => { if (f === "real") pause(); return f === "real" ? null : f; }); } };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, [pause]);
  /* In full screen, Esc leaves it and pauses. The browser usually takes Esc itself (the change above then pauses);
     where the key does reach the page, it is caught here first, so the game never moves it to the Stop button. */
  useEffect(() => {
    if (!full) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" && e.key !== "GoBack" && e.key !== "BrowserBack") return;
      e.preventDefault();
      e.stopPropagation();
      if (document.fullscreenElement) void document.exitFullscreen();
      setFull(null);
      pause();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [full, pause]);
  /* the pause card's first button is Finish now, ready for Enter or OK */
  useEffect(() => {
    if (!paused) return;
    /* the page is back to its own size: bring the paused scene into view, then the button */
    box.current?.scrollIntoView({ block: "center" });
    finishBtn.current?.focus({ preventScroll: true });
  }, [paused]);
  /* a session that ends (its time used, or stopped) leaves full screen */
  useEffect(() => { if (!playing && document.fullscreenElement === box.current && box.current) void document.exitFullscreen(); }, [playing]);

  /* the level line: read from the game's live record twice a second while it runs */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const d = detail.current;
      setReached((r) => {
        const level = d?.level ?? 0, top = d?.top ?? level, right = d?.hits ?? score.current ?? 0;
        const up = r && level > r.top ? level : r?.up ?? null;
        return r && r.level === level && r.top === top && r.right === right && r.up === up ? r : { level, top, right, up };
      });
    }, 500);
    return () => window.clearInterval(id);
  }, [playing]);
  /* the "Level 4!" note stays three seconds */
  useEffect(() => {
    if (!reached?.up) return;
    const id = window.setTimeout(() => setReached((r) => (r ? { ...r, up: null } : r)), 3000);
    return () => window.clearTimeout(id);
  }, [reached?.up]);

  /* Tab and Shift+Tab go round the pause card's three buttons and never into the page behind it (audit A8) */
  const holdFocus = (e: KeyEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const all = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    if (!all.length) return;
    const first = all[0], last = all[all.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  };
  const start = (inFull = false) => {
    score.current = 0;
    detail.current = null;
    setReached(null);
    setPaused(false);
    if (inFull) enterFull();
    void s.begin();
  };
  const finish = () => { setPaused(false); leaveFull(); void s.end("left"); };
  const stopNow = () => { setPaused(false); leaveFull(); void s.end("stop_rule"); };

  const scene = (
    <div ref={box} className="stagebox" data-full={full ?? undefined}>
      {full && (
        <div className="fsbar">
          <StageLine r={reached} s={s} />
          <span className="sp" />
          <span className="small fs-hint">{s_.escHint}</span>
          <button type="button" className="btn btn-sm" onClick={finish}>{t.finish}</button>
          <button type="button" className="btn btn-sm btn-d" data-stop onClick={stopNow}>{t.stop.button}</button>
          {full === "page" && <button type="button" className="btn btn-sm btn-gh" onClick={() => { setFull(null); pause(); }}>{s_.leaveFull}</button>}
        </div>
      )}
      <div className="scene ratio"><Game running={playing} paused={paused} onScore={onScore} onStats={onStats} joined={joined} {...eye} /></div>
      {reached?.up && playing && <p className="level-up" aria-hidden="true">{s_.up(reached.up)}</p>}
      <LevelSpoken level={playing ? reached?.level ?? 0 : 0} />
      {paused && playing && (
        <div className="pausecard" role="dialog" aria-modal="true" aria-label={s_.paused} onKeyDown={holdFocus}>
          <b>{s_.paused}</b>
          <span className="small">{s_.pausedSub}</span>
          <div className="row">
            <button ref={finishBtn} type="button" className="btn btn-g" onClick={finish}>{t.finish}</button>
            <button type="button" className="btn" onClick={() => { goOn(); enterFull(); }}>{s_.keep}</button>
            <button type="button" className="btn btn-d" onClick={stopNow}>{t.stop.button}</button>
          </div>
        </div>
      )}
    </div>
  );
  const body = (
    <>
      <p className="turn-hint small" role="note">{t.turnPhone}</p>
      {scene}
      {help && <p className="small muted">{help}</p>}
      <div className="row">
        {playing
          ? <><StopButton s={s} /><button type="button" className="btn" onClick={finish}>{t.finish}</button><button type="button" className="btn btn-gh" onClick={enterFull}>{s_.full}</button></>
          : canBegin(s, dose) && <>
            <button type="button" className="btn btn-g" onClick={() => start(true)}>{s_.startFull}</button>
            <button type="button" className="btn" onClick={() => start(false)}>{s.phase === "ended" ? t.game.again : t.game.start}</button>
          </>}
      </div>
      <SessionNote s={s} dose={dose} labels={labels} />
    </>
  );
  const line = playing && <StageLine r={reached} s={s} />;
  /* A drill done with a patch or with no glasses has nothing to show through a lens, so the switch is left out. */
  return lens ? <LensView right={line} onJoined={joinable ? setJoined : undefined} swapped={eye.weakInk === "red"}>{body}</LensView> : <div className="stack">{playing && <div className="row"><span className="sp" />{line}</div>}{body}</div>;
}
