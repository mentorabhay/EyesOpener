/**
 * Jobs that run on a schedule with nobody signed in: clean-up, weekly league rows, pooled results.
 *
 * - A job is one file in this folder that exports a `Job`. Add it to `JOBS` below.
 * - A scheduler calls `POST /api/jobs/daily` once a day and `POST /api/jobs/weekly` once a week (Monday, early
 *   morning in India), with the header `x-job-secret`. With `JOB_SECRET` unset the address does not exist.
 * - Staff can run one job by name from the admin console (`runJob`), and that is audited by the caller.
 * - A job must be safe to run twice: it works out what is due and does only that.
 * - Every run is written to the audit log with counts only, never a name or a result.
 */
import crypto from "node:crypto";
import { db, schema } from "@/db";
import { dataRequests } from "./data-requests";
import { discoveryRounds } from "./discovery-rounds";
import { experimentSignals } from "./experiment-signals";
import { extraJobs } from "./extra";
import { leagueDays, leagueWeek } from "./league";
import { monitorSamples } from "./monitor-samples";
import { programmeWeeks } from "./programme-weeks";
import { signInTidy } from "./sign-in";
import { wallTiles } from "./wall-tiles";

export type Cadence = "daily" | "weekly";
export interface JobResult { ok: boolean; note: string; counts?: Record<string, number> }
export interface Job {
  /** Short name, lower case with dashes. Shown to staff. */
  name: string;
  cadence: Cadence;
  /** One plain sentence saying what it does. Shown to staff. */
  what: string;
  run: (now: Date) => Promise<JobResult>;
}

/** Every scheduled job. A builder adds an import above and one entry here. */
export const JOBS: readonly Job[] = [
  experimentSignals,
  leagueWeek,
  leagueDays,
  dataRequests,
  signInTidy,
  programmeWeeks,
  monitorSamples,
  discoveryRounds,
  wallTiles,
  /* jobs an edition adds (./extra.ts) */
  ...extraJobs,
];

/** The secret a scheduler must send. Null when jobs cannot be called from outside. */
export const jobSecret = (env: string | undefined = process.env.JOB_SECRET): string | null => (env && env.trim().length >= 16 ? env.trim() : null);

/** Compares in constant time. False when no secret is set. */
export function jobSecretMatches(given: string | null | undefined, secret: string | null = jobSecret()): boolean {
  if (!secret || !given) return false;
  const a = crypto.createHash("sha256").update(given).digest(), b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export const isCadence = (v: string): v is Cadence => v === "daily" || v === "weekly";

async function runOne(job: Job, now: Date, by: string | null): Promise<JobResult & { name: string }> {
  let result: JobResult;
  try { result = await job.run(now); } catch (e) { result = { ok: false, note: e instanceof Error ? e.message.slice(0, 200) : "failed" }; }
  await db.insert(schema.auditLog).values({ userId: by, action: `job.${job.name}`, target: null, meta: { ok: result.ok, note: result.note, counts: result.counts ?? {} } });
  return { name: job.name, ...result };
}

/** Runs every job of one cadence, one after another. One failing job does not stop the rest. */
export async function runJobs(cadence: Cadence, now = new Date(), jobs: readonly Job[] = JOBS) {
  const out = [];
  for (const job of jobs.filter((j) => j.cadence === cadence)) out.push(await runOne(job, now, null));
  return out;
}

/** Runs one job by name for a staff member. The caller checks the staff gate first. Null when there is no such job. */
export async function runJob(name: string, staffUserId: string, now = new Date(), jobs: readonly Job[] = JOBS) {
  const job = jobs.find((j) => j.name === name);
  return job ? runOne(job, now, staffUserId) : null;
}
