/**
 * Moving between controls with four arrows, for a TV remote that has arrows and OK and nothing else.
 * `pickInDirection` is the pure rule (boxes in, the best box out) and is unit-tested; `moveFocus` applies it to the page.
 */

export type Direction = "up" | "down" | "left" | "right";
export interface Box { left: number; top: number; right: number; bottom: number }

/** How much dearer a step to the side is than a step along the way. */
const SIDE_COST = 3;
/** What leaving the row costs on a move to the left or right: more than any screen is wide. */
const OTHER_ROW = 100_000;

export const directionOf = (key: string): Direction | null =>
  key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : key === "ArrowLeft" ? "left" : key === "ArrowRight" ? "right" : null;

/**
 * The box to move to from `from`, going one way: the nearest one that lies that way.
 * A box counts as lying that way when it starts beyond the middle of `from` on that axis.
 * Boxes in the same row or column (they overlap sideways) are preferred to ones that are off to the side.
 * Returns the index in `boxes`, or -1 when nothing lies that way.
 */
export function pickInDirection(from: Box, boxes: readonly Box[], dir: Direction): number {
  const across = dir === "left" || dir === "right";
  const sign = dir === "right" || dir === "down" ? 1 : -1;
  /* Along the direction of travel: [near edge, far edge]. Across it: [start, end]. */
  const along = (b: Box) => (across ? [b.left, b.right] : [b.top, b.bottom]);
  const side = (b: Box) => (across ? [b.top, b.bottom] : [b.left, b.right]);
  const [fa0, fa1] = along(from), [fs0, fs1] = side(from), middle = (fa0 + fa1) / 2;

  let best = -1, bestScore = Infinity;
  boxes.forEach((b, i) => {
    const [a0, a1] = along(b), [s0, s1] = side(b);
    /* It must lie beyond the middle of where we are, and not be the same place. */
    const lead = sign > 0 ? a0 : a1;
    if (sign > 0 ? lead < middle || a1 <= fa1 : lead > middle || a0 >= fa0) return;
    const gap = Math.max(0, sign > 0 ? a0 - fa1 : fa0 - a1);
    const overlap = Math.min(fs1, s1) - Math.max(fs0, s0);
    const off = overlap > 0 ? 0 : Math.min(Math.abs(s0 - fs1), Math.abs(fs0 - s1)) + 1;
    /* Going up or down, a step to the side costs three times a step along the way: a column is kept to, but a near
       neighbour just off the line still beats a far box on it. Going left or right, a row is never left while
       something in it lies that way: a wide box in the next row must not catch the move. */
    const score = gap + off * SIDE_COST + (across && overlap <= 0 ? OTHER_ROW : 0);
    if (score < bestScore) { best = i; bestScore = score; }
  });
  return best;
}

/** A control on the page: its box, and the group it sits in (with that group's box) when it has one. */
export interface Stop { box: Box; group?: { id: string; box: Box } }

/**
 * The control to move to, when some controls sit together in a group (a card with its own buttons, drawn over the
 * picture). From outside, a group counts as one place with the group's box, and arriving there lands on its first
 * control; this way a remote reaches a card's buttons on the way past instead of skipping over them.
 * From inside a group, its own controls and everything outside it are single places as usual.
 * Returns the index in `stops`, or -1.
 */
export function pickStop(from: Stop, stops: readonly Stop[], dir: Direction): number {
  const inside = from.group?.id;
  const firstOf = new Map<string, number>();
  const places: { box: Box; at: number }[] = [];
  stops.forEach((s, i) => {
    if (!s.group || s.group.id === inside) { places.push({ box: s.box, at: i }); return; }
    if (firstOf.has(s.group.id)) return;
    firstOf.set(s.group.id, i);
    places.push({ box: s.group.box, at: i });
  });
  const best = pickInDirection(from.box, places.map((p) => p.box), dir);
  return best < 0 ? -1 : places[best].at;
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
/** Put this attribute on an element whose controls belong together, such as a card with buttons. */
export const ARROW_GROUP = "data-arrow-group";

/** Moves focus to the nearest control that way inside `root`. False when there is none, so the browser does what it would. */
export function moveFocus(root: HTMLElement, dir: Direction): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return false;
  const groups = [...root.querySelectorAll<HTMLElement>(`[${ARROW_GROUP}]`)];
  const stopOf = (el: HTMLElement): Stop => {
    const at = groups.findIndex((g) => g !== el && g.contains(el));
    return { box: el.getBoundingClientRect(), group: at < 0 ? undefined : { id: String(at), box: groups[at].getBoundingClientRect() } };
  };
  const seen = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el === active || el.tabIndex < 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  });
  const at = pickStop(stopOf(active), seen.map(stopOf), dir);
  if (at < 0) return false;
  seen[at].focus();
  seen[at].scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}
