/**
 * Removing a deleted person from Firebase Authentication.
 *
 * When a household is deleted (src/lib/data/erase.ts), the people who signed in only for it are deleted too.
 * Their sign-in accounts at Firebase must go as well. That is done in two steps, so that deleting a family's data
 * never waits on another service:
 *
 *   1. `queueRemoval`, inside the same transaction as the deletion, writes the Firebase id of each person who is
 *      about to go into `signin_removal`. If the deletion is rolled back, so is this.
 *   2. `removeQueued`, right after the deletions in the same run of the daily job, asks Firebase to delete each
 *      queued account and removes the row once Firebase confirms (or says the account is already gone).
 *      An account that could not be removed stays queued and is tried again by the next run.
 *
 * The server asks as the service account it runs as: the access token comes from Google Cloud's metadata server.
 * No key file is read, ever. Where there is no such server (a developer's machine) nothing is removed, the queue
 * is left as it is, and the job's result says so.
 *
 * With sign-in not set up there is no Firebase project to remove anyone from, so nothing is queued.
 * The service account needs the role "Firebase Authentication Admin" (docs/SIGN-IN.md).
 */
import { asc, eq, inArray, isNotNull, and, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { signInSettings, type SignInSettings } from "./settings";
import { deleteAccount, serviceToken } from "./toolkit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Queues the Firebase accounts of these people for removal. Call it before their rows are deleted, in the same transaction. */
export async function queueRemoval(tx: Tx, userIds: readonly string[], settings: SignInSettings | null = signInSettings()): Promise<number> {
  if (!settings || !userIds.length) return 0;
  const people = await tx.select({ uid: schema.appUser.firebaseUid }).from(schema.appUser)
    .where(and(inArray(schema.appUser.id, [...userIds]), isNotNull(schema.appUser.firebaseUid)));
  const uids = people.map((p) => p.uid).filter((u): u is string => !!u);
  if (!uids.length) return 0;
  await tx.insert(schema.signinRemoval).values(uids.map((uid) => ({ uid }))).onConflictDoNothing();
  return uids.length;
}

export interface RemovalResult {
  /** Accounts Firebase removed, or that were already gone there. */
  removed: number;
  /** Accounts still queued after this run. */
  left: number;
  /** Why some were left, in plain words. Empty when none were. */
  note: string;
}

const AT_ONCE = 200;
/** Firebase allows ten deletions a second. This keeps well under it. */
const PAUSE_MS = 150;

export const REMOVAL_NOTES = {
  notSetUp: "Sign-in is not set up, so there is no sign-in service to remove anyone from.",
  noIdentity: "This server does not run as a Google service account (a developer's machine), so no sign-in account was removed. They stay queued.",
  notAllowed: "The service account may not delete sign-in accounts. Give it the role Firebase Authentication Admin. They stay queued.",
  failed: "The sign-in service did not confirm every removal. The rest stay queued for the next run.",
} as const;

/** Removes queued accounts from Firebase. Safe to run twice: an account that is already gone counts as removed. */
export async function removeQueued(now = new Date(), settings: SignInSettings | null = signInSettings(), pauseMs = PAUSE_MS): Promise<RemovalResult> {
  const count = async () => (await db.select({ n: sql<number>`count(*)::int` }).from(schema.signinRemoval))[0].n;
  const queued = await db.select({ uid: schema.signinRemoval.uid }).from(schema.signinRemoval).orderBy(asc(schema.signinRemoval.queuedAt)).limit(AT_ONCE);
  if (!queued.length) return { removed: 0, left: 0, note: "" };
  if (!settings) return { removed: 0, left: await count(), note: REMOVAL_NOTES.notSetUp };
  const token = await serviceToken(settings.endpoints);
  if (!token) return { removed: 0, left: await count(), note: REMOVAL_NOTES.noIdentity };

  let removed = 0, note = "";
  for (const { uid } of queued) {
    /* Someone who signed in again after their family was deleted is a person here once more: their account stays. */
    const [back] = await db.select({ id: schema.appUser.id }).from(schema.appUser).where(eq(schema.appUser.firebaseUid, uid)).limit(1);
    if (back) { await db.delete(schema.signinRemoval).where(eq(schema.signinRemoval.uid, uid)); continue; }
    const out = await deleteAccount(settings, uid, token);
    if (out === "removed" || out === "gone") {
      await db.delete(schema.signinRemoval).where(eq(schema.signinRemoval.uid, uid));
      removed++;
    } else {
      await db.update(schema.signinRemoval).set({ tries: sql`${schema.signinRemoval.tries} + 1`, lastTryAt: now }).where(eq(schema.signinRemoval.uid, uid));
      note = out === "not_allowed" ? REMOVAL_NOTES.notAllowed : REMOVAL_NOTES.failed;
      /* Not allowed is the same answer for every account: stop asking. */
      if (out === "not_allowed") break;
    }
    if (pauseMs) await new Promise((r) => setTimeout(r, pauseMs));
  }
  return { removed, left: await count(), note };
}
