"use client";
import { useEffect, useRef, type ComponentType } from "react";
import { common } from "@/copy/common";
import { mount, type GameDef, type GameProps } from "./kit";

/** Turns a game definition into a component the Stage can show. The game starts fresh whenever a session starts. */
export function kitGame<S>(def: GameDef<S>): ComponentType<GameProps> {
  return function KitGame(p: GameProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, joined = false } = p;
    /* The practice view can be switched while a game runs without starting the game again: the game reads this object each frame. */
    const view = useRef({ joined });
    useEffect(() => { view.current.joined = joined; }, [joined]);
    /* A game that is not running shows one still picture, so that picture is drawn again when the view changes. */
    const still = running ? false : joined;
    useEffect(
      () => mount(canvas.current!, def, { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, view: view.current }),
      [running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats, still],
    );
    return <canvas ref={canvas} className="game-canvas" tabIndex={0} role="application" aria-label={common.gameScene} />;
  };
}
