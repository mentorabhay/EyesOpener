/**
 * What lies over the picture in the film player, and when today's minutes count as used. Pure rules, unit-tested.
 * At most one card shows at a time; with none, the film itself shows.
 */
import type { FilmStatus } from "./use-list";

export type Overlay =
  /** No film is chosen. */
  | "empty"
  /** This browser cannot play the film. */
  | "cannot"
  /** The film's file is not at hand on this visit. */
  | "file"
  /** An eye break between two chapters. */
  | "rest"
  /** Today's minutes are used up. */
  | "used"
  /** The member pressed stop. */
  | "stopped"
  /** The film can be started: the glasses reminder, and where to carry on from. */
  | "ready"
  /** Paused in the middle of a session. */
  | "paused"
  | null;

export interface OverlayInput {
  /** A film is chosen, and where it stands on this visit. */
  status: FilmStatus | null;
  /** An eye break is due. */
  rest: boolean;
  usedUp: boolean;
  /** The last session ended on the stop button. */
  stopped: boolean;
  playing: boolean;
  /** Play may be pressed: the film is readable and the server would allow a session, or one is running. */
  mayPlay: boolean;
  /** A session is running. */
  active: boolean;
  /** The member has started this film on this visit. */
  started: boolean;
}

/**
 * The order matters. The break comes first: nothing may cover it. Then "today's minutes are used", which is true
 * whether or not a film is chosen. Then a film that cannot be shown, then a stop, and only then the invitation to play.
 */
export function overlayFor(i: OverlayInput): Overlay {
  if (i.rest && i.status === "ready") return "rest";
  if (i.usedUp) return "used";
  if (!i.status) return "empty";
  if (i.status === "cannot") return "cannot";
  if (i.status !== "ready") return "file";
  if (i.stopped) return "stopped";
  if (i.playing) return null;
  if (i.mayPlay && (!i.active || !i.started)) return "ready";
  return i.active ? "paused" : null;
}

/** Cards that carry their own buttons. Over the others, and over the bare film, the picture itself is the play and pause button. */
export const hasOwnButtons = (card: Overlay, mayChoose: boolean) =>
  card === "rest" || card === "ready" || ((card === "empty" || card === "file") && mayChoose);

/**
 * Are today's minutes used up? Yes when the server says so (the programme's minutes or the daily limit are reached),
 * and yes at once when the session clock has just run out, before the server's answer has come back.
 * A staff test household has no daily limit, so its clock running out is not "today's minutes".
 */
export function minutesUsed(i: { doseReason: string | null; endReason: string | null; watchedSeconds: number; allowedSeconds: number; tester: boolean }): boolean {
  if (i.doseReason === "programme_done" || i.doseReason === "daily_cap") return true;
  if (i.tester) return false;
  const byClock = (i.endReason === "done" || i.endReason === "daily_cap") && i.allowedSeconds > 0 && i.watchedSeconds + 1 >= i.allowedSeconds;
  return byClock;
}
