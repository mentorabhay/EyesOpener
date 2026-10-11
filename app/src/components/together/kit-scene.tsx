// Eyes Opener: What a scene needs to know about the member and the screen: the same values a game gets. .
"use client";
import { useEffect, useMemo, useRef } from "react";
import type { Sprite } from "@/games/hero";
import { mount, type GameDef, type GameProps } from "@/games/kit";

/** What a scene needs to know about the member and the screen: the same values a game gets. */
export type SceneEye = Pick<GameProps, "contrast" | "gamma" | "targetPx" | "letterPx" | "ppc" | "distCm" | "cyanEye" | "weakInk">;

const noScore = () => {};

/**
 * Shows a game-kit scene that is not a game: a ceremony or a celebration. There is no session, no score and no
 * dose here; the kit still owns the three inks, the member's contrast and the size of the screen.
 * While `running` is false it rests on one still picture.
 */
export function KitScene<S>({ def, running, eye, hero, label }: { def: GameDef<S>; running: boolean; eye: SceneEye; hero: Sprite | null; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, weakInk } = eye;
  /* The hero comes as a new object each time the page is read again. The scene must not start over for that. */
  const heroKey = hero ? JSON.stringify(hero) : "";
  const shape = useMemo(() => (heroKey ? (JSON.parse(heroKey) as Sprite) : null), [heroKey]);
  useEffect(
    () => mount(canvas.current!, def, { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, weakInk, onScore: noScore, hero: shape }),
    [def, running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, weakInk, shape],
  );
  return <canvas ref={canvas} role="img" aria-label={label} />;
}
