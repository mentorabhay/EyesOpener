// Eyes Opener: Queries and writes for the admin console. Server only.
/**
 * Queries and writes for the admin console. Server only.
 * This file holds no gate: every page and every Server Action calls `requireStaff(room)` first, then audits its write.
 *
 * Privacy: nothing here reads a test result, an eye profile or the detail of a session.
 * Sessions are counted and their start time is used for "last activity"; that is all staff see.
 */
import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNotNull, isNull, max, or, sql, sum } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { edition } from "@/edition";
import { decideGathering, gatheringSubjects, gatheringText, isGatheringKind, subjectKey, type GatheringSubject } from "@/lib/gatherings-review";
import { resolveStaffRole, staffAreas, type AdminArea, type StaffRole } from "@/lib/roles";

const DAY = 86_400_000;
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
/** Midnight at the start of today, India time. */
export const startOfToday = (now = new Date()) => new Date(`${dayKey(now)}T00:00:00+05:30`);
/** Midnight at the start of this calendar month, India time. */
export const startOfMonth = (now = new Date()) => new Date(`${dayKey(now).slice(0, 7)}-01T00:00:00+05:30`);

const one = async (q: PromiseLike<{ n: number | null }[]>) => Number((await q)[0]?.n ?? 0);
const tally = <K extends string>(rows: { key: K | null; n: number }[]) => new Map(rows.filter((r) => r.key !== null).map((r) => [r.key as K, r.n]));

/* ───────────── hazard rules ───────────── */

export const HAZARD_PATTERN_MAX = 200;
export const HAZARD_TEXT_MAX = 2000;

export interface HazardRule { id: string; pattern: string; reason: string; active: boolean }
export interface HazardHit extends HazardRule { /** The words in the text that the rule matched. */ found: string }

/** The pattern as the screen uses it, or null when it does not compile. Capital letters do not matter. */
export function compileHazard(pattern: string): RegExp | null {
  if (!pattern.trim() || pattern.length > HAZARD_PATTERN_MAX) return null;
  try { return new RegExp(pattern, "i"); } catch { return null; }
}

/**
 * The rules that match this text. A rule whose pattern does not compile is skipped, so one bad row cannot break a page.
 * Matches the member-side screen: white space is flattened first and capital letters do not matter.
 */
export function matchHazards<R extends HazardRule>(text: string, rules: readonly R[]): (R & { found: string })[] {
  const flat = text.replace(/\s+/g, " ").slice(0, HAZARD_TEXT_MAX * 4);
  const hits: (R & { found: string })[] = [];
  for (const rule of rules) {
    const found = compileHazard(rule.pattern)?.exec(flat)?.[0];
    if (found) hits.push({ ...rule, found: found.slice(0, 80) });
  }
  return hits;
}

export const hazardRules = () => db.select().from(s.hazardRule).orderBy(desc(s.hazardRule.active), asc(s.hazardRule.reason));

/** Adds a rule, switched on. "broken" when the pattern does not compile, "same" when it is already listed. */
export async function addHazardRule(pattern: string, reason: string): Promise<HazardRule | "broken" | "same"> {
  if (!compileHazard(pattern)) return "broken";
  const [twin] = await db.select({ id: s.hazardRule.id }).from(s.hazardRule).where(eq(s.hazardRule.pattern, pattern)).limit(1);
  if (twin) return "same";
  const [rule] = await db.insert(s.hazardRule).values({ pattern, reason, active: true }).returning();
  return rule;
}

export async function setHazardRuleActive(id: string, active: boolean): Promise<HazardRule | null> {
  const [rule] = await db.update(s.hazardRule).set({ active }).where(eq(s.hazardRule.id, id)).returning();
  return rule ?? null;
}

/* ───────────── switchboard ───────────── */

export const SAVER_KEY = "saver_mode";
export const CAP_KEY = "gemini_cap_usd";
export const CAP_DEFAULT = 8;
export const CAP_MIN = 1;
export const CAP_MAX = 40;

/** Saver mode and the monthly Gemini cap, with the defaults when a row is missing or holds something odd. */
export async function readSwitches() {
  const rows = await db.select().from(s.setting).where(inArray(s.setting.key, [SAVER_KEY, CAP_KEY]));
  const saver = rows.find((r) => r.key === SAVER_KEY);
  const cap = rows.find((r) => r.key === CAP_KEY);
  const n = typeof cap?.value === "number" && Number.isFinite(cap.value) ? cap.value : CAP_DEFAULT;
  return {
    saverMode: saver?.value === true, saverChangedAt: saver?.updatedAt ?? null,
    capUsd: Math.min(CAP_MAX, Math.max(CAP_MIN, n)), capChangedAt: cap?.updatedAt ?? null,
  };
}

export async function writeSetting(key: typeof SAVER_KEY | typeof CAP_KEY, value: boolean | number) {
  const updatedAt = new Date();
  await db.insert(s.setting).values({ key, value, updatedAt }).onConflictDoUpdate({ target: s.setting.key, set: { value, updatedAt } });
}

/** What Gemini cost since the first of this month, and how many calls that was. */
export async function aiSpendThisMonth() {
  const [row] = await db.select({ usd: sum(s.aiCall.costUsd).mapWith(Number), calls: count() }).from(s.aiCall).where(gte(s.aiCall.createdAt, startOfMonth()));
  return { usd: row?.usd ?? 0, calls: row?.calls ?? 0 };
}

/* ───────────── overview ───────────── */

export async function overviewCounts() {
  const now = new Date();
  const [households, kinds, sessionsToday, minutes, moderation, requests, counsellors, sponsors] = await Promise.all([
    /* A staff member's test household is not a family: it is left out of every count here. */
    one(db.select({ n: count() }).from(s.account).where(isNull(s.account.previewFor))),
    db.select({ key: s.profile.kind, n: count() }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
      .where(and(isNull(s.profile.archivedAt), isNull(s.account.previewFor))).groupBy(s.profile.kind),
    one(db.select({ n: count() }).from(s.session).where(gte(s.session.startedAt, startOfToday(now)))),
    one(db.select({ n: sum(s.session.minutes).mapWith(Number) }).from(s.session)
      .where(and(eq(s.session.ring, "train"), gte(s.session.startedAt, new Date(now.getTime() - 7 * DAY))))),
    one(db.select({ n: count() }).from(s.moderationItem).where(eq(s.moderationItem.status, "open"))),
    one(db.select({ n: count() }).from(s.dataRequest).where(eq(s.dataRequest.status, "open"))),
    one(db.select({ n: count() }).from(s.appUser).where(and(eq(s.appUser.isCounsellor, true), isNull(s.appUser.counsellorVerifiedAt)))),
    one(db.select({ n: count() }).from(s.sponsor).where(eq(s.sponsor.status, "pending"))),
  ]);
  const byKind = tally(kinds);
  const adults = byKind.get("adult") ?? 0, children = byKind.get("child") ?? 0;
  return { households, adults, children, profiles: adults + children, sessionsToday, minutes: Math.round(minutes), moderation, requests, counsellors, sponsors };
}

/** The latest audited actions with the name of the person who did each. */
export function recentActivity(limit = 15) {
  return db.select({ id: s.auditLog.id, action: s.auditLog.action, meta: s.auditLog.meta, createdAt: s.auditLog.createdAt, who: s.appUser.displayName })
    .from(s.auditLog).leftJoin(s.appUser, eq(s.appUser.id, s.auditLog.userId))
    .orderBy(desc(s.auditLog.createdAt)).limit(limit);
}

/* ───────────── moderation ───────────── */

export type Subject =
  | { kind: "protocol"; title: string; author: string; forWhom: string; doWhat: string; howMuch: string; weeks: number; moves: string; story: string | null }
  | { kind: "note"; body: string; signature: string; programme: string; week: number; author: string }
  | { kind: "mail"; body: string; fromName: string }
  /* a Cinema Club listing, a Wish Jam wish or the name of a Wish Jam game (src/lib/gatherings-review.ts) */
  | GatheringSubject
  | { kind: "other"; refId: string }
  | { kind: "missing" };

export type ModerationItem = typeof s.moderationItem.$inferSelect;
export interface ModerationEntry { item: ModerationItem; subject: Subject; /** Null when there is no text to screen. */ hazards: HazardHit[] | null }

const idsOf = (items: ModerationItem[], kind: string) => items.filter((i) => i.kind === kind).map((i) => i.refId);

/** The text of a subject that the hazard screen reads: the same fields the member-side screen checks. */
export function screenText(subject: Subject): string | null {
  if (subject.kind === "protocol") return [subject.story ?? "", subject.title, subject.forWhom, subject.doWhat, subject.howMuch].join("\n");
  if (subject.kind === "note") return `${subject.body}\n${subject.signature}`;
  if (subject.kind === "mail") return subject.body;
  if (subject.kind === "gathering") return gatheringText(subject);
  return null;
}

/** Open items, oldest first, each with the row it points at and what the active hazard rules say about its text. */
export async function openModeration(): Promise<ModerationEntry[]> {
  const items = await db.select().from(s.moderationItem).where(eq(s.moderationItem.status, "open")).orderBy(asc(s.moderationItem.createdAt));
  if (!items.length) return [];
  const protocolIds = idsOf(items, "protocol"), noteIds = idsOf(items, "note"), mailIds = idsOf(items, "mail");
  const gatherings = await gatheringSubjects(items);
  const [protocols, notes, mails, rules] = await Promise.all([
    protocolIds.length ? db.select({
      id: s.protocol.id, title: s.protocol.title, forWhom: s.protocol.forWhom, doWhat: s.protocol.doWhat, howMuch: s.protocol.howMuch,
      weeks: s.protocol.weeks, moves: s.protocol.moves, author: s.profile.displayName, story: s.story.body,
    }).from(s.protocol).innerJoin(s.profile, eq(s.profile.id, s.protocol.profileId)).leftJoin(s.story, eq(s.story.id, s.protocol.storyId))
      .where(inArray(s.protocol.id, protocolIds)) : [],
    noteIds.length ? db.select({
      id: s.aheadNote.id, body: s.aheadNote.body, signature: s.aheadNote.signature, programme: s.aheadNote.programme, week: s.aheadNote.week, author: s.profile.displayName,
    }).from(s.aheadNote).innerJoin(s.profile, eq(s.profile.id, s.aheadNote.profileId)).where(inArray(s.aheadNote.id, noteIds)) : [],
    mailIds.length ? db.select({ id: s.fusionMail.id, body: s.fusionMail.body, fromName: s.fusionMail.fromName }).from(s.fusionMail).where(inArray(s.fusionMail.id, mailIds)) : [],
    db.select().from(s.hazardRule).where(eq(s.hazardRule.active, true)),
  ]);

  return items.map((item) => {
    let subject: Subject = { kind: "other", refId: item.refId };
    if (item.kind === "protocol") { const p = protocols.find((x) => x.id === item.refId); subject = p ? { kind: "protocol", ...p } : { kind: "missing" }; }
    if (item.kind === "note") { const n = notes.find((x) => x.id === item.refId); subject = n ? { kind: "note", ...n } : { kind: "missing" }; }
    if (item.kind === "mail") { const m = mails.find((x) => x.id === item.refId); subject = m ? { kind: "mail", ...m } : { kind: "missing" }; }
    if (isGatheringKind(item.kind)) subject = gatherings.get(subjectKey(item.kind, item.refId)) ?? { kind: "missing" };
    const text = screenText(subject);
    return { item, subject, hazards: text === null ? null : matchHazards(text, rules) };
  });
}

/**
 * Approves or removes one open item. Null when the item is not open any more.
 * Approve: a protocol is published (with its story) and an open experiment is made if it has none; a note is published.
 * Remove: the protocol (with its story) or the note is blocked.
 */
export async function decideModeration(itemId: string, decision: "approved" | "removed", reviewerId: string) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [item] = await tx.update(s.moderationItem).set({ status: decision, reviewerId, decidedAt: now })
      .where(and(eq(s.moderationItem.id, itemId), eq(s.moderationItem.status, "open"))).returning();
    if (!item) return null;
    const approved = decision === "approved";
    const status = approved ? "published" : "blocked";
    let name: string = item.kind;

    if (item.kind === "protocol") {
      const [p] = await tx.update(s.protocol).set(approved ? { status, publishedAt: now } : { status })
        .where(eq(s.protocol.id, item.refId)).returning({ id: s.protocol.id, storyId: s.protocol.storyId, title: s.protocol.title });
      if (p) {
        name = p.title;
        if (p.storyId) await tx.update(s.story).set({ status }).where(eq(s.story.id, p.storyId));
        if (approved) {
          const [existing] = await tx.select({ id: s.experiment.id }).from(s.experiment).where(eq(s.experiment.protocolId, p.id)).limit(1);
          if (!existing) await tx.insert(s.experiment).values({ protocolId: p.id, status: "open" });
        }
      }
    }
    if (item.kind === "note") await tx.update(s.aheadNote).set({ status }).where(eq(s.aheadNote.id, item.refId));
    if (isGatheringKind(item.kind)) name = await decideGathering(tx, item, approved, now);
    return { item, name };
  });
}

/* ───────────── counsellors ───────────── */

export async function counsellors() {
  const [people, links] = await Promise.all([
    db.select({ id: s.appUser.id, name: s.appUser.displayName, email: s.appUser.email, verifiedAt: s.appUser.counsellorVerifiedAt })
      .from(s.appUser).where(eq(s.appUser.isCounsellor, true)).orderBy(desc(isNull(s.appUser.counsellorVerifiedAt)), asc(s.appUser.displayName)),
    db.select({ counsellorId: s.counsellorLink.counsellorId, status: s.counsellorLink.status, n: count() })
      .from(s.counsellorLink).groupBy(s.counsellorLink.counsellorId, s.counsellorLink.status),
  ]);
  return people.map((p) => {
    const of = (status: "pending" | "active" | "ended") => links.find((l) => l.counsellorId === p.id && l.status === status)?.n ?? 0;
    const active = of("active"), pending = of("pending"), ended = of("ended");
    return { ...p, active, pending, ended, links: active + pending + ended };
  });
}

/** Marks a counsellor as checked. Null when the person is not a counsellor or is verified already. */
export async function verifyCounsellor(id: string) {
  const [row] = await db.update(s.appUser).set({ counsellorVerifiedAt: new Date() })
    .where(and(eq(s.appUser.id, id), eq(s.appUser.isCounsellor, true), isNull(s.appUser.counsellorVerifiedAt)))
    .returning({ id: s.appUser.id, name: s.appUser.displayName });
  return row ?? null;
}

/** Takes the check away and ends that counsellor's active and pending links, so no profile stays open to them. */
export async function withdrawCounsellor(id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.update(s.appUser).set({ counsellorVerifiedAt: null })
      .where(and(eq(s.appUser.id, id), eq(s.appUser.isCounsellor, true), isNotNull(s.appUser.counsellorVerifiedAt)))
      .returning({ id: s.appUser.id, name: s.appUser.displayName });
    if (!row) return null;
    const ended = await tx.update(s.counsellorLink).set({ status: "ended" })
      .where(and(eq(s.counsellorLink.counsellorId, id), inArray(s.counsellorLink.status, ["active", "pending"])))
      .returning({ id: s.counsellorLink.id });
    return { ...row, linksEnded: ended.length };
  });
}

/* ───────────── sponsors ───────────── */

export async function sponsors() {
  const [rows, groups, homes] = await Promise.all([
    db.select().from(s.sponsor).orderBy(asc(s.sponsor.name)),
    db.select({ key: s.sponsorGroup.sponsorId, n: count() }).from(s.sponsorGroup).groupBy(s.sponsorGroup.sponsorId),
    db.select({ key: s.sponsorGroup.sponsorId, n: countDistinct(s.sponsorGroupMember.accountId) })
      .from(s.sponsorGroupMember).innerJoin(s.sponsorGroup, eq(s.sponsorGroup.id, s.sponsorGroupMember.groupId)).groupBy(s.sponsorGroup.sponsorId),
  ]);
  const g = tally(groups), h = tally(homes);
  const order = { pending: 0, approved: 1, suspended: 2 };
  return rows.map((r) => ({ ...r, groups: g.get(r.id) ?? 0, households: h.get(r.id) ?? 0 })).sort((a, b) => order[a.status] - order[b.status]);
}

export type SponsorMove = "approve" | "suspend" | "restore";
const SPONSOR_FROM = { approve: "pending", suspend: "approved", restore: "suspended" } as const;

/** Moves a sponsor one step: waiting to approved, approved to suspended, suspended back to approved. Null when it is not in the state the step starts from. */
export async function moveSponsor(id: string, move: SponsorMove, staffId: string) {
  const set = move === "approve" ? { status: "approved" as const, approvedBy: staffId, approvedAt: new Date() }
    : move === "suspend" ? { status: "suspended" as const } : { status: "approved" as const };
  const [row] = await db.update(s.sponsor).set(set).where(and(eq(s.sponsor.id, id), eq(s.sponsor.status, SPONSOR_FROM[move]))).returning();
  return row ?? null;
}

/* ───────────── households ───────────── */

/** Every household with counts only. No test result, eye profile or session detail is read. */
export async function households() {
  const [homes, kinds, seats, last, requests, groups] = await Promise.all([
    db.select({ id: s.account.id, name: s.account.displayName, isDemo: s.account.isDemo }).from(s.account).where(isNull(s.account.previewFor)).orderBy(asc(s.account.displayName)),
    db.select({ accountId: s.profile.accountId, kind: s.profile.kind, n: count() }).from(s.profile).where(isNull(s.profile.archivedAt)).groupBy(s.profile.accountId, s.profile.kind),
    db.select({ key: s.appUser.accountId, n: count() }).from(s.appUser).where(and(isNotNull(s.appUser.accountId), isNotNull(s.appUser.seat))).groupBy(s.appUser.accountId),
    db.select({ accountId: s.profile.accountId, at: max(s.session.startedAt) }).from(s.session).innerJoin(s.profile, eq(s.profile.id, s.session.profileId)).groupBy(s.profile.accountId),
    db.select({ key: s.dataRequest.accountId, n: count() }).from(s.dataRequest).where(eq(s.dataRequest.status, "open")).groupBy(s.dataRequest.accountId),
    db.select({ accountId: s.sponsorGroupMember.accountId, name: s.sponsorGroup.name })
      .from(s.sponsorGroupMember).innerJoin(s.sponsorGroup, eq(s.sponsorGroup.id, s.sponsorGroupMember.groupId)).orderBy(asc(s.sponsorGroup.name)),
  ]);
  const seated = tally(seats), open = tally(requests);
  return homes.map((h) => ({
    ...h,
    adults: kinds.find((k) => k.accountId === h.id && k.kind === "adult")?.n ?? 0,
    children: kinds.find((k) => k.accountId === h.id && k.kind === "child")?.n ?? 0,
    seats: seated.get(h.id) ?? 0,
    lastSession: last.find((l) => l.accountId === h.id)?.at ?? null,
    openRequests: open.get(h.id) ?? 0,
    groups: groups.filter((g) => g.accountId === h.id).map((g) => g.name),
  }));
}

/* ───────────── staff ───────────── */

const envAdmins = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const lowerEmail = sql`lower(${s.appUser.email})`;

export interface StaffPerson { id: string; name: string; email: string; role: StaffRole; /** Super admin because the server settings name this address, with no role stored. */ fromServer: boolean }

/** Everyone with a staff role in effect: a stored role, or an address named in ADMIN_EMAILS. */
async function staffPeople(q: Pick<typeof db, "select"> = db, lock = false): Promise<StaffPerson[]> {
  const env = envAdmins();
  const where = env.length ? or(isNotNull(s.appUser.staffRole), inArray(lowerEmail, env)) : isNotNull(s.appUser.staffRole);
  const base = q.select({ id: s.appUser.id, name: s.appUser.displayName, email: s.appUser.email, column: s.appUser.staffRole })
    .from(s.appUser).where(where).orderBy(asc(s.appUser.displayName));
  const rows = await (lock ? base.for("update") : base);
  return rows.flatMap((r) => {
    const role = resolveStaffRole(r.column, r.email, env.join(","));
    return role ? [{ id: r.id, name: r.name, email: r.email, role, fromServer: !r.column }] : [];
  });
}
export const staffList = () => staffPeople();

export type StaffProblem = "own_role" | "last_super_admin" | "from_server" | "same";

/**
 * Why a role change is refused, or null when it may go ahead. Pure, so it can be checked without a database.
 * - nobody changes their own role;
 * - the last super admin is never removed or lowered;
 * - a super admin named only in the server settings has no stored role to remove.
 */
export function staffChangeProblem(a: { viewerId: string; target: Pick<StaffPerson, "id" | "role" | "fromServer"> | { id: string; role: null; fromServer: false }; next: StaffRole | null; superAdmins: number }): StaffProblem | null {
  if (a.target.id === a.viewerId) return "own_role";
  if (a.target.role === a.next && !(a.target.fromServer && a.next === "super_admin")) return "same";
  if (a.target.fromServer && a.next === null) return "from_server";
  if (a.target.role === "super_admin" && a.next !== "super_admin" && a.superAdmins <= 1) return "last_super_admin";
  return null;
}

export type StaffChange =
  | { ok: true; id: string; name: string; from: StaffRole | null; to: StaffRole | null }
  | { ok: false; problem: StaffProblem | "no_person" };

/** Gives, changes or removes (next = null) a staff role. The person is found by id or by email. */
export async function setStaffRole(viewerId: string, who: { id: string } | { email: string }, next: StaffRole | null): Promise<StaffChange> {
  return db.transaction(async (tx) => {
    /* Lock the staff rows so two super admins cannot lower each other at the same moment. */
    const staff = await staffPeople(tx, true);
    const [person] = await tx.select({ id: s.appUser.id, name: s.appUser.displayName }).from(s.appUser)
      .where("id" in who ? eq(s.appUser.id, who.id) : eq(lowerEmail, who.email.toLowerCase())).limit(1).for("update");
    if (!person) return { ok: false, problem: "no_person" } as const;
    const current = staff.find((p) => p.id === person.id);
    const problem = staffChangeProblem({
      viewerId, next, superAdmins: staff.filter((p) => p.role === "super_admin").length,
      target: current ?? { id: person.id, role: null, fromServer: false },
    });
    if (problem) return { ok: false, problem } as const;
    await tx.update(s.appUser).set({ staffRole: next }).where(eq(s.appUser.id, person.id));
    return { ok: true, id: person.id, name: person.name, from: current?.role ?? null, to: next } as const;
  });
}

/* ───────────── rooms ───────────── */

/** Where a room lives. The overview is the console's front page. */
export const roomHref = (area: string) => (area === "overview" ? "/admin" : `/admin/${area}`);

/** The rooms a staff role may open in this edition. The stories studio and the research room exist only where the edition has them. */
export const roomsFor = (role: StaffRole | null): AdminArea[] =>
  staffAreas(role).filter((area) => (area !== "stories" || edition.stories) && (area !== "research" || edition.research));
