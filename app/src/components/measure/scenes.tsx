"use client";
/**
 * The drawings of the two-eye check-ups: depth rings, the fusion target and the four dots.
 * Everything is drawn in whole device pixels on the black field. Where a red and a cyan shape overlap the light adds up to white.
 */
import { useCallback, type CSSProperties } from "react";
import { measure as t } from "@/copy/test";
import { SCENE_FIELD, SHARED_INK, strongInk, weakInk, type Eye } from "@/engine";
import { TrueSize, devicePixels, useDraw, type Draw } from "./canvas";

/** The ink that reaches each eye: [left eye, right eye]. The cyan lens sits over `cyanEye`; the stronger eye's ink is at `contrast` of full light. */
export function eyeInks(cyanEye: Eye, contrast = 1, gamma?: number, swapped = false): [string, string] {
  /* `contrast` dims the stronger eye's ink: the red one the usual way, the cyan one when the weaker eye sees red */
  const cyan = weakInk(swapped ? contrast : 1, gamma), red = strongInk(swapped ? 1 : contrast, gamma);
  return cyanEye === "L" ? [cyan, red] : [red, cyan];
}

function field(g: CanvasRenderingContext2D, w: number, h: number) {
  g.globalCompositeOperation = "source-over";
  g.fillStyle = SCENE_FIELD;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "lighter";
}
function ring(g: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, ink: string) {
  g.strokeStyle = ink;
  g.lineWidth = width;
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  g.stroke();
}
function disc(g: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string) {
  g.fillStyle = ink;
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  g.fill();
}

/* ───────────── depth: four rings ───────────── */

export const DEPTH_RINGS = 4;
/** The ring is 1.5 cm across where the panel has room, and never under 0.6 cm. */
const RING_CM = 0.75, RING_MIN_CM = 0.3;
/** How far a ring's base position may be nudged, in device pixels, for an offset of `px`: a pixel or two, and at least half the offset. */
export const depthJitter = (px: number) => Math.max(2, Math.ceil(px / 2));

/** The room one ring has, in device pixels, in a panel `width` device pixels wide: the widest offset and the ring's radius. */
export function depthRoom(ppc: number, dpr: number, width: number) {
  const reach = width / DEPTH_RINGS / 2 - 3 * dpr;
  const least = RING_MIN_CM * ppc * dpr;
  return {
    /* the shifted copy and the nudge together move a ring by at most one whole offset */
    maxPx: Math.max(1, Math.floor(reach - least * 1.15)),
    radius: (largest: number) => Math.max(4, Math.round(Math.min(RING_CM * ppc * dpr, (reach - largest) / 1.15))),
  };
}

export interface DepthShow {
  /** Offset between the two copies of the target ring, in device pixels. */
  offset: number;
  /** Which ring floats nearer, 0 to 3 from the left. */
  target: number;
  /** Each ring's nudge from its base position, in device pixels. */
  nudge: [number, number][];
}

/**
 * Four rings, each drawn once for each eye. The target ring's copies are crossed (the left eye's copy sits to the right),
 * so it floats in front of the screen. Both inks are at full strength.
 */
export function DepthCanvas({ show, radius, cyanEye, onPick, onWidth }: {
  show: DepthShow | null; radius: number; cyanEye: Eye; onPick: (ring: number) => void; onWidth: (devicePx: number) => void;
}) {
  const draw = useCallback<Draw>((g, w, h) => {
    field(g, w, h);
    onWidth(w);
    if (!show) return;
    const [left, right] = eyeInks(cyanEye), cell = w / DEPTH_RINGS, line = Math.max(2, Math.round(radius / 5));
    for (let i = 0; i < DEPTH_RINGS; i++) {
      const x = Math.round(cell * (i + 0.5)) + show.nudge[i][0], y = Math.round(h / 2) + show.nudge[i][1];
      const offset = i === show.target ? show.offset : 0, toRight = Math.ceil(offset / 2);
      ring(g, x + toRight, y, radius, line, left);
      ring(g, x - (offset - toRight), y, radius, line, right);
    }
  }, [show, radius, cyanEye, onWidth]);
  return (
    <TrueSize>
      <canvas
        ref={useDraw(draw)} className="chart dark" role="img" aria-label={t.depth.label} style={{ cursor: "pointer", touchAction: "manipulation" }}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          onPick(Math.max(0, Math.min(DEPTH_RINGS - 1, Math.floor(((e.clientX - box.left) / box.width) * DEPTH_RINGS))));
        }}
      />
    </TrueSize>
  );
}

/* ───────────── fusion target ───────────── */

/**
 * Draws the fusion target on a canvas: a ring for each eye, `separation` device pixels apart and crossed, so the eyes
 * must turn in to keep one ring. The left eye's ring carries a dot at the top, the right eye's a dot at the bottom.
 * `inks` is [left eye, right eye].
 */
export function paintFusion(cv: HTMLCanvasElement, ppc: number, separation: number, inks: [string, string]) {
  const k = devicePixels();
  const w = Math.max(1, Math.round(cv.clientWidth * k)), h = Math.max(1, Math.round(cv.clientHeight * k));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d")!;
  field(g, w, h);
  /* 2 cm across where the panel has room; the copies never leave the panel at the widest separation */
  const r = Math.round(Math.min(ppc * k, w * 0.12, h * 0.36)), line = Math.max(3, Math.round(r * 0.16)), dot = Math.max(3, Math.round(r * 0.14));
  const x = Math.round(w / 2), y = Math.round(h / 2), toRight = Math.ceil(separation / 2);
  ring(g, x + toRight, y, r, line, inks[0]);
  disc(g, x + toRight, y - Math.round(r * 0.5), dot, inks[0]);
  ring(g, x - (separation - toRight), y, r, line, inks[1]);
  disc(g, x - (separation - toRight), y + Math.round(r * 0.5), dot, inks[1]);
}

/* ───────────── four dots ───────────── */

/** The whole group is about 6 cm across and each dot about 1 cm. */
const GROUP_CM = 6, DOT_SHARE = 1 / 6, PANEL_CM = 6.8;

/** One red dot at the top, a cyan dot on each side and a white dot at the bottom, at full strength on black. */
export function FourDotCanvas({ ppc }: { ppc: number }) {
  const draw = useCallback<Draw>((g, w, h) => {
    field(g, w, h);
    g.globalCompositeOperation = "source-over";
    const group = Math.min(GROUP_CM * ppc * devicePixels(), w * 0.9, h * 0.9), dot = (group * DOT_SHARE) / 2, reach = group / 2 - dot;
    const x = Math.round(w / 2), y = Math.round(h / 2);
    disc(g, x, y - reach, dot, strongInk(1));
    disc(g, x - reach, y, dot, weakInk(1));
    disc(g, x + reach, y, dot, weakInk(1));
    disc(g, x, y + reach, dot, SHARED_INK);
  }, [ppc]);
  const size: CSSProperties = { height: "auto", aspectRatio: "1", maxHeight: `${Math.round(PANEL_CM * ppc)}px` };
  return <TrueSize><canvas ref={useDraw(draw)} className="chart dark" style={size} role="img" aria-label={t.dots.label} /></TrueSize>;
}
