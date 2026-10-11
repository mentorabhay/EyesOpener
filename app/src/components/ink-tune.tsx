// Eyes Opener: Hands the household's ink tuning (src/engine/tune.ts) to the browser's drawing code. It renders nothing. It sits in.
"use client";
/**
 * Hands the household's ink tuning (src/engine/tune.ts) to the browser's drawing code. It renders nothing. It sits in
 * the member layout before the page, so the setting is in place before any scene on the page is drawn, and it is set
 * again whenever the layout is drawn again (after the tuning is saved, for one). On the server it does nothing: a
 * server answers many households, so it never holds one household's setting.
 */
import { useSyncExternalStore } from "react";
import { USUAL_TUNE, currentTune, setInkTune, type InkTune } from "@/engine";

export function InkTuneSet({ tune }: { tune: InkTune }) {
  if (typeof window !== "undefined") setInkTune(tune);
  return null;
}

const still = () => () => {};
/**
 * The tuning for something drawn during render rather than on a canvas (a background colour, say). The server and the
 * first browser render use the usual inks, so the two agree, and the browser then draws again with the tuning.
 */
export const useInkTune = (): InkTune => useSyncExternalStore(still, currentTune, () => USUAL_TUNE);
