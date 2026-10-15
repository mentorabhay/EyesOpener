/**
 * The show-up league's two jobs. The rules are in src/lib/league.ts; the reading and writing in src/lib/teams.ts.
 *
 * - `league-week` (weekly, Monday early morning in India): closes every week that has ended with its final days,
 *   then opens this week's row for every team. A closed row is never written again, so a second run changes nothing.
 * - `league-days` (daily): takes members off teams they may no longer be on, then brings this week's stored days up
 *   to date. The page works this week out afresh each time it is read; the stored row is the copy that gets closed.
 *
 * Both answer with counts only.
 */
import { league as words } from "@/copy/league";
import { dayOf } from "@/lib/league";
import { closeWeeks, refreshWeek, tidySeats } from "@/lib/teams";
import type { Job } from "./index";

export const leagueWeek: Job = {
  name: "league-week",
  cadence: "weekly",
  get what() { return words.jobs.week; },
  run: async (now) => {
    const today = dayOf(now);
    const closed = await closeWeeks(undefined, today);
    const opened = await refreshWeek(undefined, today);
    return { ok: true, note: words.jobs.done, counts: { weeks_closed: closed.weeks, rows_closed: closed.rows, rows_this_week: opened } };
  },
};

export const leagueDays: Job = {
  name: "league-days",
  cadence: "daily",
  get what() { return words.jobs.days; },
  run: async (now) => {
    const today = dayOf(now);
    const removed = await tidySeats(today);
    const refreshed = await refreshWeek(undefined, today);
    return { ok: true, note: words.jobs.done, counts: { seats_removed: removed, rows_this_week: refreshed } };
  },
};
