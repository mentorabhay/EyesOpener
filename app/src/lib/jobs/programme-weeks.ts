// Eyes Opener: Daily job: moves every active programme on to the week the calendar says, and closes a course that has run all.
/**
 * Daily job: moves every active programme on to the week the calendar says, and closes a course that has run all
 * its weeks. The member's own visit to Today does the same for that member; this job covers everyone who has not
 * opened the app, so the lists a guardian or a counsellor reads show the right week.
 * Safe to run twice: a row changes only when it is out of date. The rule itself is `advance` in programme-rules.ts.
 * Answers with counts only.
 */
import { programme as words } from "@/copy/programme";
import type { Job } from "./index";

export const programmeWeeks: Job = {
  name: "programme-weeks",
  cadence: "daily",
  get what() { return words.job.what; },
  run: async (now) => {
    /* loaded when the job runs, so the list of jobs stays light to import */
    const { syncAllEnrolments } = await import("@/lib/programme");
    return { ok: true, note: words.job.done, counts: await syncAllEnrolments(now) };
  },
};
