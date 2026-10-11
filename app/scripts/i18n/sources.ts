// Eyes Opener: Which files hold words that are looked up for each request (made with `texts(...)`).
/**
 * Which files hold words that are looked up for each request (made with `texts(...)`).
 * Paths are relative to `src`, without the extension.
 */
export const isSourceFile = (file: string): boolean =>
  (/^copy\/[^/]+$/.test(file) || /^data\//.test(file)) && !file.endsWith(".test");

/** Data files that make sources when they load. The files of `src/copy/` are found by listing the folder. */
export const DATA_SOURCES: readonly string[] = ["data/guides/index", "data/game-guides/index", "data/words", "data/supervision"];
