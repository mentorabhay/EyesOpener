"use client";
import { useEffect, useMemo, useRef, type ComponentType } from "react";
import { common } from "@/copy/common";
import type { Sprite } from "./hero";
import { mount, type GameDef, type GameProps } from "./kit";

/** Turns a game definition into a component the Stage can show. The game starts fresh whenever a session starts. */
export function kitGame<S>(def: GameDef<S>): ComponentType<GameProps> {
  return function KitGame(p: GameProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, joined = false } = p;
    /* The member's hero comes as a new object each time the page is read again. The game must not start over for that, so it is kept by what it holds. */
    const heroKey = p.hero ? JSON.stringify(p.hero) : "";
    const hero = useMemo(() => (heroKey ? (JSON.parse(heroKey) as Sprite) : null), [heroKey]);
    /* The practice view can be switched while a game runs without starting the game again: the game reads this object each frame. */
    const view = useRef({ joined });
    useEffect(() => { view.current.joined = joined; }, [joined]);
    /* A game that is not running shows one still picture, so that picture is drawn again when the view changes. */
    const still = running ? false : joined;
    useEffect(
      () => mount(canvas.current!, def, { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, hero, view: view.current }),
      [running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, hero, still],
    );
    return <canvas ref={canvas} className="game-canvas" tabIndex={0} role="application" aria-label={common.gameScene} />;
  };
}
