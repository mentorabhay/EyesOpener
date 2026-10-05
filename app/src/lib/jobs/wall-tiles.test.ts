import { describe, expect, it, vi } from "vitest";

/* The list of jobs is loaded by tests that have no database: a job's file must not read a table while it loads. */
vi.mock("@/db", () => ({ db: {}, schema: {} }));

import { wallTiles } from "./wall-tiles";

describe("the wall-tiles job", () => {
  it("loads with no database, runs daily and says what it does", () => {
    expect(wallTiles.name).toBe("wall-tiles");
    expect(wallTiles.cadence).toBe("daily");
    expect(wallTiles.what.length).toBeGreaterThan(20);
  });
});
