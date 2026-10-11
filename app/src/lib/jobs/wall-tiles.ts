// Eyes Opener: The Focus Wall's daily job. The rules are in src/lib/wall-rules.ts; the reading and writing in src/lib/wall.ts.
/**
 * The Focus Wall's daily job. The rules are in src/lib/wall-rules.ts; the reading and writing in src/lib/wall.ts.
 *
 * `wall-tiles` (daily): opens this month's picture if it has none yet, then gives every finished practice day
 * its tile, this month and (for days finished late on the last evening) the month before. A day that has its
 * tile is passed over, so a second run adds nothing. It answers with counts only.
 */
import { wall as words } from "@/copy/wall";
import { dayOf } from "@/lib/league";
import { settleTiles, wallOf } from "@/lib/wall";
import { monthOf, shiftMonth } from "@/lib/wall-rules";
import type { Job } from "./index";

export const wallTiles: Job = {
  name: "wall-tiles",
  cadence: "daily",
  get what() { return words.job.what; },
  run: async (now) => {
    const today = dayOf(now), month = monthOf(today), before = shiftMonth(month, -1);
    /* Last month's picture is only added to, never made after the month has ended. */
    const late = (await wallOf(before)) ? await settleTiles(before, { today }) : 0;
    const added = await settleTiles(month, { today });
    return { ok: true, note: words.job.done, counts: { tiles_this_month: added, tiles_last_month: late } };
  },
};
