/**
 * The counsellor's side of a link.
 * Every helper takes the signed-in counsellor and reads or writes only through a `counsellor_link` row that is theirs.
 * A pending link gives the request and nothing else; a member's eye data is read only while the link is active.
 * Every write is recorded with `audit`.
 */
import { and, asc, count, desc, eq, gt, gte, inArray, isNull } from "drizzle-orm";
import { counsellor as c } from "@/copy/counsellor";
import { exerciseBySlug, gameBySlug, programmeBySlug, tests, type TestDef } from "@/data";
import { db, schema } from "@/db";
import { setupOf } from "./setup";
import { acuityText, ageFrom, blankEye, contrastText, MAX_DAILY_MINUTES, percent, snellen } from "@/engine";
import { audit, type Viewer } from "./auth";
import { lastDays } from "./session";

const L = schema.counsellorLink;
const P = schema.profile;

export const NOTE_MAX = 2000;

/** What a form shows after its action ran. */
export type FormState = { ok: boolean; message: string } | null;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/* ───────────── reading ───────────── */

/** Requests waiting for this counsellor: who is asking and when. Nothing about the member's eyes. */
export async function linkRequests(viewer: Viewer) {
  const rows = await db.select({ linkId: L.id, name: P.displayName, birthYear: P.birthYear, household: schema.account.displayName, askedAt: L.createdAt })
    .from(L).innerJoin(P, eq(P.id, L.profileId)).innerJoin(schema.account, eq(schema.account.id, P.accountId))
    .where(and(eq(L.counsellorId, viewer.user.id), eq(L.status, "pending"), isNull(P.archivedAt)))
    .orderBy(asc(L.createdAt));
  return rows.map((r) => ({ linkId: r.linkId, firstName: firstName(r.name), age: ageFrom(r.birthYear), household: r.household, askedAt: r.askedAt }));
}

/** Members with an active link to this counsellor: programme, week and days practised in the last 7 days. */
export async function linkedMembers(viewer: Viewer) {
  const rows = await db.select({ linkId: L.id, profileId: P.id, name: P.displayName, birthYear: P.birthYear })
    .from(L).innerJoin(P, eq(P.id, L.profileId))
    .where(and(eq(L.counsellorId, viewer.user.id), eq(L.status, "active"), isNull(P.archivedAt)))
    .orderBy(asc(P.displayName));
  const ids = rows.map((r) => r.profileId);
  if (!ids.length) return [];
  const since = lastDays(7)[0].key;
  const [enrolments, practised] = await Promise.all([
    db.select({ profileId: schema.enrolment.profileId, programme: schema.enrolment.programme, week: schema.enrolment.week })
      .from(schema.enrolment).where(and(inArray(schema.enrolment.profileId, ids), eq(schema.enrolment.status, "active")))
      .orderBy(desc(schema.enrolment.startedAt)),
    db.select({ profileId: schema.daySummary.profileId, days: count() })
      .from(schema.daySummary)
      .where(and(inArray(schema.daySummary.profileId, ids), gte(schema.daySummary.day, since), gt(schema.daySummary.trainMinutes, 0)))
      .groupBy(schema.daySummary.profileId),
  ]);
  return rows.map((r) => {
    const e = enrolments.find((x) => x.profileId === r.profileId);
    return {
      linkId: r.linkId, name: r.name, age: ageFrom(r.birthYear),
      programme: e ? { name: programmeBySlug(e.programme)?.name ?? e.programme, week: e.week } : null,
      daysPractised: Math.min(7, practised.find((x) => x.profileId === r.profileId)?.days ?? 0),
    };
  });
}

/** The link and its profile, only when the link is this counsellor's and active. */
async function activeLink(viewer: Viewer, linkId: string) {
  const [row] = await db.select({ link: L, profile: P })
    .from(L).innerJoin(P, eq(P.id, L.profileId))
    .where(and(eq(L.id, linkId), eq(L.counsellorId, viewer.user.id), eq(L.status, "active"), isNull(P.archivedAt))).limit(1);
  return row ?? null;
}

type Result = typeof schema.testResult.$inferSelect;
export interface Reading { text: string; at: Date }
export interface ResultLine { test: TestDef; eye: "left" | "right" | null; first: Reading | null; last: Reading | null; change: "better" | "worse" | "same" | null }

/** The number that is compared. Balance is stored as a log ratio and shown as stronger-eye contrast. */
const shown = (t: TestDef, value: number) => (t.unit === "log_ratio" ? Math.pow(10, -Math.abs(value)) : value);

/** A stored result in plain words. */
function reading(t: TestDef, r: Result): string {
  if (t.unit === "logMAR") return r.note === "floor" || r.note === "worse" ? acuityText({ ...blankEye(), va: r.value, note: r.note }) : snellen(r.value);
  if (t.unit === "logCS") return contrastText({ ...blankEye(), cs: r.value });
  if (t.unit === "log_ratio") return percent(shown(t, r.value));
  return `${Math.round(r.value * 10) / 10} ${c.member.results.units[t.unit] ?? ""}`.trim();
}

function resultLines(rows: Result[]): ResultLine[] {
  return tests.flatMap((t) => (t.perEye ? (["left", "right"] as const) : [null]).map((eye) => {
    const of = rows.filter((r) => r.testKey === t.key && r.eye === eye);
    const first = of.find((r) => r.isBaseline) ?? of[0];
    const last = of.at(-1);
    let change: ResultLine["change"] = null;
    if (first && last && first.id !== last.id) {
      const d = shown(t, last.value) - shown(t, first.value);
      change = Math.abs(d) < 0.005 ? "same" : d < 0 === t.lowerIsBetter ? "better" : "worse";
    }
    return {
      test: t, eye, change,
      first: first ? { text: reading(t, first), at: first.takenAt } : null,
      last: last ? { text: reading(t, last), at: last.takenAt } : null,
    };
  }));
}

/** The name a member knows a session's item by. */
const itemName = (kind: string, slug: string) =>
  (kind === "game" ? gameBySlug(slug)?.name : kind === "exercise" ? exerciseBySlug(slug)?.name : undefined) ?? c.member.stops.kind[kind] ?? kind;

/** Everything the member page shows. Null unless the link is this counsellor's and active. */
export async function memberView(viewer: Viewer, linkId: string) {
  const own = await activeLink(viewer, linkId);
  if (!own) return null;
  const { link, profile } = own;
  const span = lastDays(14);
  const [[eye], results, days, stops, enrolments, notes] = await Promise.all([
    db.select().from(schema.eyeProfile)
      .where(and(eq(schema.eyeProfile.profileId, profile.id), eq(schema.eyeProfile.isCurrent, true)))
      .orderBy(desc(schema.eyeProfile.createdAt)).limit(1),
    db.select().from(schema.testResult).where(eq(schema.testResult.profileId, profile.id)).orderBy(asc(schema.testResult.takenAt)),
    db.select({ day: schema.daySummary.day, minutes: schema.daySummary.trainMinutes }).from(schema.daySummary)
      .where(and(eq(schema.daySummary.profileId, profile.id), gte(schema.daySummary.day, span[0].key))),
    db.select({ id: schema.session.id, kind: schema.session.kind, itemSlug: schema.session.itemSlug, symptom: schema.session.stopSymptom, minutes: schema.session.minutes, startedAt: schema.session.startedAt })
      .from(schema.session).where(and(eq(schema.session.profileId, profile.id), eq(schema.session.endReason, "stop_rule")))
      .orderBy(desc(schema.session.startedAt)).limit(30),
    db.select().from(schema.enrolment)
      .where(and(eq(schema.enrolment.profileId, profile.id), eq(schema.enrolment.status, "active"))).orderBy(desc(schema.enrolment.startedAt)),
    db.select({ id: schema.counsellorNote.id, body: schema.counsellorNote.body, createdAt: schema.counsellorNote.createdAt })
      .from(schema.counsellorNote).where(eq(schema.counsellorNote.linkId, link.id)).orderBy(desc(schema.counsellorNote.createdAt)),
  ]);
  /* the household's screen and this person's setup, the same steps the family sees (src/lib/setup-rules.ts) */
  const [device] = await db.select().from(schema.device).where(and(eq(schema.device.accountId, profile.accountId), eq(schema.device.kind, "web")))
    .orderBy(desc(schema.device.calibratedAt)).limit(1);
  const setup = await setupOf({ profile, device: device ?? null, eye: eye ?? null, tester: false });
  return {
    linkId: link.id,
    askedAt: link.createdAt,
    setup,
    name: profile.displayName,
    age: ageFrom(profile.birthYear),
    accessLevel: profile.accessLevel,
    /** The lens choice (engine/profile.ts) and when it was made: a counsellor sees it, a family makes it. */
    weakInk: profile.weakInk === "red" ? ("red" as const) : ("cyan" as const), weakInkAt: profile.weakInkAt,
    eye: eye ?? null,
    results: resultLines(results),
    practice: span.map(({ key }) => ({ key, minutes: Math.round(days.find((d) => d.day === key)?.minutes ?? 0) })),
    stops: stops.map((s) => ({ id: s.id, item: itemName(s.kind, s.itemSlug), symptom: s.symptom, minutes: Math.round(s.minutes), startedAt: s.startedAt })),
    enrolments: enrolments.map((e) => {
      const p = programmeBySlug(e.programme);
      return { id: e.id, name: p?.name ?? e.programme, level: p?.level ?? null, week: e.week, dailyMinutes: e.dailyMinutes, daysPerWeek: e.daysPerWeek, approvedBy: e.approvedBy };
    }),
    notes,
  };
}

/* ───────────── writing ───────────── */

/** Accept or decline a waiting request. Only a pending link of this counsellor changes. */
export async function answerRequest(viewer: Viewer, linkId: string, accept: boolean): Promise<boolean> {
  const [row] = await db.update(L).set({ status: accept ? "active" : "ended" })
    .where(and(eq(L.id, linkId), eq(L.counsellorId, viewer.user.id), eq(L.status, "pending")))
    .returning({ id: L.id });
  if (!row) return false;
  await audit(viewer, accept ? "counsellor.link.accept" : "counsellor.link.decline", row.id);
  return true;
}

/** End an active link. The counsellor stops seeing the member at once. */
export async function endLink(viewer: Viewer, linkId: string): Promise<boolean> {
  const [row] = await db.update(L).set({ status: "ended" })
    .where(and(eq(L.id, linkId), eq(L.counsellorId, viewer.user.id), eq(L.status, "active")))
    .returning({ id: L.id });
  if (!row) return false;
  await audit(viewer, "counsellor.link.end", row.id);
  return true;
}

export type DoseResult = "done" | "invalid" | "not_found" | "no_enrolment" | "trial_dose";

/**
 * Set the dose of a level 2 programme. Only for an active link of this counsellor, never above the daily limit.
 * Level 0 and 1 doses come from published trials and are refused.
 */
export async function setDose(viewer: Viewer, linkId: string, enrolmentId: string, dailyMinutes: number, daysPerWeek: number): Promise<DoseResult> {
  if (!Number.isInteger(dailyMinutes) || dailyMinutes < 1 || dailyMinutes > MAX_DAILY_MINUTES) return "invalid";
  if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) return "invalid";
  const E = schema.enrolment;
  const out = await db.transaction(async (tx) => {
    /* Hold the link so it cannot be ended between the check and the write. */
    const [link] = await tx.select({ id: L.id, profileId: L.profileId }).from(L)
      .where(and(eq(L.id, linkId), eq(L.counsellorId, viewer.user.id), eq(L.status, "active"))).for("update");
    if (!link) return { result: "not_found" as const };
    const [e] = await tx.select().from(E).where(and(eq(E.id, enrolmentId), eq(E.profileId, link.profileId), eq(E.status, "active"))).for("update");
    if (!e) return { result: "no_enrolment" as const };
    if (programmeBySlug(e.programme)?.level !== 2) return { result: "trial_dose" as const };
    await tx.update(E).set({ dailyMinutes, daysPerWeek, approvedBy: viewer.user.id }).where(eq(E.id, e.id));
    return { result: "done" as const, enrolment: e };
  });
  if (out.result === "done") {
    await audit(viewer, "counsellor.dose.set", out.enrolment.id, {
      linkId, programme: out.enrolment.programme, dailyMinutes, daysPerWeek,
      before: { dailyMinutes: out.enrolment.dailyMinutes, daysPerWeek: out.enrolment.daysPerWeek },
    });
  }
  return out.result;
}

/** Add a note to an active link of this counsellor. The note text is not copied into the audit record. */
export async function addNote(viewer: Viewer, linkId: string, body: string): Promise<"done" | "not_found"> {
  const own = await activeLink(viewer, linkId);
  if (!own) return "not_found";
  const [note] = await db.insert(schema.counsellorNote).values({ linkId: own.link.id, body }).returning({ id: schema.counsellorNote.id });
  await audit(viewer, "counsellor.note.add", note.id, { linkId: own.link.id });
  return "done";
}
