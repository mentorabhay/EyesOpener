// Eyes Opener: The arithmetic of the two screen tools (the reading tool and the grid check). Plain functions:.
/**
 * The arithmetic of the two screen tools (the reading tool and the grid check). Plain functions:
 * no React, no browser, no clock. Tested in tools.test.ts.
 */
import type { Detail } from "@/lib/sessions";

/* ── reading ── */

/** The words of a text, in order. */
export const wordsOf = (text: string): string[] => text.trim().split(/\s+/).filter(Boolean);

/** A line as a range of word numbers: from `start` up to, not including, `end`. */
export interface LineRange { start: number; end: number }

/**
 * Fills lines with whole words, each line at most `max` characters long. A word longer than `max` gets a line to itself.
 * Every word lands in exactly one line, in order.
 */
export function lineRanges(words: readonly string[], max: number): LineRange[] {
  const out: LineRange[] = [];
  let start = 0, length = 0;
  words.forEach((word, i) => {
    const next = length === 0 ? word.length : length + 1 + word.length;
    if (length > 0 && next > max) {
      out.push({ start, end: i });
      start = i;
      length = word.length;
    } else length = next;
  });
  if (words.length > start) out.push({ start, end: words.length });
  return out;
}

/** The same split as text: the lines a passage is read in. */
export function splitLines(text: string, max: number): string[] {
  const words = wordsOf(text);
  return lineRanges(words, max).map((r) => words.slice(r.start, r.end).join(" "));
}

/** The line that holds word number `at` (the last line when `at` is past the end). */
export function lineOf(ranges: readonly LineRange[], at: number): number {
  const i = ranges.findIndex((r) => at < r.end);
  return i < 0 ? Math.max(0, ranges.length - 1) : i;
}

/** How many characters of this size fit in a box this wide, never more than the member chose and never fewer than 10. */
export function charsThatFit(boxPx: number, fontPx: number, chosen: number, charEm = 0.56): number {
  if (!(boxPx > 0) || !(fontPx > 0)) return chosen;
  return Math.max(10, Math.min(chosen, Math.floor(boxPx / (fontPx * charEm))));
}

/**
 * Where the reader is. `at` is the first word of the line on screen; `far` is how many words of this passage
 * have been counted, so a line read again after "Back" is not counted twice. `seconds` is the session time
 * when the last counted line was finished.
 */
export interface ReadPos { passage: number; at: number; far: number; lines: number; words: number; seconds: number }
export const READ_START: ReadPos = { passage: 0, at: 0, far: 0, lines: 0, words: 0, seconds: 0 };

/** The line on screen is finished: count it if it is new, and move to the next line, or to the next passage after the last line. */
export function nextLine(pos: ReadPos, ranges: readonly LineRange[], passageCount: number, seconds: number): ReadPos {
  const i = lineOf(ranges, pos.at), r = ranges[i];
  if (!r) return pos;
  const fresh = r.end > pos.far;
  const counted = {
    lines: pos.lines + (fresh ? 1 : 0),
    words: pos.words + (fresh ? r.end - Math.max(pos.far, r.start) : 0),
    seconds: fresh ? Math.max(pos.seconds, seconds) : pos.seconds,
  };
  if (i >= ranges.length - 1) return { passage: (pos.passage + 1) % Math.max(1, passageCount), at: 0, far: 0, ...counted };
  return { passage: pos.passage, at: r.end, far: Math.max(pos.far, r.end), ...counted };
}

/** One line back in the same passage. Nothing is counted and nothing is taken away. */
export function previousLine(pos: ReadPos, ranges: readonly LineRange[]): ReadPos {
  const i = lineOf(ranges, pos.at);
  return i > 0 ? { ...pos, at: ranges[i - 1].start } : pos;
}

/** A reading speed is shown only after this much reading: fewer lines or seconds give a number that means nothing. */
export const READ_MIN_SECONDS = 20;
export const READ_MIN_LINES = 3;
/** Faster than this is pressing the button, not reading. It is not kept. */
export const READ_MAX_WPM = 600;

/** Words read in a minute, to the nearest whole word. Null when no time has passed. */
export function wordsPerMinute(words: number, seconds: number): number | null {
  if (!(seconds > 0) || !(words >= 0)) return null;
  return Math.round((words * 60) / seconds);
}

/** What the reading tool keeps: lines finished, and the speed once enough has been read. `seconds` is the session time when the last line was finished. */
export function readingDetail(lines: number, words: number, seconds: number): Detail | null {
  if (lines <= 0) return null;
  const out: Detail = { lines };
  const speed = lines >= READ_MIN_LINES && seconds >= READ_MIN_SECONDS ? wordsPerMinute(words, seconds) : null;
  if (speed !== null && speed > 0 && speed <= READ_MAX_WPM) out.words_per_min = speed;
  return out;
}

/* ── grid check ── */

/** Squares along one side of the grid. */
export const GRID = 20;
export const GRID_CELLS = GRID * GRID;
/** The grid is drawn this wide when the screen's size is known. Held at three times its width, each square covers one degree. */
export const GRID_CM = 10;
/** CSS pixels in a centimetre on a screen that was never measured. */
export const DEFAULT_PPC = 37.8;

export const blankMarks = (): boolean[] => Array.from({ length: GRID_CELLS }, () => false);
export const countMarks = (marks: readonly boolean[]): number => marks.reduce((n, on) => n + (on ? 1 : 0), 0);
export const toggleMark = (marks: readonly boolean[], cell: number): boolean[] => marks.map((on, i) => (i === cell ? !on : on));

/** The square under a point given as shares (0 to 1) of the grid's width and height. Null outside the grid. */
export function cellAt(fx: number, fy: number): number | null {
  if (!(fx >= 0 && fx < 1 && fy >= 0 && fy < 1)) return null;
  return Math.floor(fy * GRID) * GRID + Math.floor(fx * GRID);
}

/** Where an arrow key takes the keyboard cursor. It stops at the edges. Other keys leave it where it is. */
export function moveCursor(cell: number, key: string): number {
  const row = Math.floor(cell / GRID), col = cell % GRID;
  if (key === "ArrowLeft") return col > 0 ? cell - 1 : cell;
  if (key === "ArrowRight") return col < GRID - 1 ? cell + 1 : cell;
  if (key === "ArrowUp") return row > 0 ? cell - GRID : cell;
  if (key === "ArrowDown") return row < GRID - 1 ? cell + GRID : cell;
  if (key === "Home") return row * GRID;
  if (key === "End") return row * GRID + GRID - 1;
  return cell;
}

/** What the grid check keeps: the squares marked for each eye, each eye only once that eye is done. */
export function gridDetail(right: number | null, left: number | null): Detail | null {
  const out: Detail = {};
  if (right !== null) out.right_marks = right;
  if (left !== null) out.left_marks = left;
  return Object.keys(out).length ? out : null;
}

/** How far to hold the screen, in whole centimetres, for a grid drawn this wide: three times its width. */
export const holdDistanceCm = (gridWidthCm: number): number => Math.max(10, Math.round(gridWidthCm * 3));
