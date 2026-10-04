"use client";
import { useCallback, useRef } from "react";
import { train as t } from "@/copy/train";
import type { GameProps } from "@/games/kit";
import { playable } from "@/games/registry";
import type { TrainDose } from "@/lib/sessions";
import { LensView } from "./lens";
import { canBegin, Clock, SessionNote, StopButton } from "./session-ui";
import { useTrainSession } from "./use-session";

export type EyeProps = Omit<GameProps, "running" | "onScore">;

/** Everything around a game: the session, the countdown, the stop rule and the glasses view. The game only draws. */
export function Stage({ slug, dose, help, ...eye }: { slug: string; dose: TrainDose; help?: string } & EyeProps) {
  const Game = playable[slug];
  const score = useRef(0);
  const onScore = useCallback((n: number) => { score.current = n; }, []);
  const s = useTrainSession("game", slug, score);
  const playing = s.phase === "active";
  const start = () => {
    score.current = 0;
    void s.begin();
  };
  return (
    <LensView right={playing && <Clock s={s} />}>
      <div className="scene ratio"><Game running={playing} onScore={onScore} {...eye} /></div>
      {help && <p className="small muted">{help}</p>}
      <div className="row">
        {playing
          ? <><StopButton s={s} /><button type="button" className="btn" onClick={() => void s.end("left")}>{t.finish}</button></>
          : canBegin(s, dose) && <button type="button" className="btn btn-g" onClick={start}>{s.phase === "ended" ? t.game.again : t.game.start}</button>}
      </div>
      <SessionNote s={s} dose={dose} />
    </LensView>
  );
}
