/**
 * Daily job: the pooled result of every open experiment.
 * For each one it reads the members who finished with a pair of check-ups that can be compared, works out the
 * mean change in each group, the gap and its 95% interval (src/lib/experiments.ts), and stores that as the
 * experiment's signal. With fewer than the minimum in either group it stores nothing and removes an older result.
 * Safe to run twice: each experiment keeps one signal row, written from scratch every time.
 */
import { experiments as words } from "@/copy/experiments";
import { recomputeOpenSignals } from "@/lib/experiment-data";
import type { Job } from "./index";

export const experimentSignals: Job = {
  name: "experiment-signals",
  cadence: "daily",
  what: words.job.what,
  run: async (now) => ({ ok: true, note: words.job.note, counts: await recomputeOpenSignals(now) }),
};
