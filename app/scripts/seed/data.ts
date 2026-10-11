// Eyes Opener: Demo rows for data requests, so the staff room has something in each state that is safe to show.
/**
 * Demo rows for data requests, so the staff room has something in each state that is safe to show.
 * Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/data.ts
 *
 * What it adds, each to a sample household that has no request yet:
 * - "Sample household 1": a copy that is ready and not downloaded.
 * - "Sample household 2": a copy that was downloaded yesterday.
 * - "Sample household 3": a deletion that the family cancelled.
 * The main seed already gives "Community sample" a copy that was asked for and is not ready: the daily job makes it ready.
 *
 * What it leaves out on purpose:
 * - A deletion that is still waiting. The daily job would carry it out a week later and remove a sample household
 *   for good. To see that state, ask for a deletion as the demo guardian: the demo family is never deleted.
 * - A line saying a household was deleted. That line is written only when a deletion really ran.
 */
import "../env";
import { eq } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { addDays, COPY_DAYS, WAIT_DAYS } from "../../src/lib/data/state";

export async function seedData() {
  const now = new Date();
  const rows: Record<string, (accountId: string, askedBy: string | null) => typeof s.dataRequest.$inferInsert> = {
    "Sample household 1": (accountId, askedBy) => ({ accountId, askedBy, kind: "export", status: "ready", createdAt: addDays(now, -1), readyAt: addDays(now, -1), expiresAt: addDays(now, COPY_DAYS - 1) }),
    "Sample household 2": (accountId, askedBy) => ({ accountId, askedBy, kind: "export", status: "ready", createdAt: addDays(now, -2), readyAt: addDays(now, -2), expiresAt: addDays(now, COPY_DAYS - 2), downloadedAt: addDays(now, -1) }),
    "Sample household 3": (accountId, askedBy) => ({ accountId, askedBy, kind: "delete", status: "cancelled", scope: "household", createdAt: addDays(now, -3), deleteAfter: addDays(now, WAIT_DAYS - 3), cancelledAt: addDays(now, -2) }),
  };
  let added = 0;
  for (const [name, make] of Object.entries(rows)) {
    const [home] = await db.select({ id: s.account.id }).from(s.account).where(eq(s.account.displayName, name)).limit(1);
    if (!home) continue;
    const [has] = await db.select({ id: s.dataRequest.id }).from(s.dataRequest).where(eq(s.dataRequest.accountId, home.id)).limit(1);
    if (has) continue;
    const [guardian] = await db.select({ id: s.appUser.id }).from(s.appUser).where(eq(s.appUser.accountId, home.id)).limit(1);
    await db.insert(s.dataRequest).values(make(home.id, guardian?.id ?? null));
    added++;
  }
  console.log(`Data requests: ${added} added.`);
}

if (/scripts[\\/]seed[\\/]data\.ts$/.test(process.argv[1] ?? "")) seedData().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
