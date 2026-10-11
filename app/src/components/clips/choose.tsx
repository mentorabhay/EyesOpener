// Eyes Opener: Choose what you see: a direction or a shape, on a staircase. The plain letter test and the two-letter balance.
"use client";
/**
 * Choose what you see: a direction or a shape, on a staircase. The plain letter test and the two-letter balance
 * test are played by the check-ups' own parts; the other kinds are the same tests with another target.
 */
import { BalanceTest } from "@/components/measure/balance-test";
import { LetterTest } from "@/components/measure/letter-test";
import { clips as c } from "@/copy/clips";
import { AnimalBalance } from "./animals";
import { DotsTest } from "./dots";
import { GratingTest } from "./grating";
import { OptotypeTest } from "./optotype";
import type { TaskProps } from "./types";

export function ChooseTask({ def, ctx, onDone }: TaskProps) {
  if (def.play.template !== "choose") return null;
  const { kind, cpd } = def.play, screen = ctx.screen!;
  switch (kind) {
    case "letter": return <LetterTest kind="acuity" screen={screen} onDone={onDone} />;
    case "crowded": case "shapes": case "faint": return <OptotypeTest kind={kind} screen={screen} onDone={onDone} />;
    case "stripes": return <GratingTest screen={screen} cpd={cpd ?? 6} onDone={onDone} />;
    case "dots": return <><DotsTest gamma={screen.gamma} onDone={(x) => onDone({ x })} /><p className="muted small">{c.choose.noSettings}</p></>;
    case "pairs": return <BalanceTest gamma={screen.gamma} onDone={(x) => onDone({ x })} />;
    case "animals": return <AnimalBalance gamma={screen.gamma} onDone={(x) => onDone({ x })} />;
  }
}
