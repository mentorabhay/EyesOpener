// The database keeps one live picture per slot, and the reader joins each picture's sizes.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { livePictures, pictureFile } from "./read";

const made: string[] = [];
const row = (status: string) => ({ slot: "home-tv", status, kind: "photo", alt: "A family watching television", width: 1600, height: 900 });

describe("site pictures in the database", () => {
  beforeAll(async () => {
    await db.delete(schema.sitePicture).where(inArray(schema.sitePicture.slot, ["home-tv"]));
  });
  afterAll(async () => { if (made.length) await db.delete(schema.sitePicture).where(inArray(schema.sitePicture.id, made)); });

  it("refuses a second live picture for the same slot", async () => {
    const [a] = await db.insert(schema.sitePicture).values(row("live")).returning({ id: schema.sitePicture.id });
    made.push(a.id);
    await expect(db.insert(schema.sitePicture).values(row("live"))).rejects.toThrow();
    const [b] = await db.insert(schema.sitePicture).values(row("retired")).returning({ id: schema.sitePicture.id });
    made.push(b.id);
  });

  it("reads the live picture with its sizes, smallest first, and serves its bytes", async () => {
    const id = made[0];
    await db.insert(schema.sitePictureFile).values([
      { pictureId: id, width: 1280, mime: "image/webp", data: Buffer.from([2]) },
      { pictureId: id, width: 640, mime: "image/webp", data: Buffer.from([1]) },
    ]);
    const live = (await livePictures()).get("home-tv");
    expect(live?.id).toBe(id);
    expect(live?.widths).toEqual([640, 1280]);
    const f = await pictureFile(id, 640);
    expect(f?.status).toBe("live");
    expect([...f!.data]).toEqual([1]);
    expect(await pictureFile(id, 1920)).toBeNull();
  });
});
