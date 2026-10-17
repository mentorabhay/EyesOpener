// Reads the site's pictures: the live one of a slot, and the bytes of one size. Server only.
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SlotId } from "./slots";

export interface LivePicture {
  id: string; slot: string; kind: string; alt: string; credit: string;
  focalX: number; focalY: number; width: number; height: number; widths: number[];
}

/** Every live picture, once per request, by slot. A database that cannot be read means no pictures, never a broken page. */
export const livePictures = cache(async (): Promise<Map<string, LivePicture>> => {
  try {
    const rows = await db.select({
      id: schema.sitePicture.id, slot: schema.sitePicture.slot, kind: schema.sitePicture.kind, alt: schema.sitePicture.alt,
      credit: schema.sitePicture.credit, focalX: schema.sitePicture.focalX, focalY: schema.sitePicture.focalY,
      width: schema.sitePicture.width, height: schema.sitePicture.height, w: schema.sitePictureFile.width,
    }).from(schema.sitePicture)
      .innerJoin(schema.sitePictureFile, eq(schema.sitePictureFile.pictureId, schema.sitePicture.id))
      .where(eq(schema.sitePicture.status, "live"));
    const out = new Map<string, LivePicture>();
    for (const r of rows) {
      const { w, ...p } = r;
      const have = out.get(p.slot);
      if (have) have.widths.push(w); else out.set(p.slot, { ...p, widths: [w] });
    }
    for (const p of out.values()) p.widths.sort((a, b) => a - b);
    return out;
  } catch (err) {
    console.warn(`site pictures: ${err instanceof Error ? err.message : String(err)}`);
    return new Map();
  }
});

export const livePicture = async (slot: SlotId) => (await livePictures()).get(slot) ?? null;

/** One size of one picture, with its status, or null. */
export async function pictureFile(id: string, width: number) {
  const [row] = await db.select({ data: schema.sitePictureFile.data, mime: schema.sitePictureFile.mime, status: schema.sitePicture.status })
    .from(schema.sitePictureFile)
    .innerJoin(schema.sitePicture, eq(schema.sitePicture.id, schema.sitePictureFile.pictureId))
    .where(and(eq(schema.sitePictureFile.pictureId, id), eq(schema.sitePictureFile.width, width))).limit(1);
  return row ?? null;
}
