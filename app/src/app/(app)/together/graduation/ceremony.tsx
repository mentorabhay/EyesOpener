// Eyes Opener: The ceremony with its Play button. It is a short scene, not practice: no session, no training minutes, and it.
"use client";
import { useEffect, useMemo, useState } from "react";
import { KitScene, type SceneEye } from "@/components/together/kit-scene";
import { graduation as t } from "@/copy/graduation";
import type { Sprite } from "@/games/hero";
import { CEREMONY_SECONDS } from "@/lib/graduation";
import { ceremonyScene } from "@/lib/scenes/ceremony-scene";

/**
 * The ceremony with its Play button. It is a short scene, not practice: no session, no training minutes, and it
 * comes to rest by itself on its last picture. It needs no glasses.
 */
export function Ceremony({ weeks, programme, eye, hero }: { weeks: number; programme: string; eye: SceneEye; hero: Sprite | null }) {
  const [running, setRunning] = useState(false);
  const [played, setPlayed] = useState(false);
  const def = useMemo(() => ceremonyScene(weeks, { kept: t.ceremony.words.kept(weeks), programme }), [weeks, programme]);
  useEffect(() => {
    if (!running) return;
    const stop = setTimeout(() => setRunning(false), CEREMONY_SECONDS * 1000);
    return () => clearTimeout(stop);
  }, [running]);
  return (
    <>
      <div className="scene ratio"><KitScene def={def} running={running} eye={eye} hero={hero} label={t.ceremony.label(weeks)} /></div>
      <div className="row">
        {running
          ? <button type="button" className="btn" onClick={() => setRunning(false)}>{t.ceremony.stop}</button>
          : <button type="button" className="btn btn-d" onClick={() => { setRunning(true); setPlayed(true); }}>{played ? t.ceremony.again : t.ceremony.play}</button>}
      </div>
    </>
  );
}
