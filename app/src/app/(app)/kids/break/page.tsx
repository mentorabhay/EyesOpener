// Child mode's eye break: look far away while a count goes down. Nothing is saved.
import type { Metadata } from "next";
import { StepFlow } from "@/components/guide/flow";
import { listSteps } from "@/components/guide/steps";
import { kids as t } from "@/copy/kids";
import { requireMember } from "@/lib/session";
import { BackHome } from "../back";
import css from "../kids.module.css";
import { Count } from "./count";

export const generateMetadata = (): Metadata => ({ title: t.break.title });

/** 20 seconds: the "20-20-20" break (every 20 minutes, 20 seconds, about 6 metres away), as the cinema's breaks. */
const SECONDS = 20;

export default async function KidsBreak() {
  await requireMember();
  return (
    <div className={css.page}>
      <header className={css.head}><h1>{t.break.title}</h1></header>
      <StepFlow steps={listSteps(t.break.steps, ["eye", "far", "timer"])} label={t.break.title} />
      <p className={css.lead}>{t.break.lead}</p>
      <div className={css.panel}>
        <Count seconds={SECONDS} words={{ start: t.break.start, again: t.break.again, look: t.break.look, done: t.break.done, count: t.break.count }} />
      </div>
      <BackHome />
    </div>
  );
}
