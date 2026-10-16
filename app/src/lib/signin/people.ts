// Eyes Opener: Who a sign-in is, in Eyes Opener's own table of people.
/**
 * Who a sign-in is, in Eyes Opener's own table of people.
 *
 * Firebase says: this is account `uid`, and it proved it owns `email`. This file decides which `app_user` that is.
 * The rule (`decide`) is pure and unit-tested; `personFor` applies it inside one transaction.
 *
 *   1. A person already tied to this Firebase account is that person. Google today and an email link tomorrow are
 *      the same Firebase account when the address is the same, so they are one person here.
 *        - If the address changed at the provider, the person's row takes the new address, unless another person
 *          here already has it. Then the sign-in is refused: two rows are never merged by a guess.
 *   2. Nobody is tied to this account, and one person here has this address:
 *        - that person has never signed in: they are tied to the account now. This is how staff and counsellors
 *          that ops entered by email get their sign-in. It happens only for a verified address.
 *        - that person is tied to a different Firebase account: refused. Whoever holds an address today does not
 *          inherit the family of whoever held it before. Staff can clear the old tie after checking.
 *        - that person belongs to the demo family: refused. Every visitor shares the demo family.
 *   3. Nobody has this account or this address: a new person, with no household yet. They then start a family
 *      space or join one with an invite code (see `startFamily`, and acceptInvite in family.ts).
 *   4. More than one person has this address in different capitals: refused, never guessed.
 *
 * An address that was not verified never reaches this file: `verifyIdToken` refuses the token. `decide` checks it
 * again all the same, so the rule is safe whoever calls it.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Identity } from "./idtoken";

export interface PersonRow { id: string; email: string; firebaseUid: string | null; demo: boolean }

export type LinkRefusal =
  | "unverified"       // the address was not proved
  | "other_sign_in"    // the address belongs to a person tied to a different Firebase account
  | "address_in_use"   // the account's address changed to one another person has
  | "unclear"          // more than one person has the address
  | "demo";            // the address belongs to the demo family

export type Decision =
  | { act: "sign_in"; id: string; newEmail?: string }
  | { act: "link"; id: string }
  | { act: "create" }
  | { act: "refuse"; why: LinkRefusal };

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function decide(who: { uid: string; email: string; emailVerified: boolean }, byUid: PersonRow | null, byEmail: readonly PersonRow[]): Decision {
  if (who.emailVerified !== true || !who.uid || !who.email) return { act: "refuse", why: "unverified" };
  if (byUid) {
    if (same(byUid.email, who.email)) return { act: "sign_in", id: byUid.id };
    return byEmail.some((r) => r.id !== byUid.id) ? { act: "refuse", why: "address_in_use" } : { act: "sign_in", id: byUid.id, newEmail: who.email.trim().toLowerCase() };
  }
  if (!byEmail.length) return { act: "create" };
  if (byEmail.length > 1) return { act: "refuse", why: "unclear" };
  const [row] = byEmail;
  if (row.firebaseUid) return { act: "refuse", why: "other_sign_in" };
  if (row.demo) return { act: "refuse", why: "demo" };
  return { act: "link", id: row.id };
}

/** A name for a person who came with none: the part of the address before the @. */
export const nameFromEmail = (email: string) => (email.split("@")[0] || email).slice(0, 80);

export type Person =
  | { ok: true; userId: string; accountId: string | null; isNew: boolean }
  /** not_known: nobody here is this person, and making a new one was not allowed. */
  | { ok: false; why: LinkRefusal | "not_known" };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface Row { id: string; email: string; firebaseUid: string | null; accountId: string | null }
type Found = PersonRow & { accountId: string | null };

async function rows(tx: Tx, identity: Identity): Promise<{ byUid: Found | null; byEmail: Found[] }> {
  const pick = { id: schema.appUser.id, email: schema.appUser.email, firebaseUid: schema.appUser.firebaseUid, accountId: schema.appUser.accountId };
  const uidRows: Row[] = await tx.select(pick).from(schema.appUser).where(eq(schema.appUser.firebaseUid, identity.uid)).for("update");
  const emailRows: Row[] = await tx.select(pick).from(schema.appUser).where(eq(sql`lower(${schema.appUser.email})`, identity.email)).for("update");
  const demo = new Set<string>();
  for (const id of new Set([...uidRows, ...emailRows].map((r) => r.accountId).filter((a): a is string => !!a))) {
    const [a] = await tx.select({ isDemo: schema.account.isDemo }).from(schema.account).where(eq(schema.account.id, id)).limit(1);
    if (a?.isDemo) demo.add(id);
  }
  const shape = (r: Row): Found => ({ ...r, demo: !!r.accountId && demo.has(r.accountId) });
  return { byUid: uidRows[0] ? shape(uidRows[0]) : null, byEmail: emailRows.map(shape) };
}

/**
 * The person this verified sign-in is. With `create` false nobody new is made (a device in child mode).
 * Safe when two sign-ins for the same new person arrive together: the second finds the row the first made.
 */
export async function personFor(identity: Identity, o: { create: boolean }): Promise<Person> {
  for (let round = 0; round < 3; round++) {
    const out = await db.transaction(async (tx): Promise<Person | "again"> => {
      const found = await rows(tx, identity);
      const d = decide({ uid: identity.uid, email: identity.email, emailVerified: true }, found.byUid, found.byEmail);
      if (d.act === "refuse") return { ok: false, why: d.why };
      if (d.act === "sign_in") {
        if (d.newEmail) {
          /* Another sign-in may have taken the address this very moment: the database's own rule (one row per address) decides.
             The change runs behind a savepoint, so a refusal by the database leaves the rest of the transaction usable. */
          const newEmail = d.newEmail;
          const changed = await tx.transaction((sp) => sp.update(schema.appUser).set({ email: newEmail }).where(eq(schema.appUser.id, d.id)).returning({ id: schema.appUser.id })).catch(() => null);
          if (!changed) return "again";
        }
        return { ok: true, userId: d.id, accountId: found.byUid!.accountId, isNew: false };
      }
      if (d.act === "link") {
        const [linked] = await tx.update(schema.appUser).set({ firebaseUid: identity.uid })
          .where(and(eq(schema.appUser.id, d.id), isNull(schema.appUser.firebaseUid))).returning({ id: schema.appUser.id, accountId: schema.appUser.accountId });
        return linked ? { ok: true, userId: linked.id, accountId: linked.accountId, isNew: false } : "again";
      }
      if (!o.create) return { ok: false, why: "not_known" };
      const [made] = await tx.insert(schema.appUser)
        .values({ email: identity.email, firebaseUid: identity.uid, displayName: identity.name ?? nameFromEmail(identity.email) })
        .onConflictDoNothing().returning({ id: schema.appUser.id });
      return made ? { ok: true, userId: made.id, accountId: null, isNew: true } : "again";
    });
    if (out !== "again") return out;
  }
  return { ok: false, why: "unclear" };
}

export type Started = "started" | "has_household" | "missing";

/**
 * Starts a family space for a signed-in person who has none: the household, the person as its guardian, and one
 * adult profile for the person, so the app can open and onboarding can begin.
 */
export async function startFamily(userId: string, householdName: (person: string) => string): Promise<Started> {
  return db.transaction(async (tx) => {
    const [me] = await tx.select({ id: schema.appUser.id, name: schema.appUser.displayName, accountId: schema.appUser.accountId }).from(schema.appUser).where(eq(schema.appUser.id, userId)).for("update");
    if (!me) return "missing";
    if (me.accountId) return "has_household";
    const [account] = await tx.insert(schema.account).values({ displayName: householdName(me.name).slice(0, 80) }).returning({ id: schema.account.id });
    await tx.insert(schema.profile).values({ accountId: account.id, displayName: me.name, kind: "adult" });
    await tx.update(schema.appUser).set({ accountId: account.id, seat: "guardian" }).where(eq(schema.appUser.id, me.id));
    return "started";
  });
}
