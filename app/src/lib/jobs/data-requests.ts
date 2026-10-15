/**
 * The daily job for data requests: copies and deletions that families asked for in Settings.
 * The rules and the work are in src/lib/data/requests.ts. Safe to run twice; answers with counts only.
 */
import { JOB_NAME, runDataRequests } from "@/lib/data/requests";
import { WAIT_DAYS } from "@/lib/data/state";
import type { Job } from "./index";

export const dataRequests: Job = {
  name: JOB_NAME,
  cadence: "daily",
  what: `Closes copies whose days ran out, and deletes for good every household and profile whose ${WAIT_DAYS} days of waiting are over.`,
  run: runDataRequests,
};
