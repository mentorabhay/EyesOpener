/**
 * The daily job for the workday monitor: one-minute samples are kept for a limited time, then removed.
 * Day totals (screen time, breaks on the Rest ring) stay. It also closes runs a closed tab left open.
 * The work is in src/lib/monitor.ts. Safe to run twice; answers with counts only.
 */
import { trimMonitor } from "@/lib/monitor";
import { RULE } from "@/lib/monitor-rules";
import type { Job } from "./index";

export const monitorSamples: Job = {
  name: "monitor-samples",
  cadence: "daily",
  what: `Removes one-minute samples of the workday monitor that are older than ${RULE.keepDays} days, and closes monitor runs left open for more than a day.`,
  run: async (now) => {
    const counts = await trimMonitor(now);
    return { ok: true, note: counts.samples || counts.runs ? "old samples removed" : "nothing was due", counts };
  },
};
