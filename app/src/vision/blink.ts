/**
 * Blinks, from how far the lids are apart in each camera picture (`open` from face.ts). Pure: the caller passes the
 * time of each picture, and the state goes in and comes out.
 *
 * The rule:
 *  1. The "open level" is the member's own: the level the lids were at or above for nine tenths of the last
 *     few seconds. Nothing is assumed about a person's eyes, glasses or camera angle.
 *  2. A dip starts when the opening falls under `DIP_START` of the open level. It ends when the opening is back
 *     above `DIP_END`.
 *  3. A dip that lasted no longer than `BLINK_MAX_MS` is a blink. It is a FULL blink when the lids came within
 *     `FULL_BLINK` of the open level at the lowest picture, and a HALF blink otherwise.
 *  4. A dip that lasts longer is not a blink. That is what looking down at a keyboard or a phone looks like to a
 *     camera (the upper lid follows the eye down and stays there), and it is also what resting the eyes shut looks
 *     like. Neither is counted. After a few seconds the open level follows the eyes down, so blinks made while
 *     looking down are dips from the new level and are found again. Coming back up is not a blink either.
 *  5. A picture with the face turned away, or no face, ends any dip without counting it. So does a gap between
 *     pictures longer than `MAX_GAP_MS`: a blink can fall wholly inside such a gap, so nothing is claimed.
 *
 * How sure this is. A blink lasts about a tenth to four tenths of a second, so at 15 pictures a second it is seen
 * in two to five of them. Counting blinks this way is reasonably sure in good light. Telling a full blink from a
 * half blink is not: the lowest picture can miss the moment the lids met, which turns full blinks into half
 * blinks. The evidence framework rates it "low to medium at webcam resolution; needs validation", and the three
 * shares below are starting values that no study of this project has checked. Glasses glare and a dim room make
 * all of it worse. One run of this code on a filmed face that blinked fully every four seconds, on a slow computer,
 * counted the blinks rightly (16 a minute) and called two thirds of them half blinks. So the monitor shows the blink
 * count, and keeps the half-blink count with the member's numbers without showing it until it has been checked.
 */

/** A dip begins under this share of the member's own open level. */
export const DIP_START = 0.75;
/** A dip is over above this share. Higher than the start, so a level that hovers at the edge is one dip, not many. */
export const DIP_END = 0.82;
/** The lids met (a full blink) when the lowest picture is at or under this share of the open level. */
export const FULL_BLINK = 0.45;
/** A dip longer than this is eyes lowered or eyes shut, not a blink. */
export const BLINK_MAX_MS = 600;
/**
 * Pictures further apart than this cannot be trusted to show every blink: ten pictures a second. A quick blink keeps
 * the lids low for about a tenth of a second, so a slower pace would miss some and report a rate that is too low,
 * which is the one mistake that would set off a blink reminder nobody needs. Below this pace no blink number is given.
 */
export const MAX_GAP_MS = 100;
/** How far back the open level looks. */
export const LEVEL_WINDOW_MS = 8000;
/** The open level is known once this much has been seen. */
export const LEVEL_MIN_MS = 1500;

export type BlinkKind = "full" | "half";

export interface BlinkState {
  /** Recent openings with their times, oldest first. Only pictures that faced the camera. */
  recent: { t: number; open: number }[];
  /** The dip in progress: when it began, the lowest share seen, and the open level it is measured against. */
  dip: { since: number; lowest: number; level: number } | null;
  /** True after a dip that lasted too long to be a blink, until the lids are seen open again. No dip starts while it is true. */
  lowered: boolean;
  /** Time of the last picture that could be read, or null. */
  last: number | null;
}

export const startBlinks = (): BlinkState => ({ recent: [], dip: null, lowered: false, last: null });

export interface BlinkStep {
  state: BlinkState;
  /** A blink that ended with this picture. */
  blink: BlinkKind | null;
  /** Milliseconds since the last picture during which a blink would have been seen. 0 when the detector was blind. */
  watchedMs: number;
  /** The member's own open level now, or null while it is still being learned. */
  level: number | null;
}

/** The level the lids were at or above for nine tenths of the recent pictures, from pictures that were not inside a dip. */
function openLevel(recent: BlinkState["recent"]): number | null {
  if (recent.length < 2 || recent[recent.length - 1].t - recent[0].t < LEVEL_MIN_MS) return null;
  const s = recent.map((r) => r.open).sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))];
}

/**
 * One camera picture. `open` is null when there was no face or it was turned away.
 * Times are milliseconds on any clock that only goes forward.
 */
export function blinkStep(prev: BlinkState, t: number, open: number | null): BlinkStep {
  const gap = prev.last === null ? Infinity : t - prev.last;
  if (open === null || !Number.isFinite(open) || open < 0) {
    /* Nothing to read: a dip in progress is dropped, and the next picture starts a new stretch. */
    return { state: { recent: prev.recent, dip: null, lowered: false, last: null }, blink: null, watchedMs: 0, level: openLevel(prev.recent) };
  }
  const blind = gap > MAX_GAP_MS || gap <= 0;
  const recent = [...prev.recent.filter((r) => t - r.t <= LEVEL_WINDOW_MS), { t, open }];
  const level = openLevel(recent);
  let dip = blind ? null : prev.dip, lowered = prev.lowered;
  let blink: BlinkKind | null = null;

  if (level !== null && level > 0) {
    const share = open / (dip ? dip.level : level);
    if (dip) {
      const lowest = Math.min(dip.lowest, share), tooLong = t - dip.since > BLINK_MAX_MS;
      if (tooLong) { dip = null; lowered = share < DIP_END; }
      else if (share >= DIP_END) { blink = dip.lowest <= FULL_BLINK ? "full" : "half"; dip = null; }
      else dip = { ...dip, lowest };
    } else if (lowered) {
      /* Eyes lowered or shut for a while: wait until they are seen open, against the level as it is now. */
      if (share >= DIP_END) lowered = false;
    } else if (!blind && share < DIP_START) {
      /* The dip began somewhere between the last picture and this one: time it from the last picture. */
      dip = { since: prev.last ?? t, lowest: share, level };
    }
  }
  return { state: { recent, dip, lowered, last: t }, blink, watchedMs: blind || level === null ? 0 : gap, level };
}
