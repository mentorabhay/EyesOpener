// Eyes Opener: Count what you see: the four-dot check, played by the suppression check-up's own part. .
"use client";
import { FourDotTest } from "@/components/measure/four-dot";
import type { TaskProps } from "./types";

/** Count what you see: the four-dot check, played by the suppression check-up's own part. */
export function CountTask({ ctx, onDone }: TaskProps) {
  return <FourDotTest ppc={ctx.screen!.ppc} onDone={onDone} />;
}
