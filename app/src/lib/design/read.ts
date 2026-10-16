/**
 * Server only. The stored value lives in the `setting` table under DESIGN_KEY (no migration needed). Anything
 * missing, unreadable or below the contrast floor gives the defaults, and a database that cannot be reached
 * never stops a page from drawing: the page simply uses the defaults.
 */
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/db";
import { DEFAULT_DESIGN, DESIGN_KEY, type Design, contrastProblems, designSchema, parseDesign } from "./config";

export const readDesign = cache(async (): Promise<Design> => {
  try {
    const [row] = await db.select().from(schema.setting).where(eq(schema.setting.key, DESIGN_KEY)).limit(1);
    return row ? parseDesign(row.value) : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
});

export type SaveDesignResult = { ok: true; design: Design } | { ok: false; why: "shape"; issues: string[] } | { ok: false; why: "contrast"; problems: ReturnType<typeof contrastProblems> };

/** Saves a design only when it passes the schema and the contrast floor. The caller writes the audit line. */
export async function writeDesign(value: unknown): Promise<SaveDesignResult> {
  const parsed = designSchema.safeParse(value);
  if (!parsed.success) return { ok: false, why: "shape", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const problems = contrastProblems(parsed.data);
  if (problems.length) return { ok: false, why: "contrast", problems };
  const updatedAt = new Date();
  await db.insert(schema.setting).values({ key: DESIGN_KEY, value: parsed.data, updatedAt })
    .onConflictDoUpdate({ target: schema.setting.key, set: { value: parsed.data, updatedAt } });
  return { ok: true, design: parsed.data };
}

/** Back to the defaults: the stored row is removed, so a later change to the defaults reaches this site too. */
export async function resetDesign(): Promise<void> {
  await db.delete(schema.setting).where(eq(schema.setting.key, DESIGN_KEY));
}
