// Eyes Opener: Child mode's Listen: each tile's words read aloud, where audio has been made for them.
import type { Metadata } from "next";
import { Listen } from "@/components/voice/listen";
import { kids as t } from "@/copy/kids";
import { requireMember } from "@/lib/session";
import { SCRIPT_PARTS, kidsScriptId } from "@/voice/scripts";
import { audioFor } from "@/voice/audio";
import { BackHome } from "../back";
import css from "../kids.module.css";

export const generateMetadata = (): Metadata => ({ title: t.listen.title });

export default async function KidsListen() {
  const m = await requireMember();
  const have = await Promise.all(SCRIPT_PARTS.kids.map(async (part) => ({ part, ok: !!(await audioFor(kidsScriptId(part), m.account.locale)) })));
  const list = have.filter((h) => h.ok);
  return (
    <div className={css.page}>
      <header className={css.head}><h1>{t.listen.title}</h1><p>{t.listen.lead}</p></header>
      {list.length
        ? <ul className={css.listen}>{list.map(({ part }) => (
            <li key={part}>{t.tiles[part].name}<Listen id={kidsScriptId(part)} what={t.tiles[part].name} locale={m.account.locale} /></li>
          ))}</ul>
        : <p className={css.lead}>{t.listen.none}</p>}
      <BackHome />
    </div>
  );
}
