// Eyes Opener: Daily job: closes every Discovery Board round whose last day to vote has passed.
/**
 * Daily job: closes every Discovery Board round whose last day to vote has passed.
 * A round is already closed for voting from the day after its closing day (`roundState` in src/lib/discovery.ts
 * reads the calendar), so nothing depends on this job running on time. It only stamps the round as closed.
 * Safe to run twice: a round that is stamped is not touched again. It answers with a count only.
 */
import { discovery as words } from "@/copy/discovery";
import type { Job } from "./index";

export const discoveryRounds: Job = {
  name: "discovery-rounds",
  cadence: "daily",
  get what() { return words.job.what; },
  run: async (now) => {
    /* loaded when the job runs, so listing the jobs does not open the Discovery Board's queries */
    const { closeDueRounds } = await import("@/lib/discovery-data");
    return { ok: true, note: words.job.note, counts: { rounds_closed: await closeDueRounds(now) } };
  },
};
