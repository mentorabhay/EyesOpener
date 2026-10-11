// Eyes Opener: The exercise drills as screen components, by slug. Client only. Server code asks `src/drills/index.ts` instead. .
"use client";
/** The exercise drills as screen components, by slug. Client only. Server code asks `src/drills/index.ts` instead. */
import type { ComponentType } from "react";
import { kitGame } from "@/games/canvas";
import type { GameProps } from "@/games/kit";
import { drills } from "./index";

export const drillable: Record<string, ComponentType<GameProps>> = Object.fromEntries(
  Object.entries(drills).map(([slug, def]) => [slug, kitGame(def)]),
);
