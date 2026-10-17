// Eyes Opener: Child mode's Stop: glasses off, eyes closed, tell a grown-up; and the signs that need a grown-up now.
import type { Metadata } from "next";
import { StepFlow } from "@/components/guide/flow";
import { listSteps } from "@/components/guide/steps";
import { LineArt } from "@/components/lineart/lineart";
import { kids as t } from "@/copy/kids";
import { requireMember } from "@/lib/session";
import { BackHome } from "../back";
import css from "../kids.module.css";

export const generateMetadata = (): Metadata => ({ title: t.stop.title });

export default async function KidsStop() {
  await requireMember();
  return (
    <div className={css.page}>
      <header className={css.head}><h1>{t.stop.title}</h1></header>
      <StepFlow steps={listSteps(t.stop.steps, ["glasses", "eye", "people"])} label={t.stop.title} />
      <div className={css.panel}>
        <LineArt name="hand" size={72} />
        <p className={css.big}>{t.stop.lead}</p>
      </div>
      <div className={css.panel} role="note">
        <p className={css.big}><b>{t.stop.now}</b></p>
        <ul className={css.signs}>{t.stop.signs.map((s) => <li key={s}>{s}</li>)}</ul>
      </div>
      <BackHome />
    </div>
  );
}
