// Eyes Opener: Demo rows for the show-up league. Run it after the main seed; it is safe to run again.
/**
 * Demo rows for the show-up league. Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/league.ts
 * Every number here is sample data for development, not a measurement.
 *
 * What it does:
 * - Puts the seeded lazy-eye league in the age band the app uses ("4 to 7") and gives its family-named team a name
 *   from the fixed list: a team is never named after a family.
 * - Puts the six sample children on the lazy-eye programme with a guardian's consent, and seats them and Aarav
 *   on the five teams.
 * - Adds day rows for the three weeks before the main seed's last seven days, and one day the stop rule ended.
 * - Works the past weeks out with the same code the weekly job uses, so the history shown is counted, not typed in.
 */
import "../env";
import { and, asc, eq, isNull, like } from "drizzle-orm";
import { db, schema as s } from "../../src/db";
import { addDays, dayOf, startOfDay, weekOf } from "../../src/lib/league";
import { closeWeeks, refreshWeek } from "../../src/lib/teams";

const PROGRAMME = "lazy-eye", BAND = "4 to 7", MINUTES = 60, DAYS = 6;
const TEAMS = ["Kingfishers", "Team Mango", "Starfish", "Kite Club", "Night Owls"];
/** Which team each sample child sits on, by the order of their names. Aarav shares a team with the first. */
const SEATS = ["Kingfishers", "Team Mango", "Team Mango", "Starfish", "Kite Club", "Night Owls"];

export async function seedLeague() {
  const today = dayOf(new Date()), week = weekOf(today), from = addDays(week, -21);

  const [aarav] = await db.select({ id: s.profile.id }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.profile.displayName, "Aarav"), eq(s.account.isDemo, true))).limit(1);
  if (!aarav) { console.log("League: the demo family is not there. Run the main seed first."); return; }
  const kids = await db.select({ id: s.profile.id, accountId: s.profile.accountId }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(like(s.account.displayName, "Sample household %"), eq(s.profile.kind, "child"))).orderBy(asc(s.profile.displayName));

  /* the league and its teams */
  let [league] = await db.select().from(s.league).where(eq(s.league.programme, PROGRAMME)).orderBy(asc(s.league.createdAt)).limit(1);
  if (!league) [league] = await db.insert(s.league).values({ name: "Show-up league", programme: PROGRAMME, ageBand: BAND }).returning();
  if (league.ageBand !== BAND) await db.update(s.league).set({ ageBand: BAND }).where(eq(s.league.id, league.id));
  const inLeague = eq(s.team.leagueId, league.id);
  if (!(await db.select({ id: s.team.id }).from(s.team).where(and(inLeague, eq(s.team.name, TEAMS[0])))).length)
    await db.update(s.team).set({ name: TEAMS[0] }).where(and(inLeague, eq(s.team.name, "Sharma family")));
  const have = await db.select({ name: s.team.name }).from(s.team).where(inLeague);
  const missing = TEAMS.filter((name) => !have.some((t) => t.name === name));
  if (missing.length) await db.insert(s.team).values(missing.map((name) => ({ leagueId: league.id, name })));
  const teams = await db.select({ id: s.team.id, name: s.team.name }).from(s.team).where(inLeague);
  const teamId = (name: string) => teams.find((t) => t.name === name)!.id;

  /* the sample children: on the programme, with consent */
  for (const k of kids) {
    const [enrolled] = await db.select({ id: s.enrolment.id }).from(s.enrolment).where(and(eq(s.enrolment.profileId, k.id), eq(s.enrolment.status, "active"))).limit(1);
    if (!enrolled) await db.insert(s.enrolment).values({ profileId: k.id, programme: PROGRAMME, dailyMinutes: MINUTES, daysPerWeek: DAYS, week: 4, startedAt: startOfDay(addDays(from, -7)) });
    const [consent] = await db.select({ id: s.consent.id }).from(s.consent).where(and(eq(s.consent.profileId, k.id), eq(s.consent.kind, "parental"), isNull(s.consent.revokedAt))).limit(1);
    if (!consent) await db.insert(s.consent).values({ profileId: k.id, accountId: k.accountId, kind: "parental", textVersion: "2026-10" });
  }

  /* seats: a profile that already has one keeps it */
  const wanted = [{ profileId: aarav.id, team: TEAMS[0] }, ...kids.slice(0, SEATS.length).map((k, i) => ({ profileId: k.id, team: SEATS[i] }))];
  for (const w of wanted) {
    const [seated] = await db.select({ id: s.teamMember.teamId }).from(s.teamMember).where(eq(s.teamMember.profileId, w.profileId)).limit(1);
    if (!seated) await db.insert(s.teamMember).values({ teamId: teamId(w.team), profileId: w.profileId, countsFrom: from });
  }

  /* three earlier weeks of days. Sunday is the rest day; some members miss a day now and then. */
  const members = [aarav.id, ...kids.map((k) => k.id)];
  const rows = members.flatMap((profileId, k) => {
    const out: (typeof s.daySummary.$inferInsert)[] = [];
    for (let n = 0, day = from; day <= addDays(today, -7); n++, day = addDays(from, n)) {
      if (n % 7 === 6) continue;
      const missed = (n * 7 + k * 5) % 11 < k % 3;
      out.push({ profileId, day, trainMinutes: missed ? (n % 2 ? 25 : 0) : MINUTES, trainGoal: MINUTES });
    }
    return out;
  });
  if (rows.length) await db.insert(s.daySummary).values(rows).onConflictDoNothing();

  /* one day the stop rule ended, two weeks ago: it must not count against that child's team */
  const stopped = kids[2];
  if (stopped) {
    const day = addDays(week, -12), at = new Date(startOfDay(day).getTime() + 17 * 3_600_000);
    await db.insert(s.daySummary).values({ profileId: stopped.id, day, trainMinutes: 20, trainGoal: MINUTES })
      .onConflictDoUpdate({ target: [s.daySummary.profileId, s.daySummary.day], set: { trainMinutes: 20, trainGoal: MINUTES } });
    const [has] = await db.select({ id: s.session.id }).from(s.session)
      .where(and(eq(s.session.profileId, stopped.id), eq(s.session.endReason, "stop_rule"), eq(s.session.startedAt, at))).limit(1);
    if (!has) await db.insert(s.session).values({ profileId: stopped.id, kind: "game", itemSlug: "firefly-catch", ring: "train", minutes: 20, endReason: "stop_rule", stopSymptom: "headache", startedAt: at, endedAt: at });
  }

  /* the weeks, counted by the job's own code: an open row for each earlier week is what the job finds and closes */
  await db.insert(s.teamWeek).values([-21, -14, -7].flatMap((back) => teams.map((t) => ({ teamId: t.id, weekStart: addDays(week, back), daysFinished: 0, daysPossible: 0 })))).onConflictDoNothing();
  const closed = await closeWeeks(db, today);
  const opened = await refreshWeek(db, today);
  console.log(`League: ${teams.length} teams, ${wanted.length} members, ${closed.rows} past rows closed, ${opened} rows this week.`);
}

if (/scripts[\\/]seed[\\/]league\.ts$/.test(process.argv[1] ?? "")) seedLeague().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
