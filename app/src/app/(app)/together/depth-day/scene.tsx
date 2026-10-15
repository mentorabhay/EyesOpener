"use client";
import { useEffect, useMemo, useState } from "react";
import { KitScene, type SceneEye } from "@/components/together/kit-scene";
import { depthDay as t } from "@/copy/depth-day";
import type { Sprite } from "@/games/hero";
import { depthScene } from "@/lib/scenes/depth-scene";
import { scenePlayed } from "./actions";

/** How long the scene plays before it comes to rest by itself, in seconds. */
const SCENE_SECONDS = 40;

/**
 * The depth scene with its Play button. It is a short scene, not practice: it has no session, uses no training
 * minutes and stops by itself. `found` is the depth step the member's check-up found; the scene draws nothing finer.
 */
export function DepthScene({ found, date, eye, hero, mark }: {
  found: number; date: string; eye: SceneEye; hero: Sprite | null;
  /** True when playing should be recorded: there is a kept day and its scene has not been played. */
  mark: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [played, setPlayed] = useState(false);
  const def = useMemo(() => depthScene(found, { title: date ? t.scene.words.title : t.scene.words.noDay, date }), [found, date]);
  useEffect(() => {
    if (!running) return;
    const stop = setTimeout(() => setRunning(false), SCENE_SECONDS * 1000);
    return () => clearTimeout(stop);
  }, [running]);
  const play = () => {
    setRunning(true);
    setPlayed(true);
    if (mark && !played) void scenePlayed().catch(() => undefined);
  };
  return (
    <>
      <div className="scene ratio"><KitScene def={def} running={running} eye={eye} hero={hero} label={t.scene.label} /></div>
      <div className="row">
        {running
          ? <button type="button" className="btn" onClick={() => setRunning(false)}>{t.scene.stop}</button>
          : <button type="button" className="btn btn-g" onClick={play}>{played ? t.scene.again : t.scene.play}</button>}
      </div>
    </>
  );
}
