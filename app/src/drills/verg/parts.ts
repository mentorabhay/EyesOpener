/**
 * Parts the vergence drills share: where things sit in the scene, the line that says what to do, the
 * "Seeing two?" row, a progress bar and the rounding of what is reported.
 * The demand itself is never handled here: every drill uses the helpers in `@/games/vergence`.
 *
 * The scene, top to bottom: the numbers (`k.hud`), one line that says what to do now, the fusion target,
 * a thin bar where a drill times a hold, and the row with the question "Seeing two?" and the split spot.
 * Everything here is drawn in `both` ink: it is the same for the two eyes and holds them together.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type Kit } from "@/games/kit";
import { band, size } from "@/games/verg/parts";
import { drawSplit, spot } from "@/games/vergence";

/** A demand as it is reported: one decimal, cut and never rounded up, so it cannot pass a limit it stayed under. */
export const pd = (v: number) => Math.floor(Math.abs(v) * 10 + 1e-6) / 10;
/** One decimal, for a rate or an average. */
export const tenth = (v: number) => Math.round(v * 10) / 10;
/** Whole seconds completed. */
export const whole = (sec: number) => Math.floor(sec + 1e-6);

/** How wide a line is at a size, in scene units. A surface that cannot measure (a test) answers 0. */
export function wide(k: Kit, s: string, px: number) {
  const g = k.ctx("both");
  g.font = `700 ${px}px Verdana, sans-serif`;
  return g.measureText(s)?.width ?? 0;
}

/** The size at which a line fits `room`: `px` when it fits, smaller when it does not. */
export function fit(k: Kit, s: string, px: number, room: number) {
  const w = wide(k, s, px);
  return w > room ? (px * room) / w : px;
}

/** From this letter size on, the numbers line is shrunk so far that the instruction fits above it better than under it. */
const ABOVE = 72;

/** Where things sit. `top` to `bottom` is the room for the fusion target; `r` is the ring that fits it. */
export interface Plan { cueY: number; cueSize: number; top: number; bottom: number; mid: number; tall: number; r: number; barY: number; barH: number }

/**
 * Lays the scene out for this member's letter size and screen. Pass `timed` for a drill that draws the bar.
 *
 * The instruction sits under the numbers. With very large letters on a small screen that leaves no room: the kit
 * then shrinks the numbers line to fit the width but keeps it where it was, which frees the strip above it, so
 * the instruction goes there and the target keeps the whole of the play strip.
 */
export function plan(k: Kit, timed = false): Plan {
  const b = band(k), above = k.letter >= ABOVE, free = k.letter - 35;
  const cueSize = above ? Math.min(k.letter, free / 1.25) : Math.min(k.letter, b.tall * 0.3);
  const cueY = above ? 14 + (free + cueSize * 0.7) / 2 : b.top + cueSize * 0.9;
  const barH = timed ? Math.max(6, Math.min(10, 4 * k.k)) : 0, barY = b.bottom - barH;
  const top = above ? Math.max(b.top, 30 + k.letter) : cueY + cueSize * 0.5;
  const bottom = Math.max(top + 16, timed ? barY - 8 : b.bottom), tall = bottom - top;
  return { cueY, cueSize, top, bottom, mid: top + tall / 2, tall, r: size(k, 60, tall / 2 - 4), barY, barH };
}

/** The one line that says what to do now, centred under the numbers and shrunk to fit the scene. */
export function cue(k: Kit, p: Plan, s: string) {
  k.text(s, W / 2, p.cueY, "both", fit(k, s, p.cueSize, W - 44), "center");
}

/** The bottom row: the question "Seeing two?" and, beside it, the spot to tap when the answer is yes. */
export function ask(k: Kit) {
  const s = spot(k), room = s.x - 12 - 22;
  if (room > 60) k.text(t.ask, s.x - 12, s.y + s.h / 2 + k.letter * 0.32, "both", fit(k, t.ask, k.letter * 0.8, room), "right");
  drawSplit(k, t.split);
}

/** A thin bar that fills from the left: `share` is 0 to 1. Only for a `plan(k, true)`. */
export function bar(k: Kit, p: Plan, share: number) {
  /* Where very large letters make the split spot reach up past the bar, the bar stops short of it. */
  const sp = spot(k), x = 22, w = (sp.y < p.barY + p.barH ? sp.x - 12 : W - 22) - x, f = Math.max(0, Math.min(1, share));
  k.box(x, p.barY, w, p.barH, "both", false, 2);
  if (f > 0) k.box(x, p.barY, w * f, p.barH, "both");
}

/** Seconds as the numbers line shows them: "45 s". The same unit the record keeps. */
export const span = (sec: number) => `${sec} ${t.s}`;
