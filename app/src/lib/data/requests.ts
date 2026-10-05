/**
 * Data requests: asking for a copy, asking for deletion, cancelling, and the daily work on them.
 *
 * Who may do what is decided here, on the server, every time:
 *  - Only a guardian or co-guardian may ask, download or cancel (`m.can("data")`). A cheer seat may not, and nothing
 *    here works while the device is in child mode.
 *  - Every query is tied to the signed-in person's own household. No id from the browser picks a household.
 *
 * How a request moves is in state.ts. In short:
 *  - A copy is ready the moment it is asked for and can be downloaded for COPY_DAYS days. No file is stored (export.ts).
 *  - A deletion waits WAIT_DAYS days. A guardian can cancel until the daily job has carried it out.
 *
 * Two kinds of household need their own rule:
 *  - The demo family is shared by every visitor of the public demo. Its requests can be made and cancelled so the
 *    screens can be tried, and a copy can be downloaded, but it is never deleted: when the day comes the job closes
 *    the request instead.
 *  - A staff member's test household is treated like any household. A copy holds what the tester made; a deletion
 *    removes the test household, and the tester (who is not one of its people) keeps their sign-in and gets a new,
 *    empty one the next time they open the member app. It is marked in the staff room and counted apart.
 */
import { and, desc, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { JobResult } from "@/lib/jobs";
import type { Member } from "@/lib/session";
import { removeQueued, REMOVAL_NOTES } from "@/lib/signin/removal";
import { eraseHousehold, eraseProfile } from "./erase";
import { addDays, canDeleteProfile, canDownload, COPY_DAYS, isLive, stepFor, WAIT_DAYS } from "./state";

const R = schema.dataRequest;
export type DataRequest = typeof R.$inferSelect;
export type AskResult = { ok: true; request: DataRequest } | { ok: false; why: "not_allowed" | "not_yours" | "already" | "last_one" | "all_going" | "not_found" };

/** Audit lines that say a deletion ran. They hold counts only. */
export const DELETED_HOUSEHOLD = "data.household_deleted";
export const DELETED_PROFILE = "data.profile_deleted";
export const JOB_NAME = "data-requests";

/* ───────────── the family's side ───────────── */

/** The household's requests, newest first, each with the name of the profile it is about and of the person who asked. */
export async function familyRequests(m: Member) {
  return db.select({ request: R, profileName: schema.profile.displayName, askedByName: schema.appUser.displayName })
    .from(R).leftJoin(schema.profile, eq(schema.profile.id, R.profileId)).leftJoin(schema.appUser, eq(schema.appUser.id, R.askedBy))
    .where(eq(R.accountId, m.account.id)).orderBy(desc(R.createdAt)).limit(40);
}

/** Holds the household's row for the length of a transaction, so two requests made at once are handled one after the other. */
const hold = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0], accountId: string) =>
  tx.select({ id: schema.account.id }).from(schema.account).where(eq(schema.account.id, accountId)).for("update");

/** Makes a copy ready. If one is still open for download, that one is the answer. */
export async function askForCopy(m: Member, now = new Date()): Promise<AskResult> {
  if (!m.can("data")) return { ok: false, why: "not_allowed" };
  return db.transaction(async (tx) => {
    await hold(tx, m.account.id);
    const open = await tx.select().from(R).where(and(eq(R.accountId, m.account.id), eq(R.kind, "export"), inArray(R.status, ["open", "ready"])));
    const ready = open.find((r) => canDownload(r, now));
    if (ready) return { ok: true as const, request: ready };
    /* An older request that was never made ready, or whose days ran out, is closed: the new one replaces it. */
    if (open.length) await tx.update(R).set({ status: "done", doneAt: now }).where(inArray(R.id, open.map((r) => r.id)));
    const [request] = await tx.insert(R).values({
      accountId: m.account.id, kind: "export", status: "ready", askedBy: m.user.id, createdAt: now, readyAt: now, expiresAt: addDays(now, COPY_DAYS),
    }).returning();
    return { ok: true as const, request };
  });
}

/** The copy this guardian may download right now, or null. Checked again at the moment of every download. */
export async function copyToDownload(m: Member, now = new Date()): Promise<DataRequest | null> {
  if (!m.can("data")) return null;
  const rows = await db.select().from(R).where(and(eq(R.accountId, m.account.id), eq(R.kind, "export"), eq(R.status, "ready"))).orderBy(desc(R.createdAt));
  return rows.find((r) => canDownload(r, now)) ?? null;
}

export async function markDownloaded(requestId: string, now = new Date()) {
  await db.update(R).set({ downloadedAt: now }).where(eq(R.id, requestId));
}

/**
 * Asks for the household, or one profile of it, to be deleted when the waiting time is over.
 * One deletion of the household at a time; one per profile; never the last profile a household can open.
 */
export async function askForDeletion(m: Member, what: { scope: "household" } | { scope: "profile"; profileId: string }, now = new Date()): Promise<AskResult> {
  if (!m.can("data")) return { ok: false, why: "not_allowed" };
  return db.transaction(async (tx) => {
    await hold(tx, m.account.id);
    const waiting = (await tx.select().from(R).where(and(eq(R.accountId, m.account.id), eq(R.kind, "delete"), eq(R.status, "open")))).filter((r) => isLive(r, now));
    const all = waiting.find((r) => r.scope === "household");
    if (what.scope === "household") {
      if (all) return { ok: false as const, why: "already" as const };
    } else {
      if (all) return { ok: false as const, why: "all_going" as const };
      const leaving = waiting.map((r) => r.profileId).filter((id): id is string => !!id);
      const can = canDeleteProfile(m.profiles.map((p) => p.id), leaving, what.profileId);
      if (can !== "ok") return { ok: false as const, why: can };
    }
    const [request] = await tx.insert(R).values({
      accountId: m.account.id, kind: "delete", status: "open", scope: what.scope, profileId: what.scope === "profile" ? what.profileId : null,
      askedBy: m.user.id, createdAt: now, deleteAfter: addDays(now, WAIT_DAYS),
    }).returning();
    return { ok: true as const, request };
  });
}

/** Cancels a deletion of this household that has not happened yet. */
export async function cancelDeletion(m: Member, requestId: string, now = new Date()): Promise<AskResult> {
  if (!m.can("data")) return { ok: false, why: "not_allowed" };
  /* The job holds the row while it deletes, so this either lands before the deletion or finds nothing left to cancel. */
  const [request] = await db.update(R).set({ status: "cancelled", cancelledAt: now })
    .where(and(eq(R.id, requestId), eq(R.accountId, m.account.id), eq(R.kind, "delete"), eq(R.status, "open"))).returning();
  return request ? { ok: true, request } : { ok: false, why: "not_found" };
}

/* ───────────── the daily job ───────────── */

export type Outcome = "household" | "profile" | "kept" | "skipped";

/**
 * Carries out one deletion whose waiting time is over, in one transaction: the rows go, the audit line with counts
 * is written, and the request is settled. If anything fails, nothing is deleted.
 */
export async function carryOut(requestId: string, now = new Date()): Promise<Outcome> {
  return db.transaction(async (tx) => {
    /* Hold the request: a guardian's cancel waits for this to finish, or has already landed. */
    const [r] = await tx.select().from(R).where(eq(R.id, requestId)).for("update");
    if (!r || stepFor(r, now) !== "delete") return "skipped";
    const keep = () => tx.update(R).set({ status: "cancelled", cancelledAt: now }).where(eq(R.id, r.id));

    if (r.scope === "profile") {
      /* The profile is already gone: nothing is left to do but close the request. */
      if (!r.profileId) { await tx.update(R).set({ status: "done", doneAt: now }).where(eq(R.id, r.id)); return "skipped"; }
      const out = await eraseProfile(tx, r.profileId);
      if (!out.ok) { await keep(); return "kept"; }
      await tx.update(R).set({ status: "done", doneAt: now }).where(eq(R.id, r.id));
      await tx.insert(schema.auditLog).values({ userId: null, action: DELETED_PROFILE, target: null, createdAt: now, meta: { rows: out.rows, testHousehold: out.testHousehold } });
      return "profile";
    }
    const out = await eraseHousehold(tx, r.accountId);
    if (!out.ok) { if (out.why !== "missing") await keep(); return "kept"; }
    await tx.insert(schema.auditLog).values({
      userId: null, action: DELETED_HOUSEHOLD, target: null, createdAt: now,
      meta: { profiles: out.profiles, people: out.people, peopleKept: out.peopleKept, rows: out.rows, testHousehold: out.testHousehold },
    });
    return "household";
  });
}

/**
 * The daily work. Safe to run twice: each step looks for what is due and does only that.
 *  1. A copy that was asked for and never made ready (a row from before this job existed) becomes ready.
 *  2. A copy whose days ran out is closed.
 *  3. A deletion with no date gets one, WAIT_DAYS from now: the family was never shown a date, so the wait starts today.
 *  4. Every deletion whose waiting time is over is carried out, each in its own transaction, so one failure stops only itself.
 *  5. The sign-in accounts of the people those deletions removed are removed from Firebase Authentication.
 */
export async function runDataRequests(now = new Date()): Promise<JobResult> {
  const counts = { copiesReady: 0, copiesClosed: 0, datesSet: 0, householdsDeleted: 0, profilesDeleted: 0, kept: 0, failed: 0 };
  counts.copiesReady = (await db.update(R).set({ status: "ready", readyAt: now, expiresAt: addDays(now, COPY_DAYS) })
    .where(and(eq(R.kind, "export"), eq(R.status, "open"))).returning({ id: R.id })).length;
  counts.copiesClosed = (await db.update(R).set({ status: "done", doneAt: now })
    .where(and(eq(R.kind, "export"), eq(R.status, "ready"), or(isNull(R.expiresAt), lte(R.expiresAt, now)))).returning({ id: R.id })).length;
  counts.datesSet = (await db.update(R).set({ deleteAfter: addDays(now, WAIT_DAYS) })
    .where(and(eq(R.kind, "delete"), eq(R.status, "open"), isNull(R.deleteAfter))).returning({ id: R.id })).length;

  const due = await db.select({ id: R.id }).from(R)
    .where(and(eq(R.kind, "delete"), eq(R.status, "open"), isNotNull(R.deleteAfter), lte(R.deleteAfter, now))).orderBy(R.deleteAfter);
  for (const { id } of due) {
    try {
      const out = await carryOut(id, now);
      if (out === "household") counts.householdsDeleted++;
      else if (out === "profile") counts.profilesDeleted++;
      else if (out === "kept") counts.kept++;
    } catch { counts.failed++; }
  }
  /* The people who were deleted are removed from the sign-in service too, in this same run. What cannot be removed now stays queued. */
  const signIns = await removeQueued(now);
  const all = { ...counts, signInsRemoved: signIns.removed, signInsLeft: signIns.left };
  const notes = [counts.failed ? "A deletion failed and was left as it was. Nothing of it was removed." : "", signIns.note].filter(Boolean);
  /* A developer's machine has no service account: leaving the queue there is expected, and not a failure. */
  const ok = counts.failed === 0 && (signIns.left === 0 || signIns.note === REMOVAL_NOTES.noIdentity || signIns.note === REMOVAL_NOTES.notSetUp);
  return { ok, note: notes.join(" ") || "done", counts: all };
}

/* ───────────── the staff room ───────────── */

/**
 * What staff see: where each request stands, by household name. Never a profile's name, and never anything a copy
 * holds. Requests still running, and those settled in the last 90 days. A household that was deleted has no row left;
 * it shows up only as a count in `deleted`.
 */
export async function staffRequests(now = new Date()) {
  const since = addDays(now, -90);
  const [rows, deleted, [lastRun]] = await Promise.all([
    db.select({ request: R, household: schema.account.displayName, isDemo: schema.account.isDemo, previewFor: schema.account.previewFor })
      .from(R).innerJoin(schema.account, eq(schema.account.id, R.accountId))
      .where(or(inArray(R.status, ["open", "ready"]), gte(R.createdAt, since))).orderBy(desc(R.createdAt)).limit(300),
    db.select({ id: schema.auditLog.id, action: schema.auditLog.action, meta: schema.auditLog.meta, at: schema.auditLog.createdAt }).from(schema.auditLog)
      .where(and(inArray(schema.auditLog.action, [DELETED_HOUSEHOLD, DELETED_PROFILE]), gte(schema.auditLog.createdAt, since))).orderBy(desc(schema.auditLog.createdAt)).limit(200),
    db.select({ at: schema.auditLog.createdAt, meta: schema.auditLog.meta, who: schema.appUser.displayName }).from(schema.auditLog)
      .leftJoin(schema.appUser, eq(schema.appUser.id, schema.auditLog.userId))
      .where(eq(schema.auditLog.action, `job.${JOB_NAME}`)).orderBy(desc(schema.auditLog.createdAt)).limit(1),
  ]);
  return {
    rows: rows.map((r) => ({ ...r.request, household: r.household, isDemo: r.isDemo, testHousehold: !!r.previewFor })),
    deleted,
    lastRun: lastRun ?? null,
  };
}
