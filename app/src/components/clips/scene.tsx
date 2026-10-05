"use client";
/**
 * The clips that are played as a scene on the game kit: say when it splits, hold and time, count flips, find and
 * follow. The scene draws and reports plain numbers; this part runs it until it says it is done, or for the set
 * time, and hands the numbers on. The kit enforces the vergence limits (src/games/vergence.ts).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { holdClip } from "@/clips/scenes/hold";
import { rampClip } from "@/clips/scenes/ramp";
import { recoverClip } from "@/clips/scenes/recover";
import { trackClip } from "@/clips/scenes/track";
import { clips as c, sceneHelp } from "@/copy/clips";
import { drillHelp, drills } from "@/drills";
import { FUSION_REPEATS } from "@/engine";
import { kitGame } from "@/games/canvas";
import type { GameProps, Stats } from "@/games/kit";
import { AlignTask } from "./align";
import css from "./clips.module.css";
import type { TaskProps } from "./types";

type Game = ComponentType<GameProps>;
const RATES = [0.5, 1, 2] as const;
/** One component for each scene, made once: a scene must not start over because the page was drawn again. */
const RAMPS: Record<string, Game> = Object.fromEntries(([1, -1] as const).flatMap((way) => RATES.map((rate) => [`${way}:${rate}`, kitGame(rampClip(way, rate))])));
const RECOVER = kitGame(recoverClip), FLIPS = kitGame(drills["flip-switch"]), SEARCH = kitGame(drills["blind-side-sweeps"]);
const TRACK_SECONDS = 60, TRACK = kitGame(trackClip(TRACK_SECONDS));

/* whether this browser can fill the screen with one element, and whether one is filling it now */
const onFill = (cb: () => void) => { document.addEventListener("fullscreenchange", cb); return () => document.removeEventListener("fullscreenchange", cb); };
const canFill = () => document.fullscreenEnabled === true, isFilled = () => document.fullscreenElement !== null, never = () => false;
const leaveFill = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); };

/** Runs one scene. It ends when the scene reports `done`, or after `seconds` when the scene has no end of its own. */
function Scene({ Game, ctx, seconds, help, onEnd }: { Game: Game; ctx: TaskProps["ctx"]; seconds?: number; help: string; onEnd: (stats: Stats) => void }) {
  const stats = useRef<Stats>({}), ended = useRef(false);
  const [running, setRunning] = useState(true);
  const [left, setLeft] = useState(seconds ?? 0);
  const onStats = useCallback((live: Stats) => { stats.current = live; }, []);
  const onScore = useCallback(() => undefined, []);
  const screen = ctx.screen!;
  const wrap = useRef<HTMLDivElement>(null);
  const fillable = useSyncExternalStore(onFill, canFill, never), filled = useSyncExternalStore(onFill, isFilled, never);
  /* a small scene is hard to tap on a phone: it can fill the screen, and the keys go on working there */
  const fill = () => { void wrap.current?.requestFullscreen?.().then(() => wrap.current?.querySelector("canvas")?.focus()).catch(() => undefined); };
  useEffect(() => leaveFill, []);

  useEffect(() => {
    const from = performance.now();
    const id = setInterval(() => {
      const spent = (performance.now() - from) / 1000;
      if (seconds) setLeft(Math.max(0, Math.ceil(seconds - spent)));
      if (ended.current || !(stats.current.done === 1 || (seconds && spent >= seconds))) return;
      ended.current = true;
      setRunning(false);
      leaveFill();
      onEnd({ ...stats.current });
    }, 250);
    return () => clearInterval(id);
  }, [seconds, onEnd]);

  return (
    <>
      <div ref={wrap} className={css.sceneFill}>
        <div className="scene ratio">
          <Game running={running} contrast={ctx.contrast} gamma={screen.gamma} targetPx={ctx.targetPx} letterPx={ctx.letterPx} ppc={screen.ppc} distCm={screen.dist} cyanEye={ctx.cyanEye} onScore={onScore} onStats={onStats} />
        </div>
        <button type="button" className={`btn btn-sm ${css.leave}`} onClick={leaveFill}>{c.scene.leave}</button>
      </div>
      {fillable && !filled && running && <button type="button" className="btn btn-sm" style={{ alignSelf: "flex-start" }} onClick={fill}>{c.scene.fill}</button>}
      <p className="small muted">{help}</p>
      {seconds !== undefined && running && <p className="muted small tnum" role="status">{c.scene.left(left)}</p>}
    </>
  );
}

const num = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Say when it splits and when it is one again: the fusion range at a set speed, or the time to one picture again. */
export function SplitTask({ def, ctx, onDone }: TaskProps) {
  const play = def.play.template === "split" ? def.play : null;
  const recover = play?.mode === "recover";
  const onEnd = useCallback((s: Stats) => {
    if (s.cannot) return onDone({ cannot: true });
    const repeats = Array.from({ length: FUSION_REPEATS }, (_, i) => i + 1);
    if (recover) return onDone({ times: repeats.map((n) => num(s[`t${n}`])) });
    onDone({ limit: s.limit ?? 0, rate: s.rate ?? 1, tries: repeats.map((n) => ({ break: s[`b${n}`] ?? 0, recovery: s[`r${n}`] ?? 0, atLimit: s[`l${n}`] === 1 })) });
  }, [recover, onDone]);
  if (!play) return null;
  return <Scene Game={recover ? RECOVER : RAMPS[`${play.way === "in" ? 1 : -1}:${play.rate}`]} ctx={ctx} help={sceneHelp.split} onEnd={onEnd} />;
}

/** Hold one ring at a set pull and time it; count flips in a minute; or measure the resting position before and after a long hold. */
export function HoldTask({ def, ctx, onDone }: TaskProps) {
  const play = def.play.template === "hold" ? def.play : null;
  const kind = play?.kind ?? "hold", seconds = play?.seconds ?? 60;
  const Hold = useMemo(() => kitGame(holdClip(ctx.holdPd, seconds)), [ctx.holdPd, seconds]);
  const [before, setBefore] = useState<{ offsets: number[]; dpr: number } | null>(null);
  const [held, setHeld] = useState<{ held: number; demand: number } | null>(null);

  const onHold = useCallback((s: Stats) => {
    if (s.cannot) return onDone({ cannot: true });
    const got = { held: s.held ?? 0, demand: s.demand ?? 0 };
    if (kind === "adapt") setHeld(got); else onDone(got);
  }, [kind, onDone]);
  const onFlips = useCallback((s: Stats) => onDone({ cycles: num(s.cycles_per_min), turnIn: s.conv_pd ?? 0, turnOut: s.div_pd ?? 0 }), [onDone]);

  if (kind === "flips") return <Scene Game={FLIPS} ctx={ctx} seconds={seconds} help={c.scene.flipsHow} onEnd={onFlips} />;
  if (kind === "hold") return <><p className="muted">{c.scene.demand(ctx.holdPd)}</p><Scene Game={Hold} ctx={ctx} help={sceneHelp.hold} onEnd={onHold} /></>;
  /* adaptation: line up, hold, line up again */
  if (!before) return <><h3>{c.adapt.before}</h3><AlignTask key="before" axis="h" lock={false} ctx={ctx} onDone={setBefore} /></>;
  if (!held) return <><h3>{c.adapt.hold}</h3><p className="muted">{c.scene.demand(ctx.holdPd)}</p><Scene Game={Hold} ctx={ctx} help={sceneHelp.hold} onEnd={onHold} /></>;
  return (
    <>
      <h3>{c.adapt.after}</h3>
      {held.held < seconds && <p className="notice">{c.adapt.shortHold}</p>}
      <AlignTask key="after" axis="h" lock={false} ctx={ctx} onDone={(after) => onDone({ before: before.offsets, after: after.offsets, dpr: after.dpr, held: held.held, demand: held.demand })} />
    </>
  );
}

/** Find and follow: the search drill run as a starting measure, and a ring to keep a pointer on. */
export function FindTask({ def, ctx, onDone }: TaskProps) {
  const play = def.play.template === "find" ? def.play : null;
  const onSearch = useCallback((s: Stats) => onDone({ found: s.found ?? 0, blind: num(s.find_s_blind), seeing: num(s.find_s_seeing) }), [onDone]);
  const onTrack = useCallback((s: Stats) => onDone({ on: s.on ?? 0, seconds: s.secs ?? 0 }), [onDone]);
  if (!play) return null;
  return play.kind === "search"
    ? <Scene Game={SEARCH} ctx={ctx} seconds={play.seconds} help={`${drillHelp["blind-side-sweeps"] ?? ""} ${c.scene.searchHow}`} onEnd={onSearch} />
    : <Scene Game={TRACK} ctx={ctx} help={sceneHelp.track} onEnd={onTrack} />;
}
