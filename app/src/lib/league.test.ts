import { describe, expect, it } from "vitest";
import { TEAM_NAMES } from "@/copy/league";
import { programmes } from "@/data";
import {
  addDays, AGE_BANDS, ageBandOf, countsFromFor, dayOf, daysOfWeek, finishedDay, freeName, keepsSeat, LEAGUE_TEAMS, leagueDays, leagueEntry,
  mayChangeTeam, memberWeek, nextChangeDay, pickTeam, placed, startOfDay, TEAM_MAX, TEAM_PAIR, teamDays, weekOf, weeksToClose,
  type DayRow, type TeamSeats,
} from "./league";

/* 5 October 2026 is a Monday. */
const MON = "2026-10-05";
const day = (offset: number, trainMinutes: number, trainGoal = 60): DayRow => ({ day: addDays(MON, offset), trainMinutes, trainGoal });
const lazy = { programme: "lazy-eye", dailyMinutes: 60, daysPerWeek: 6 };

describe("league weeks", () => {
  it("run Monday to Sunday", () => {
    expect(weekOf("2026-10-05")).toBe("2026-10-05");
    expect(weekOf("2026-10-11")).toBe("2026-10-05");
    expect(weekOf("2026-10-12")).toBe("2026-10-12");
    expect(weekOf("2026-10-04")).toBe("2026-09-28");
    expect(daysOfWeek(MON)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
  });
  it("cross a month and a year", () => {
    expect(weekOf("2027-01-01")).toBe("2026-12-28");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("start at midnight in India", () => {
    expect(startOfDay(MON).toISOString()).toBe("2026-10-04T18:30:00.000Z");
    expect(dayOf(new Date("2026-10-04T18:29:59Z"))).toBe("2026-10-04");
    expect(dayOf(new Date("2026-10-04T18:30:00Z"))).toBe("2026-10-05");
    expect(dayOf(startOfDay(MON))).toBe(MON);
  });
  it("count a new member from a Monday: the same day on a Monday, the next Monday otherwise", () => {
    expect(countsFromFor("2026-10-05")).toBe("2026-10-05");
    expect(countsFromFor("2026-10-06")).toBe("2026-10-12");
    expect(countsFromFor("2026-10-11")).toBe("2026-10-12");
  });
});

describe("who may join a league", () => {
  const child = { tester: false, kind: "child" as const, age: 6, consented: true, enrolment: lazy };

  it("puts children and adults in separate age bands", () => {
    expect(ageBandOf("child", 4)).toBe("4 to 7");
    expect(ageBandOf("child", 7)).toBe("4 to 7");
    expect(ageBandOf("child", 8)).toBe("8 to 12");
    expect(ageBandOf("child", 12)).toBe("8 to 12");
    expect(ageBandOf("child", 13)).toBe("13 to 17");
    expect(ageBandOf("child", 17)).toBe("13 to 17");
    expect(ageBandOf("child", 18)).toBe("adults");
    expect(ageBandOf("adult", null)).toBe("adults");
    expect(ageBandOf("adult", 68)).toBe("adults");
    for (let age = 4; age < 18; age++) expect(ageBandOf("child", age)).not.toBe("adults");
    expect(new Set(AGE_BANDS).size).toBe(4);
  });
  it("has no band for a child under the screen age or of unknown age", () => {
    expect(ageBandOf("child", 3)).toBeNull();
    expect(ageBandOf("child", null)).toBeNull();
  });
  it("offers a member on a programme the league of that programme and age band", () => {
    expect(leagueEntry(child)).toEqual({ ok: true, programme: "lazy-eye", band: "4 to 7" });
    expect(leagueEntry({ ...child, kind: "adult", age: null })).toEqual({ ok: true, programme: "lazy-eye", band: "adults" });
  });
  it("offers nothing without a programme", () => {
    expect(leagueEntry({ ...child, enrolment: null })).toEqual({ ok: false, reason: "no_programme" });
  });
  it("offers nothing on a programme with no minutes to finish", () => {
    expect(leagueEntry({ ...child, enrolment: { programme: "eye-fitness", dailyMinutes: 0, daysPerWeek: 7 } })).toEqual({ ok: false, reason: "no_daily_minutes" });
    /* A counsellor-led programme before the counsellor has set the dose. */
    expect(leagueEntry({ ...child, enrolment: { programme: "squint", dailyMinutes: 0, daysPerWeek: 0 } })).toEqual({ ok: false, reason: "no_daily_minutes" });
    expect(leagueEntry({ ...child, enrolment: { programme: "squint", dailyMinutes: 20, daysPerWeek: 0 } })).toEqual({ ok: false, reason: "no_daily_minutes" });
    expect(leagueEntry({ ...child, enrolment: { programme: "squint", dailyMinutes: 20, daysPerWeek: 4 } }).ok).toBe(true);
  });
  it("lets a child join only while a guardian's consent stands", () => {
    expect(leagueEntry({ ...child, consented: false })).toEqual({ ok: false, reason: "needs_consent" });
    /* An adult needs nobody's consent. */
    expect(leagueEntry({ ...child, kind: "adult", age: 30, consented: false }).ok).toBe(true);
  });
  it("offers nothing to a child under 4", () => {
    expect(leagueEntry({ ...child, age: 3 })).toEqual({ ok: false, reason: "too_young" });
  });
  it("never seats a staff test household", () => {
    expect(leagueEntry({ ...child, tester: true })).toEqual({ ok: false, reason: "tester" });
  });
  it("keeps a seat only while the member is on the programme, not archived, and a child has consent", () => {
    const ok = { archived: false, kind: "child" as const, consented: true, onProgramme: true };
    expect(keepsSeat(ok)).toBe(true);
    expect(keepsSeat({ ...ok, archived: true })).toBe(false);
    expect(keepsSeat({ ...ok, onProgramme: false })).toBe(false);
    expect(keepsSeat({ ...ok, consented: false })).toBe(false);
    expect(keepsSeat({ ...ok, kind: "adult", consented: false })).toBe(true);
  });
});

describe("finishing a day", () => {
  it("is reaching the day's training minutes", () => {
    expect(finishedDay({ trainMinutes: 60, trainGoal: 60 })).toBe(true);
    expect(finishedDay({ trainMinutes: 59, trainGoal: 60 })).toBe(false);
    expect(finishedDay({ trainMinutes: 45, trainGoal: 60 })).toBe(false);
    expect(finishedDay({ trainMinutes: 0, trainGoal: 60 })).toBe(false);
  });
  it("forgives a few seconds of clock error and no more", () => {
    expect(finishedDay({ trainMinutes: 59.96, trainGoal: 60 })).toBe(true);
    expect(finishedDay({ trainMinutes: 59.9, trainGoal: 60 })).toBe(false);
  });
  it("is never possible on a day with no minutes set", () => {
    expect(finishedDay({ trainMinutes: 0, trainGoal: 0 })).toBe(false);
    expect(finishedDay({ trainMinutes: 40, trainGoal: 0 })).toBe(false);
  });
  it("is the same for extra minutes as for the exact minutes", () => {
    expect(finishedDay({ trainMinutes: 90, trainGoal: 60 })).toBe(finishedDay({ trainMinutes: 60, trainGoal: 60 }));
  });
  it("never asks for more than the daily cap", () => {
    expect(finishedDay({ trainMinutes: 90, trainGoal: 120 })).toBe(true);
  });
});

describe("a member's week", () => {
  const week = (days: DayRow[], more: Partial<Parameters<typeof memberWeek>[0]> = {}) =>
    memberWeek({ week: MON, daysPerWeek: 6, days, stopDays: [], countsFrom: null, ...more });

  it("counts finished days out of the days the programme asks for", () => {
    expect(week([day(0, 60), day(1, 60), day(2, 30), day(3, 60)])).toEqual({ finished: 3, asked: 6 });
    expect(week([])).toEqual({ finished: 0, asked: 6 });
  });
  it("never counts a rest day against the member", () => {
    /* Six days asked, six finished, the seventh not trained: a full week. */
    expect(week([0, 1, 2, 3, 4, 5].map((i) => day(i, 60)))).toEqual({ finished: 6, asked: 6 });
    expect(week([0, 2, 4, 5, 6].map((i) => day(i, 15, 15)), { daysPerWeek: 5 })).toEqual({ finished: 5, asked: 5 });
  });
  it("gives nothing for a day beyond the days asked", () => {
    expect(week([0, 1, 2, 3, 4, 5, 6].map((i) => day(i, 60)))).toEqual({ finished: 6, asked: 6 });
    expect(week([0, 1, 2, 3, 4, 5, 6].map((i) => day(i, 90)))).toEqual({ finished: 6, asked: 6 });
  });
  it("ignores days outside the week", () => {
    expect(week([day(-1, 60), day(7, 60), day(0, 60)])).toEqual({ finished: 1, asked: 6 });
  });
  it("excuses a day the stop rule ended: it is never a missed day", () => {
    const five = [0, 1, 2, 3, 4].map((i) => day(i, 60));
    /* Five finished, the sixth day stopped at 20 minutes: a full week of the days that could be asked. */
    expect(week([...five, day(5, 20)], { stopDays: [addDays(MON, 5)] })).toEqual({ finished: 5, asked: 5 });
    /* The same week without the stop is one day short. */
    expect(week([...five, day(5, 20)])).toEqual({ finished: 5, asked: 6 });
    /* A stopped day with no day row at all is excused too. */
    expect(week(five, { stopDays: [addDays(MON, 6)] })).toEqual({ finished: 5, asked: 5 });
  });
  it("counts a stopped day as finished when the minutes had been reached", () => {
    expect(week([day(0, 60)], { stopDays: [MON] })).toEqual({ finished: 1, asked: 6 });
  });
  it("counts two stopped sessions on one day once, and ignores a stop in another week", () => {
    expect(week([], { stopDays: [MON, MON, addDays(MON, -3)] })).toEqual({ finished: 0, asked: 5 });
  });
  it("asks for nothing in a week where every asked day was stopped", () => {
    expect(week([], { daysPerWeek: 2, stopDays: [MON, addDays(MON, 1), addDays(MON, 2)] })).toEqual({ finished: 0, asked: 0 });
  });
  it("does not count a member before the Monday they start", () => {
    expect(week([day(0, 60)], { countsFrom: addDays(MON, 7) })).toEqual({ finished: 0, asked: 0 });
    expect(week([day(0, 60)], { countsFrom: MON })).toEqual({ finished: 1, asked: 6 });
    expect(week([day(0, 60)], { countsFrom: addDays(MON, -7) })).toEqual({ finished: 1, asked: 6 });
  });
});

describe("a team's week", () => {
  it("is shown on the programme's own scale", () => {
    expect(leagueDays("lazy-eye")).toBe(6);
    expect(leagueDays("convergence")).toBe(5);
    /* Counsellor-led programmes set their own days: a fixed scale is used. */
    expect(leagueDays("squint")).toBe(5);
    expect(leagueDays("no-such-programme")).toBe(5);
    for (const p of programmes) expect(leagueDays(p.slug)).toBeGreaterThanOrEqual(1);
  });
  it("is the pooled share of asked days, so team size does not decide it", () => {
    const full = { finished: 6, asked: 6 }, half = { finished: 3, asked: 6 };
    expect(teamDays([full], 6)).toEqual({ daysFinished: 6, daysPossible: 6 });
    expect(teamDays([full, full, full, full, full], 6)).toEqual({ daysFinished: 6, daysPossible: 6 });
    expect(teamDays([half], 6)).toEqual({ daysFinished: 3, daysPossible: 6 });
    expect(teamDays([half, half, half], 6)).toEqual({ daysFinished: 3, daysPossible: 6 });
    expect(teamDays([full, half], 6)).toEqual({ daysFinished: 5, daysPossible: 6 });
  });
  it("is never more than the scale, whatever the members report", () => {
    expect(teamDays([{ finished: 9, asked: 6 }], 6)).toEqual({ daysFinished: 6, daysPossible: 6 });
  });
  it("does not show an excused day: the scale stays the same and the day is not missed", () => {
    /* One member had a day excused (5 of 5), the other finished 6 of 6. */
    expect(teamDays([{ finished: 5, asked: 5 }, { finished: 6, asked: 6 }], 6)).toEqual({ daysFinished: 6, daysPossible: 6 });
  });
  it("puts members with different days asked on one scale", () => {
    expect(teamDays([{ finished: 4, asked: 4 }, { finished: 3, asked: 6 }], 5)).toEqual({ daysFinished: 4, daysPossible: 5 });
  });
  it("is not in the table when nobody has a day to count", () => {
    expect(teamDays([], 6)).toBeNull();
    expect(teamDays([{ finished: 0, asked: 0 }], 6)).toBeNull();
  });
});

describe("places", () => {
  const rows = [{ name: "Starfish", daysFinished: 5 }, { name: "Kite Club", daysFinished: 6 }, { name: "Team Mango", daysFinished: 5 }, { name: "Night Owls", daysFinished: 2 }];

  it("come from days finished alone, and a tie is a tie", () => {
    expect(placed(rows).map((r) => [r.name, r.place, r.tied])).toEqual([
      ["Kite Club", 1, false], ["Starfish", 2, true], ["Team Mango", 2, true], ["Night Owls", 4, false],
    ]);
  });
  it("give every team first place when all are level", () => {
    expect(placed(rows.map((r) => ({ ...r, daysFinished: 0 }))).every((r) => r.place === 1 && r.tied)).toBe(true);
  });
  it("do not change the rows they are given", () => {
    const before = JSON.stringify(rows);
    placed(rows);
    expect(JSON.stringify(rows)).toBe(before);
  });
});

describe("filling teams", () => {
  const team = (id: string, members: number, leagueId = "L1"): TeamSeats => ({ id, leagueId, name: TEAM_NAMES[Number(id.slice(1)) - 1], members });
  const pick = (teams: TeamSeats[], more: Partial<Parameters<typeof pickTeam>[0]> = {}) =>
    pickTeam({ leagues: [...new Set(teams.map((t) => t.leagueId))], teams, ...more }, TEAM_NAMES);

  it("uses only names from the fixed list, each once in a league", () => {
    expect(new Set(TEAM_NAMES).size).toBe(TEAM_NAMES.length);
    expect(TEAM_NAMES.length).toBeGreaterThanOrEqual(LEAGUE_TEAMS);
    expect(freeName([], TEAM_NAMES)).toBe(TEAM_NAMES[0]);
    expect(freeName([TEAM_NAMES[0], TEAM_NAMES[2]], TEAM_NAMES)).toBe(TEAM_NAMES[1]);
    expect(TEAM_NAMES).toContain(freeName([...TEAM_NAMES], TEAM_NAMES));
  });
  it("opens a league for the first member", () => {
    expect(pick([])).toEqual({ kind: "new_league", name: TEAM_NAMES[0] });
  });
  it("gives the second member the first member's team, then opens a new team", () => {
    expect(pick([team("t1", 1)])).toEqual({ kind: "team", teamId: "t1" });
    expect(pick([team("t1", 2)])).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[1] });
  });
  it("fills thirty members into six even teams, and the thirty-first opens a new league", () => {
    const teams: TeamSeats[] = [];
    for (let n = 0; n < TEAM_MAX * LEAGUE_TEAMS; n++) {
      const p = pickTeam({ leagues: teams.length ? ["L1"] : [], teams }, TEAM_NAMES);
      if (p.kind === "team") teams.find((t) => t.id === p.teamId)!.members += 1;
      else teams.push({ id: `t${teams.length + 1}`, leagueId: "L1", name: p.name, members: 1 });
      const sizes = teams.map((t) => t.members);
      /* Teams never differ by more than the size of a pair while they fill. */
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(TEAM_PAIR);
    }
    expect(teams.map((t) => t.members)).toEqual(Array(LEAGUE_TEAMS).fill(TEAM_MAX));
    expect(new Set(teams.map((t) => t.name)).size).toBe(LEAGUE_TEAMS);
    expect(pickTeam({ leagues: ["L1"], teams }, TEAM_NAMES).kind).toBe("new_league");
  });
  it("never passes the size limit", () => {
    const full = team("t1", TEAM_MAX);
    expect(pick([full])).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[1] });
    expect(pick([full], { family: ["t1"] })).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[1] });
    expect(pick([full], { back: "t1" })).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[1] });
  });
  it("gives the team with the fewest members once the league has all its teams", () => {
    const teams = [team("t1", 3), team("t2", 2), team("t3", 4), team("t4", 3), team("t5", 5), team("t6", 3)];
    expect(pick(teams)).toEqual({ kind: "team", teamId: "t2" });
  });
  it("fills a team that lost its members before it opens another", () => {
    expect(pick([team("t1", 3), team("t2", 0)])).toEqual({ kind: "team", teamId: "t2" });
  });
  it("keeps a household together by default", () => {
    const teams = [team("t1", 4), team("t2", 2), team("t3", 2)];
    expect(pick(teams, { family: ["t1"] })).toEqual({ kind: "team", teamId: "t1" });
  });
  it("sends a member who left this week back to the same team", () => {
    const teams = [team("t1", 4), team("t2", 1)];
    expect(pick(teams, { back: "t1" })).toEqual({ kind: "team", teamId: "t1" });
    expect(pick(teams, { back: "gone" })).toEqual({ kind: "team", teamId: "t2" });
  });
  it("never gives the team a member asked to move away from", () => {
    expect(pick([team("t1", 1)], { avoid: "t1" })).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[1] });
    expect(pick([team("t1", 1), team("t2", 2)], { avoid: "t1", family: ["t1"], back: "t1" })).toEqual({ kind: "new_team", leagueId: "L1", name: TEAM_NAMES[2] });
    const six = [team("t1", 1), team("t2", 2), team("t3", 3), team("t4", 3), team("t5", 3), team("t6", 3)];
    expect(pick(six, { avoid: "t1" })).toEqual({ kind: "team", teamId: "t2" });
  });
  it("uses the oldest league with room before a newer one", () => {
    const first = [1, 2, 3, 4, 5, 6].map((n) => team(`t${n}`, TEAM_MAX, "L1"));
    expect(pickTeam({ leagues: ["L1", "L2"], teams: [...first, team("t7", 1, "L2")] }, TEAM_NAMES)).toEqual({ kind: "team", teamId: "t7" });
    first[3].members = 4;
    expect(pickTeam({ leagues: ["L1", "L2"], teams: [...first, team("t7", 1, "L2")] }, TEAM_NAMES)).toEqual({ kind: "team", teamId: "t4" });
  });
  it("reads nothing about the member: the same teams always give the same answer", () => {
    const teams = [team("t1", 2), team("t2", 2)];
    expect(pick(teams)).toEqual(pick(teams));
  });
});

describe("changing team", () => {
  it("is allowed once in a league week", () => {
    expect(mayChangeTeam(null, "2026-10-07")).toBe(true);
    expect(mayChangeTeam("2026-10-05", "2026-10-07")).toBe(false);
    expect(mayChangeTeam("2026-10-05", "2026-10-11")).toBe(false);
    expect(mayChangeTeam("2026-10-11", "2026-10-12")).toBe(true);
    expect(mayChangeTeam("2026-09-30", "2026-10-05")).toBe(true);
  });
  it("opens again on the next Monday", () => {
    expect(nextChangeDay("2026-10-07")).toBe("2026-10-12");
    expect(nextChangeDay("2026-10-05")).toBe("2026-10-12");
  });
});

describe("the weekly job", () => {
  it("closes the week that just ended, and any earlier week left open", () => {
    expect(weeksToClose([], "2026-10-05")).toEqual(["2026-09-28"]);
    expect(weeksToClose(["2026-09-14", "2026-09-28"], "2026-10-07")).toEqual(["2026-09-14", "2026-09-28"]);
  });
  it("never closes the week that is running", () => {
    expect(weeksToClose(["2026-10-05"], "2026-10-05")).toEqual(["2026-09-28"]);
    expect(weeksToClose(["2026-10-05"], "2026-10-11")).toEqual(["2026-09-28"]);
  });
  it("names each week once, so a second run finds the same work and no more", () => {
    expect(weeksToClose(["2026-09-28", "2026-09-28"], "2026-10-05")).toEqual(["2026-09-28"]);
  });
});
