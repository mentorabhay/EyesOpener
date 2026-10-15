/**
 * The steps a clip shows before it starts, by how its template is set. Words only: src/copy/clips.ts.
 * A "look and answer" clip carries its own steps (src/data/clips/looks.ts). The near point check and the surveys
 * explain themselves on their own screen part.
 */
import { clips as c } from "@/copy/clips";
import type { OfferedClip } from "@/data/clips";

export function stepsOf(def: OfferedClip): readonly string[] {
  const p = def.play, h = c.how;
  switch (p.template) {
    case "look": case "survey": return [];
    case "count": return h.count;
    case "match": return h.match;
    case "measure": return h[p.kind];
    case "camera": return p.kind === "scale" ? h.scale : h.camera;
    case "auto": return h[p.kind];
    case "choose": return h[p.kind];
    case "spots": return h[p.kind];
    case "pick": return h[p.kind];
    case "split": return p.mode === "recover" ? h.recover : h.split;
    case "hold": return h[p.kind];
    case "align": return p.lock ? h.alignLock : p.axis === "v" ? h.alignV : h.align;
    case "grid": return h.grid;
    case "find": return h[p.kind];
    case "read": return h.read;
  }
}
