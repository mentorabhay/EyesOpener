/**
 * Demo rows for the weekly plan. Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/programme.ts
 * Every number here is sample data for development, not a measurement.
 *
 * What it does: gives Aarav's programme a start date that agrees with the week the main seed wrote on it.
 * The week of a programme is counted on the calendar from its start day. The main seed writes "week 6" on a row
 * that starts today, so the first visit to Today would set it back to week 1. This moves the start back to five
 * weeks and four days ago: today is then day 5 of week 6, the six seeded weekly check-ups fall one in each week,
 * and the seeded last seven days show a full day, the week's rest day, two full days and today partly done.
 * It adds no rows. A row whose start already agrees with its week is left alone.
 */
import "../env";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { weekOn } from "../../src/lib/programme-rules";
import { todayKey } from "../../src/lib/session";

const DAY_MS = 86_400_000;
/** Today is this day of the programme week (1 to 7). */
const DAY_OF_WEEK = 5;

export async function seedProgramme() {
  const now = new Date();
  const rows = await db.select({ id: s.enrolment.id, week: s.enrolment.week, startedAt: s.enrolment.startedAt })
    .from(s.enrolment).innerJoin(s.profile, eq(s.profile.id, s.enrolment.profileId)).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.account.isDemo, true), eq(s.profile.displayName, "Aarav"), eq(s.enrolment.status, "active"), eq(s.enrolment.programme, "lazy-eye")));
  if (!rows.length) { console.log("Programme: Aarav has no active lazy-eye programme. Run the main seed first."); return; }
  let moved = 0;
  for (const e of rows) {
    /* only a row that claims a later week than its start date allows: the mark of a freshly seeded row */
    if (weekOn(todayKey(e.startedAt), todayKey(now)) >= e.week) continue;
    const startedAt = new Date(now.getTime() - ((e.week - 1) * 7 + DAY_OF_WEEK - 1) * DAY_MS);
    await db.update(s.enrolment).set({ startedAt }).where(eq(s.enrolment.id, e.id));
    moved += 1;
  }
  console.log(`Programme: ${moved ? "moved the start of Aarav's programme to match its week" : "Aarav's programme start already matches its week"}.`);
}

if (/scripts[\\/]seed[\\/]programme\.ts$/.test(process.argv[1] ?? "")) seedProgramme().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
