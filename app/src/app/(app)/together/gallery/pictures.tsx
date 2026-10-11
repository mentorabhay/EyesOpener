// Eyes Opener: Locked Gallery: the pictures themselves. Each is drawn in whole device pixels, the way the check-ups draw:.
"use client";
/**
 * Locked Gallery: the pictures themselves. Each is drawn in whole device pixels, the way the check-ups draw:
 *  - a depth picture with the same two inks at full strength that the Depth check-up uses, one copy for each eye;
 *  - a faint picture with the same greys as the Faint letters check-up.
 * A picture is always drawn truly, at its own step, whether the member has reached it or not.
 */
import { useCallback, useSyncExternalStore } from "react";
import css from "@/components/together/rewards.module.css";
import { TrueSize, useDraw, type Draw } from "@/components/measure/canvas";
import { gallery as t } from "@/copy/gallery";
import { eyeInks } from "@/components/measure/scenes";
import { SCENE_FIELD, contrastField, contrastGrey, pixelArcsec } from "@/engine";
import { depthPixels, depthPlanes, dotCount, dotField, eyeDots, eyeShifts, seedOf, type ShapeKey } from "@/lib/gallery";
import { SHAPES, shapeIn } from "@/lib/gallery-art";

/** Device pixels to one CSS pixel. 0 on the server, where there is no screen to ask. */
function useDevicePixels() {
  return useSyncExternalStore(
    (changed) => { window.addEventListener("resize", changed); return () => window.removeEventListener("resize", changed); },
    () => window.devicePixelRatio || 1,
    () => 0,
  );
}

interface DepthProps {
  slug: string; shape: ShapeKey; arcsec: number; ppc: number; dist: number; cyanEye: "L" | "R"; dotCm: number;
  /** The picture's name, once it is reached. Left out until then, so the words do not give the picture away. */
  name?: string;
}

/**
 * A field of dots with one shape in it that exists only as a depth step of `arcsec`.
 * `dotCm` is how wide one dot is, from the member's own letter size, so both eyes can make the dots out.
 */
export function DepthPicture(p: DepthProps) {
  const dpr = useDevicePixels();
  /* Before the browser has said how fine its pixels are there is nothing true to draw: an empty black panel. */
  if (dpr <= 0) return <div className={css.panel} />;
  const pixel = pixelArcsec({ ppc: p.ppc, dist: p.dist }, dpr), pixels = depthPixels(p.arcsec, pixel);
  if (pixels < 1) return <div className={`empty ${css.cannot}`}><div>{t.depth.cannot(pixel)}</div></div>;
  return (
    <>
      <DepthDots {...p} dpr={dpr} pixels={pixels} />
      <p className="muted small tnum">{t.depth.drawn(pixels, pixels * pixel)}</p>
    </>
  );
}

/** The dots, `pixels` whole device pixels apart for the two eyes inside the shape. */
function DepthDots({ slug, shape, arcsec, ppc, cyanEye, dotCm, name, dpr, pixels }: DepthProps & { dpr: number; pixels: number }) {
  const draw = useCallback<Draw>((g, w, h) => {
    const cell = Math.max(2, Math.round(dotCm * ppc * dpr));
    const planes = depthPlanes(pixels), [groundL, groundR] = eyeShifts(planes.ground), [shapeL, shapeR] = eyeShifts(planes.shape);
    const inShape = shapeIn(SHAPES[shape], w, h, 0.12), reach = pixels + cell, count = dotCount(w, h, cell, reach);
    const ground = dotField(seedOf(slug), count, w, h, cell, reach), figure = dotField(seedOf(`${slug}/shape`), count, w, h, cell, reach);
    /* the same two inks, at full strength, that the Depth check-up draws its rings with */
    const [leftInk, rightInk] = eyeInks(cyanEye);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = SCENE_FIELD;
    g.fillRect(0, 0, w, h);
    /* where a red and a cyan dot overlap the light adds up to white */
    g.globalCompositeOperation = "lighter";
    g.fillStyle = leftInk;
    for (const d of eyeDots(ground, figure, cell, inShape, groundL, shapeL)) g.fillRect(d.x, d.y, cell, cell);
    g.fillStyle = rightInk;
    for (const d of eyeDots(ground, figure, cell, inShape, groundR, shapeR)) g.fillRect(d.x, d.y, cell, cell);
    g.globalCompositeOperation = "source-over";
    /* a white edge, drawn the same for both eyes: it sits on the screen and gives the depth something to stand against */
    const edge = Math.max(2, Math.round(2 * dpr));
    g.strokeStyle = "#fff";
    g.lineWidth = edge;
    g.strokeRect(edge / 2, edge / 2, w - edge, h - edge);
  }, [slug, shape, pixels, ppc, dpr, cyanEye, dotCm]);
  return <TrueSize><canvas ref={useDraw(draw)} className={css.panel} role="img" aria-label={name ? t.depth.alt.reached(name, arcsec) : t.depth.alt.hidden(arcsec)} /></TrueSize>;
}

/** A shape a little darker than the grey around it, at one step of the Faint letters check-up. */
export function FaintPicture({ shape, logCs, gamma, name }: { shape: ShapeKey; logCs: number; gamma: number; name?: string }) {
  const draw = useCallback<Draw>((g, w, h) => {
    const field = contrastField(gamma), ink = contrastGrey(logCs, gamma);
    const inShape = shapeIn(SHAPES[shape], w, h, 0.14), img = g.createImageData(w, h), px = img.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const v = inShape(x, y) ? ink : field;
      px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, [shape, logCs, gamma]);
  return (
    <>
      <TrueSize><canvas ref={useDraw(draw)} className={`${css.panel} ${css.grey}`} role="img" aria-label={name ? t.faint.alt.reached(name, logCs) : t.faint.alt.hidden(logCs)} /></TrueSize>
      <p className="muted small tnum">{t.faint.drawn(logCs)}</p>
    </>
  );
}
