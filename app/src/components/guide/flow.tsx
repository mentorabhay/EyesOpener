/**
 * The step strip at the top of a page (flow-client.tsx draws it). This server part adds the small script that folds a
 * strip this browser has shown before, before the first paint; a script drawn by the browser later would never run.
 */
import { guide as w } from "@/copy/guide";
import { FOLD_BOOT } from "./flow-boot";
import { StepFlowClient, type FlowStep } from "./flow-client";
import { scriptNonce } from "@/lib/nonce";

export type { FlowStep };

export async function StepFlow(props: { steps: FlowStep[]; label?: string; start?: number; auto?: boolean; compact?: boolean }) {
  const label = props.label ?? w.how, auto = props.auto ?? true;
  const nonce = auto && props.steps.length > 0 ? await scriptNonce() : undefined;
  return (
    <>
      <StepFlowClient {...props} />
      {auto && props.steps.length > 0 && <script nonce={nonce} dangerouslySetInnerHTML={{ __html: FOLD_BOOT(label) }} />}
    </>
  );
}
