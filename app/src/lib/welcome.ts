/**
 * A new household's first steps on the Today page (Ved, 18 October 2026: a new household landed on an empty Today):
 * add who will use the app, set up the screen and glasses, do a first check-up. Shown to a grown-up who manages the
 * family, on a profile that has not practised yet, until setup and a first check-up are both done. Never in child mode
 * or in a staff test household. Server only.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Member } from "@/lib/session";
import { setupOf } from "@/lib/setup";

export interface Welcome { people: boolean; setup: boolean; check: boolean }

export async function welcomeOf(m: Member): Promise<Welcome | null> {
  if (m.childMode || m.tester || !m.can("manage_family")) return null;
  const [[played], [checked], setup] = await Promise.all([
    db.select({ id: schema.session.id }).from(schema.session).where(eq(schema.session.profileId, m.profile.id)).limit(1),
    db.select({ id: schema.testResult.id }).from(schema.testResult).where(eq(schema.testResult.profileId, m.profile.id)).limit(1),
    setupOf(m),
  ]);
  const w = { people: m.profiles.length > 1, setup: setup.ready, check: !!checked };
  return played || (w.setup && w.check) ? null : w;
}
