// Eyes Opener: Child mode's home: a few big tiles (Play, Eye break, Go outside, Listen) and Stop, chosen in the Look room.
import type { Metadata } from "next";
import Link from "next/link";
import { LineArt } from "@/components/lineart/lineart";
import { kids as t } from "@/copy/kids";
import { kidTilesFor } from "@/lib/kids-data";
import { requireMember } from "@/lib/session";
import css from "./kids.module.css";

export const generateMetadata = (): Metadata => ({ title: t.title });

export default async function KidsHome() {
  const m = await requireMember();
  const tiles = await kidTilesFor(m);
  return (
    <>
      <header className={css.head}>
        <h1>{t.hi(m.profile.displayName)}</h1>
        <p>{t.lead}</p>
      </header>
      <ul className={css.tiles} aria-label={t.menu}>
        {tiles.map((tile) => {
          const w = t.tiles[tile.key];
          const note = tile.note ? t.play[tile.note === "done" ? "rest" : tile.note] : null;
          const noteText = tile.note ? t.play[tile.note === "done" ? "restText" : tile.note === "held" ? "heldText" : "youngText"] : null;
          const inner = (
            <>
              <LineArt name={tile.art} size={64} className={css.art} />
              <b>{note ?? w.name}</b>
              <span>{noteText ?? w.text}</span>
            </>
          );
          return (
            <li key={tile.key}>
              {tile.href
                ? <Link href={tile.href} className={css.tile} data-tone={tile.tone} data-kid-tile={tile.key}>{inner}</Link>
                : <div className={css.tile} data-tone={tile.tone} data-note={tile.note} data-kid-tile={tile.key} role="note">{inner}</div>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
