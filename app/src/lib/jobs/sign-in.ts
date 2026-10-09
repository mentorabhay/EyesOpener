/**
 * The daily tidy-up for sign-in. Safe to run twice; answers with counts only.
 *  1. Counts of sign-in links asked for, and emailed sign-in codes, are kept for a day. Older ones are removed here,
 *     so the tables empty even on a day when nobody signs in.
 *  2. Sign-in accounts still waiting to be removed from Firebase Authentication are tried again. (The data-requests
 *     job removes them right after a deletion; this catches what that run could not finish.)
 */
import { forgetOldCodes } from "@/lib/signin/code";
import { forgetOldAsks } from "@/lib/signin/limit";
import { removeQueued, REMOVAL_NOTES } from "@/lib/signin/removal";
import type { Job } from "./index";

export const signInTidy: Job = {
  name: "sign-in-tidy",
  cadence: "daily",
  what: "Removes day-old counts of sign-in links and day-old sign-in codes, and removes from the sign-in service the accounts of people who were deleted.",
  run: async (now) => {
    const asksForgotten = await forgetOldAsks(now), codesForgotten = await forgetOldCodes(now);
    const signIns = await removeQueued(now);
    const expected = signIns.left === 0 || signIns.note === REMOVAL_NOTES.noIdentity || signIns.note === REMOVAL_NOTES.notSetUp;
    return { ok: expected, note: signIns.note || "done", counts: { asksForgotten, codesForgotten, signInsRemoved: signIns.removed, signInsLeft: signIns.left } };
  },
};
