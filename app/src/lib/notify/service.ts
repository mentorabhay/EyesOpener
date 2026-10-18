/**
 * The reminder and notification service. Server only.
 *
 *  - `notify` writes one notification for one grown-up; a second call with the same `dedupe` does nothing.
 *  - `notifyHousehold` tells a household's grown-ups about something in the community they take part in.
 *  - `sendDueReminders` turns every reminder that is due now (rules.ts) into a notification for each grown-up of the
 *    household, and sends its email when the reminder asks for one and mail is set up (src/lib/signin/mail.ts, owner
 *    step M1). It is safe to run as often as wanted: a reminder fires at most once a local day. The scheduled job and
 *    the app's own check (`checkMine`, when a grown-up has the app open) both call it.
 *  - Notifications are quiet: a count on the bell at the top of the page. A person may also switch on the browser's
 *    own notifications on their computer.
 *  - An email names no one and carries no detail of anyone's eyes: a short line and a link back to the app.
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { notify as w } from "@/copy/notify";
import { english } from "@/i18n/texts";
import { mailSettings, sendMail } from "@/lib/signin/mail";
import { siteUrl } from "@/lib/site";
import { dedupeKey, isDue, localParts, safeHref } from "./rules";

export interface Notice { appUserId: string; accountId?: string | null; profileId?: string | null; reminderId?: string | null; kind: string; title: string; body: string; href?: string | null; dedupe: string }

/** Writes one notification. Returns its id, or null when one with the same key exists. */
export async function notify(n: Notice): Promise<string | null> {
  const [row] = await db.insert(schema.notification).values({
    appUserId: n.appUserId, accountId: n.accountId ?? null, profileId: n.profileId ?? null, reminderId: n.reminderId ?? null,
    kind: n.kind, title: n.title.slice(0, 160), body: n.body.slice(0, 600), href: safeHref(n.href), dedupe: n.dedupe,
  }).onConflictDoNothing({ target: schema.notification.dedupe }).returning({ id: schema.notification.id });
  return row?.id ?? null;
}

type ReminderRow = typeof schema.reminder.$inferSelect;

/** The grown-ups of a household who get its notices: guardians and co-guardians, and cheer seats when asked. */
export async function grownUps(accountId: string, withCircle = false) {
  const seats = withCircle ? ["guardian", "co_guardian", "circle"] as const : ["guardian", "co_guardian"] as const;
  return db.select({ id: schema.appUser.id, email: schema.appUser.email }).from(schema.appUser)
    .where(and(eq(schema.appUser.accountId, accountId), inArray(schema.appUser.seat, [...seats])));
}

/**
 * Tells every grown-up of a household about something in the community they take part in, except the person who did
 * it. `key` names the event once; each person's copy gets its own key from it, so the same event is never told twice.
 * Never throws: a notice that cannot be written must not undo what the member did.
 */
export async function notifyHousehold(accountId: string, n: { kind: string; title: string; body: string; href?: string | null; key: string; profileId?: string | null }, except?: string | null) {
  try {
    const people = (await grownUps(accountId, true)).filter((p) => p.id !== except);
    for (const p of people) await notify({ appUserId: p.id, accountId, profileId: n.profileId ?? null, kind: n.kind, title: n.title, body: n.body, href: n.href, dedupe: `${n.key}:${p.id}` });
    return people.length;
  } catch { return 0; }
}

/** The words of one reminder as it comes due, in the reader's language when the service runs in a request. */
function wordsFor(r: ReminderRow, who: string) {
  const k = w.kinds[r.kind] ?? w.kinds.custom;
  return { title: r.kind === "custom" ? (r.note || k.name) : k.title(who), body: k.body, href: k.href };
}

/** The email for one reminder. In English, with no name and no detail: the kind of reminder and a link. */
function emailFor(r: ReminderRow) {
  const e = english(w);
  const k = e.kinds[r.kind] ?? e.kinds.custom;
  const name = r.kind === "custom" ? (r.note || k.name) : k.name;
  const link = `${siteUrl()}${k.href}`;
  return { subject: e.email.subject(name), text: `${name}\n\n${k.body}\n\n${e.email.open}: ${link}\n\n${e.email.footer}\n` };
}

/**
 * Fires every due reminder among `rows` (all active reminders when not given): one notification for each grown-up
 * of the household (guardians and co-guardians), and an email to each when the reminder asks for one and mail is set
 * up. Returns counts only. The `lastSentOn` update is guarded by its old value, so two runs at once cannot both fire it.
 */
export async function sendDueReminders(now = new Date(), rows?: ReminderRow[]) {
  const list = rows ?? await db.select().from(schema.reminder).where(eq(schema.reminder.active, true));
  const due = list.filter((r) => isDue({ ...r, lastSentOn: r.lastSentOn ?? null }, now));
  const counts = { due: due.length, shown: 0, emailed: 0, mailOff: 0 };
  if (!due.length) return counts;
  const profiles = await db.select({ id: schema.profile.id, name: schema.profile.displayName }).from(schema.profile)
    .where(inArray(schema.profile.id, [...new Set(due.map((r) => r.profileId))]));
  const mail = mailSettings();
  for (const r of due) {
    const local = localParts(now, r.timeZone);
    /* claim the day first: only one run gets past this */
    const claimed = await db.update(schema.reminder).set({ lastSentOn: local.date })
      .where(and(eq(schema.reminder.id, r.id), r.lastSentOn ? eq(schema.reminder.lastSentOn, r.lastSentOn) : isNull(schema.reminder.lastSentOn)))
      .returning({ id: schema.reminder.id });
    if (!claimed.length) continue;
    const words = wordsFor(r, profiles.find((p) => p.id === r.profileId)?.name ?? "");
    for (const person of await grownUps(r.accountId)) {
      const id = await notify({
        appUserId: person.id, accountId: r.accountId, profileId: r.profileId, reminderId: r.id,
        kind: `reminder.${r.kind}`, title: words.title, body: words.body, href: words.href, dedupe: `${dedupeKey(r.id, local.date)}:${person.id}`,
      });
      if (!id) continue;
      if (r.inApp) counts.shown++;
      if (r.email && person.email) {
        if (!mail) { counts.mailOff++; continue; }
        const m = emailFor(r);
        if ((await sendMail({ to: person.email, subject: m.subject, text: m.text }, mail)) === "sent") {
          counts.emailed++;
          await db.update(schema.notification).set({ emailedAt: new Date() }).where(eq(schema.notification.id, id));
        }
      }
    }
  }
  return counts;
}

/** Fires the due reminders of this person's household: called while they have the app open, so the app needs no scheduler. */
export async function checkMine(accountId: string, now = new Date()) {
  const rows = await db.select().from(schema.reminder).where(and(eq(schema.reminder.accountId, accountId), eq(schema.reminder.active, true)));
  return sendDueReminders(now, rows);
}

export async function unreadCount(appUserId: string) {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.notification).where(and(eq(schema.notification.appUserId, appUserId), isNull(schema.notification.readAt)));
  return r?.n ?? 0;
}

export async function listFor(appUserId: string, limit = 50) {
  return db.select().from(schema.notification).where(eq(schema.notification.appUserId, appUserId)).orderBy(desc(schema.notification.createdAt)).limit(limit);
}

/** Unread notifications newer than `since`: what the open app shows as it arrives. */
export async function freshFor(appUserId: string, since: Date) {
  return db.select({ id: schema.notification.id, title: schema.notification.title, body: schema.notification.body, href: schema.notification.href, createdAt: schema.notification.createdAt })
    .from(schema.notification)
    .where(and(eq(schema.notification.appUserId, appUserId), isNull(schema.notification.readAt), sql`${schema.notification.createdAt} > ${since}`))
    .orderBy(desc(schema.notification.createdAt)).limit(10);
}

export async function markRead(appUserId: string, id?: string) {
  await db.update(schema.notification).set({ readAt: new Date() })
    .where(and(eq(schema.notification.appUserId, appUserId), isNull(schema.notification.readAt), ...(id ? [eq(schema.notification.id, id)] : [])));
}

export async function remindersOf(accountId: string, profileId?: string) {
  return db.select().from(schema.reminder)
    .where(and(eq(schema.reminder.accountId, accountId), ...(profileId ? [eq(schema.reminder.profileId, profileId)] : [])))
    .orderBy(schema.reminder.at);
}
