// Eyes Opener: Demo rows for four community ideas: Lights On Hour, Cinema Club, Class Mission and Wish Jam.
/**
 * Demo rows for four community ideas: Lights On Hour, Cinema Club, Class Mission and Wish Jam.
 * Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/gatherings.ts
 * Every row here is sample data for development. Nothing in it is a real family, a real place or a real wish.
 *
 * What it does:
 * - Six households named "Gatherings sample household 1" to 6, each with one child and a guardian's consent.
 * - Lights On Hour: one practice session for each of those six inside the latest hour that has ended, so the page
 *   can say how many households practised last time. The hour itself is not set: it stays at its starting value.
 * - Cinema Club: two listed clubs and one that waits for review, all marked as samples (`is_sample`) with made-up
 *   place names. Two belong to the demo sponsor, one was listed by staff.
 * - Class Mission: Aarav has a mission that a guardian gave three days ago and that has not been run.
 * - Wish Jam: seven wishes marked as samples, one in each state: Aarav's is built and waits for a name; of the
 *   sample households', two are listed, one is taken on, one is built and named, one waits for review, and one is
 *   built with a name that waits for review.
 */
import "../env";
import { and, asc, eq, inArray, isNull, like } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { cleanHour, lastHour } from "../../src/lib/lights-on";

const HOME = "Gatherings sample household";
const MIN = 60_000, DAY = 86_400_000;

export async function seedGatherings() {
  const now = new Date();
  const [aarav] = await db.select({ id: s.profile.id, accountId: s.profile.accountId }).from(s.profile)
    .innerJoin(s.account, eq(s.account.id, s.profile.accountId)).where(and(eq(s.account.isDemo, true), eq(s.profile.displayName, "Aarav"))).limit(1);
  if (!aarav) { console.log("Gatherings: the demo family is not there. Run the main seed first."); return; }
  const [guardian] = await db.select({ id: s.appUser.id }).from(s.appUser).where(and(eq(s.appUser.accountId, aarav.accountId), eq(s.appUser.seat, "guardian"))).orderBy(asc(s.appUser.createdAt)).limit(1);
  const [staff] = await db.select({ id: s.appUser.id }).from(s.appUser).where(eq(s.appUser.staffRole, "ops")).orderBy(asc(s.appUser.createdAt)).limit(1);
  const [sponsor] = await db.select({ id: s.sponsor.id }).from(s.sponsor).where(eq(s.sponsor.status, "approved")).orderBy(asc(s.sponsor.createdAt)).limit(1);
  const [owner] = sponsor ? await db.select({ id: s.sponsorUser.userId }).from(s.sponsorUser).where(eq(s.sponsorUser.sponsorId, sponsor.id)).limit(1) : [];

  /* ── six sample households, each with one child and consent ── */
  const kids = [{ name: "Meenu", born: 6 }, { name: "Rohan", born: 8 }, { name: "Tara", born: 5 }, { name: "Vihaan", born: 10 }, { name: "Zoya", born: 7 }, { name: "Arjun", born: 9 }];
  const have = await db.select({ id: s.account.id, name: s.account.displayName }).from(s.account).where(like(s.account.displayName, `${HOME} %`));
  const missing = kids.map((_, i) => `${HOME} ${i + 1}`).filter((name) => !have.some((a) => a.name === name));
  if (missing.length) await db.insert(s.account).values(missing.map((displayName) => ({ displayName })));
  const homes = await db.select({ id: s.account.id, name: s.account.displayName }).from(s.account).where(like(s.account.displayName, `${HOME} %`));
  const children: { accountId: string; profileId: string }[] = [];
  for (const [i, kid] of kids.entries()) {
    const home = homes.find((h) => h.name === `${HOME} ${i + 1}`);
    if (!home) continue;
    let [child] = await db.select({ id: s.profile.id }).from(s.profile).where(and(eq(s.profile.accountId, home.id), eq(s.profile.kind, "child"))).limit(1);
    if (!child) [child] = await db.insert(s.profile).values({ accountId: home.id, displayName: kid.name, kind: "child", birthYear: now.getFullYear() - kid.born }).returning({ id: s.profile.id });
    const [agreed] = await db.select({ id: s.consent.id }).from(s.consent).where(and(eq(s.consent.profileId, child.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt))).limit(1);
    if (!agreed) await db.insert(s.consent).values({ profileId: child.id, accountId: home.id, kind: "parental", textVersion: "sample" });
    children.push({ accountId: home.id, profileId: child.id });
  }

  /* ── Lights On Hour: each sample household practised inside the latest hour that has ended ── */
  const [hourRow] = await db.select({ value: s.setting.value }).from(s.setting).where(eq(s.setting.key, "lights_on_hour")).limit(1);
  const last = lastHour(now, cleanHour(hourRow?.value));
  let lit = 0;
  for (const [i, c] of children.entries()) {
    const startedAt = new Date(last.start.getTime() + (4 + i * 7) * MIN);
    const [has] = await db.select({ id: s.session.id }).from(s.session).where(and(eq(s.session.profileId, c.profileId), eq(s.session.startedAt, startedAt))).limit(1);
    if (has) continue;
    await db.insert(s.session).values({ profileId: c.profileId, kind: "game", itemSlug: "comet-trail", ring: "train", minutes: 2, endReason: "done", startedAt, endedAt: new Date(startedAt.getTime() + 2 * MIN) });
    lit += 1;
  }

  /* ── Cinema Club: made-up places, marked as samples ── */
  const clubs = [
    { placeKind: "library", placeName: "Demo Library reading room, Sample Town", weekday: 6, startMinute: 17 * 60, status: "listed", bySponsor: true },
    { placeKind: "school", placeName: "Demo School hall, Sample Town", weekday: 0, startMinute: 10 * 60 + 30, status: "listed", bySponsor: false },
    { placeKind: "community_hall", placeName: "Demo Community Hall, Sample Town", weekday: 3, startMinute: 16 * 60, status: "in_review", bySponsor: true },
  ];
  let listed = 0;
  for (const c of clubs) {
    if (c.bySponsor && !sponsor) continue;
    const [old] = await db.select({ id: s.cinemaClub.id }).from(s.cinemaClub).where(and(eq(s.cinemaClub.placeName, c.placeName), eq(s.cinemaClub.isSample, true))).limit(1);
    if (old) continue;
    const [made] = await db.insert(s.cinemaClub).values({
      sponsorId: c.bySponsor ? sponsor!.id : null, placeKind: c.placeKind, placeName: c.placeName, weekday: c.weekday, startMinute: c.startMinute,
      status: c.status, isSample: true, createdBy: c.bySponsor ? owner?.id ?? null : staff?.id ?? null, listedAt: c.status === "listed" ? new Date(now.getTime() - 9 * DAY) : null,
    }).returning({ id: s.cinemaClub.id });
    if (c.status === "in_review") await db.insert(s.moderationItem).values({ kind: "club", refId: made.id, reason: "New Cinema Club listing from a sponsor. Passed the hazard screen and the no-home rule; needs a person's approval. (Sample data.)" });
    listed += 1;
  }

  /* ── Class Mission: Aarav has one that has not been run ── */
  const [mission] = await db.select({ id: s.classMission.id }).from(s.classMission).where(eq(s.classMission.profileId, aarav.id)).limit(1);
  if (!mission) await db.insert(s.classMission).values({ profileId: aarav.id, givenBy: guardian?.id ?? null, givenAt: new Date(now.getTime() - 3 * DAY) });

  /* ── Wish Jam: one sample wish in each state ── */
  const ago = (days: number) => new Date(now.getTime() - days * DAY);
  const wishes: (typeof s.wish.$inferInsert & { review?: "wish" | "wish_name" })[] = [
    { accountId: aarav.accountId, profileId: aarav.id, code: "TRANS2", loves: "trains", play: "steer", game: "two_eye", line: "Trains instead of blocks, with a station to stop at.", showFirstName: true, status: "built", createdBy: guardian?.id ?? null, createdAt: ago(40), listedAt: ago(38), matchedAt: ago(30), builtAt: ago(2) },
    ...(children[0] ? [{ ...children[0], code: "ANMLS3", loves: "animals", play: "find", game: "any", line: "She likes it when the animals wave back.", status: "listed", createdAt: ago(12), listedAt: ago(11) }] : []),
    ...(children[1] ? [{ ...children[1], code: "SPACE4", loves: "space", play: "steer", game: "no_glasses", line: "", status: "matched", createdAt: ago(25), listedAt: ago(24), matchedAt: ago(6) }] : []),
    ...(children[2] ? [{ ...children[2], code: "CRKT55", loves: "cricket", play: "catch", game: "two_eye", line: "Catching the ball before it reaches the rope.", status: "built", createdAt: ago(70), listedAt: ago(68), matchedAt: ago(50), builtAt: ago(20), gameName: "Six Catcher", nameStatus: "approved", namedAt: ago(15) }] : []),
    ...(children[3] ? [{ ...children[3], code: "DNSR66", loves: "dinosaurs", play: "find", game: "depth", line: "Dinosaurs hiding behind trees.", status: "listed", createdAt: ago(5), listedAt: ago(4) }] : []),
    ...(children[4] ? [{ ...children[4], code: "MUSC77", loves: "music", play: "match", game: "any", line: "Drums and bells that answer each other.", status: "in_review", createdAt: ago(1), review: "wish" as const }] : []),
    ...(children[5] ? [{ ...children[5], code: "RCKT88", loves: "space", play: "race", game: "pull_in", line: "", status: "built", createdAt: ago(60), listedAt: ago(58), matchedAt: ago(41), builtAt: ago(3), gameName: "Rocket Pond", nameStatus: "in_review", review: "wish_name" as const }] : []),
  ];
  const codes = wishes.map((w) => w.code);
  const old = await db.select({ code: s.wish.code }).from(s.wish).where(inArray(s.wish.code, codes));
  let wished = 0;
  for (const { review, ...w } of wishes) {
    if (old.some((o) => o.code === w.code)) continue;
    const [made] = await db.insert(s.wish).values({ ...w, isSample: true }).onConflictDoNothing({ target: s.wish.code }).returning({ id: s.wish.id });
    if (!made) continue;
    if (review) await db.insert(s.moderationItem).values({ kind: review, refId: made.id, reason: review === "wish" ? "New Wish Jam wish from a family. Passed the hazard screen and the no-names rule; needs a person's approval. (Sample data.)" : "A name for a Wish Jam game. Passed the hazard screen and the no-names rule; needs a person's approval. (Sample data.)" });
    wished += 1;
  }

  console.log(`Gatherings: ${missing.length} sample households made, ${lit} lantern sessions added, ${listed} clubs added, mission ${mission ? "kept" : "given"}, ${wished} wishes added.`);
}

if (/scripts[\\/]seed[\\/]gatherings\.ts$/.test(process.argv[1] ?? "")) seedGatherings().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
