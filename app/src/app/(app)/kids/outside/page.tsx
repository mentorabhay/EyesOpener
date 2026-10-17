// Eyes Opener: Child mode's "Go outside": play outside in daylight with a grown-up. The grown-up writes the time down.
import type { Metadata } from "next";
import { StepFlow } from "@/components/guide/flow";
import { listSteps } from "@/components/guide/steps";
import { LineArt } from "@/components/lineart/lineart";
import { kids as t } from "@/copy/kids";
import { requireMember } from "@/lib/session";
import { BackHome } from "../back";
import css from "../kids.module.css";

export const generateMetadata = (): Metadata => ({ title: t.outside.title });

export default async function KidsOutside() {
  await requireMember();
  return (
    <div className={css.page}>
      <header className={css.head}><h1>{t.outside.title}</h1></header>
      <StepFlow steps={listSteps(t.outside.steps, ["people", "sun", "play", "pen"])} label={t.outside.title} />
      <div className={css.panel}>
        <LineArt name="sun" size={72} />
        <p className={css.big}>{t.outside.lead}</p>
        <p className={css.big}>{t.outside.sun}</p>
      </div>
      <BackHome />
    </div>
  );
}
