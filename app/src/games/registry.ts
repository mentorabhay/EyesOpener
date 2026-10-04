"use client";
/** The canvas games as screen components, by slug. Client only. Server code asks `built.ts` instead. */
import type { ComponentType } from "react";
import { kitGame } from "./canvas";
import { defs } from "./defs";
import type { GameProps } from "./kit";

export const playable: Record<string, ComponentType<GameProps>> = Object.fromEntries(
  Object.entries(defs).map(([slug, def]) => [slug, kitGame(def)]),
);
