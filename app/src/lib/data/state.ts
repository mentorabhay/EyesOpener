// Eyes Opener: What a data request is doing right now, worked out from its row. Pure rules, unit-tested.
/**
 * What a data request is doing right now, worked out from its row. Pure rules, unit-tested.
 * The Settings page, the staff room and the daily job all read a request through these functions.
 *
 * A copy (`kind` export):
 *   open      asked, not ready yet. Only rows from before the job existed are ever in this state.
 *   ready     the family can download it until `expiresAt`.
 *   done      its days ran out and the job closed it.
 * A deletion (`kind` delete), of the household or of one profile (`scope`):
 *   open      waiting until `deleteAfter`. A guardian can cancel. With no date yet, the job sets one.
 *   cancelled a guardian cancelled, or the job would not delete (the demo family, a household's last profile).
 *   done      one profile was deleted. The row stays as the family's record. After a household is deleted
 *             no row is left at all: only a count in the audit log says it happened.
 */

/** A copy can be downloaded for this many days after it is made. */
export const COPY_DAYS = 7;
/** A deletion waits this many days, so that a guardian can change their mind. The privacy page says the same number. */
export const WAIT_DAYS = 7;

const DAY = 86_400_000;
export const addDays = (from: Date, days: number) => new Date(from.getTime() + days * DAY);

export interface RequestFacts {
  kind: "export" | "delete";
  status: string;
  scope: string;
  readyAt: Date | null;
  expiresAt: Date | null;
  downloadedAt: Date | null;
  deleteAfter: Date | null;
}

export type RequestState =
  | "asked"       // recorded; the job has not touched it yet
  | "ready"       // a copy that can be downloaded
  | "downloaded"  // a copy that can still be downloaded and has been
  | "expired"     // a copy whose days ran out
  | "waiting"     // a deletion inside its waiting time
  | "due"         // a deletion whose waiting time is over: the next run of the job does it
  | "cancelled"
  | "deleted";    // one profile was deleted

export function stateOf(r: RequestFacts, now: Date): RequestState {
  if (r.status === "cancelled") return "cancelled";
  if (r.kind === "export") {
    if (r.status === "open") return "asked";
    if (r.status === "done" || !r.expiresAt || r.expiresAt <= now) return "expired";
    return r.downloadedAt ? "downloaded" : "ready";
  }
  if (r.status === "done") return "deleted";
  if (!r.deleteAfter) return "asked";
  return r.deleteAfter > now ? "waiting" : "due";
}

/** May the file be downloaded now? */
export const canDownload = (r: RequestFacts, now: Date) => { const s = stateOf(r, now); return r.kind === "export" && (s === "ready" || s === "downloaded"); };

/** Is this request still running: something the family or the job has yet to do with it? */
export const isLive = (r: RequestFacts, now: Date) => ["asked", "ready", "downloaded", "waiting", "due"].includes(stateOf(r, now));

/** May a guardian still cancel it? Any deletion that has not happened. */
export const canCancel = (r: RequestFacts, now: Date) => { const s = stateOf(r, now); return r.kind === "delete" && (s === "asked" || s === "waiting" || s === "due"); };

export type JobStep = "make_ready" | "close" | "set_date" | "delete";

/** What the daily job does with a request, or null when there is nothing to do. Doing the step twice changes nothing. */
export function stepFor(r: RequestFacts, now: Date): JobStep | null {
  if (r.kind === "export") {
    if (r.status === "open") return "make_ready";
    if (r.status === "ready" && (!r.expiresAt || r.expiresAt <= now)) return "close";
    return null;
  }
  if (r.status !== "open") return null;
  if (!r.deleteAfter) return "set_date";
  return r.deleteAfter <= now ? "delete" : null;
}

/** Which grown-ups go when their household is deleted, and which only lose their seat in it. */
export interface PersonFacts { id: string; staff: boolean; counsellor: boolean; sponsor: boolean }

/**
 * A grown-up who signs in only for this household is deleted with it.
 * One who also signs in as staff, as a counsellor (now, or with a link to any family on record) or for a sponsor keeps
 * that sign-in: their name and email are still needed for it. Their seat in the household is removed.
 */
export function splitPeople<T extends PersonFacts>(people: readonly T[]) {
  const keep = people.filter((p) => p.staff || p.counsellor || p.sponsor);
  return { keep, gone: people.filter((p) => !keep.includes(p)) };
}

/**
 * May this profile be deleted on its own? Not when it would leave the household with no profile: a household needs
 * one to open the app, and a family that wants everything gone deletes the household instead.
 * `leaving` are the profiles that already have a deletion waiting.
 */
export function canDeleteProfile(profileIds: readonly string[], leaving: readonly string[], profileId: string): "ok" | "not_yours" | "already" | "last_one" {
  if (!profileIds.includes(profileId)) return "not_yours";
  if (leaving.includes(profileId)) return "already";
  const staying = profileIds.filter((id) => id !== profileId && !leaving.includes(id));
  return staying.length ? "ok" : "last_one";
}
