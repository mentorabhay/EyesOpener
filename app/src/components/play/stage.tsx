// Eyes Opener: Everything around a game or an exercise drill: the session, the countdown, the stop rule, the glasses view.
"use client";
import { useCallback, useRef, useState } from "react";
import { train as t } from "@/copy/train";
import { drillable } from "@/drills/registry";
import type { GameProps, Stats } from "@/games/kit";
import { playable } from "@/games/registry";
import type { Detail, TrainDose } from "@/lib/sessions";
import { LensView } from "./lens";
import type { Labels } from "./results";
import { canBegin, Clock, SessionNote, StopButton } from "./session-ui";
import { useTrainSession } from "./use-session";

export type EyeProps = Omit<GameProps, "running" | "onScore" | "onStats" | "joined" | "view">;

/**
 * Everything around a game or an exercise drill: the session, the countdown, the stop rule, the glasses view
 * and, when the session ends, what it measured. The game only draws.
 * `kind` picks the library: "game" plays a game, "exercise" plays the drill that goes with an exercise.
 */
export function Stage({ slug, dose, help, kind = "game", labels, lens = true, joinable = false, ...eye }: { slug: string; dose: TrainDose; help?: string; kind?: "game" | "exercise"; labels?: Labels; lens?: boolean; /** Offer the "eyes joined" practice view: for scenes where two pictures must join into one. */ joinable?: boolean } & EyeProps) {
  const Game = (kind === "game" ? playable : drillable)[slug];
  const score = useRef(0), detail = useRef<Detail | null>(null);
  const onScore = useCallback((n: number) => { score.current = n; }, []);
  const onStats = useCallback((stats: Stats) => { detail.current = stats; }, []);
  const s = useTrainSession(kind, slug, score, detail);
  const playing = s.phase === "active";
  const [joined, setJoined] = useState(false);
  const start = () => {
    score.current = 0;
    detail.current = null;
    void s.begin();
  };
  const body = (
    <>
      <div className="scene ratio"><Game running={playing} onScore={onScore} onStats={onStats} joined={joined} {...eye} /></div>
      {help && <p className="small muted">{help}</p>}
      <div className="row">
        {playing
          ? <><StopButton s={s} /><button type="button" className="btn" onClick={() => void s.end("left")}>{t.finish}</button></>
          : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={start}>{s.phase === "ended" ? t.game.again : t.game.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} labels={labels} />
    </>
  );
  /* A drill done with a patch or with no glasses has nothing to show through a lens, so the switch is left out. */
  return lens ? <LensView right={playing && <Clock s={s} />} onJoined={joinable ? setJoined : undefined} swapped={eye.weakInk === "red"}>{body}</LensView> : <div className="stack">{playing && <div className="row"><span className="sp" /><Clock s={s} /></div>}{body}</div>;
}
