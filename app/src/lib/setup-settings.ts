// Eyes Opener: The two settings staff hold for setup (the Screens and glasses room, /admin/screens): whether two-eye items wait until.
/**
 * The two settings staff hold for setup (the Screens and glasses room, /admin/screens): whether two-eye items wait until
 * a person's setup is done, and the mixer's two starting points besides "As usual". Stored in the `setting` table and
 * read once per request. Server only.
 */
import { inArray } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";
import { db, schema } from "@/db";
import { mixKeepsEnough } from "@/engine";

export const GATE_KEY = "setup_gate";
export const PRESETS_KEY = "mixer_presets";

const mix = z.object({ green: z.number().min(0).max(1), blue: z.number().min(0).max(1) }).refine((m) => mixKeepsEnough(m.green, m.blue));
export const presetsSchema = z.object({ lessBlue: mix, lessGreen: mix });
export type Presets = z.infer<typeof presetsSchema>;
export const DEFAULT_PRESETS: Presets = { lessBlue: { green: 1, blue: 0 }, lessGreen: { green: 0.5, blue: 1 } };

/** The gate is on unless staff turned it off; a stored mix under the floor is read as the default. */
export const readSetupSettings = cache(async () => {
  const rows = await db.select().from(schema.setting).where(inArray(schema.setting.key, [GATE_KEY, PRESETS_KEY]));
  const gate = rows.find((r) => r.key === GATE_KEY), presets = rows.find((r) => r.key === PRESETS_KEY);
  return {
    gate: gate?.value !== false, gateAt: gate?.updatedAt ?? null,
    presets: presetsSchema.catch(DEFAULT_PRESETS).parse(presets?.value ?? DEFAULT_PRESETS), presetsAt: presets?.updatedAt ?? null,
  };
});

export async function writeSetupSetting(key: typeof GATE_KEY | typeof PRESETS_KEY, value: boolean | Presets) {
  const updatedAt = new Date();
  await db.insert(schema.setting).values({ key, value, updatedAt }).onConflictDoUpdate({ target: schema.setting.key, set: { value, updatedAt } });
}
