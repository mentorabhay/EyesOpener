// Eyes Opener: A picture slot on a public page: the approved picture, cut around its subject, or what the page showed before.
import type { ReactNode } from "react";
import { pictures as t } from "@/copy/pictures";
import { readDesign } from "@/lib/design/read";
import { livePicture } from "@/lib/site-pictures/read";
import { picAddress, slotOf, type SlotId } from "@/lib/site-pictures/slots";
import { Parallax } from "./parallax";
import css from "./site-picture.module.css";

/**
 * Shows the slot's live picture. With none approved it shows `children` (the page's own drawing), or nothing.
 * `sizes` is the width the frame takes on the page, for the browser to pick a file; the default fits a full-width frame.
 */
export async function SitePicture({ slot, sizes = "(max-width: 900px) 100vw, 900px", className, children }: {
  slot: SlotId; sizes?: string; className?: string; children?: ReactNode;
}) {
  const s = slotOf(slot), p = s ? await livePicture(slot) : null;
  if (!s || !p) return <>{children ?? null}</>;
  const design = await readDesign();
  const credit = [p.kind === "generated" && design.content.illustrationCredit ? t.illustration : "", p.credit].filter(Boolean).join(" · ");
  const largest = p.widths.at(-1)!;
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={css.img}
      src={picAddress(p.id, p.widths.find((w) => w >= 1280) ?? largest)}
      srcSet={p.widths.map((w) => `${picAddress(p.id, w)} ${w}w`).join(", ")}
      sizes={sizes} alt={p.alt} width={p.width} height={p.height} loading={slot === "home-hero" ? "eager" : "lazy"} decoding="async"
      style={{ objectPosition: `${(p.focalX * 100).toFixed(1)}% ${(p.focalY * 100).toFixed(1)}%` }}
    />
  );
  return (
    <figure className={`${css.frame}${className ? ` ${className}` : ""}`} style={{ aspectRatio: String(s.aspect) }} data-slot={slot}>
      {s.parallax ? <Parallax>{img}</Parallax> : img}
      {credit && <figcaption className={css.credit}>{credit}</figcaption>}
    </figure>
  );
}
