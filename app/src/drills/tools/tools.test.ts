// Eyes Opener: Unit and regression test suite verifying tools functionality.
import { describe, expect, it } from "vitest";
import { passages, tools } from "@/copy/drills-tools";
import {
  blankMarks, cellAt, charsThatFit, countMarks, GRID, GRID_CELLS, gridDetail, holdDistanceCm, lineOf, lineRanges, moveCursor, nextLine,
  previousLine, READ_START, readingDetail, splitLines, toggleMark, wordsOf, wordsPerMinute,
} from "./helpers";

const SAMPLE = passages[0];

describe("reading tool: the passages", () => {
  it("has eight passages of 90 to 130 words, none repeated", () => {
    expect(passages).toHaveLength(8);
    for (const p of passages) {
      const count = wordsOf(p).length;
      expect(count).toBeGreaterThanOrEqual(90);
      expect(count).toBeLessThanOrEqual(130);
    }
    expect(new Set(passages.map((p) => p.trim().toLowerCase())).size).toBe(passages.length);
    expect(new Set(passages.map((p) => wordsOf(p).slice(0, 6).join(" "))).size).toBe(passages.length);
  });

  it("keeps the passages plain: one paragraph, no long words, no odd characters", () => {
    for (const p of passages) {
      expect(p).toBe(p.trim());
      expect(/\s{2,}|\n/.test(p)).toBe(false);
      expect(/^[A-Za-z0-9 .,:;'’\-]+$/.test(p)).toBe(true);
      for (const w of wordsOf(p)) expect(w.length).toBeLessThanOrEqual(12);
    }
  });
});

describe("reading tool: splitting into lines", () => {
  it.each([10, 16, 28, 44, 80])("keeps every word once and in order at %i characters", (max) => {
    for (const p of passages) {
      const lines = splitLines(p, max);
      expect(lines.join(" ")).toBe(wordsOf(p).join(" "));
      for (const line of lines) {
        expect(line.length).toBeGreaterThan(0);
        /* a line is over the limit only when it is one long word */
        if (line.length > max) expect(line.includes(" ")).toBe(false);
      }
    }
  });

  it("fills each line as far as it can", () => {
    const words = wordsOf(SAMPLE), ranges = lineRanges(words, 28);
    for (let i = 0; i + 1 < ranges.length; i++) {
      const line = words.slice(ranges[i].start, ranges[i].end).join(" ");
      expect(`${line} ${words[ranges[i].end]}`.length).toBeGreaterThan(28);
    }
    expect(ranges[0].start).toBe(0);
    expect(ranges.at(-1)!.end).toBe(words.length);
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].start).toBe(ranges[i - 1].end);
  });

  it("handles an empty text and a single long word", () => {
    expect(splitLines("", 20)).toEqual([]);
    expect(splitLines("   ", 20)).toEqual([]);
    expect(splitLines("extraordinarily", 5)).toEqual(["extraordinarily"]);
    expect(splitLines("a extraordinarily b", 5)).toEqual(["a", "extraordinarily", "b"]);
  });

  it("finds the line that holds a word", () => {
    const ranges = lineRanges(wordsOf(SAMPLE), 28);
    expect(lineOf(ranges, 0)).toBe(0);
    expect(lineOf(ranges, ranges[2].start)).toBe(2);
    expect(lineOf(ranges, ranges[2].end - 1)).toBe(2);
    expect(lineOf(ranges, 10_000)).toBe(ranges.length - 1);
  });

  it("shortens lines to the room there is, never below ten characters", () => {
    expect(charsThatFit(0, 24, 28)).toBe(28);
    expect(charsThatFit(2000, 24, 28)).toBe(28);
    expect(charsThatFit(286, 42, 44)).toBe(12);
    expect(charsThatFit(60, 42, 44)).toBe(10);
  });
});

describe("reading tool: counting", () => {
  it("works out words a minute", () => {
    expect(wordsPerMinute(100, 60)).toBe(100);
    expect(wordsPerMinute(45, 30)).toBe(90);
    expect(wordsPerMinute(10, 7)).toBe(86);
    expect(wordsPerMinute(0, 30)).toBe(0);
    expect(wordsPerMinute(50, 0)).toBeNull();
    expect(wordsPerMinute(50, -3)).toBeNull();
  });

  it("reports lines at once and the speed only after 3 lines and 20 seconds", () => {
    expect(readingDetail(0, 0, 50)).toBeNull();
    expect(readingDetail(2, 14, 40)).toEqual({ lines: 2 });
    expect(readingDetail(3, 21, 19)).toEqual({ lines: 3 });
    expect(readingDetail(3, 21, 20)).toEqual({ lines: 3, words_per_min: 63 });
    expect(readingDetail(14, 105, 70)).toEqual({ lines: 14, words_per_min: 90 });
  });

  it("does not keep a speed nobody reads at", () => {
    expect(readingDetail(30, 300, 20)).toEqual({ lines: 30 });
  });

  it("counts a line once, moves on, and starts the next passage after the last line", () => {
    const words = wordsOf(SAMPLE), ranges = lineRanges(words, 44);
    let pos = { ...READ_START, passage: 3 };
    ranges.forEach((r, i) => {
      expect(pos.at).toBe(r.start);
      pos = nextLine(pos, ranges, passages.length, 10 + i * 4);
      expect(pos.lines).toBe(i + 1);
      expect(pos.words).toBe(r.end);
      expect(pos.seconds).toBe(10 + i * 4);
    });
    expect(pos).toMatchObject({ passage: 4, at: 0, far: 0, lines: ranges.length, words: words.length });
    expect(nextLine({ ...READ_START, passage: 7 }, [{ start: 0, end: 5 }], 8, 9).passage).toBe(0);
  });

  it("goes back without counting, and does not count a line read again", () => {
    const ranges = lineRanges(wordsOf(SAMPLE), 28);
    let pos = nextLine(nextLine(READ_START, ranges, 8, 5), ranges, 8, 9);
    const after = { ...pos };
    pos = previousLine(pos, ranges);
    expect(pos).toEqual({ ...after, at: ranges[1].start });
    pos = previousLine(previousLine(pos, ranges), ranges);
    expect(pos).toEqual({ ...after, at: 0 });
    /* forward again over the two lines already counted: the numbers and the time stay */
    pos = nextLine(nextLine(pos, ranges, 8, 30), ranges, 8, 35);
    expect(pos).toEqual(after);
    pos = nextLine(pos, ranges, 8, 40);
    expect(pos).toMatchObject({ lines: 3, words: ranges[2].end, seconds: 40, at: ranges[2].end });
  });

  it("keeps its count when the lines are split again at another length", () => {
    const words = wordsOf(SAMPLE), short = lineRanges(words, 28), long = lineRanges(words, 44);
    let pos = nextLine(READ_START, short, 8, 6);
    pos = nextLine(pos, long, 8, 12);
    expect(pos.lines).toBe(2);
    expect(pos.words).toBe(long[lineOf(long, short[0].end)].end);
    expect(pos.words).toBeLessThanOrEqual(words.length);
  });
});

describe("grid check", () => {
  it("starts with 400 clear squares and toggles one at a time", () => {
    const blank = blankMarks();
    expect(blank).toHaveLength(GRID_CELLS);
    expect(countMarks(blank)).toBe(0);
    const one = toggleMark(blank, 45), two = toggleMark(one, 399);
    expect(countMarks(one)).toBe(1);
    expect(countMarks(two)).toBe(2);
    expect(two[45] && two[399]).toBe(true);
    expect(countMarks(toggleMark(two, 45))).toBe(1);
    expect(countMarks(blank)).toBe(0);
  });

  it("finds the square under a point", () => {
    expect(cellAt(0, 0)).toBe(0);
    expect(cellAt(0.999, 0)).toBe(GRID - 1);
    expect(cellAt(0, 0.999)).toBe(GRID_CELLS - GRID);
    expect(cellAt(0.5, 0.5)).toBe(10 * GRID + 10);
    expect(cellAt(0.07, 0.12)).toBe(2 * GRID + 1);
    for (const [x, y] of [[-0.01, 0.5], [1, 0.5], [0.5, -0.01], [0.5, 1], [Number.NaN, 0.5]]) expect(cellAt(x, y)).toBeNull();
  });

  it("moves the keyboard cursor and stops at the edges", () => {
    const mid = 10 * GRID + 10;
    expect(moveCursor(mid, "ArrowLeft")).toBe(mid - 1);
    expect(moveCursor(mid, "ArrowRight")).toBe(mid + 1);
    expect(moveCursor(mid, "ArrowUp")).toBe(mid - GRID);
    expect(moveCursor(mid, "ArrowDown")).toBe(mid + GRID);
    expect(moveCursor(mid, "Home")).toBe(10 * GRID);
    expect(moveCursor(mid, "End")).toBe(10 * GRID + GRID - 1);
    expect(moveCursor(mid, "a")).toBe(mid);
    expect(moveCursor(0, "ArrowLeft")).toBe(0);
    expect(moveCursor(0, "ArrowUp")).toBe(0);
    expect(moveCursor(GRID - 1, "ArrowRight")).toBe(GRID - 1);
    expect(moveCursor(GRID_CELLS - 1, "ArrowDown")).toBe(GRID_CELLS - 1);
    expect(moveCursor(GRID_CELLS - 1, "ArrowRight")).toBe(GRID_CELLS - 1);
  });

  it("reports each eye only when that eye is done", () => {
    expect(gridDetail(null, null)).toBeNull();
    expect(gridDetail(0, null)).toEqual({ right_marks: 0 });
    expect(gridDetail(3, null)).toEqual({ right_marks: 3 });
    expect(gridDetail(3, 0)).toEqual({ right_marks: 3, left_marks: 0 });
  });

  it("holds the grid at three times its width", () => {
    expect(holdDistanceCm(10)).toBe(30);
    expect(holdDistanceCm(8.7)).toBe(26);
    expect(holdDistanceCm(0)).toBe(10);
  });

  it("names no disease in what the member reads", () => {
    const words = JSON.stringify(tools.grid).toLowerCase();
    for (const term of ["macular", "degeneration", "amd", "glaucoma", "retinopathy", "diagnos", "amsler"]) expect(words.includes(term)).toBe(false);
  });
});
