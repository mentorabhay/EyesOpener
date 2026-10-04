"use client";
import { useEffect, useRef, type ComponentType } from "react";
import { common } from "@/copy/common";
import { mount, type GameDef, type GameProps } from "./kit";

/** Turns a game definition into a component the Stage can show. The game starts fresh whenever a session starts. */
export function kitGame<S>(def: GameDef<S>): ComponentType<GameProps> {
  return function KitGame(p: GameProps) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats } = p;
    useEffect(
      () => mount(canvas.current!, def, { running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats }),
      [running, contrast, gamma, targetPx, letterPx, ppc, distCm, cyanEye, onScore, onStats],
    );
    return <canvas ref={canvas} className="game-canvas" tabIndex={0} role="application" aria-label={common.gameScene} />;
  };
}
