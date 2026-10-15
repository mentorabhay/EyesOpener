/**
 * The web's step strips: the plain step lists of src/lib/guide-steps.ts (which the phone and TV apps get too), each
 * picture turned into its drawing. Server-safe: no hooks, no browser APIs.
 */
import { CuePicture } from "@/components/play/cue";
import {
  checkupStepData, clipStepData, exerciseStepData, gameStepData, listStepData, SETUP_ICON,
  type IconKey, type StepData,
} from "@/lib/guide-steps";
import type { SetupStep } from "@/lib/setup-rules";
import type { FlowStep } from "./flow";
import { Icon, NumPic } from "./icons";

/** One step's data as the strip draws it. */
export function toFlow(steps: readonly StepData[]): FlowStep[] {
  return steps.map((s) => {
    const p = s.pic;
    const pic = "cue" in p ? <CuePicture shapes={p.cue} /> : "num" in p ? <NumPic n={p.num} /> : <Icon k={p.icon} cyan={p.cyan} />;
    return { title: s.title, text: s.text, tone: s.tone, pic, dark: "cue" in p };
  });
}

export const listSteps = (items: readonly { title: string; text?: string }[], icons: readonly IconKey[]) => toFlow(listStepData(items, icons));
export const gameSteps = (a: Parameters<typeof gameStepData>[0]) => toFlow(gameStepData(a));
export const exerciseSteps = (...a: Parameters<typeof exerciseStepData>) => toFlow(exerciseStepData(...a));
export const checkupSteps = (...a: Parameters<typeof checkupStepData>) => toFlow(checkupStepData(...a));
export const clipSteps = (a: Parameters<typeof clipStepData>[0]) => toFlow(clipStepData(a));

/** Setup as it stands for this person: each step with its state, the next one lit, and a way to do it. */
export function setupFlow(steps: readonly SetupStep[], words: {
  name: (key: SetupStep["key"]) => string; line: (st: SetupStep) => string; doIt: (st: SetupStep) => string; may: (st: SetupStep) => boolean;
}): FlowStep[] {
  return steps.filter((st) => st.state !== "skip").map((st) => ({
    title: words.name(st.key),
    text: words.line(st),
    pic: <Icon k={SETUP_ICON[st.key] ?? "check"} />,
    state: st.state,
    action: words.may(st) && st.state !== "done" ? { href: st.href, label: words.doIt(st) } : undefined,
  }));
}
